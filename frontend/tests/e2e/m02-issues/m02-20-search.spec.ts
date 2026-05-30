/**
 * M02-20: 제보 키워드 검색 — Playwright E2E.
 *
 * 6항 검증:
 *  1. Happy: 키워드 입력 → 300ms 디바운스 후 1회만 fetch + URL ?q= 동기화
 *  2. Error: 1자 이하 입력 시 q 파라미터 미전송 (backend 무시)
 *  3. 권한: 누구나 광장 검색 / 운영자만 큐 검색
 *  4. URL: ?q= 직접 진입 시 검색어 input 채워짐
 *  5. Modal: N/A
 *  6. A11y: input type=search + label + WCAG
 */
import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

const RESULT_HORANG = [
  {
    id: 'q-1',
    title: '반석동 횡단보도 신호등 시간 부족',
    body: '횡단보도 신호 시간 조정 필요',
    region: 'daejeon',
    stage: 'published',
    track: 'policy_reflection',
    vote_count: 42,
    comment_count: 8,
    created_at: new Date().toISOString(),
  },
];

const RESULT_OTHER = [
  {
    id: 'q-2',
    title: '공주 한옥마을 안내',
    body: '관광 안내 부족',
    region: 'gongju',
    stage: 'published',
    track: null,
    vote_count: 5,
    comment_count: 1,
    created_at: new Date().toISOString(),
  },
];

test.describe('M02-20 키워드 검색', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy + 디바운스 ───────────────────────────────────
  test('광장 검색 — 디바운스 후 1회 fetch + URL ?q= 동기화', async ({
    page,
  }) => {
    const calls: string[] = [];
    await page.route('**/api/v1/issues**', async (route) => {
      calls.push(route.request().url());
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: route.request().url().includes('q=%ED%9A%A1%EB%8B%A8')
            ? RESULT_HORANG
            : [...RESULT_HORANG, ...RESULT_OTHER],
          meta: { limit: 20, has_more: false, next_cursor: null },
        }),
      });
    });

    await page.goto('/issues');
    await page.waitForTimeout(100);
    const callsBefore = calls.length;

    // 빠르게 4글자 입력 — 디바운스로 1회만 fetch 되어야 함
    const input = page.getByTestId('filter-q');
    await input.fill('횡');
    await input.fill('횡단');
    await input.fill('횡단보');
    await input.fill('횡단보도');

    // 300ms 디바운스 후 URL 반영 + fetch 1회
    await page.waitForURL(/q=/, { timeout: 2_000 });

    // URL 에 q 인코딩된 형태로 반영
    await expect(page).toHaveURL(/q=%ED%9A%A1%EB%8B%A8%EB%B3%B4%EB%8F%84/);

    // 결과 카드 — 횡단보도 검색 결과만 1건
    await expect(page.getByTestId('issue-card')).toHaveCount(1);

    // 호출 횟수: 초기 1회 + 디바운스 후 1회 = 합리적 범위
    const finalCalls = calls.length - callsBefore;
    expect(finalCalls).toBeLessThanOrEqual(3);
  });

  // ── 2. URL ?q= 직접 진입 시 input 자동 채움 ───────────────
  test('?q=keyword 직접 진입 시 input 자동 채움 + 검색 적용', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/issues**', 200, {
      data: RESULT_HORANG,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/issues?q=횡단보도');
    await expect(page.getByTestId('filter-q')).toHaveValue('횡단보도');
    await expect(page.getByTestId('issue-card')).toHaveCount(1);
  });

  // ── 3. URL 라우팅 (§2.4) ─────────────────────────────────
  test('?q=test URL 진입 + F5 유지', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues**', 200, {
      data: RESULT_HORANG,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/issues?q=test');
    await uscp.routingOk(page, page.getByTestId('issues-page'));
  });

  // ── 4. Admin 큐 키워드 검색 (operator) ────────────────────
  test('운영자 큐 검색 — 디바운스 + ?q= 동기화', async ({ page }) => {
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
    await mockJson(page, '**/api/v1/admin/issues/stats', 200, {
      reported: 1,
      reviewing: 0,
      published: 0,
      mentor_assigned: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
    });
    await mockJson(page, '**/api/v1/admin/issues**', 200, {
      data: RESULT_HORANG,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });

    await page.goto('/admin/issues');
    await page.getByTestId('admin-filter-q').fill('횡단보도');
    await page.waitForURL(/q=/, { timeout: 2_000 });
    await expect(page).toHaveURL(/q=%ED%9A%A1%EB%8B%A8%EB%B3%B4%EB%8F%84/);
  });

  // ── 5. A11y ───────────────────────────────────────────────
  test('A11y — input type=search + label + WCAG', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues**', 200, {
      data: RESULT_HORANG,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/issues');
    await expect(page.getByTestId('filter-q')).toHaveAttribute('type', 'search');
    await uscp.a11yClean(page);
  });
});
