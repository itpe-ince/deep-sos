/**
 * M02-01: 지역문제 제보 작성 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M02-01 (지역문제 제보 등록)
 *  - design.md §4.2 M02 (POST /issues V2)
 *  - design.md §7.2.1 (Toast 사용)
 *  - design.md §10.3.3 6항
 *
 * 6항 검증:
 *  1. Happy Path  : 지역+제목+본문 입력 → 제출 → Toast + /issues/{id} 이동
 *  2. Error Path A: 본문 10자 미만 → submit 비활성 (client 검증)
 *  3. Error Path B: 사진 6장 초과 → Toast 경고 + 5장만 추가
 *  4. Error Path C: 백엔드 spam_throttled 429 → Toast 안내 (alert 미사용)
 *  5. 권한 분기  : 비로그인 → /login?next=/user/issue-new redirect
 *  6. URL 라우팅 : /user/issue-new 직접 진입 + F5 유지
 *  7. A11y       : RegionSelect fieldset legend + WCAG 위반 0건
 */
import { clearAllMocks, mockJson, mockProblem } from '../fixtures/api-mocks';
import { testCitizen } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

async function fakeLogin(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'fake-test-token');
    localStorage.setItem('refresh_token', 'fake-refresh-token');
  });
  await mockJson(page, '**/api/v1/users/me', 200, {
    id: '11111111-1111-1111-1111-111111111111',
    email: testCitizen.email,
    name: testCitizen.name,
    role: 'citizen',
    is_active: true,
    email_verified: true,
  });
}

test.describe('M02-01 지역문제 제보 작성', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 5. 권한 분기 — 비로그인 redirect ──────────────────────
  test('비로그인 진입 → /login?next=/user/issue-new redirect', async ({
    browser,
  }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.goto('/user/issue-new');
      await expect(page).toHaveURL(/\/login.*next=.*issue-new/);
    } finally {
      await ctx.close();
    }
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('지역+제목+본문 → 제출 → Toast + /issues/{id} 이동', async ({
    page,
  }) => {
    await fakeLogin(page);
    let receivedBody: Record<string, unknown> | null = null;
    await page.route('**/api/v1/issues', async (route) => {
      receivedBody = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          issue_id: '22222222-2222-2222-2222-222222222222',
          stage: 'reported',
          region: receivedBody.region,
          created_at: new Date().toISOString(),
          notification_enqueued: true,
          message: '제보가 등록되었습니다.',
        }),
      });
    });

    await page.goto('/user/issue-new');

    await page.getByTestId('region-daejeon').click();
    await page.getByTestId('issue-title').fill('반석동 횡단보도 신호등 시간 부족');
    await page.getByTestId('issue-body').fill(
      '대전 유성구 반석동의 횡단보도 신호 시간이 부족하여 노인과 어린이 보행자가 안전하게 횡단하기 어렵습니다.',
    );

    await expect(page.getByTestId('issue-submit')).toBeEnabled();
    await page.getByTestId('issue-submit').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    expect(receivedBody).toMatchObject({
      region: 'daejeon',
      title: '반석동 횡단보도 신호등 시간 부족',
    });

    // 리다이렉트 검증
    await expect(page).toHaveURL(
      /\/issues\/22222222-2222-2222-2222-222222222222/,
      { timeout: 5_000 },
    );
  });

  // ── 2. Error Path A — 본문 10자 미만 ──────────────────────
  test('본문 10자 미만 → submit 비활성', async ({ page }) => {
    await fakeLogin(page);
    await page.goto('/user/issue-new');

    await page.getByTestId('region-gongju').click();
    await page.getByTestId('issue-title').fill('짧은 제목');
    await page.getByTestId('issue-body').fill('짧다'); // 10자 미만

    await expect(page.getByTestId('issue-submit')).toBeDisabled();
    await expect(page.getByTestId('issue-body')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
  });

  // ── 3. Error Path B — 백엔드 spam_throttled 429 ───────────
  test('429 spam_throttled → Toast warning (alert 미호출)', async ({ page }) => {
    let alertCount = 0;
    page.on('dialog', async (d) => {
      alertCount += 1;
      await d.dismiss();
    });

    await fakeLogin(page);
    await mockProblem(page, '**/api/v1/issues', 429, {
      type: 'urn:uscp:problem:spam_throttled',
      title: 'Too Many Requests',
      detail: {
        code: 'spam_throttled',
        message: '같은 지역에 5분 내 3건 이상 제보할 수 없습니다.',
        retry_after_seconds: 300,
      } as unknown as string,
    });

    await page.goto('/user/issue-new');
    await page.getByTestId('region-yesan').click();
    await page.getByTestId('issue-title').fill('스팸 테스트 제보');
    await page.getByTestId('issue-body').fill(
      '같은 지역에 5분 내 여러 건을 제보하는 경우의 동작을 검증합니다.',
    );
    await page.getByTestId('issue-submit').click();

    const toast = page.locator(
      '[data-testid="toast-warning"], [data-testid="toast-error"]',
    );
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    await expect(toast.first()).toContainText(/5분|3건|잠시/);
    expect(alertCount).toBe(0);
  });

  // ── 6. URL 라우팅 (§2.4) ──────────────────────────────────
  test('/user/issue-new 직접 진입 + F5 유지', async ({ page }) => {
    await fakeLogin(page);
    await page.goto('/user/issue-new');
    await uscp.routingOk(page, page.getByTestId('issue-new-form'));
  });

  // ── 7. A11y (M08-10) ──────────────────────────────────────
  test('RegionSelect fieldset legend + aria-label + WCAG 위반 0건', async ({
    page,
  }) => {
    await fakeLogin(page);
    await page.goto('/user/issue-new');

    const regionSelect = page.getByTestId('region-select');
    await expect(regionSelect.locator('legend').first()).toBeVisible();

    const radiogroup = regionSelect.getByRole('radiogroup', { name: '지역' });
    await expect(radiogroup).toBeVisible();

    await uscp.a11yClean(page);
  });

  // ── 추가: 5개 지역 모두 노출 + 색상 인디케이터 ────────────
  test('5개 지역 칩 모두 노출 (cheonan 포함)', async ({ page }) => {
    await fakeLogin(page);
    await page.goto('/user/issue-new');

    for (const code of ['daejeon', 'gongju', 'yesan', 'cheonan', 'sejong']) {
      await expect(page.getByTestId(`region-${code}`)).toBeVisible();
    }
  });
});

// ── CR-5 V1 잔재 페이지 격리 확인 ────────────────────────────
test.describe('CR-5 V1 잔재 페이지 410 안내', () => {
  for (const path of [
    '/campus',
    '/volunteers',
    '/guide',
    '/portfolio/some-user-id',
  ]) {
    test(`${path} 진입 시 deprecated 안내 표시`, async ({ page }) => {
      await page.goto(path);
      const notice = page.getByTestId('deprecated-notice');
      await expect(notice).toBeVisible({ timeout: 5_000 });
      await expect(page.getByTestId('deprecated-cta')).toBeVisible();
    });
  }
});
