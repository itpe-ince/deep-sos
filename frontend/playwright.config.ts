import { defineConfig, devices } from '@playwright/test';

/**
 * USCP V2 Playwright 설정.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §10.3.4
 *  - CI 통합: PR 단위 실행, 머지 차단
 *  - 시각 회귀: visual-baseline/ 디렉터리에 baseline (mockup 26개)
 *  - 9 모듈 디렉터리 (m01-auth ~ m09-common)
 */
export default defineConfig({
  testDir: './tests/e2e',
  // 시각 회귀 baseline 위치 — spec 파일 옆이 아닌 중앙 디렉터리로 통합
  snapshotPathTemplate:
    './tests/e2e/visual-baseline/{testFilePath}/{arg}{ext}',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
    // toHaveScreenshot 기본 허용 픽셀 차이
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['list'],
    // CI 에서는 JUnit XML 도 생성 (GitHub Actions 통합)
    ...(process.env.CI
      ? ([['junit', { outputFile: 'playwright-report/junit.xml' }]] as const)
      : ([] as const)),
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3800',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // firefox/webkit은 CI에서만 활성화 (로컬 실행 속도)
    ...(process.env.CI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  webServer: process.env.CI
    ? undefined // CI는 별도 서비스 띄움
    : {
        command: 'npm run dev',
        port: 3800,
        reuseExistingServer: true,
      },
});
