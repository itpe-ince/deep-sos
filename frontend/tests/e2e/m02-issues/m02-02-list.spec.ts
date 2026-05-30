/**
 * M02-02: 지역문제 광장 (목록) — Playwright E2E.
 *
 * 6항 검증:
 *  1. Happy: 카드 그리드 + IssueCard 정상 렌더
 *  2. Error: API 실패 → empty fallback
 *  3. 권한: 누구나 열람
 *  4. URL: ?region=&track= 필터 적용 + URL 동기화
 *  5. Modal: N/A
 *  6. A11y: filter-bar fieldset + WCAG
 */
import { clearAllMocks, mockJson, mockProblem } from '../fixtures/api-mocks';
import { test, expect, uscp } from '../fixtures/uscp-test';

const MOCK_ITEMS = [
  {
    id: 'i-1',
    title: '대전 반석동 횡단보도',
    body: '신호 시간이 부족합니다.',
    region: 'daejeon',
    stage: 'published',
    track: 'policy_reflection',
    vote_count: 42,
    comment_count: 8,
    created_at: new Date(Date.now() - 86400_000).toISOString(),
  },
  {
    id: 'i-2',
    title: '공주 한옥마을 길 안내',
    body: '관광 안내가 부족합니다.',
    region: 'gongju',
    stage: 'in_progress',
    track: 'policy_reference',
    vote_count: 15,
    comment_count: 3,
    created_at: new Date(Date.now() - 3 * 86400_000).toISOString(),
  },
];

test.describe('M02-02 지역문제 광장 (목록)', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  test('카드 그리드 + IssueCard 정상 렌더', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues**', 200, {
      data: MOCK_ITEMS,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/issues');
    await expect(page.getByTestId('issues-list')).toBeVisible();
    const cards = page.getByTestId('issue-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('대전 반석동');
  });

  test('API 실패 → empty state 노출', async ({ page }) => {
    await mockProblem(page, '**/api/v1/issues**', 500, {
      title: 'Error',
      detail: 'down',
    });
    await page.goto('/issues');
    await expect(page.getByTestId('issues-empty')).toBeVisible({ timeout: 5_000 });
  });

  test('?region=daejeon&track=policy_reflection URL 진입 + URL 유지', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/issues**', 200, {
      data: [MOCK_ITEMS[0]],
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/issues?region=daejeon&track=policy_reflection');
    await expect(page.getByTestId('issues-list')).toBeVisible();
    await expect(page).toHaveURL(/region=daejeon/);
    await expect(page).toHaveURL(/track=policy_reflection/);
    await uscp.routingOk(page, page.getByTestId('issues-list'));
  });

  test('비로그인도 광장 열람 가능', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await mockJson(page, '**/api/v1/issues**', 200, {
        data: MOCK_ITEMS,
        meta: { limit: 20, has_more: false, next_cursor: null },
      });
      await page.goto('/issues');
      await expect(page.getByTestId('issues-list')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  test('단계 필터 변경 → URL 동기화', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues**', 200, {
      data: MOCK_ITEMS,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/issues');
    await page.getByTestId('filter-stage').selectOption('in_progress');
    await expect(page).toHaveURL(/stage=in_progress/);
  });

  test('A11y — filter bar + WCAG 위반 0건', async ({ page }) => {
    await mockJson(page, '**/api/v1/issues**', 200, {
      data: MOCK_ITEMS,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/issues');
    await expect(page.getByTestId('issues-filter-bar')).toBeVisible();
    await uscp.a11yClean(page);
  });
});
