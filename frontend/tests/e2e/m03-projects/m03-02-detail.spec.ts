/**
 * M03-01/02/03: 리빙랩 목록 + 상세 + 타임라인 — Playwright E2E.
 *
 * 6항 검증:
 *  1. Happy: 목록 카드 + 상세 진입 → ProjectStageStepper 3단계 + Timeline
 *  2. Error: API 실패 → empty / error fallback
 *  3. 권한: 누구나 열람
 *  4. URL: /projects?region=daejeon 필터 동기화 + 카드 → /projects/{id}
 *  5. Modal: N/A
 *  6. A11y: ProjectStageStepper aria-current + Timeline aria-labelledby + WCAG
 */
import { clearAllMocks, mockJson, mockProblem } from '../fixtures/api-mocks';
import { test, expect, uscp } from '../fixtures/uscp-test';

const PROJECTS = [
  {
    id: 'p-daejeon',
    title: '반석동 보행자 안전 리빙랩',
    summary: '횡단보도 신호 시간 조정',
    region: 'daejeon',
    stage: 'in_progress',
    start_at: '2026-06-01',
    end_at: '2026-12-31',
    created_at: new Date().toISOString(),
  },
  {
    id: 'p-gongju',
    title: '공주 한옥마을 디지털 안내',
    summary: '관광 안내 디지털화',
    region: 'gongju',
    stage: 'recruiting',
    start_at: null,
    end_at: null,
    created_at: new Date().toISOString(),
  },
];

const DETAIL = {
  id: 'p-daejeon',
  title: '반석동 보행자 안전 리빙랩',
  summary: '횡단보도 신호 시간 조정',
  description: '대전 반석동 횡단보도의 신호 시간을 조정하는 리빙랩 프로젝트입니다.',
  region: 'daejeon',
  stage: 'in_progress',
  // M03-14 N:M (H01): 연결 의제는 linked_issues[] 로 노출
  linked_issues: [{ id: 'i-1', title: '반석동 횡단보도 신호 개선 요청', stage: 'published' }],
  start_at: '2026-06-01',
  end_at: '2026-12-31',
  owner_id: 'op-id',
  created_at: new Date().toISOString(),
};

const TIMELINE = [
  {
    id: 't-1',
    entry_date: '2026-06-01',
    title: '킥오프 미팅',
    description: '대전시 교통과 + 멘토단 + 학생팀 1차 회의',
    created_at: new Date().toISOString(),
    created_by: { id: 'op-id', name: '이운영' },
  },
  {
    id: 't-2',
    entry_date: '2026-06-15',
    title: '현장 조사',
    description: null,
    created_at: new Date().toISOString(),
    created_by: { id: 's-1', name: '학생팀A' },
  },
];

test.describe('M03-01/02/03 리빙랩 목록·상세·타임라인', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy: 목록 → 카드 + 상세 진입 ─────────────────────
  test('목록 카드 → 카드 클릭 → /projects/{id} 이동', async ({ page }) => {
    await mockJson(page, '**/api/v1/projects?**', 200, {
      data: PROJECTS,
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await mockJson(page, '**/api/v1/projects/p-daejeon', 200, DETAIL);
    await mockJson(page, '**/api/v1/projects/p-daejeon/timeline**', 200, {
      data: TIMELINE,
      meta: { total: 2 },
    });

    await page.goto('/projects');
    await expect(page.getByTestId('projects-list')).toBeVisible();
    const cards = page.getByTestId('project-card');
    await expect(cards).toHaveCount(2);
    await expect(cards.first()).toContainText('반석동');

    await cards.first().getByRole('link').first().click();
    await expect(page).toHaveURL(/\/projects\/p-daejeon/);
  });

  // ── 2. Happy: 상세 + ProjectStageStepper 3단계 ────────────
  test('상세 진입 + 3단계 stepper + region/stage 뱃지', async ({ page }) => {
    await mockJson(page, '**/api/v1/projects/p-daejeon', 200, DETAIL);
    await mockJson(page, '**/api/v1/projects/p-daejeon/timeline**', 200, {
      data: TIMELINE,
      meta: { total: 2 },
    });

    await page.goto('/projects/p-daejeon');
    await expect(page.getByTestId('project-detail-page')).toBeVisible();
    await expect(page.getByTestId('project-detail-title')).toContainText('반석동');

    // 3단계 stepper — current = in_progress
    await expect(page.getByTestId('project-stage-stepper')).toBeVisible();
    await expect(
      page.getByTestId('project-stage-item-recruiting'),
    ).toHaveAttribute('data-state', 'done');
    await expect(
      page.getByTestId('project-stage-item-in_progress'),
    ).toHaveAttribute('data-state', 'current');
    await expect(
      page.getByTestId('project-stage-item-completed'),
    ).toHaveAttribute('data-state', 'future');
  });

  // ── 3. Happy: Timeline 2건 + 의제 링크 ───────────────────
  test('타임라인 2건 + source_issue 링크 노출', async ({ page }) => {
    await mockJson(page, '**/api/v1/projects/p-daejeon', 200, DETAIL);
    await mockJson(page, '**/api/v1/projects/p-daejeon/timeline**', 200, {
      data: TIMELINE,
      meta: { total: 2 },
    });

    await page.goto('/projects/p-daejeon');

    await expect(page.getByTestId('project-timeline')).toBeVisible();
    await expect(page.getByTestId('project-timeline-list')).toBeVisible();
    const items = page.getByTestId('project-timeline-item');
    await expect(items).toHaveCount(2);
    await expect(items.first()).toContainText('킥오프 미팅');

    // 의제 링크
    await expect(page.getByTestId('project-detail-source-issue')).toHaveAttribute(
      'href',
      '/issues/i-1',
    );
  });

  // ── 4. Error: 타임라인 빈 응답 → empty ────────────────────
  test('타임라인 빈 응답 → empty state', async ({ page }) => {
    await mockJson(page, '**/api/v1/projects/p-daejeon', 200, DETAIL);
    await mockJson(page, '**/api/v1/projects/p-daejeon/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    await page.goto('/projects/p-daejeon');
    await expect(page.getByTestId('project-timeline-empty')).toBeVisible();
  });

  // ── 5. Error: 상세 404 → error fallback ──────────────────
  test('상세 404 → error message + 목록으로 링크', async ({ page }) => {
    await mockProblem(page, '**/api/v1/projects/notfound', 404, {
      type: 'urn:uscp:problem:project_not_found',
      title: 'Not Found',
      detail: '프로젝트를 찾을 수 없습니다.',
    });

    await page.goto('/projects/notfound');
    await expect(page.getByTestId('project-detail-error')).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── 6. URL 라우팅 (§2.4) ─────────────────────────────────
  test('/projects?region=daejeon&stage=in_progress URL 진입 + F5 유지', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/projects?**', 200, {
      data: [PROJECTS[0]],
      meta: { limit: 20, has_more: false, next_cursor: null },
    });
    await page.goto('/projects?region=daejeon&stage=in_progress');
    await expect(page).toHaveURL(/region=daejeon/);
    await expect(page).toHaveURL(/stage=in_progress/);
    await uscp.routingOk(page, page.getByTestId('projects-page'));
  });

  // ── 7. A11y ───────────────────────────────────────────────
  test('A11y — ProjectStageStepper aria-current + Timeline + WCAG', async ({
    page,
  }) => {
    await mockJson(page, '**/api/v1/projects/p-daejeon', 200, DETAIL);
    await mockJson(page, '**/api/v1/projects/p-daejeon/timeline**', 200, {
      data: TIMELINE,
      meta: { total: 2 },
    });

    await page.goto('/projects/p-daejeon');
    await expect(
      page.getByTestId('project-stage-item-in_progress'),
    ).toHaveAttribute('aria-current', 'step');

    await uscp.a11yClean(page);
  });

  // ── 비로그인도 공개 열람 가능 ─────────────────────────────
  test('비로그인 사용자도 목록·상세 열람 가능', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await mockJson(page, '**/api/v1/projects?**', 200, {
        data: PROJECTS,
        meta: { limit: 20, has_more: false, next_cursor: null },
      });
      await page.goto('/projects');
      await expect(page.getByTestId('projects-list')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });
});
