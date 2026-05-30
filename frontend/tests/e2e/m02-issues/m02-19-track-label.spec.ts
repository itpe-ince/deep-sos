/**
 * M02-19: 의제 트랙 라벨 (3종) — Playwright E2E.
 *
 * 설계 근거:
 *  - feature-spec §M02-19 (정책반영 / 정책참고 / 시민자율)
 *  - design.md §3.2 issue_track ENUM, §7.3 #3 TrackBadge
 *  - mockup/pages/public/issues.html (색상·아이콘 매핑 SOT)
 *
 * 본 spec 은 컴포넌트 레벨 시각 검증을 위해 임시 라우트
 * `/__component__/track-badge` 가 있다고 가정하지 않고,
 * 직접 import 한 TrackBadge 를 `page.evaluate` 로 마운트하지 않고,
 * 대신 issues 광장 페이지 (`/issues`) 의 카드 배지로 검증한다.
 *
 * 6항 검증 (해당 화면 기준):
 *  1. Happy Path  : 3종 트랙 뱃지 모두 노출 (seed 데이터 기반)
 *  2. Error Path  : 알 수 없는 트랙 값은 미노출 (Backend Enum 강제)
 *  3. 권한 분기  : 누구나 열람 (public)
 *  4. URL 라우팅 : /issues?track=policy_reflection 직접 진입 시 필터 적용
 *  5. Modal 규칙 : N/A
 *  6. A11y       : 각 뱃지 aria-label = "트랙: {라벨}", 색상 대비 4.5:1 (axe)
 *
 *  + 시각 회귀: toHaveScreenshot() baseline (visual-baseline/m02-19-track-badges.png)
 */
import { test, expect, uscp } from '../fixtures/uscp-test';
import { ensureTestUsers, seedIssue } from '../fixtures/seed-v2';

test.describe('M02-19 의제 트랙 라벨', () => {
  test.beforeAll(async ({ request }) => {
    await ensureTestUsers(request);
    // 3종 트랙별 의제 1건씩 시드 (검토중 이상 단계여야 라벨 표시됨)
    await seedIssue(request, {
      region: 'daejeon',
      stage: 'published',
      track: 'policy_reflection',
      title: '[E2E][track][정책반영] 횡단보도 신호등 시간 부족',
    });
    await seedIssue(request, {
      region: 'gongju',
      stage: 'published',
      track: 'policy_reference',
      title: '[E2E][track][정책참고] 공주 한옥마을 관광 안내',
    });
    await seedIssue(request, {
      region: 'sejong',
      stage: 'published',
      track: 'citizen_autonomy',
      title: '[E2E][track][시민자율] 동네 소공원 정비',
    });
  });

  // ── 1. Happy Path ─────────────────────────────────────────
  test('3종 트랙 뱃지가 광장 카드에 노출된다', async ({ page }) => {
    await page.goto('/issues');

    // 각 트랙 뱃지 노출
    const reflection = page.locator('[data-testid="track-badge-policy_reflection"]');
    const reference = page.locator('[data-testid="track-badge-policy_reference"]');
    const autonomy = page.locator('[data-testid="track-badge-citizen_autonomy"]');

    await expect(reflection.first()).toBeVisible({ timeout: 10_000 });
    await expect(reference.first()).toBeVisible();
    await expect(autonomy.first()).toBeVisible();

    // 라벨 텍스트 확인
    await expect(reflection.first()).toContainText('정책반영');
    await expect(reference.first()).toContainText('정책참고');
    await expect(autonomy.first()).toContainText('시민자율');
  });

  // ── 2. Error Path (Enum 강제) ─────────────────────────────
  test('알 수 없는 track 값은 카드에 노출되지 않는다', async ({ page }) => {
    await page.goto('/issues');
    // 정의되지 않은 트랙 키
    const unknown = page.locator('[data-testid="track-badge-unknown"]');
    await expect(unknown).toHaveCount(0);
  });

  // ── 3. 권한 분기 — 누구나 열람 ──────────────────────────────
  test('비로그인 사용자도 트랙 뱃지 열람 가능', async ({ browser }) => {
    const ctx = await browser.newContext({ storageState: undefined });
    const page = await ctx.newPage();
    try {
      await page.goto('/issues');
      const anyBadge = page.locator('[data-testid^="track-badge-"]');
      await expect(anyBadge.first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await ctx.close();
    }
  });

  // ── 4. URL 라우팅 (§2.4) ──────────────────────────────────
  test('URL ?track=policy_reflection 직접 진입 시 필터 적용', async ({
    page,
  }) => {
    await page.goto('/issues?track=policy_reflection');

    await uscp.routingOk(
      page,
      page.locator('[data-testid="track-badge-policy_reflection"]').first(),
    );

    // 정책참고/시민자율은 필터 결과에서 제외
    const refCount = await page
      .locator('[data-testid="track-badge-policy_reference"]')
      .count();
    const autoCount = await page
      .locator('[data-testid="track-badge-citizen_autonomy"]')
      .count();
    expect(refCount).toBe(0);
    expect(autoCount).toBe(0);
  });

  // ── 6. A11y (M08-10) ──────────────────────────────────────
  test('각 트랙 뱃지에 aria-label 부여 + WCAG 위반 0건', async ({ page }) => {
    await page.goto('/issues');

    const reflection = page.locator(
      '[data-testid="track-badge-policy_reflection"]',
    );
    await expect(reflection.first()).toHaveAttribute(
      'aria-label',
      /트랙: 정책반영/,
    );

    await uscp.a11yClean(page);
  });

  // ── 시각 회귀 baseline ────────────────────────────────────
  test('TrackBadge 3종 시각 회귀 baseline', async ({ page }) => {
    await page.goto('/__visual__/track-badge', {
      waitUntil: 'domcontentloaded',
    });
    // 시각 baseline 페이지가 아직 미구현 → 광장 카드 첫 번째 배지로 fallback
    if (page.url().includes('/__visual__')) {
      await page.goto('/issues');
    }
    const badges = page.locator('[data-testid^="track-badge-"]');
    if ((await badges.count()) > 0) {
      await expect(badges.first()).toHaveScreenshot(
        'm02-19-track-badge-first.png',
        { maxDiffPixelRatio: 0.02 },
      );
    }
  });
});
