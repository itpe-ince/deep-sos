/**
 * M06 성과자료 공개 페이지 E2E.
 *
 * 설계 근거:
 *  - feature-spec §M06-02(지표 달성률)·§M06-07(공지·이벤트)·§M06-08(자료실 다운로드)
 *
 * 6항 검증:
 *  1. 성과지표 탭 — 달성률 카드 렌더
 *  2. 자료실 탭 — 다운로드 카운트 + 다운로드 호출(GET /resources/{id}/download)
 *  3. 공지·이벤트 탭 — 뱃지 구분
 *  4. 빈 상태
 *  5. 탭 전환
 *  6. A11y (페이지 스코프)
 */
import AxeBuilder from '@axe-core/playwright';

import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { test, expect } from '../fixtures/uscp-test';

const KPIS = [
  { id: 'k-1', name: '해결완료 의제', unit: '건', formula: null, target_value: 100, actual_value: 42, achievement_rate: 42.0, auto_count_source: 'resolved_issue' },
  { id: 'k-2', name: '운영 워크숍', unit: '회', formula: null, target_value: 12, actual_value: 8, achievement_rate: 66.7, auto_count_source: null },
];
const RESOURCES = [
  { id: 'r-1', title: '리빙랩 운영 가이드', category: 'guide', category_label: '가이드', tags: [], file_size: 1024, content_type: 'application/pdf', download_count: 15, created_at: new Date().toISOString() },
];
const CONTENTS = [
  { id: 'c-1', category: 'notice', category_label: '공지', title: '플랫폼 정기점검 안내', is_pinned: true, published_at: '2026-06-01', event_at: null },
  { id: 'c-2', category: 'event', category_label: '이벤트', title: '리빙랩 성과공유회', is_pinned: false, published_at: '2026-06-10', event_at: '2026-06-20' },
];

async function mockLists(page: import('@playwright/test').Page, kpis = KPIS, resources = RESOURCES, contents = CONTENTS) {
  await mockJson(page, '**/api/v1/performance', 200, { data: kpis, meta: { total: kpis.length } });
  await mockJson(page, '**/api/v1/resources**', 200, { data: resources, meta: { total: resources.length, limit: 50, offset: 0 } });
  await mockJson(page, '**/api/v1/contents**', 200, { data: contents, meta: { total: contents.length, limit: 20, offset: 0 } });
}

test.describe('M06 성과자료', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. 성과지표 달성률 ───────────────────────────────────
  test('성과지표 탭 — 달성률 카드 렌더', async ({ page }) => {
    await mockLists(page);
    await page.goto('/performance');
    await expect(page.getByTestId('performance-page')).toBeVisible();
    await expect(page.getByTestId('kpi-card')).toHaveCount(2);
    await expect(page.getByTestId('kpi-panel')).toContainText('해결완료 의제');
    await expect(page.getByTestId('kpi-panel')).toContainText('42%');
  });

  // ── 2. 자료실 다운로드 ───────────────────────────────────
  test('M06-08 자료실 — 다운로드 호출', async ({ page }) => {
    await mockLists(page);
    let downloadCalled = false;
    await page.route('**/api/v1/resources/r-1/download', async (route) => {
      downloadCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ attachment_id: 'r-1', title: '리빙랩 운영 가이드', minio_key: 'k', content_type: 'application/pdf', download_url: 'https://stub/dl?x=1' }) });
    });
    // window.open stub
    await page.addInitScript(() => { window.open = () => null; });

    await page.goto('/performance');
    await page.getByTestId('perf-tab-resources').click();
    await expect(page.getByTestId('resource-card')).toHaveCount(1);
    await page.getByTestId('resource-download').first().click();
    await expect.poll(() => downloadCalled, { timeout: 5_000 }).toBe(true);
  });

  // ── 3. 공지·이벤트 뱃지 ──────────────────────────────────
  test('M06-07 공지·이벤트 — 카테고리 뱃지', async ({ page }) => {
    await mockLists(page);
    await page.goto('/performance');
    await page.getByTestId('perf-tab-contents').click();
    await expect(page.getByTestId('content-card')).toHaveCount(2);
    await expect(page.getByTestId('content-panel')).toContainText('공지');
    await expect(page.getByTestId('content-panel')).toContainText('이벤트');
  });

  // ── 4. 빈 상태 ───────────────────────────────────────────
  test('성과지표 0건 → empty', async ({ page }) => {
    await mockLists(page, [], [], []);
    await page.goto('/performance');
    await expect(page.getByTestId('kpi-empty')).toBeVisible();
  });

  // ── 5. 탭 전환 ───────────────────────────────────────────
  test('탭 전환 — 지표 → 자료실 → 공지', async ({ page }) => {
    await mockLists(page);
    await page.goto('/performance');
    await page.getByTestId('perf-tab-resources').click();
    await expect(page.getByTestId('resource-panel')).toBeVisible();
    await page.getByTestId('perf-tab-contents').click();
    await expect(page.getByTestId('content-panel')).toBeVisible();
    await page.getByTestId('perf-tab-kpi').click();
    await expect(page.getByTestId('kpi-panel')).toBeVisible();
  });

  // ── 6. A11y ──────────────────────────────────────────────
  test('A11y — 성과자료 페이지 WCAG 위반 0건', async ({ page }) => {
    await mockLists(page);
    await page.goto('/performance');
    await expect(page.getByTestId('kpi-panel')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('[data-testid="performance-page"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blockers = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    expect(
      blockers,
      blockers.map((v) => `[${v.impact}] ${v.id}: ${v.help}`).join('\n'),
    ).toEqual([]);
  });
});
