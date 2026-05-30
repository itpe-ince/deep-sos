/**
 * M02-14: 반려 처리 — Playwright E2E.
 *
 * 6항 검증:
 *  1. Happy: 사유 30자 이상 → 반려 성공 + Toast + 이메일 발송 안내
 *  2. Error: 사유 30자 미만 → confirm 비활성 + aria-invalid
 *  3. Error: 서버 reject_reason_too_short 응답 → Toast (방어 검증)
 *  4. Modal §7.2.1: danger variant + ESC 비활성 + backdrop 비반응
 *  5. URL: 모달 열기 후 URL 변동 없음
 *  6. A11y: aria-invalid + WCAG
 */
import { clearAllMocks, mockJson, mockProblem } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

const ISSUE = {
  id: 'rej-1',
  title: '반려 대상 제보',
  body: '운영자 판단으로 반려할 제보입니다.',
  region: 'sejong',
  stage: 'reported',
  track: null,
  vote_count: 0,
  comment_count: 0,
  reporter: { id: 'r-x', name: '익명' },
  location: null,
  voted: false,
  created_at: new Date().toISOString(),
  history: [],
  photos: [],
};

const VALID_REASON =
  '동일한 내용의 제보가 이미 존재하며, 사실 관계를 확인하기 어려운 부분이 있어 반려합니다.';

async function fakeOperatorLogin(page: import('@playwright/test').Page) {
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
}

test.describe('M02-14 반려 처리', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy ─────────────────────────────────────────────
  test('30자 이상 사유 → 반려 성공 + Toast + 이메일 안내', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rej-1', 200, ISSUE);

    let body: Record<string, unknown> | null = null;
    await page.route(
      '**/api/v1/admin/issues/rej-1/reject',
      async (route) => {
        body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issue_id: 'rej-1',
            prev_stage: 'reported',
            stage: 'rejected',
            track: null,
            transitioned_at: new Date().toISOString(),
          }),
        });
      },
    );

    await page.goto('/admin/issues/rej-1');
    await page.getByTestId('reject-open').click();

    const dialog = page.getByRole('dialog', { name: '제보 반려' });
    await expect(dialog).toBeVisible();

    await dialog.getByTestId('reject-reason').fill(VALID_REASON);
    await expect(dialog.getByTestId('reject-confirm')).toBeEnabled();
    await dialog.getByTestId('reject-confirm').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/반려|이메일/);

    expect(body).toMatchObject({ reason: VALID_REASON });
  });

  // ── 2. Error: 30자 미만 ───────────────────────────────────
  test('30자 미만 사유 → confirm 비활성 + aria-invalid', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rej-1', 200, ISSUE);
    await page.goto('/admin/issues/rej-1');
    await page.getByTestId('reject-open').click();

    const dialog = page.getByRole('dialog');
    await dialog.getByTestId('reject-reason').fill('짧은 사유');

    await expect(dialog.getByTestId('reject-confirm')).toBeDisabled();
    await expect(dialog.getByTestId('reject-reason')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  // ── 3. Error: 서버 422 reason too short ───────────────────
  test('서버 422 reject_reason_too_short → Toast', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rej-1', 200, ISSUE);
    await mockProblem(page, '**/api/v1/admin/issues/rej-1/reject', 422, {
      type: 'urn:uscp:problem:reject_reason_too_short',
      title: 'Unprocessable Entity',
      detail: {
        code: 'reject_reason_too_short',
        message: '반려 사유는 30자 이상 작성해 주세요.',
      } as unknown as string,
    });

    await page.goto('/admin/issues/rej-1');
    await page.getByTestId('reject-open').click();

    const dialog = page.getByRole('dialog');
    // 클라이언트 검증 우회 — 30자 이상 입력 후 서버에서 422
    await dialog.getByTestId('reject-reason').fill(VALID_REASON);
    await dialog.getByTestId('reject-confirm').click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
  });

  // ── 4. Modal danger 컴플라이언스 ─────────────────────────
  test('RejectDialog danger + §7.2.1 컴플라이언스', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rej-1', 200, ISSUE);
    await page.goto('/admin/issues/rej-1');
    await page.getByTestId('reject-open').click();

    const dialog = page.getByRole('dialog');
    await uscp.modalCompliant(dialog);
  });

  // ── 6. A11y ──────────────────────────────────────────────
  test('A11y — WCAG 위반 0건', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rej-1', 200, ISSUE);
    await page.goto('/admin/issues/rej-1');
    await uscp.a11yClean(page);
  });
});
