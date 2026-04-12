import { test, expect } from '@playwright/test';
import { loginAs, STUDENT } from './fixtures/auth';

test.describe('BF-1 이슈 루프', () => {
  test('이슈 등록 → 상세 → 공감 토글', async ({ page }) => {
    await loginAs(page, STUDENT);

    // 이슈 등록 폼
    await page.goto('/issues/new');
    await expect(
      page.getByRole('heading', { name: /문제 제안하기/ }),
    ).toBeVisible();

    const uniqueTitle = `E2E 자동 테스트 이슈 ${Date.now()}`;
    await page.getByPlaceholder(/횡단보도/).fill(uniqueTitle);
    await page.getByRole('button', { name: '환경', exact: true }).click();
    await page
      .getByPlaceholder(/문제 상황/)
      .fill('Playwright E2E 자동 생성 이슈입니다. 삭제될 수 있습니다.');
    await page.getByRole('button', { name: /문제 제안하기/ }).click();

    // /issues/{id} 상세 리디렉션
    await page.waitForURL(/\/issues\/[a-f0-9-]{36}$/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();

    // 공감 버튼 클릭 (client component 하이드레이션 대기)
    await page.waitForTimeout(1000);
    const voteBtn = page.getByRole('button', { name: /공감하기|공감 취소/ });
    await voteBtn.click();
    // "공감 취소" 상태 확인
    await expect(
      page.getByRole('button', { name: /공감 취소/ }),
    ).toBeVisible({ timeout: 5_000 });

    // 댓글 입력
    await page.getByPlaceholder(/의견을 남겨주세요/).fill('E2E 테스트 댓글');
    await page.getByRole('button', { name: /^등록$/ }).click();
    await expect(page.getByText('E2E 테스트 댓글')).toBeVisible();
  });
});
