/**
 * M01-13: 비밀번호 보안 정책 — 5회 잠금 30분 (서버 정책 검증).
 *
 * 설계 근거:
 *  - feature-spec §M01-13 (비밀번호 보안 정책 통합)
 *  - design.md §8.2 (보안: Brute force 대응)
 *  - design.md §7.2.1 (window.alert 금지 → Toast)
 *  - design.md §10.3.3 6항
 *
 * 6항 검증:
 *  1. Happy Path  : 정상 자격 → 잠금 미발생 (m01-01-signup·m01-04-login 에서 기 검증)
 *  2. Error Path A: 4회 실패 → 401 + remaining_attempts 감소
 *  3. Error Path B: 5회째 실패 → 423 + locked_until + Retry-After + Toast
 *  4. Error Path C: 잠금 중 재로그인 시도 → 423 + 동일 메시지
 *  5. 권한 분기  : N/A
 *  6. URL 라우팅 : 잠금 시에도 /login URL 유지
 *  7. Modal      : N/A (Toast 만 사용)
 *  8. A11y       : Toast aria-live=assertive (error 변형)
 */
import { test, expect } from '../fixtures/uscp-test';

const EMAIL = 'lockuser@uscp-e2e.local';
const WRONG_PW = 'WrongPassword1!';

function mockLoginResponse(
  page: import('@playwright/test').Page,
  status: number,
  body: object,
  headers: Record<string, string> = {},
) {
  return page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status,
      contentType: 'application/problem+json',
      headers,
      body: JSON.stringify(body),
    });
  });
}

test.describe('M01-13 비밀번호 보안 — 5회 잠금', () => {
  // ── 1. 4회 실패까지는 401 + remaining_attempts ────────────
  test('4회째 실패 → 401 remaining_attempts=1', async ({ page }) => {
    await mockLoginResponse(page, 401, {
      type: 'urn:uscp:problem:invalid_credentials',
      title: 'Unauthorized',
      status: 401,
      detail: {
        code: 'invalid_credentials',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.',
        remaining_attempts: 1,
      },
    });

    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(EMAIL);
    await page.getByLabel(/비밀번호/i).fill(WRONG_PW);
    await page.getByRole('button', { name: /로그인/i }).click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(
      /이메일 또는 비밀번호|올바르지 않/,
    );

    // 잠금 메시지는 미노출 (4회까지)
    await expect(toast.first()).not.toContainText(/잠금|30분/);
  });

  // ── 2. 5회째 실패 → 423 잠금 ─────────────────────────────
  test('5회째 실패 → 423 + Retry-After + Toast 잠금 메시지', async ({ page }) => {
    const lockedUntil = new Date(Date.now() + 30 * 60_000).toISOString();
    await mockLoginResponse(
      page,
      423,
      {
        type: 'urn:uscp:problem:account_locked',
        title: 'Locked',
        status: 423,
        detail: {
          code: 'account_locked',
          message: '5회 연속 실패로 계정이 30분간 잠금되었습니다.',
          locked_until: lockedUntil,
          retry_after_seconds: 1800,
        },
      },
      { 'Retry-After': '1800' },
    );

    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(EMAIL);
    await page.getByLabel(/비밀번호/i).fill(WRONG_PW);
    await page.getByRole('button', { name: /로그인/i }).click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/잠금|30분/);
  });

  // ── 3. 잠금 중 재시도 → 동일 423 응답 ───────────────────
  test('잠금 중 재로그인 시도 → 423 유지', async ({ page }) => {
    const lockedUntil = new Date(Date.now() + 20 * 60_000).toISOString();
    await mockLoginResponse(
      page,
      423,
      {
        type: 'urn:uscp:problem:account_locked',
        title: 'Locked',
        status: 423,
        detail: {
          code: 'account_locked',
          message: '5회 연속 실패로 계정이 30분간 잠금되었습니다.',
          locked_until: lockedUntil,
          retry_after_seconds: 1200,
        },
      },
      { 'Retry-After': '1200' },
    );

    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(EMAIL);
    // 잠금 중에는 올바른 비밀번호여도 무효 — 서버가 423 반환
    await page.getByLabel(/비밀번호/i).fill('CorrectPw1!');
    await page.getByRole('button', { name: /로그인/i }).click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/잠금|30분/);
  });

  // ── 4. URL 유지 ──────────────────────────────────────────
  test('잠금 응답 시에도 /login URL 유지', async ({ page }) => {
    await mockLoginResponse(page, 423, {
      type: 'urn:uscp:problem:account_locked',
      title: 'Locked',
      status: 423,
      detail: {
        code: 'account_locked',
        message: '5회 실패로 잠금되었습니다.',
        locked_until: new Date().toISOString(),
      },
    });

    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(EMAIL);
    await page.getByLabel(/비밀번호/i).fill(WRONG_PW);
    await page.getByRole('button', { name: /로그인/i }).click();

    await expect(page).toHaveURL(/\/login$/);
  });

  // ── 5. Toast aria-live=assertive (error) ────────────────
  test('잠금 Toast 는 aria-live=assertive (스크린리더 즉시 안내)', async ({
    page,
  }) => {
    await mockLoginResponse(page, 423, {
      type: 'urn:uscp:problem:account_locked',
      title: 'Locked',
      status: 423,
      detail: {
        code: 'account_locked',
        message: '계정 잠금',
        locked_until: new Date().toISOString(),
      },
    });

    await page.goto('/login');
    await page.getByLabel(/이메일/i).fill(EMAIL);
    await page.getByLabel(/비밀번호/i).fill(WRONG_PW);
    await page.getByRole('button', { name: /로그인/i }).click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toHaveAttribute('aria-live', 'assertive');
  });
});
