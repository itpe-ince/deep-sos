/**
 * M01-08/09/10 — 프로필 V2 (조회·수정 + 알림 토글 + 회원 탈퇴) Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M01-08 (프로필 조회·수정)
 *  - feature-spec §M01-09 (이메일 알림 수신 설정)
 *  - feature-spec §M01-10 (회원 탈퇴)
 *  - design.md §7.2.1 (탈퇴 = ConfirmModal danger + 비밀번호 재확인)
 *  - design.md §10.3.3 6항
 *
 * 6항 검증:
 *  1. Happy Path  : 프로필 표시 + 이름 변경 → Toast
 *  2. Error Path  : PATCH 실패 (401/500) → Toast
 *  3. 권한 분기  : 비로그인 → /login?next=/user/profile redirect
 *  4. URL 라우팅 : /user/profile 직접 진입 + F5 유지
 *  5. Modal 규칙 : 탈퇴 ConfirmModal — backdrop 비반응 + 닫기 버튼 + variant=danger
 *  6. A11y       : aria-describedby + ConfirmModal aria + WCAG 위반 0건
 */
import { clearAllMocks, mockJson, mockProblem } from '../fixtures/api-mocks';
import { testCitizen } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

async function fakeLogin(page: import('@playwright/test').Page) {
  // 인증 미들웨어 검증을 우회하기 위해 localStorage 토큰 + /users/me mock 만으로 충분
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'fake-test-token');
    localStorage.setItem('refresh_token', 'fake-refresh-token');
  });
  await mockJson(page, '**/api/v1/users/me', 200, {
    id: '11111111-1111-1111-1111-111111111111',
    email: testCitizen.email,
    name: testCitizen.name,
    phone: null,
    role: 'citizen',
    is_active: true,
    email_verified: true,
  });
}

test.describe('M01-08/09/10 프로필 V2', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 3. 권한 분기 — 비로그인 redirect ──────────────────────
  test('비로그인 진입 → /login?next=/user/profile redirect', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.goto('/user/profile');
      await expect(page).toHaveURL(/\/login.*next=%2Fuser%2Fprofile|\/login.*next=\/user\/profile/);
    } finally {
      await ctx.close();
    }
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('로그인 후 프로필 표시 + 이름 변경 → Toast', async ({ page }) => {
    await fakeLogin(page);
    let patchedBody: Record<string, unknown> | null = null;
    await page.route('**/api/v1/users/me', async (route) => {
      const req = route.request();
      if (req.method() === 'PATCH') {
        patchedBody = req.postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ ...patchedBody, id: 'x', email: testCitizen.email, role: 'citizen' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '11111111',
            email: testCitizen.email,
            name: testCitizen.name,
            phone: null,
            role: 'citizen',
            is_active: true,
            email_verified: true,
          }),
        });
      }
    });

    await page.goto('/user/profile');

    await expect(page.getByTestId('profile-page')).toBeVisible();
    await expect(page.getByTestId('profile-email')).toHaveValue(testCitizen.email);
    await expect(page.getByTestId('profile-email')).toBeDisabled();

    const nameInput = page.getByTestId('profile-name');
    await nameInput.fill('새이름');
    await page.getByTestId('profile-save').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    expect(patchedBody).toMatchObject({ name: '새이름' });
  });

  // ── 2. Error Path — PATCH 500 ─────────────────────────────
  test('PATCH 500 실패 시 Toast 에러 + 폼 유지', async ({ page }) => {
    await fakeLogin(page);
    await mockProblem(page, '**/api/v1/users/me', 500, {
      title: 'Internal Server Error',
      detail: 'down',
    });

    // GET /users/me 응답은 위 fakeLogin 의 mockJson 에서 처리되지만,
    // mockProblem 이 동일 URL 을 캐치하므로 GET 도 500. → Loading 상태가 유지됨.
    // 대신 PATCH 만 실패하도록 분기.
    await clearAllMocks(page);
    await fakeLogin(page);
    await page.route('**/api/v1/users/me', async (route) => {
      const req = route.request();
      if (req.method() === 'PATCH') {
        await route.fulfill({
          status: 500,
          contentType: 'application/problem+json',
          body: JSON.stringify({ title: 'Error', detail: 'down' }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '11111111',
            email: testCitizen.email,
            name: testCitizen.name,
            phone: null,
            role: 'citizen',
            is_active: true,
            email_verified: true,
          }),
        });
      }
    });

    await page.goto('/user/profile');
    await page.getByTestId('profile-name').fill('실패테스트');
    await page.getByTestId('profile-save').click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    // 폼은 유지
    await expect(page.getByTestId('profile-form')).toBeVisible();
  });

  // ── 4. URL 라우팅 ────────────────────────────────────────
  test('/user/profile 직접 진입 + F5 유지', async ({ page }) => {
    await fakeLogin(page);
    await page.goto('/user/profile');
    await uscp.routingOk(page, page.getByTestId('profile-page'));
  });

  // ── 5. Modal 규칙 — 탈퇴 ConfirmModal ────────────────────
  test('탈퇴 모달 — backdrop 비반응 + variant=danger + 닫기 동작', async ({
    page,
  }) => {
    await fakeLogin(page);
    await page.goto('/user/profile');

    await page.getByTestId('withdraw-open').click();

    const modal = page.getByRole('dialog', { name: '회원 탈퇴 확인' });
    await expect(modal).toBeVisible();

    // §7.2.1 컴플라이언스
    await uscp.modalCompliant(modal);

    // 비밀번호 미입력 상태로 탈퇴 시도 → Toast 에러
    await modal.getByTestId('confirm-modal-confirm').click();
    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });

    // 닫기 버튼 동작
    await modal.getByTestId('modal-close').click();
    await expect(modal).not.toBeVisible();
  });

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('알림 토글 aria-describedby + WCAG 위반 0건', async ({ page }) => {
    await fakeLogin(page);
    await page.goto('/user/profile');

    const checkbox = page.getByTestId('notification-checkbox');
    await expect(checkbox).toHaveAttribute(
      'aria-describedby',
      'notification-help',
    );

    await uscp.a11yClean(page);
  });

  // ── M01-10 알림 토글 동작 ────────────────────────────────
  test('알림 토글 OFF → ON 상태 변경 + 저장 시 localStorage 반영', async ({
    page,
  }) => {
    await fakeLogin(page);
    await page.route('**/api/v1/users/me', async (route) => {
      const req = route.request();
      if (req.method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'x', email: testCitizen.email, role: 'citizen', name: testCitizen.name, phone: null }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '11111111',
            email: testCitizen.email,
            name: testCitizen.name,
            phone: null,
            role: 'citizen',
            is_active: true,
            email_verified: true,
          }),
        });
      }
    });

    await page.goto('/user/profile');
    const cb = page.getByTestId('notification-checkbox');
    await expect(cb).toBeChecked();
    await cb.uncheck();
    await page.getByTestId('profile-save').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({ timeout: 5_000 });

    const stored = await page.evaluate(() =>
      localStorage.getItem('uscp.notification_email_enabled'),
    );
    expect(stored).toBe('false');
  });
});
