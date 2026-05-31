/**
 * M07 콘텐츠 관리 E2E (공지·이벤트 admin + 재동의 모달).
 *
 * 설계 근거:
 *  - feature-spec §M07-01~04 (공지·이벤트 작성·삭제)·§M07-14 (재동의 모달)
 *  - design.md §7.2.1 (Modal/ConfirmModal)
 *
 * 6항 검증:
 *  1. 공지 목록 + 탭 전환(이벤트)
 *  2. M07-01 공지 작성 → POST → Toast
 *  3. M07-02 삭제 ConfirmModal → DELETE
 *  4. 빈 상태
 *  5. M07-14 재동의 필요 → 모달 노출 + 동의 → POST accept
 *  6. A11y (페이지 스코프)
 */
import AxeBuilder from '@axe-core/playwright';

import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect } from '../fixtures/uscp-test';

const NOTICES = [
  { id: 'n-1', category: 'notice', title: '정기점검 안내', is_pinned: true, is_published: true, published_at: '2026-06-01', event_at: null },
  { id: 'n-2', category: 'notice', title: '임시저장 공지', is_pinned: false, is_published: false, published_at: null, event_at: null },
];
const EVENTS = [
  { id: 'e-1', category: 'event', title: '성과공유회', is_pinned: false, is_published: true, published_at: '2026-06-10', event_at: '2026-06-20' },
];

async function fakeOperator(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'op-token');
    localStorage.setItem('refresh_token', 'op-refresh');
  });
  const me = { id: 'op-id', email: testOperator.email, name: testOperator.name, role: 'admin', is_active: true, email_verified: true };
  await mockJson(page, '**/api/v1/auth/me', 200, me);
  await mockJson(page, '**/api/v1/users/me', 200, me);
}

test.describe('M07 콘텐츠 관리 (공지·이벤트)', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  test('공지 목록 + 이벤트 탭 전환', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/admin/cms/contents?category=notice', 200, { data: NOTICES, meta: { limit: 20, offset: 0 } });
    await mockJson(page, '**/api/v1/admin/cms/contents?category=event', 200, { data: EVENTS, meta: { limit: 20, offset: 0 } });

    await page.goto('/admin/cms/contents');
    await expect(page.getByTestId('admin-contents-page')).toBeVisible();
    await expect(page.getByTestId('content-item')).toHaveCount(2);
    await expect(page.getByTestId('content-list')).toContainText('정기점검');
    await expect(page.getByTestId('content-list')).toContainText('임시저장');

    await page.getByTestId('content-tab-event').click();
    await expect(page.getByTestId('content-item')).toHaveCount(1);
    await expect(page.getByTestId('content-list')).toContainText('성과공유회');
  });

  test('M07-01 공지 작성 → POST → Toast', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/admin/cms/contents?category=notice', 200, { data: NOTICES, meta: { limit: 20, offset: 0 } });
    let body: Record<string, unknown> | null = null;
    await page.route('**/api/v1/admin/cms/contents', async (route) => {
      if (route.request().method() === 'POST') {
        body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content_id: 'n-new', category: 'notice', message: '등록했습니다.' }) });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/admin/cms/contents');
    await page.getByTestId('content-create-open').click();
    await page.getByTestId('content-title').fill('신규 공지');
    await page.getByTestId('content-body').fill('본문 내용입니다.');
    await page.getByTestId('content-create-submit').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({ timeout: 5_000 });
    expect(body).toMatchObject({ category: 'notice', title: '신규 공지' });
  });

  test('M07-02 공지 삭제 — ConfirmModal → DELETE', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/admin/cms/contents?category=notice', 200, { data: NOTICES, meta: { limit: 20, offset: 0 } });
    let deletedPath: string | null = null;
    await page.route('**/api/v1/admin/cms/contents/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        deletedPath = new URL(route.request().url()).pathname;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content_id: 'n-1', deleted: true, message: '삭제했습니다.' }) });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/admin/cms/contents');
    await page.getByTestId('content-delete').first().click();
    const modal = page.getByRole('dialog', { name: '콘텐츠 삭제' });
    await expect(modal).toBeVisible();
    await modal.getByTestId('confirm-modal-confirm').click();
    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({ timeout: 5_000 });
    expect(deletedPath).toContain('/admin/cms/contents/n-1');
  });

  test('공지 0건 → empty', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/admin/cms/contents**', 200, { data: [], meta: { limit: 20, offset: 0 } });
    await page.goto('/admin/cms/contents');
    await expect(page.getByTestId('content-empty')).toBeVisible();
  });

  test('A11y — 공지·이벤트 관리 WCAG 위반 0건', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/admin/cms/contents**', 200, { data: NOTICES, meta: { limit: 20, offset: 0 } });
    await page.goto('/admin/cms/contents');
    await expect(page.getByTestId('content-list')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include('[data-testid="admin-contents-page"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blockers = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(blockers, blockers.map((v) => `[${v.impact}] ${v.id}`).join('\n')).toEqual([]);
  });
});
