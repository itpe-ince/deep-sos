/**
 * M01-01/02/03/13 — 통합 회원가입 흐름 Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M01-01 (이메일 회원가입)
 *  - feature-spec §M01-02 (만 14세 이상 확인)
 *  - feature-spec §M01-03 (개인정보·이용약관 통합 동의)
 *  - feature-spec §M01-13 (비밀번호 보안 정책)
 *  - design.md §7.2.1 (Toast 사용 강제, alert 금지)
 *  - design.md §10.3.3 6항
 *
 * 6항 검증:
 *  1. Happy Path   : 정상 입력 → 회원가입 성공 → Toast + 로그인 탭 전환
 *  2. Error Path A : 14세 미만 birth_year → submit 비활성 + 에러 hint
 *  3. Error Path B : 비밀번호 복잡도 위반 → submit 비활성 + 에러 hint
 *  4. Error Path C : 통합 동의 누락 → submit 비활성
 *  5. Error Path D : 이메일 중복 (409) → Toast 안내, alert 미사용
 *  6. URL 라우팅   : /login?tab=signup 직접 진입 + ?next= 보존
 *  7. A11y         : aria-invalid, aria-selected, WCAG 위반 0건
 */
import { clearAllMocks, mockProblem } from '../fixtures/api-mocks';
import { test, expect, uscp } from '../fixtures/uscp-test';

const CURRENT_YEAR = new Date().getFullYear();
const VALID_BIRTH_YEAR = CURRENT_YEAR - 30; // 만 30세

const GOOD_PW = 'Test1234!@';

test.describe('M01-01/02/03/13 회원가입 통합 흐름', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 0. URL 분기 — /login?tab=signup 직접 진입 ────────────
  test('/login?tab=signup 직접 진입 시 회원가입 폼 노출', async ({ page }) => {
    await page.goto('/login?tab=signup');
    await expect(page.getByTestId('signup-page')).toBeVisible();
    await expect(page.getByTestId('signup-form')).toBeVisible();

    const signupTab = page.getByTestId('auth-tab-signup');
    await expect(signupTab).toHaveAttribute('aria-selected', 'true');
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('정상 입력 → 회원가입 성공 → Toast + 로그인 탭 전환', async ({
    page,
  }) => {
    let signupCalled = false;
    let receivedBody: Record<string, unknown> | null = null;

    await page.route('**/api/v1/auth/signup', async (route) => {
      signupCalled = true;
      receivedBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          user_id: '11111111-1111-1111-1111-111111111111',
          email: receivedBody.email,
          name: receivedBody.name,
          email_verification_sent: true,
          message: '회원가입이 완료되었습니다.',
        }),
      });
    });

    await page.goto('/login?tab=signup');
    await page.getByTestId('signup-email').fill('newuser@uscp-e2e.local');
    await page.getByTestId('signup-password').fill(GOOD_PW);
    await page.getByTestId('signup-name').fill('김시민');
    await page.getByTestId('signup-birth-year').fill(String(VALID_BIRTH_YEAR));
    await page.getByTestId('signup-agree-all').check();

    await expect(page.getByTestId('signup-submit')).toBeEnabled();
    await page.getByTestId('signup-submit').click();

    // Toast 성공 안내 (3-5s)
    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/이메일 인증|회원가입/);

    // 백엔드 호출 검증
    expect(signupCalled).toBe(true);
    expect(receivedBody).toMatchObject({
      email: 'newuser@uscp-e2e.local',
      name: '김시민',
      birth_year: VALID_BIRTH_YEAR,
      agreements: { privacy: true, service: true },
    });

    // 로그인 탭으로 자동 전환
    await expect(page.getByTestId('auth-tab-login')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  // ── 2. Error Path A — 14세 미만 (M01-02) ──────────────────
  test('14세 미만 birth_year → submit 비활성 + 에러 hint', async ({ page }) => {
    await page.goto('/login?tab=signup');

    await page.getByTestId('signup-email').fill('teen@uscp-e2e.local');
    await page.getByTestId('signup-password').fill(GOOD_PW);
    await page.getByTestId('signup-name').fill('박학생');
    // 만 10세 (너무 어린 출생연도)
    await page.getByTestId('signup-birth-year').fill(String(CURRENT_YEAR - 10));
    await page.getByTestId('signup-agree-all').check();

    await expect(page.getByTestId('signup-submit')).toBeDisabled();

    const yearInput = page.getByTestId('signup-birth-year');
    await expect(yearInput).toHaveAttribute('aria-invalid', 'true');
  });

  // ── 3. Error Path B — 비밀번호 복잡도 (M01-13) ────────────
  test('비밀번호 복잡도 위반 → submit 비활성 + aria-invalid', async ({ page }) => {
    await page.goto('/login?tab=signup');
    await page.getByTestId('signup-email').fill('weak@uscp-e2e.local');
    await page.getByTestId('signup-password').fill('weakpw'); // 6자 + 특수 없음
    await page.getByTestId('signup-name').fill('홍길동');
    await page.getByTestId('signup-birth-year').fill(String(VALID_BIRTH_YEAR));
    await page.getByTestId('signup-agree-all').check();

    await expect(page.getByTestId('signup-submit')).toBeDisabled();
    await expect(page.getByTestId('signup-password')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  // ── 4. Error Path C — 통합 동의 누락 (M01-03) ─────────────
  test('통합 동의 누락 → submit 비활성', async ({ page }) => {
    await page.goto('/login?tab=signup');
    await page.getByTestId('signup-email').fill('noagree@uscp-e2e.local');
    await page.getByTestId('signup-password').fill(GOOD_PW);
    await page.getByTestId('signup-name').fill('박멘토');
    await page.getByTestId('signup-birth-year').fill(String(VALID_BIRTH_YEAR));
    // 동의 체크박스 1개만 (privacy 만)
    await page.getByTestId('signup-agree-privacy').check();

    await expect(page.getByTestId('signup-submit')).toBeDisabled();

    // service 도 체크 + age 도 체크 → 활성화 확인
    await page.getByTestId('signup-agree-service').check();
    await page.getByTestId('signup-agree-age').check();
    await expect(page.getByTestId('signup-submit')).toBeEnabled();
  });

  // ── 5. Error Path D — 이메일 중복 (409) → Toast (alert 금지) ─
  test('이메일 중복 409 → Toast 에러 + window.alert 미호출', async ({
    page,
  }) => {
    let alertCalled = 0;
    page.on('dialog', async (d) => {
      alertCalled += 1;
      await d.dismiss();
    });

    await mockProblem(page, '**/api/v1/auth/signup', 409, {
      type: 'urn:uscp:problem:email_already_registered',
      title: 'Conflict',
      detail: {
        code: 'email_already_registered',
        message: '이미 등록된 이메일입니다.',
      } as unknown as string,
    });

    await page.goto('/login?tab=signup');
    await page.getByTestId('signup-email').fill('dup@uscp-e2e.local');
    await page.getByTestId('signup-password').fill(GOOD_PW);
    await page.getByTestId('signup-name').fill('이중복');
    await page.getByTestId('signup-birth-year').fill(String(VALID_BIRTH_YEAR));
    await page.getByTestId('signup-agree-all').check();
    await page.getByTestId('signup-submit').click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/이미 등록|로그인/);

    // §7.2.1 — alert/confirm 미호출
    expect(alertCalled).toBe(0);
  });

  // ── 6. URL 라우팅 (§2.4) — ?next= 보존 ────────────────────
  test('/login?tab=signup&next=/user/profile → URL 라우팅 4-체크', async ({
    page,
  }) => {
    await page.goto('/login?tab=signup&next=/user/profile');
    await uscp.routingOk(page, page.getByTestId('signup-form'));

    // F5 후에도 signup 탭 유지
    await expect(page.getByTestId('auth-tab-signup')).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  test('탭 전환 시 URL ?tab= 동기화', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    await page.getByTestId('auth-tab-signup').click();
    await expect(page).toHaveURL(/[?&]tab=signup/);
    await page.getByTestId('auth-tab-login').click();
    await expect(page).not.toHaveURL(/[?&]tab=/);
  });

  // ── 7. A11y (M08-10) ──────────────────────────────────────
  test('회원가입 폼 ARIA + WCAG 위반 0건', async ({ page }) => {
    await page.goto('/login?tab=signup');

    // 탭 ARIA
    await expect(page.getByTestId('auth-tab-signup')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.getByTestId('auth-tab-login')).toHaveAttribute(
      'aria-selected',
      'false',
    );

    // fieldset 의 legend 존재
    const agreements = page.getByTestId('signup-agreements');
    await expect(agreements.locator('legend')).toBeVisible();

    await uscp.a11yClean(page);
  });
});
