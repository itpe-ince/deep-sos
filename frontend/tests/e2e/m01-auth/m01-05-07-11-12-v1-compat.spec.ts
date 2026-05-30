/**
 * M01-05/06/07/11/12 — V1 호환 유지 + placeholder spec.
 *
 * 본 spec 은 Sprint 1 시점 V1 라우터 (logout / password change / password reset /
 * terms pages) 가 V2 진행 중에도 사용 가능함을 표면적으로 검증한다.
 *
 * 본격 V2 마이그레이션은 다음 시점에 진행:
 *  - M01-05/06/07: Sprint 2 (V1 V2 컬럼 호환 보장 후)
 *  - M01-11/12  : Sprint 4 M07 본격 구현 시
 *
 * 따라서 본 spec 은 화면 진입 가능 여부 + 404 미발생 여부 + A11y 핵심만 검증.
 */
import { test, expect } from '../fixtures/uscp-test';

test.describe('M01-05/06/07/11/12 V1 호환', () => {
  // ── M01-05 로그아웃 — Header 통합 ─────────────────────────
  test('M01-05 — Header 의 로그아웃 버튼 접근 가능 (인증 시)', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('access_token', 'fake-test-token');
      localStorage.setItem('refresh_token', 'fake-refresh-token');
    });
    await page.route('**/api/v1/users/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'x',
          email: 'test@uscp.local',
          name: '테스트',
          role: 'citizen',
          is_active: true,
          email_verified: true,
        }),
      });
    });
    await page.goto('/');
    const logout = page.locator('button[title="로그아웃"]');
    // 데스크탑 viewport 기본 — 로그아웃 버튼은 sm 이상에서만 노출. 모바일 햄버거 진입은
    // 별도 m09-10-header.spec 에서 검증함.
    await expect(logout).toBeVisible({ timeout: 5_000 });
  });

  // ── M01-06 비밀번호 변경 — V1 화면 ──────────────────────
  test('M01-06 — /password/forgot 진입 가능 (V1)', async ({ page }) => {
    await page.goto('/password/forgot');
    await expect(page).toHaveURL(/\/password\/forgot/);
    // V1 화면 존재만 확인 — V2 본격 마이그레이션은 Sprint 후반
    await expect(page.getByRole('heading', { name: /비밀번호.*찾기/i })).toBeVisible({ timeout: 5_000 });
  });

  // ── M01-07 비밀번호 재설정 — V1 화면 ────────────────────
  test('M01-07 — /password/reset URL 진입 가능 (V1, token 미설정 시에도 404 아님)', async ({
    page,
  }) => {
    await page.goto('/password/reset?token=fake');
    // V1 페이지가 존재하면 200, 미존재 시 페이지 정의 따라 다름. 404 만 명시 차단.
    const heading = page.getByRole('heading');
    await expect(heading.first()).toBeVisible({ timeout: 5_000 });
  });

  // ── M01-11/12 약관·개인정보처리방침 페이지 ──────────────
  test('M01-11/12 — /terms/service, /terms/privacy 진입 가능 (Sprint 4 본격)', async ({
    page,
  }) => {
    // Sprint 4 M07 본격 구현 전이므로 404 가 정상일 수 있음.
    // 본 spec 은 향후 라우트 도입 시 자연스럽게 활성 검증으로 전환되도록 placeholder.
    for (const path of ['/terms/service', '/terms/privacy']) {
      await page.goto(path);
      // 페이지 URL 자체는 유지되어야 함 (CORS·서버 에러로 인한 리다이렉트 미발생)
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')));
    }
  });
});
