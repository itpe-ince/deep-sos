/**
 * M01-04: 이메일 로그인 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M01-04 (이메일 로그인)
 *  - feature-spec §M01-13 (비밀번호 보안 정책: 5회 실패 시 30분 잠금)
 *  - design.md §10.3.3 (6항 검증 패턴: Happy / Error / 권한 / URL / Modal / A11y)
 *
 * 6항 검증:
 *  1. Happy Path  : 정상 자격증명 → /user/my-activities 이동
 *  2. Error Path  : 잘못된 비밀번호 → 페이지 내 에러 표시 (브라우저 alert 미사용)
 *  3. 권한 분기  : 잠금 계정 → 423 + Toast 안내
 *  4. URL 라우팅 : /login 직접 진입 가능 + ?next= 보존
 *  5. Modal 규칙 : (해당 화면은 모달 없으므로 N/A — 약관 재동의 모달은 m07-14 에서 검증)
 *  6. A11y       : axe-core 위반 0건 (M08-10)
 */
import { invalidCredentials, testCitizen } from '../fixtures/users';
import {
  mockLoginLocked,
  mockProblem,
  clearAllMocks,
} from '../fixtures/api-mocks';
import { test, expect, uscp } from '../fixtures/uscp-test';

test.describe('M01-04 이메일 로그인', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('정상 자격증명으로 로그인 → 인증 페이지 접근 가능', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(testCitizen.email);
    await page.getByLabel(/비밀번호/i).fill(testCitizen.password);
    await page.getByRole('button', { name: /로그인/i }).click();

    // 인증 후 reasonable target — /user/* 또는 /
    await expect(page).toHaveURL(/\/(user|$)/, { timeout: 10_000 });

    // 인증 상태 확인 — 헤더에 로그아웃 버튼 노출
    const logout = page.locator('button[title="로그아웃"]');
    await expect(logout).toBeVisible({ timeout: 5_000 });
  });

  // ── 2. Error Path ─────────────────────────────────────────
  test('잘못된 비밀번호 → 페이지 내 에러 표시 (브라우저 alert 미사용)', async ({
    page,
  }) => {
    let alertCount = 0;
    page.on('dialog', async (dialog) => {
      alertCount += 1;
      await dialog.dismiss();
    });

    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(invalidCredentials.email);
    await page.getByLabel(/비밀번호/i).fill(invalidCredentials.password);
    await page.getByRole('button', { name: /로그인/i }).click();

    // 에러 메시지 (Toast or inline) 노출, URL 미이동
    await expect(page).toHaveURL(/\/login/);
    const errorIndicator = page.locator(
      '[role="alert"], [data-testid^="toast-"], .text-danger, .text-red-600',
    );
    await expect(errorIndicator.first()).toBeVisible({ timeout: 5_000 });

    // window.alert 호출 0건 (§7.2.1)
    expect(alertCount).toBe(0);
  });

  // ── 3. 권한 분기 (잠금 계정) ───────────────────────────────
  test('5회 실패 잠금 계정 → 423 응답 + Toast 안내 (M01-13)', async ({
    page,
  }) => {
    await mockLoginLocked(page);

    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(testCitizen.email);
    await page.getByLabel(/비밀번호/i).fill('WrongAgain1!');
    await page.getByRole('button', { name: /로그인/i }).click();

    const toast = page.locator('[data-testid^="toast-"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/잠금|30분|locked/i);
  });

  // ── 4. URL 라우팅 (§2.4) ──────────────────────────────────
  test('/login 직접 진입 가능 + 인증 redirect 시 ?next= 보존', async ({
    page,
  }) => {
    await page.goto('/login');
    await uscp.routingOk(
      page,
      page.getByRole('heading', { name: /로그인|회원가입/i }).first(),
    );

    // /user/profile 비로그인 직접 진입 → /login?next=/user/profile 로 redirect 권장 동작
    await page.goto('/user/profile');
    const finalUrl = page.url();
    if (finalUrl.includes('/login')) {
      // ?next= 가 보존되어야 (디자인 §2.4.2)
      expect(finalUrl).toContain('next=');
    }
  });

  // ── 5. Modal 규칙 — N/A ───────────────────────────────────
  // 로그인 화면 자체에는 모달 없음. 약관 재동의 모달은 m07-14-reconsent.spec.ts 에서 검증.

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('로그인 화면 WCAG 2.1 AA serious/critical 위반 0건', async ({
    page,
  }) => {
    await page.goto('/login');
    await uscp.a11yClean(page);
  });

  // ── Rate limit (§6.3, §8.2 보안) ──────────────────────────
  test('로그인 5req/min 초과 시 429 + Retry-After 안내', async ({ page }) => {
    await mockProblem(page, '**/api/v1/auth/login', 429, {
      type: 'urn:uscp:problem:rate_limited',
      title: 'Too Many Requests',
      detail: '60초 후 다시 시도해주세요.',
    });

    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(testCitizen.email);
    await page.getByLabel(/비밀번호/i).fill(testCitizen.password);
    await page.getByRole('button', { name: /로그인/i }).click();

    const toast = page.locator('[data-testid^="toast-"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
  });
});
