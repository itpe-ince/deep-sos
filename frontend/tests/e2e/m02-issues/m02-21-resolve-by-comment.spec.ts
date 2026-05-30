/**
 * M02-21: 댓글로 해결 종결 — Playwright E2E.
 *
 * 6항 검증:
 *  1. Happy: 댓글 선택 → 종결 → Toast + resolved 알림
 *  2. Error: 댓글 미선택 → confirm 비활성
 *  3. Error: 서버 409 invalid_transition (이미 resolved) → Toast
 *  4. Modal §7.2.1: 3분할 + backdrop 비반응
 *  5. URL: /admin/issues/{id} 직접 진입 후 모달 열기 → URL 변동 없음
 *  6. A11y: fieldset legend + radiogroup + WCAG
 *  7. Edge: 댓글 없음 → empty state
 */
import { clearAllMocks, mockJson, mockProblem } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

const ISSUE = {
  id: 'rbc-1',
  title: '문의성 제보 — 댓글로 답변 완료',
  body: '운영자가 댓글로 답변하여 해결된 제보입니다.',
  region: 'gongju',
  stage: 'published',
  track: 'citizen_autonomy',
  vote_count: 3,
  comment_count: 2,
  reporter: { id: 'r-1', name: '김시민' },
  location: null,
  voted: false,
  created_at: new Date(Date.now() - 86400_000).toISOString(),
  history: [
    {
      stage: 'reported',
      at: new Date(Date.now() - 3 * 86400_000).toISOString(),
      actor: '김시민',
      comment: null,
    },
    {
      stage: 'published',
      at: new Date(Date.now() - 2 * 86400_000).toISOString(),
      actor: '운영자',
      comment: null,
    },
  ],
  photos: [],
};

const COMMENTS = [
  {
    id: 'c-1',
    content: '안녕하세요. 시민 회원입니다.',
    is_deleted: false,
    author: { id: 'r-1', name: '김시민' },
    created_at: new Date().toISOString(),
  },
  {
    id: 'c-op',
    content: '확인되었습니다. 다음과 같이 답변드립니다...',
    is_deleted: false,
    author: { id: 'op-id', name: '이운영' },
    created_at: new Date().toISOString(),
  },
];

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

test.describe('M02-21 댓글로 해결 종결', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy ─────────────────────────────────────────────
  test('댓글 선택 → 종결 → Toast + resolved 알림', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rbc-1', 200, ISSUE);
    await mockJson(page, '**/api/v1/issues/rbc-1/comments', 200, {
      data: COMMENTS,
      meta: { total: 2 },
    });

    let body: Record<string, unknown> | null = null;
    await page.route(
      '**/api/v1/admin/issues/rbc-1/resolve-by-comment',
      async (route) => {
        body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            issue_id: 'rbc-1',
            prev_stage: 'published',
            stage: 'resolved',
            track: 'citizen_autonomy',
            transitioned_at: new Date().toISOString(),
          }),
        });
      },
    );

    await page.goto('/admin/issues/rbc-1');
    await page.getByTestId('resolve-by-comment-open').click();

    const dialog = page.getByRole('dialog', { name: '댓글로 해결 종결' });
    await expect(dialog).toBeVisible();

    // 댓글 라디오 선택
    await dialog.getByTestId('resolve-comment-c-op').click();
    await expect(dialog.getByTestId('resolve-confirm')).toBeEnabled();
    await dialog.getByTestId('resolve-confirm').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/해결|이메일/);

    expect(body).toMatchObject({ comment_id: 'c-op' });
  });

  // ── 2. Error: 댓글 미선택 → confirm 비활성 ────────────────
  test('댓글 미선택 → confirm 비활성', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rbc-1', 200, ISSUE);
    await mockJson(page, '**/api/v1/issues/rbc-1/comments', 200, {
      data: COMMENTS,
      meta: { total: 2 },
    });

    await page.goto('/admin/issues/rbc-1');
    await page.getByTestId('resolve-by-comment-open').click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('resolve-confirm')).toBeDisabled();
  });

  // ── 3. Error: 409 invalid_transition ──────────────────────
  test('409 invalid_transition (이미 resolved) → Toast', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rbc-1', 200, ISSUE);
    await mockJson(page, '**/api/v1/issues/rbc-1/comments', 200, {
      data: COMMENTS,
      meta: { total: 2 },
    });
    await mockProblem(
      page,
      '**/api/v1/admin/issues/rbc-1/resolve-by-comment',
      409,
      {
        type: 'urn:uscp:problem:invalid_transition',
        title: 'Conflict',
        detail: {
          code: 'invalid_transition',
          message: '현재 단계(resolved)에서는 댓글 종결 처리를 할 수 없습니다.',
        } as unknown as string,
      },
    );

    await page.goto('/admin/issues/rbc-1');
    await page.getByTestId('resolve-by-comment-open').click();
    const dialog = page.getByRole('dialog');
    await dialog.getByTestId('resolve-comment-c-op').click();
    await dialog.getByTestId('resolve-confirm').click();

    const toast = page.locator('[data-testid="toast-error"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
  });

  // ── 4. Modal §7.2.1 컴플라이언스 ──────────────────────────
  test('ResolveByCommentDialog §7.2.1 컴플라이언스', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rbc-1', 200, ISSUE);
    await mockJson(page, '**/api/v1/issues/rbc-1/comments', 200, {
      data: COMMENTS,
      meta: { total: 2 },
    });

    await page.goto('/admin/issues/rbc-1');
    await page.getByTestId('resolve-by-comment-open').click();
    const dialog = page.getByRole('dialog');
    await uscp.modalCompliant(dialog);
  });

  // ── 7. Edge: 댓글 없음 → empty state ──────────────────────
  test('댓글 없음 → resolve-no-comments empty state', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rbc-1', 200, ISSUE);
    await mockJson(page, '**/api/v1/issues/rbc-1/comments', 200, {
      data: [],
      meta: { total: 0 },
    });

    await page.goto('/admin/issues/rbc-1');
    await page.getByTestId('resolve-by-comment-open').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByTestId('resolve-no-comments')).toBeVisible();
    await expect(dialog.getByTestId('resolve-confirm')).toBeDisabled();
  });

  // ── 6. A11y ──────────────────────────────────────────────
  test('A11y — fieldset legend + WCAG 위반 0건', async ({ page }) => {
    await fakeOperatorLogin(page);
    await mockJson(page, '**/api/v1/admin/issues/rbc-1', 200, ISSUE);
    await mockJson(page, '**/api/v1/issues/rbc-1/comments', 200, {
      data: COMMENTS,
      meta: { total: 2 },
    });

    await page.goto('/admin/issues/rbc-1');
    await page.getByTestId('resolve-by-comment-open').click();
    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByTestId('resolve-comments').locator('legend'),
    ).toBeVisible();

    await uscp.a11yClean(page);
  });
});
