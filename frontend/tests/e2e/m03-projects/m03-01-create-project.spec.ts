/**
 * M03-01/06: 리빙랩 프로젝트 등록 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M03-06 (리빙랩 등록 — 운영자)
 *  - feature-spec §M03-13 (3단계 라이프사이클 — 모집중→진행중→완료)
 *  - design.md §4.2 M03 admin
 *  - design.md §7.2.1 (Toast)
 *  - design.md §10.3.3 6항
 *
 * 6항 검증:
 *  1. Happy: 운영자 로그인 + 폼 입력 → 등록 성공 → Toast + /projects/{id} 이동
 *  2. Error A: 제목 누락 → submit 비활성
 *  3. Error B: 날짜 역전 (end < start) → aria-invalid + submit 비활성
 *  4. Error C: source_issue 중복 → 409 Toast warning
 *  5. 권한: 비로그인 → /login redirect
 *  6. URL: /admin/projects/new 직접 진입 + F5
 *  7. A11y: RegionSelect fieldset + WCAG
 */
import { clearAllMocks, mockJson, mockProblem } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

async function fakeOperatorLogin(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'fake-operator-token');
    localStorage.setItem('refresh_token', 'fake-refresh-token');
  });
  // admin/layout.tsx 의 useAuth 는 /auth/me 를 호출하고 role 'admin' 을 요구한다.
  const me = {
    id: 'op-id',
    email: testOperator.email,
    name: testOperator.name,
    role: 'admin',
    is_active: true,
    email_verified: true,
  };
  await mockJson(page, '**/api/v1/auth/me', 200, me);
  await mockJson(page, '**/api/v1/users/me', 200, me);
}

test.describe('M03-01/06 리빙랩 프로젝트 등록', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 5. 권한 분기 — 비로그인 redirect ──────────────────────
  test('비로그인 진입 → /login?next= redirect', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.goto('/admin/projects/new');
      await expect(page).toHaveURL(/\/login.*next=.*projects/);
    } finally {
      await ctx.close();
    }
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('운영자 로그인 + 폼 입력 → 등록 성공 → /projects/{id} 이동', async ({
    page,
  }) => {
    await fakeOperatorLogin(page);

    let receivedBody: Record<string, unknown> | null = null;
    await page.route('**/api/v1/admin/projects', async (route) => {
      receivedBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          project_id: '33333333-3333-3333-3333-333333333333',
          stage: 'recruiting',
          region: receivedBody.region,
          title: receivedBody.title,
          summary: receivedBody.summary,
          source_issue_id: receivedBody.source_issue_id,
          created_at: new Date().toISOString(),
          message: '리빙랩 프로젝트가 등록되었습니다.',
        }),
      });
    });

    await page.goto('/admin/projects/new');
    await expect(page.getByTestId('admin-project-new-page')).toBeVisible();

    // 지역 선택
    await page.getByTestId('region-daejeon').click();
    await page.getByTestId('project-title').fill('반석동 보행자 안전 리빙랩');
    await page.getByTestId('project-summary').fill('횡단보도 신호 시간 조정');

    await expect(page.getByTestId('project-submit')).toBeEnabled();
    await page.getByTestId('project-submit').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/등록/);

    expect(receivedBody).toMatchObject({
      region: 'daejeon',
      title: '반석동 보행자 안전 리빙랩',
    });

    await expect(page).toHaveURL(
      /\/projects\/33333333-3333-3333-3333-333333333333/,
      { timeout: 5_000 },
    );
  });

  // ── 2. Error A — 제목 누락 ────────────────────────────────
  test('제목 누락 → submit 비활성', async ({ page }) => {
    await fakeOperatorLogin(page);
    await page.goto('/admin/projects/new');

    await page.getByTestId('region-gongju').click();
    // 제목 미입력
    await expect(page.getByTestId('project-submit')).toBeDisabled();
  });

  // ── 3. Error B — 날짜 역전 ────────────────────────────────
  test('종료일 < 시작일 → aria-invalid + submit 비활성', async ({ page }) => {
    await fakeOperatorLogin(page);
    await page.goto('/admin/projects/new');

    await page.getByTestId('region-yesan').click();
    await page.getByTestId('project-title').fill('예산 테스트 프로젝트');
    await page.getByTestId('project-start-at').fill('2026-08-01');
    await page.getByTestId('project-end-at').fill('2026-07-01'); // 역전

    await expect(page.getByTestId('project-end-at')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    await expect(page.getByTestId('project-submit')).toBeDisabled();
  });

  // ── 4. Error C — source_issue 중복 (409) ──────────────────
  // H01(N:M): 의제 중복 연결 409 가드는 폐기됨. 등록 시 의제 1건 선택 연결이
  // idempotent 로 성공하는지 검증한다.
  test('등록 시 의제 선택 연결 → 성공 → /projects/{id} 이동', async ({
    page,
  }) => {
    let alertCount = 0;
    page.on('dialog', async (d) => {
      alertCount += 1;
      await d.dismiss();
    });

    await fakeOperatorLogin(page);
    let body: Record<string, unknown> | null = null;
    await page.route('**/api/v1/admin/projects', async (route) => {
      if (route.request().method() === 'POST') {
        body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            project_id: 'p-new-linked',
            stage: 'recruiting',
            region: 'cheonan',
            title: '의제 연결 테스트',
            summary: null,
            created_at: new Date().toISOString(),
            message: '리빙랩 프로젝트가 등록되었습니다. (모집중 단계)',
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/admin/projects/new');
    await page.getByTestId('region-cheonan').click();
    await page.getByTestId('project-title').fill('의제 연결 테스트');
    await page
      .getByTestId('project-source-issue')
      .fill('11111111-1111-1111-1111-111111111111');
    await page.getByTestId('project-submit').click();

    await expect(page).toHaveURL(/\/projects\/p-new-linked/, { timeout: 5_000 });
    expect(body).toMatchObject({
      source_issue_id: '11111111-1111-1111-1111-111111111111',
    });
    expect(alertCount).toBe(0);
  });

  // ── 6. URL 라우팅 (§2.4) ──────────────────────────────────
  test('/admin/projects/new 직접 진입 + F5 유지', async ({ page }) => {
    await fakeOperatorLogin(page);
    await page.goto('/admin/projects/new');
    await uscp.routingOk(page, page.getByTestId('admin-project-new-form'));
  });

  // ── 7. A11y (M08-10) ──────────────────────────────────────
  test('RegionSelect fieldset + WCAG 위반 0건', async ({ page }) => {
    await fakeOperatorLogin(page);
    await page.goto('/admin/projects/new');

    const regionSelect = page.getByTestId('region-select');
    await expect(regionSelect.locator('legend').first()).toBeVisible();

    await uscp.a11yClean(page);
  });
});
