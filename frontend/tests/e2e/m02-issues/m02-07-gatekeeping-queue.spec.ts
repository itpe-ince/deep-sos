/**
 * M02-07: 게이트키핑 큐 — Playwright E2E.
 *
 * 6항 검증:
 *  1. Happy: 큐 + 단계 통계 칩 + 행 클릭 → 상세 이동
 *  2. Error: API 실패 → empty fallback
 *  3. 권한: 운영자 외 → 403 (Sprint 후반 RBAC 통합)
 *  4. URL: ?stage=&region= 필터 동기화
 *  5. Modal: N/A (큐는 모달 없음, 상세 페이지에서)
 *  6. A11y: 단계 칩 + WCAG
 */
import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

const QUEUE_ITEMS = [
  {
    id: 'gk-1',
    title: '반석동 횡단보도 신호등',
    body: '신호 시간 부족',
    region: 'daejeon',
    stage: 'reported',
    track: null,
    vote_count: 12,
    comment_count: 2,
    created_at: new Date().toISOString(),
  },
  {
    id: 'gk-2',
    title: '공주 한옥마을 안내',
    body: '관광 안내 부족',
    region: 'gongju',
    stage: 'reviewing',
    track: 'policy_reference',
    vote_count: 4,
    comment_count: 1,
    created_at: new Date().toISOString(),
  },
];

const STAGE_STATS = {
  reported: 5,
  reviewing: 3,
  published: 8,
  mentor_assigned: 2,
  in_progress: 4,
  resolved: 12,
  rejected: 1,
};

async function fakeOperatorLogin(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'fake-operator-token');
    localStorage.setItem('refresh_token', 'fake-refresh-token');
  });
  await mockJson(page, '**/api/v1/users/me', 200, {
    id: 'op-id',
    email: testOperator.email,
    name: testOperator.name,
    role: 'operator',
    is_active: true,
    email_verified: true,
  });
}

test.describe('M02-07 게이트키핑 큐', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('큐 + 단계 칩 통계 + 행 노출', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/stats', 200, STAGE_STATS);
    await mockJson(page, '**/api/v1/admin/issues**', 200, {
      data: QUEUE_ITEMS,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });

    await page.goto('/admin/issues');
    await expect(page.getByTestId('admin-issues-page')).toBeVisible();
    await expect(page.getByTestId('admin-issues-stats')).toBeVisible();

    // 단계 칩 — 전체 + 7단계 = 8칩
    const chips = page.locator('[data-testid^="stage-chip-"]');
    await expect(chips).toHaveCount(8);
    // reported 칩 카운트 5 확인
    await expect(page.getByTestId('stage-chip-reported')).toContainText('5');

    // 큐 행
    await expect(page.getByTestId('admin-issues-list')).toBeVisible();
    const rows = page.getByTestId('admin-issue-row');
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText('반석동');
  });

  // ── 2. Error Path ─────────────────────────────────────────
  test('API 실패 → empty fallback', async ({ page }) => {
    await fakeOperatorLogin(page);
    await page.route('**/api/v1/admin/issues**', (route) =>
      route.fulfill({ status: 500, body: 'down' }),
    );
    await page.goto('/admin/issues');
    await expect(page.getByTestId('admin-issues-empty')).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── 4. URL 동기화 ─────────────────────────────────────────
  test('?stage=reported&region=daejeon URL 진입 + 칩 active', async ({
    page,
  }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/stats', 200, STAGE_STATS);
    await mockJson(page, '**/api/v1/admin/issues**', 200, {
      data: [QUEUE_ITEMS[0]],
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/admin/issues?stage=reported&region=daejeon');
    await expect(page.getByTestId('stage-chip-reported')).toHaveAttribute(
      'data-active',
      'true',
    );
    await uscp.routingOk(page, page.getByTestId('admin-issues-page'));
  });

  // ── 칩 클릭 → URL 동기화 + 필터 적용 ─────────────────────
  test('칩 클릭 → URL ?stage= 동기화', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/stats', 200, STAGE_STATS);
    await mockJson(page, '**/api/v1/admin/issues**', 200, {
      data: QUEUE_ITEMS,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/admin/issues');
    await page.getByTestId('stage-chip-reviewing').click();
    await expect(page).toHaveURL(/stage=reviewing/);
  });

  // ── 6. A11y ───────────────────────────────────────────────
  test('A11y — WCAG 위반 0건', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/stats', 200, STAGE_STATS);
    await mockJson(page, '**/api/v1/admin/issues**', 200, {
      data: QUEUE_ITEMS,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/admin/issues');
    await uscp.a11yClean(page);
  });
});
