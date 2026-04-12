import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.1 AA 접근성 자동 검증.
 * axe-core가 공개 페이지를 스캔하여 violation 0건을 검증한다.
 */
test.describe('WCAG 2.1 AA', () => {
  const PUBLIC_PAGES = [
    '/',
    '/about',
    '/campus',
    '/guide',
    '/issues',
    '/projects',
    '/volunteers',
    '/success-cases',
    '/login',
    '/password/forgot',
    '/password/reset',
  ];

  for (const path of PUBLIC_PAGES) {
    test(`${path} has no a11y violations`, async ({ page }) => {
      await page.goto(path);
      // CSR 하이드레이션 대기
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      // violation 상세를 테스트 출력에 포함
      const violations = results.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        description: v.description,
        nodes: v.nodes.length,
      }));

      expect(violations, `A11y violations on ${path}`).toEqual([]);
    });
  }
});
