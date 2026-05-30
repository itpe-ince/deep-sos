/**
 * M02-03/04/05: 제보 상세 + 공감 + 댓글 통합 spec.
 *
 * 6항 검증:
 *  1. Happy: 상세 + StageStepper history + 사진 갤러리
 *  2. M02-04 Happy: 비로그인 클릭 → /login redirect
 *  3. M02-04 Happy: 로그인 클릭 → Optimistic + voted=true (mock 1)
 *  4. M02-05 Happy: 댓글 작성 → list 에 추가
 *  5. M02-05 Modal: 댓글 삭제 ConfirmModal danger + backdrop 비반응
 *  6. URL: /issues/{id} 직접 진입 + F5 유지
 *  7. A11y: StageStepper aria-current + WCAG
 */
import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { testCitizen } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

const DETAIL = {
  id: 'i-detail-1',
  title: '반석동 횡단보도 신호등 시간 부족',
  body: '대전 반석동 횡단보도의 신호 시간이 부족합니다. 노인·어린이 보행자가 안전하게 횡단하기 어렵습니다.',
  region: 'daejeon',
  stage: 'in_progress',
  track: 'policy_reflection',
  vote_count: 42,
  comment_count: 1,
  reporter: { id: 'r-1', name: '김시민' },
  location: null,
  voted: false,
  created_at: new Date(Date.now() - 86400_000).toISOString(),
  history: [
    {
      stage: 'reported',
      at: new Date(Date.now() - 5 * 86400_000).toISOString(),
      actor: '김시민',
      comment: null,
    },
    {
      stage: 'reviewing',
      at: new Date(Date.now() - 4 * 86400_000).toISOString(),
      actor: '운영자',
      comment: '현장 확인 후 대전시 교통과 협의 진행',
    },
    {
      stage: 'published',
      at: new Date(Date.now() - 3 * 86400_000).toISOString(),
      actor: '운영자',
      comment: null,
    },
  ],
  photos: [],
};

const COMMENTS = [
  {
    id: 'c-1',
    content: '저도 같은 의견입니다.',
    is_deleted: false,
    author: { id: 'r-2', name: '박시민' },
    created_at: new Date(Date.now() - 86400_000).toISOString(),
  },
];

async function fakeLogin(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'fake-test-token');
    localStorage.setItem('refresh_token', 'fake-refresh-token');
  });
  await mockJson(page, '**/api/v1/users/me', 200, {
    id: 'mock-user-id',
    email: testCitizen.email,
    name: testCitizen.name,
    role: 'citizen',
    is_active: true,
    email_verified: true,
  });
}

test.describe('M02-03/04/05 제보 상세 + 공감 + 댓글', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. M02-03 Happy ───────────────────────────────────────
  test('상세 진입 + StageStepper history + region/track 뱃지', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/issues/i-detail-1', 200, DETAIL);
    await mockJson(page, '**/api/v1/issues/i-detail-1/comments', 200, {
      data: COMMENTS,
      meta: { total: 1 },
    });

    await page.goto('/issues/i-detail-1');

    await expect(page.getByTestId('issue-detail-page')).toBeVisible();
    await expect(page.getByTestId('issue-detail-title')).toContainText('반석동');

    // StageStepper — 3건 history 의 마지막 단계 노출
    await expect(page.getByTestId('stage-stepper')).toBeVisible();
    await expect(page.getByTestId('stage-item-published')).toBeVisible();
    await expect(page.getByTestId('stage-item-in_progress')).toBeVisible();

    // TrackBadge
    await expect(
      page.locator('[data-testid="track-badge-policy_reflection"]').first(),
    ).toBeVisible();
  });

  // ── 2. M02-04 비로그인 클릭 → /login redirect ─────────────
  test('M02-04 — 비로그인 공감 클릭 → /login?next= redirect', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await mockJson(page, '**/api/v1/issues/i-detail-1', 200, DETAIL);
      await mockJson(page, '**/api/v1/issues/i-detail-1/comments', 200, {
        data: [],
        meta: { total: 0 },
      });
      await page.goto('/issues/i-detail-1');
      await page.getByTestId('vote-button').click();
      await expect(page).toHaveURL(/\/login.*next=/);
    } finally {
      await ctx.close();
    }
  });

  // ── 3. M02-04 로그인 공감 (Optimistic) ────────────────────
  test('M02-04 — 로그인 공감 클릭 → Optimistic count+1 → 서버 동기화', async ({
    page,
  }) => {
    await fakeLogin(page);
    await mockJson(page, '**/api/v1/issues/i-detail-1', 200, DETAIL);
    await mockJson(page, '**/api/v1/issues/i-detail-1/comments', 200, {
      data: [],
      meta: { total: 0 },
    });
    await page.route('**/api/v1/issues/i-detail-1/vote', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ voted: true, vote_count: 43 }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/issues/i-detail-1');
    const btn = page.getByTestId('vote-button');
    await expect(btn).toHaveAttribute('data-voted', 'false');
    await btn.click();

    // Optimistic 또는 서버 응답 후 voted=true + count=43
    await expect(btn).toHaveAttribute('data-voted', 'true', { timeout: 3_000 });
    await expect(btn).toContainText(/43/);
  });

  // ── 4. M02-05 댓글 작성 ───────────────────────────────────
  test('M02-05 — 로그인 댓글 작성 → 리스트에 추가', async ({ page }) => {
    await fakeLogin(page);
    await mockJson(page, '**/api/v1/issues/i-detail-1', 200, DETAIL);
    await mockJson(page, '**/api/v1/issues/i-detail-1/comments', 200, {
      data: [],
      meta: { total: 0 },
    });

    let receivedBody: Record<string, unknown> | null = null;
    await page.route(
      '**/api/v1/issues/i-detail-1/comments',
      async (route) => {
        const req = route.request();
        if (req.method() === 'POST') {
          receivedBody = req.postDataJSON() as Record<string, unknown>;
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'c-new',
              content: receivedBody.content,
              is_deleted: false,
              author: { id: 'mock-user-id', name: testCitizen.name },
              created_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: [], meta: { total: 0 } }),
          });
        }
      },
    );

    await page.goto('/issues/i-detail-1');
    await page.getByTestId('comment-input').fill('첫 번째 댓글입니다.');
    await page.getByTestId('comment-submit').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });

    expect(receivedBody).toMatchObject({ content: '첫 번째 댓글입니다.' });
    await expect(page.getByTestId('comment-list')).toBeVisible();
    await expect(
      page.getByTestId('comment-item').filter({ hasText: '첫 번째 댓글' }),
    ).toBeVisible();
  });

  // ── 5. M02-05 댓글 삭제 ConfirmModal danger ──────────────
  test('M02-05 — 본인 댓글 삭제 → ConfirmModal danger + backdrop 비반응', async ({
    page,
  }) => {
    await fakeLogin(page);
    await mockJson(page, '**/api/v1/issues/i-detail-1', 200, DETAIL);
    await mockJson(page, '**/api/v1/issues/i-detail-1/comments', 200, {
      data: [
        {
          id: 'c-mine',
          content: '내가 작성한 댓글',
          is_deleted: false,
          author: { id: 'mock-user-id', name: testCitizen.name },
          created_at: new Date().toISOString(),
        },
      ],
      meta: { total: 1 },
    });

    await page.goto('/issues/i-detail-1');
    await page.getByTestId('comment-delete-c-mine').click();

    const modal = page.getByRole('dialog', { name: '댓글 삭제' });
    await expect(modal).toBeVisible();
    await uscp.modalCompliant(modal);
  });

  // ── 6. URL 라우팅 (§2.4) ──────────────────────────────────
  test('/issues/{id} 직접 진입 + F5 유지', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues/i-detail-1', 200, DETAIL);
    await mockJson(page, '**/api/v1/issues/i-detail-1/comments', 200, {
      data: [],
      meta: { total: 0 },
    });
    await page.goto('/issues/i-detail-1');
    await uscp.routingOk(page, page.getByTestId('issue-detail-page'));
  });

  // ── 7. A11y (M08-10) ──────────────────────────────────────
  test('StageStepper aria-current + WCAG 위반 0건', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues/i-detail-1', 200, DETAIL);
    await mockJson(page, '**/api/v1/issues/i-detail-1/comments', 200, {
      data: [],
      meta: { total: 0 },
    });
    await page.goto('/issues/i-detail-1');

    await expect(page.getByTestId('stage-item-in_progress')).toHaveAttribute(
      'aria-current',
      'step',
    );

    await uscp.a11yClean(page);
  });
});
