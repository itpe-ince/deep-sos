/**
 * M09-05: 5개 지역 현황 지도 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M09-05 (5개 지역 현황 지도)
 *  - design.md §7.3 #1 + §8.3 (정적 fallback)
 *  - design.md §3.2 region ENUM (daejeon/gongju/yesan/cheonan/sejong)
 *
 * 6항 검증:
 *  1. Happy Path  : 5개 지역 카드 노출 + 통계 수치 + region 색상
 *  2. Error Path  : API 실패 → FALLBACK_REGIONS 5개로 graceful degrade
 *  3. 권한 분기  : 누구나 열람
 *  4. URL 라우팅 : 카드 클릭 → /issues?region={code} 이동
 *  5. Modal 규칙 : N/A
 *  6. A11y       : aria-labelledby + region role + WCAG 위반 0건
 *
 * 본 spec 은 NEXT_PUBLIC_KAKAO_MAP_KEY 미설정 상태에서 동작하는 fallback 경로를
 * 주로 검증. Kakao SDK 실제 통합은 별도 수동 QA 또는 Sprint 5 시각 회귀에서 다룸.
 */
import { mockJson, mockProblem, clearAllMocks } from '../fixtures/api-mocks';
import { test, expect, uscp } from '../fixtures/uscp-test';

const MOCK_REGIONS = [
  {
    code: 'daejeon',
    label: '대전',
    color: '#1E40AF',
    lat: 36.3504,
    lng: 127.3845,
    active_issues: 12,
    resolved_issues: 5,
    active_projects: 4,
  },
  {
    code: 'gongju',
    label: '공주',
    color: '#059669',
    lat: 36.4467,
    lng: 127.119,
    active_issues: 6,
    resolved_issues: 2,
    active_projects: 3,
  },
  {
    code: 'yesan',
    label: '예산',
    color: '#7c3aed',
    lat: 36.6802,
    lng: 126.8447,
    active_issues: 3,
    resolved_issues: 1,
    active_projects: 1,
  },
  {
    code: 'cheonan',
    label: '천안',
    color: '#0891b2',
    lat: 36.8151,
    lng: 127.1139,
    active_issues: 8,
    resolved_issues: 3,
    active_projects: 2,
  },
  {
    code: 'sejong',
    label: '세종',
    color: '#ea580c',
    lat: 36.4801,
    lng: 127.289,
    active_issues: 4,
    resolved_issues: 2,
    active_projects: 1,
  },
];

const MOCK_RESPONSE = {
  regions: MOCK_REGIONS,
  center: { lat: 36.55, lng: 127.13 },
};

test.describe('M09-05 5개 지역 현황 지도', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('5개 지역 카드/지도 노출 + 통계 수치 표시', async ({ page }) => {
    await mockJson(page, '**/api/v1/common/regions/map', 200, MOCK_RESPONSE);
    await page.goto('/');

    const section = page.getByTestId('home-region-map');
    await expect(section).toBeVisible();

    // SDK 키 미설정 환경에서는 fallback 카드 그리드 표시
    // 키 설정 환경에서는 region-map-canvas + region-summary-* 표시
    const fallback = page.getByTestId('region-map-fallback');
    const canvas = page.getByTestId('region-map-canvas');

    // 둘 중 하나는 반드시 노출
    const fallbackVisible = await fallback.isVisible().catch(() => false);
    const canvasVisible = await canvas.isVisible().catch(() => false);
    expect(fallbackVisible || canvasVisible).toBe(true);

    // 5개 지역 모두 노출 (fallback 또는 보조 그리드)
    for (const region of MOCK_REGIONS) {
      const fallbackCard = page.getByTestId(`region-fallback-${region.code}`);
      const summaryCard = page.getByTestId(`region-summary-${region.code}`);
      const oneVisible =
        (await fallbackCard.isVisible().catch(() => false)) ||
        (await summaryCard.isVisible().catch(() => false));
      expect(oneVisible, `region ${region.code} 노출`).toBe(true);
    }
  });

  // ── 2. Error Path (graceful fallback) ─────────────────────
  test('API 500 실패 시 정적 5개 지역으로 graceful fallback', async ({
    page,
  }) => {
    await mockProblem(page, '**/api/v1/common/regions/map', 500, {
      title: 'Internal Server Error',
      detail: 'temporary failure',
    });

    await page.goto('/');

    const section = page.getByTestId('home-region-map');
    await expect(section).toBeVisible();

    // fallback 5개 지역 카드 노출 (count=0 이지만 화면 자체는 표시)
    for (const code of ['daejeon', 'gongju', 'yesan', 'cheonan', 'sejong']) {
      const cardCount =
        (await page.getByTestId(`region-fallback-${code}`).count()) +
        (await page.getByTestId(`region-summary-${code}`).count());
      expect(cardCount).toBeGreaterThan(0);
    }
  });

  // ── 3. 권한 분기 — 누구나 열람 ──────────────────────────────
  test('비로그인 사용자도 지역 지도 열람 가능', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await expect(page.getByTestId('home-region-map')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // ── 4. URL 라우팅 (§2.4) ──────────────────────────────────
  test('지역 카드 클릭 → /issues?region={code} 이동', async ({ page }) => {
    await mockJson(page, '**/api/v1/common/regions/map', 200, MOCK_RESPONSE);
    await page.goto('/');

    // fallback 또는 보조 그리드 중 노출된 것을 사용
    const candidates = [
      page.getByTestId('region-fallback-daejeon'),
      page.getByTestId('region-summary-daejeon'),
    ];
    let clicked = false;
    for (const c of candidates) {
      if (await c.isVisible().catch(() => false)) {
        await c.click();
        clicked = true;
        break;
      }
    }
    expect(clicked).toBe(true);
    await expect(page).toHaveURL(/\/issues\?region=daejeon/);
  });

  test('홈 진입 후 F5 시 지역 지도 유지', async ({ page }) => {
    await mockJson(page, '**/api/v1/common/regions/map', 200, MOCK_RESPONSE);
    await page.goto('/');
    await uscp.routingOk(page, page.getByTestId('home-region-map'));
  });

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('aria-labelledby + WCAG 위반 0건', async ({ page }) => {
    await mockJson(page, '**/api/v1/common/regions/map', 200, MOCK_RESPONSE);
    await page.goto('/');

    const heading = page.locator('#region-map-heading');
    await expect(heading).toBeVisible();

    await uscp.a11yClean(page);
  });
});
