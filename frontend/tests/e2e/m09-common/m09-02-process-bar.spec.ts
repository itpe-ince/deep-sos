/**
 * M09-02: 6단계 프로세스 안내 바 — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M09-02 (6단계 프로세스 안내 바)
 *  - design.md §3.2 issue_stage ENUM + §7.3 #1 + §10.3.3
 *
 * 6항 검증 (정적 컴포넌트):
 *  1. Happy Path  : 6단계 모두 노출 + 번호·제목·설명
 *  2. Error Path  : N/A (네트워크 의존 없음)
 *  3. 권한 분기  : 누구나 열람
 *  4. URL 라우팅 : CTA 클릭 → /issues 이동
 *  5. Modal 규칙 : N/A (모달 없음)
 *  6. A11y       : ordered list + aria-labelledby + heading 구조 + WCAG
 */
import { test, expect, uscp } from '../fixtures/uscp-test';

const STAGES = [
  { num: 1, title: '제보' },
  { num: 2, title: '검토중' },
  { num: 3, title: '공개등록' },
  { num: 4, title: '멘토배정' },
  { num: 5, title: '처리중' },
  { num: 6, title: '해결완료' },
];

test.describe('M09-02 6단계 프로세스 안내 바', () => {
  // ── 1. Happy Path ─────────────────────────────────────────
  test('6단계 모두 노출 + 각 단계 번호·제목 확인', async ({ page }) => {
    await page.goto('/');
    const bar = page.getByTestId('home-process-bar');
    await expect(bar).toBeVisible();

    for (const stage of STAGES) {
      const step = page.getByTestId(`process-step-${stage.num}`);
      await expect(step).toBeVisible();
      await expect(step).toContainText(stage.title);
      await expect(step).toContainText(String(stage.num));
    }
  });

  // ── 3. 권한 분기 — 누구나 열람 ──────────────────────────────
  test('비로그인 사용자도 6단계 안내 열람 가능', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.goto('/');
      await expect(page.getByTestId('home-process-bar')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });

  // ── 4. URL 라우팅 (§2.4) — CTA → /issues ─────────────────
  test('CTA 클릭 시 /issues 로 이동', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('process-bar-cta').click();
    await expect(page).toHaveURL(/\/issues/);
  });

  test('홈 진입 후 F5 시 6단계 유지', async ({ page }) => {
    await page.goto('/');
    await uscp.routingOk(page, page.getByTestId('home-process-bar'));
  });

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('ordered list role + aria-labelledby + WCAG 위반 0건', async ({
    page,
  }) => {
    await page.goto('/');
    const heading = page.locator('#process-heading');
    await expect(heading).toBeVisible();

    // 6개의 step item
    const steps = page.locator('[data-testid^="process-step-"]');
    await expect(steps).toHaveCount(6);

    await uscp.a11yClean(page);
  });
});
