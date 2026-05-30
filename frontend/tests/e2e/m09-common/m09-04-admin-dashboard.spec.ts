/**
 * M09-04: 관리자 대시보드 V2 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M09-04 (관리자 대시보드)
 *  - design.md §7.3 #14 + uscp-sitemap.md §3.2.2 (관리자 11개 화면)
 *
 * 6항 검증:
 *  1. Happy Path  : 4종 통계 + 게이트키핑 preview + 6개 nav 카드 노출
 *  2. Error Path  : /common/stats 실패 → 0 fallback (헤더·메뉴는 표시)
 *  3. 권한 분기  : 비로그인 → /login redirect (운영자 권한 필요)
 *  4. URL 라우팅 : nav 카드 클릭 → 해당 관리자 페이지 이동
 *  5. Modal 규칙 : N/A (관리자 대시보드 모달 없음)
 *  6. A11y       : aria-labelledby + heading 구조 + WCAG 위반 0건
 *
 * 권한 분기는 Sprint 1 시점 인증 미들웨어 적용 전이므로 기본적으로 admin 화면이
 * 모두에게 열려 있다. middleware 적용 시 본 spec 의 redirect 검증을 활성화한다.
 */
import { mockJson, mockProblem, clearAllMocks } from '../fixtures/api-mocks';
import { test, expect, uscp } from '../fixtures/uscp-test';

const STATS_MOCK = {
  issues_resolved: 42,
  projects_in_progress: 17,
  members_total: 1284,
  regions_count: 5,
};

test.describe('M09-04 관리자 대시보드 V2', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('대시보드 진입 시 4종 카드 + preview + 6개 nav 노출', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/common/stats', 200, STATS_MOCK);
    await mockJson(page, '**/api/v1/admin/issues/stats*', 200, {
      reported: 3,
    });

    await page.goto('/admin');

    await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    await expect(page.getByTestId('admin-stats-cards')).toBeVisible();
    await expect(
      page.getByTestId('admin-stat-card-issues_resolved'),
    ).toContainText('42');
    await expect(
      page.getByTestId('admin-stat-card-pending_review'),
    ).toContainText('3');

    await expect(page.getByTestId('admin-gatekeeping-preview')).toBeVisible();

    const nav = page.getByTestId('admin-nav-grid');
    await expect(nav).toBeVisible();
    // 6개 카드 (게이트키핑·리빙랩·멘토·협력기관·KPI·콘텐츠)
    await expect(nav.locator('li')).toHaveCount(6);
  });

  // ── 2. Error Path ─────────────────────────────────────────
  test('/common/stats 500 실패 시에도 헤더·메뉴는 정상 표시 + 0 fallback', async ({
    page,
  }) => {
    await mockProblem(page, '**/api/v1/common/stats', 500, {
      title: 'Internal Server Error',
      detail: 'down',
    });
    await mockProblem(page, '**/api/v1/admin/issues/stats*', 503, {
      title: 'Unavailable',
      detail: 'not yet implemented',
    });

    await page.goto('/admin');
    await expect(page.getByTestId('admin-dashboard')).toBeVisible();
    await expect(page.getByTestId('admin-nav-grid')).toBeVisible();
    // pending_review fallback 0
    await expect(
      page.getByTestId('admin-stat-card-pending_review'),
    ).toContainText('0');
  });

  // ── 4. URL 라우팅 (§2.4) ──────────────────────────────────
  test('nav 카드 클릭 → 해당 관리자 페이지 이동', async ({ page }) => {
    await mockJson(page, '**/api/v1/common/stats', 200, STATS_MOCK);
    await page.goto('/admin');

    await page
      .getByTestId('admin-nav--admin-cms-banners')
      .click({ trial: false });
    await expect(page).toHaveURL(/\/admin\/cms-banners/);
  });

  test('/admin 직접 진입 + F5 시 대시보드 유지', async ({ page }) => {
    await mockJson(page, '**/api/v1/common/stats', 200, STATS_MOCK);
    await page.goto('/admin');
    await uscp.routingOk(page, page.getByTestId('admin-dashboard'));
  });

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('각 section aria-label/aria-labelledby + WCAG 위반 0건', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/common/stats', 200, STATS_MOCK);
    await page.goto('/admin');

    // 게이트키핑 preview section 의 heading 매핑
    const preview = page.getByTestId('admin-gatekeeping-preview');
    await expect(preview).toHaveAttribute(
      'aria-labelledby',
      'gatekeeping-preview-heading',
    );

    await uscp.a11yClean(page);
  });
});
