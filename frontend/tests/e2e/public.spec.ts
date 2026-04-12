import { test, expect } from '@playwright/test';

test.describe('공개 영역 탐색', () => {
  test('홈 페이지 로드 + 주요 섹션', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/SOS랩|USCP/);
    // 핵심 텍스트 하나라도 보이면 렌더 성공
    await expect(
      page.getByText(/사회공헌|리빙랩|지역/).first(),
    ).toBeVisible();
  });

  test('이슈 목록 페이지', async ({ page }) => {
    await page.goto('/issues');
    await expect(
      page.getByRole('heading', { name: /지역 문제 제안/ }),
    ).toBeVisible();
    // 최소 1개 이슈 카드 노출
    await expect(page.locator('ul li').first()).toBeVisible();
  });

  test('프로젝트 목록 → 상세 이동', async ({ page }) => {
    await page.goto('/projects');
    await expect(
      page.getByRole('heading', { name: /리빙랩 프로젝트/ }),
    ).toBeVisible();
    // 첫 번째 프로젝트 카드 클릭
    await page.locator('a[href^="/projects/"]').first().click();
    await expect(page).toHaveURL(/\/projects\/[a-f0-9-]{36}$/);
    // 5단계 시각화 섹션 확인
    await expect(page.getByText(/리빙랩 5단계|진행 상황/)).toBeVisible();
  });

  test('봉사활동 + 성공사례 + 가이드 페이지', async ({ page }) => {
    for (const path of ['/volunteers', '/success-cases', '/guide', '/about']) {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
    }
  });

  test('이슈 지도 뷰 토글', async ({ page }) => {
    await page.goto('/issues?view=map');
    // 키 미설정 시 fallback 메시지
    await expect(
      page.getByText(/지도 보기 준비 중|위치 정보|Kakao/i).first(),
    ).toBeVisible();
  });
});
