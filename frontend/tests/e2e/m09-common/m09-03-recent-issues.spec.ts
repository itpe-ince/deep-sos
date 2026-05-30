/**
 * M09-03: 최근 제보 카드 위젯 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M09-03 (최근 제보 카드 위젯)
 *  - design.md §7.3 #1 + §10.3.3
 *
 * 6항 검증:
 *  1. Happy Path  : 3건 카드 노출 + 지역·단계 뱃지 + TrackBadge + 공감/댓글 수
 *  2. Error Path  : API 빈 응답 → EmptyState 노출
 *  3. 권한 분기  : 누구나 열람
 *  4. URL 라우팅 : "전체 보기" 링크 → /issues / 카드 클릭 → /issues/{id}
 *  5. Modal 규칙 : N/A
 *  6. A11y       : section aria-labelledby + WCAG 위반 0건
 */
import { mockJson, clearAllMocks } from '../fixtures/api-mocks';
import { test, expect, uscp } from '../fixtures/uscp-test';

const MOCK_ISSUES = [
  {
    id: 'issue-1',
    title: '반석동 횡단보도 신호등 시간 부족',
    body: '노인·어린이 보행자가 횡단보도를 건너는 시간이 부족합니다.',
    region: 'daejeon',
    stage: 'in_progress',
    track: 'policy_reflection' as const,
    vote_count: 42,
    comment_count: 8,
    created_at: new Date(Date.now() - 2 * 86400_000).toISOString(),
  },
  {
    id: 'issue-2',
    title: '공주 한옥마을 관광 안내 부족',
    body: '한옥마을 관광객들이 길 안내 부족으로 헤매고 있습니다.',
    region: 'gongju',
    stage: 'published',
    track: 'policy_reference' as const,
    vote_count: 15,
    comment_count: 3,
    created_at: new Date(Date.now() - 5 * 86400_000).toISOString(),
  },
  {
    id: 'issue-3',
    title: '세종 동네 소공원 정비 제안',
    body: '동네 소공원의 벤치와 운동기구가 노후화되었습니다.',
    region: 'sejong',
    stage: 'reviewing',
    track: 'citizen_autonomy' as const,
    vote_count: 9,
    comment_count: 1,
    created_at: new Date(Date.now() - 1 * 86400_000).toISOString(),
  },
];

test.describe('M09-03 최근 제보 카드', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('3건 카드 노출 + 지역·단계·트랙 뱃지 + 공감/댓글 수', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/issues?**', 200, {
      data: MOCK_ISSUES,
      meta: { total: 3, page: 1, size: 3, totalPages: 1 },
    });

    await page.goto('/');

    const container = page.getByTestId('home-recent-issues');
    await expect(container).toBeVisible();

    const cards = page.getByTestId('recent-issue-card');
    await expect(cards).toHaveCount(3);

    // 지역·단계·트랙 뱃지
    await expect(cards.first()).toContainText('대전');
    await expect(cards.first()).toContainText('처리중');
    await expect(
      cards.first().locator('[data-testid="track-badge-policy_reflection"]'),
    ).toBeVisible();

    // 공감/댓글 수
    await expect(cards.first()).toContainText('공감 42');
    await expect(cards.first()).toContainText('댓글 8');
  });

  // ── 2. Error Path — Empty ─────────────────────────────────
  test('빈 응답 시 EmptyState 노출', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues?**', 200, {
      data: [],
      meta: { total: 0 },
    });

    await page.goto('/');
    await expect(page.getByTestId('recent-issues-empty')).toBeVisible();
    await expect(page.getByTestId('recent-issues-empty')).toContainText(
      '첫 번째 시민',
    );
  });

  // ── 3. 권한 분기 — 누구나 열람 ──────────────────────────────
  test('비로그인 사용자도 최근 제보 카드 열람 가능', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await expect(page.getByTestId('home-recent-issues')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // ── 4. URL 라우팅 (§2.4) ──────────────────────────────────
  test('"전체 보기" 클릭 → /issues 이동', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues?**', 200, {
      data: MOCK_ISSUES,
      meta: {},
    });
    await page.goto('/');
    await page.getByTestId('recent-issues-view-all').click();
    await expect(page).toHaveURL(/\/issues/);
  });

  test('카드 클릭 → /issues/{id} 이동', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues?**', 200, {
      data: MOCK_ISSUES,
      meta: {},
    });
    await page.goto('/');
    const firstTitleLink = page
      .getByTestId('recent-issue-card')
      .first()
      .getByRole('link');
    await firstTitleLink.click();
    await expect(page).toHaveURL(/\/issues\/issue-1/);
  });

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('aria-labelledby + WCAG 위반 0건', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues?**', 200, {
      data: MOCK_ISSUES,
      meta: {},
    });
    await page.goto('/');

    const heading = page.locator('#recent-issues-heading');
    await expect(heading).toBeVisible();

    await uscp.a11yClean(page);
  });
});
