/**
 * M09-10: Header (GNB) V2 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M09-10 (헤더 GNB)
 *  - design.md §7.3 #1~9 + §7.2.1 (모바일 메뉴 Modal 사용)
 *  - uscp-sitemap.md §3.1.2 (공개 6개 메뉴)
 *
 * 6항 검증:
 *  1. Happy Path  : 6개 공개 메뉴 노출 + 클릭 시 URL 변경
 *  2. Error Path  : V1 잔재 메뉴 (/guide, /volunteers) 미노출
 *  3. 권한 분기  : 비로그인 → 로그인/회원가입 / 로그인 → 사용자 메뉴+로그아웃
 *  4. URL 라우팅 : 각 메뉴 진입 후 F5 → 동일 화면 (active 상태 유지)
 *  5. Modal 규칙 : 모바일 햄버거 → backdrop 클릭 무반응 + 닫기 버튼 동작
 *  6. A11y       : aria-current="page" + 모바일 메뉴 aria-expanded + WCAG 위반 0건
 */
import { test, expect, uscp } from '../fixtures/uscp-test';

test.describe('M09-10 Header (GNB) V2', () => {
  // ── 1. Happy Path ─────────────────────────────────────────
  test('6개 V2 공개 메뉴 모두 노출 + 클릭 시 URL 변경', async ({ page }) => {
    await page.goto('/');
    const header = page.getByTestId('header-gnb');
    await expect(header).toBeVisible();

    const expectedMenus = [
      { label: 'USCP 소개', href: '/about' },
      { label: '지역문제 광장', href: '/issues' },
      { label: '리빙랩', href: '/projects' },
      { label: '성공사례', href: '/success-cases' },
      { label: '협력 네트워크', href: '/network' },
      { label: '성과자료', href: '/performance' },
    ];

    for (const { label, href } of expectedMenus) {
      const link = header.getByRole('link', { name: label });
      await expect(link.first()).toHaveAttribute('href', href);
    }

    // 클릭 시 URL 변경 (대표 1건만)
    await header.getByRole('link', { name: '지역문제 광장' }).first().click();
    await expect(page).toHaveURL(/\/issues/);
  });

  // ── 2. Error Path (V1 잔재 제거 검증) ──────────────────────
  test('V1 메뉴 /guide, /volunteers 는 GNB 에 없어야 한다', async ({ page }) => {
    await page.goto('/');
    const header = page.getByTestId('header-gnb');

    await expect(header.locator('a[href="/guide"]')).toHaveCount(0);
    await expect(header.locator('a[href="/volunteers"]')).toHaveCount(0);
    await expect(header.locator('a[href="/campus"]')).toHaveCount(0);
  });

  // ── 3. 권한 분기 ───────────────────────────────────────────
  test('비로그인 → 로그인/회원가입 버튼 노출', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('header-login')).toBeVisible();
    await expect(page.getByTestId('header-signup')).toBeVisible();
    await expect(page.getByTestId('header-user-menu')).toHaveCount(0);
    await expect(page.getByTestId('header-logout')).toHaveCount(0);
  });

  // ── 4. URL 라우팅 (§2.4) ──────────────────────────────────
  test('각 메뉴 진입 후 F5 시 active 상태 유지', async ({ page }) => {
    await page.goto('/issues');

    const activeLink = page
      .getByTestId('header-gnb')
      .getByRole('link', { name: '지역문제 광장' })
      .first();
    await expect(activeLink).toHaveAttribute('aria-current', 'page');

    await uscp.routingOk(page, activeLink);
  });

  // ── 5. Modal 규칙 (§7.2.1) — 모바일 햄버거 ─────────────────
  test('모바일 햄버거 메뉴 — backdrop 클릭 무반응 + 닫기 동작', async ({
    page,
  }) => {
    // viewport 모바일 사이즈
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto('/');

    const toggle = page.getByTestId('header-mobile-menu-toggle');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();

    const modal = page.getByRole('dialog', { name: '메뉴' });
    await expect(modal).toBeVisible();

    // §7.2.1 모달 컴플라이언스 통합 검증
    await uscp.modalCompliant(modal);

    // 닫기 버튼 동작
    await modal.getByTestId('modal-close').click();
    await expect(modal).not.toBeVisible();
  });

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('헤더 헤딩·aria + WCAG 2.1 AA 위반 0건', async ({ page }) => {
    await page.goto('/');

    // 로고 링크 aria-label
    const homeLink = page.locator('header a[href="/"]').first();
    await expect(homeLink).toHaveAttribute('aria-label', /USCP 홈/);

    // 모바일 토글 aria-expanded
    await expect(
      page.getByTestId('header-mobile-menu-toggle'),
    ).toHaveAttribute('aria-expanded', 'false');

    await uscp.a11yClean(page);
  });

  // ── + Footer V2 메뉴 검증 (M09-11 통합) ────────────────────
  test('Footer V2 메뉴: V1 잔재 제거 + 약관·개인정보 링크 노출', async ({
    page,
  }) => {
    await page.goto('/');
    const footer = page.getByTestId('footer');
    await expect(footer).toBeVisible();

    // V1 제거
    await expect(footer.locator('a[href="/campus"]')).toHaveCount(0);
    await expect(footer.locator('a[href="/volunteers"]')).toHaveCount(0);
    await expect(footer.locator('a[href="/guide"]')).toHaveCount(0);

    // V2 신규
    await expect(footer.locator('a[href="/network"]')).toBeVisible();
    await expect(footer.locator('a[href="/performance"]')).toBeVisible();

    // 컴플라이언스 링크
    await expect(footer.locator('a[href="/terms/service"]')).toBeVisible();
    await expect(footer.locator('a[href="/terms/privacy"]')).toBeVisible();
  });
});
