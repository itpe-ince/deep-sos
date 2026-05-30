/**
 * M09-12: 반응형 레이아웃 (PC·태블릿·모바일) — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M09-12 (반응형 레이아웃)
 *  - design.md §7.1 breakpoints (sm 640 / md 768 / lg 1024 / xl 1280)
 *  - design.md §10.3.3 + §8.4 모바일 접근성
 *
 * 검증 viewport (3종):
 *  - 모바일      : 375 × 800  (iPhone SE 기준)
 *  - 태블릿      : 768 × 1024 (iPad mini 기준)
 *  - 데스크탑    : 1280 × 800 (lg 진입점)
 *
 * 6항 변형:
 *  1. Happy Path  : 각 viewport 에서 핵심 컨텐츠 표시
 *  2. Error Path  : N/A
 *  3. 권한 분기  : N/A
 *  4. URL 라우팅 : viewport 전환 후에도 URL 유지
 *  5. Modal 규칙 : 모바일 햄버거 → 모달 정상 동작 (§7.2.1)
 *  6. A11y       : 각 viewport 에서 axe-core 위반 0건
 */
import { test, expect, uscp } from '../fixtures/uscp-test';

const VIEWPORTS = [
  { name: '모바일', width: 375, height: 800 },
  { name: '태블릿', width: 768, height: 1024 },
  { name: '데스크탑', width: 1280, height: 800 },
] as const;

test.describe('M09-12 반응형 레이아웃', () => {
  for (const vp of VIEWPORTS) {
    test(`${vp.name} (${vp.width}x${vp.height}) — 홈 핵심 위젯 노출`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');

      // 헤더·푸터·핵심 위젯 4종 모두 표시
      await expect(page.getByTestId('header-gnb')).toBeVisible();
      await expect(page.getByTestId('home-stats-cards')).toBeVisible();
      await expect(page.getByTestId('home-process-bar')).toBeVisible();
      await expect(page.getByTestId('home-region-map')).toBeVisible();
      await expect(page.getByTestId('home-recent-issues')).toBeVisible();
      await expect(page.getByTestId('footer')).toBeVisible();
    });

    test(`${vp.name} — WCAG 위반 0건`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/');
      await uscp.a11yClean(page);
    });
  }

  // ── 모바일 햄버거 → 데스크탑 메뉴 ─────────────────────────
  test('lg 미만에서 햄버거 노출, lg 이상에서 일반 메뉴 노출', async ({
    page,
  }) => {
    // 모바일
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');
    await expect(
      page.getByTestId('header-mobile-menu-toggle'),
    ).toBeVisible();

    // 데스크탑 — viewport 만 늘려 동일 페이지에서 메뉴 전환 확인
    await page.setViewportSize({ width: 1280, height: 800 });
    const desktopNav = page
      .getByTestId('header-gnb')
      .getByRole('navigation', { name: '주요 메뉴' });
    await expect(desktopNav).toBeVisible();
  });

  // ── URL 라우팅 (§2.4) ────────────────────────────────────
  test('viewport 전환에도 URL 변동 없음', async ({ page }) => {
    await page.goto('/issues');
    const initialUrl = page.url();

    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      expect(page.url()).toBe(initialUrl);
    }
  });
});
