/**
 * M02-09~13: 단계 전환 — Playwright E2E.
 *
 * 6항 검증:
 *  1. Happy: reported → reviewing 전환 (track 선택 필수)
 *  2. Error: reviewing 진입 시 track 미선택 → Toast + 모달 유지
 *  3. Error: state machine 위반 (예: published → resolved 직접) → 409 Toast
 *  4. Modal §7.2.1: TransitionDialog 3분할 + backdrop 비반응
 *  5. URL: /admin/issues/{id} 직접 진입 + F5
 *  6. A11y: dialog + WCAG
 *
 * 5단계 전환 (reported→...→resolved) 의 전체 패턴은 본 spec 의 single transition
 * 동작 검증 + state machine 위반 시 409 응답 처리에 집약됨.
 */
import { clearAllMocks, mockJson, mockProblem } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

const ISSUE_REPORTED = {
  id: 'gk-detail-1',
  title: '검토 대기 제보',
  body: '운영자 검토를 기다리는 제보입니다.',
  region: 'daejeon',
  stage: 'reported',
  track: null,
  vote_count: 3,
  comment_count: 0,
  reporter: { id: 'r-1', name: '김시민' },
  location: null,
  voted: false,
  created_at: new Date().toISOString(),
  history: [
    {
      stage: 'reported',
      at: new Date(Date.now() - 86400_000).toISOString(),
      actor: '김시민',
      comment: null,
    },
  ],
  photos: [],
};

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

test.describe('M02-09~13 단계 전환', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy: reported → reviewing (track 선택) ───────────
  test('reported → reviewing 전환 — track 선택 후 성공', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(
      page,
      '**/api/v1/admin/issues/gk-detail-1',
      200,
      ISSUE_REPORTED,
    );

    let transitionBody: Record<string, unknown> | null = null;
    await page.route(
      '**/api/v1/admin/issues/gk-detail-1/transition',
      async (route) => {
        transitionBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issue_id: 'gk-detail-1',
            prev_stage: 'reported',
            stage: 'reviewing',
            track: transitionBody.track,
            transitioned_at: new Date().toISOString(),
          }),
        });
      },
    );

    await page.goto('/admin/issues/gk-detail-1');
    await expect(page.getByTestId('admin-issue-detail')).toBeVisible();

    await page.getByTestId('transition-to-reviewing').click();

    const dialog = page.getByRole('dialog', {
      name: /단계 전환.*제보.*검토중/,
    });
    await expect(dialog).toBeVisible();

    // track 선택
    await dialog
      .getByTestId('transition-track-policy_reflection')
      .click();
    await dialog.getByTestId('transition-comment').fill('현장 확인 후 진행');
    await dialog.getByTestId('transition-confirm').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    expect(transitionBody).toMatchObject({
      to_stage: 'reviewing',
      track: 'policy_reflection',
    });
  });

  // ── 2. Error: reviewing 진입 시 track 미선택 ──────────────
  test('reviewing 진입 시 track 미선택 → Toast + 모달 유지', async ({
    page,
  }) => {
    await fakeOperatorLogin(page);
    await mockJson(
      page,
      '**/api/v1/admin/issues/gk-detail-1',
      200,
      ISSUE_REPORTED,
    );

    await page.goto('/admin/issues/gk-detail-1');
    await page.getByTestId('transition-to-reviewing').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();

    // track 선택 없이 바로 확인
    await dialog.getByTestId('transition-confirm').click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/트랙/);

    // 모달은 유지
    await expect(dialog).toBeVisible();
  });

  // ── 3. Error: 409 invalid_transition ──────────────────────
  test('409 invalid_transition → Toast 안내', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(
      page,
      '**/api/v1/admin/issues/gk-detail-1',
      200,
      ISSUE_REPORTED,
    );

    await mockProblem(
      page,
      '**/api/v1/admin/issues/gk-detail-1/transition',
      409,
      {
        type: 'urn:uscp:problem:invalid_transition',
        title: 'Conflict',
        detail: {
          code: 'invalid_transition',
          message: '현재 단계(reported)에서 published 로 전환할 수 없습니다.',
        } as unknown as string,
      },
    );

    await page.goto('/admin/issues/gk-detail-1');
    await page.getByTestId('transition-to-reviewing').click();

    const dialog = page.getByRole('dialog');
    await dialog
      .getByTestId('transition-track-policy_reflection')
      .click();
    await dialog.getByTestId('transition-confirm').click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/전환할 수 없/);
  });

  // ── 4. Modal 컴플라이언스 ────────────────────────────────
  test('TransitionDialog §7.2.1 컴플라이언스', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(
      page,
      '**/api/v1/admin/issues/gk-detail-1',
      200,
      ISSUE_REPORTED,
    );

    await page.goto('/admin/issues/gk-detail-1');
    await page.getByTestId('transition-to-reviewing').click();

    const dialog = page.getByRole('dialog');
    await uscp.modalCompliant(dialog);
  });

  // ── 5. URL 라우팅 ────────────────────────────────────────
  test('/admin/issues/{id} 직접 진입 + F5 유지', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(
      page,
      '**/api/v1/admin/issues/gk-detail-1',
      200,
      ISSUE_REPORTED,
    );
    await page.goto('/admin/issues/gk-detail-1');
    await uscp.routingOk(page, page.getByTestId('admin-issue-detail'));
  });

  // ── 6. A11y ───────────────────────────────────────────────
  test('A11y — WCAG 위반 0건', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(
      page,
      '**/api/v1/admin/issues/gk-detail-1',
      200,
      ISSUE_REPORTED,
    );
    await page.goto('/admin/issues/gk-detail-1');
    await uscp.a11yClean(page);
  });
});
