import { test, expect } from '@playwright/test';
import { loginAs, STUDENT } from './fixtures/auth';

test.describe('인증 플로우', () => {
  test('로그인 → 대시보드 → 로그아웃', async ({ page }) => {
    await loginAs(page, STUDENT);

    // 대시보드 이동
    await page.goto('/user/dashboard');
    // CSR 하이드레이션 대기
    await page.waitForTimeout(3000);
    // 대시보드 상단 텍스트 확인 (비로그인이면 /login으로 리디렉트됨)
    await expect(page.getByText(/안녕하세요|문제 제안|내 이슈/).first()).toBeVisible({ timeout: 8_000 });

    // 로그아웃 (Header 로그아웃 버튼)
    const logoutBtn = page.locator('button[title="로그아웃"]');
    if (await logoutBtn.isVisible().catch(() => false)) {
      await logoutBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('비밀번호 찾기 페이지 접근', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /비밀번호를 잊으셨나요/ }).click();
    await expect(page).toHaveURL(/\/password\/forgot/);
    await expect(
      page.getByRole('heading', { name: /비밀번호 찾기/ }),
    ).toBeVisible();
  });

  test('포트폴리오 공개 조회', async ({ page }) => {
    // 포트폴리오 페이지 직접 접근 (SSR이므로 로그인 불필요)
    await page.goto('/portfolio/50a3f0a6-d826-42bc-b616-f5d261f6d736');
    await expect(page.getByText(/P-17|포트폴리오|제안 이슈/).first()).toBeVisible({ timeout: 5_000 });
  });
});
