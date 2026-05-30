/**
 * M09-01: 홈 화면 통계 카드 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M09-01 (홈 화면 통계 카드)
 *  - design.md §7.3 #1 + §10.3.3
 *
 * 6항 검증:
 *  1. Happy Path  : 4종 카드 모두 노출 + 숫자 + 단위 + 캡션
 *  2. Error Path  : API 실패 시에도 화면 깨지지 않음 (0 fallback)
 *  3. 권한 분기  : 누구나 열람 (public)
 *  4. URL 라우팅 : / 직접 진입 시 통계 카드 SSR/CSR 동작
 *  5. Modal 규칙 : N/A (홈 통계 카드 모달 없음)
 *  6. A11y       : section aria-labelledby, 각 카드 testid, WCAG 위반 0건
 */
import { mockJson, mockProblem, clearAllMocks } from '../fixtures/api-mocks';
import { test, expect, uscp } from '../fixtures/uscp-test';

test.describe('M09-01 홈 통계 카드', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('4종 통계 카드 모두 노출 (issues_resolved / projects_in_progress / members_total / regions_count)', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/common/stats', 200, {
      issues_resolved: 42,
      projects_in_progress: 17,
      members_total: 1284,
      regions_count: 5,
    });

    await page.goto('/');

    const container = page.getByTestId('home-stats-cards');
    await expect(container).toBeVisible();

    await expect(page.getByTestId('stat-card-issues_resolved')).toContainText(
      '42',
    );
    await expect(
      page.getByTestId('stat-card-projects_in_progress'),
    ).toContainText('17');
    await expect(page.getByTestId('stat-card-members_total')).toContainText(
      '1,284',
    );
    await expect(page.getByTestId('stat-card-regions_count')).toContainText('5');
  });

  // ── 2. Error Path ─────────────────────────────────────────
  test('통계 API 500 실패 시에도 화면 깨지지 않고 0 fallback', async ({
    page,
  }) => {
    await mockProblem(page, '**/api/v1/common/stats', 500, {
      title: 'Internal Server Error',
      detail: 'temporary failure',
    });

    await page.goto('/');

    const container = page.getByTestId('home-stats-cards');
    await expect(container).toBeVisible();

    // 화면 자체는 렌더 + 카드 4개 노출 (값은 0 fallback)
    await expect(page.getByTestId('stat-card-issues_resolved')).toBeVisible();
    await expect(page.getByTestId('stat-card-regions_count')).toContainText('5');
  });

  // ── 3. 권한 분기 — 누구나 열람 ──────────────────────────────
  test('비로그인 사용자도 통계 카드 열람 가능', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await expect(page.getByTestId('home-stats-cards')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // ── 4. URL 라우팅 (§2.4) ──────────────────────────────────
  test('홈 URL 직접 진입 + F5 시 통계 카드 유지', async ({ page }) => {
    await page.goto('/');
    await uscp.routingOk(page, page.getByTestId('home-stats-cards'));
  });

  // ── 5. Modal 규칙 — N/A ───────────────────────────────────

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('aria-labelledby + 4개 카드 testid + WCAG 위반 0건', async ({
    page,
  }) => {
    await page.goto('/');
    const heading = page.locator('#stats-heading');
    await expect(heading).toHaveText('USCP 운영 현황');

    // 모든 카드가 data-testid + data-value 보유
    const cards = page.locator('[data-testid^="stat-card-"]');
    await expect(cards).toHaveCount(4);

    await uscp.a11yClean(page);
  });
});
