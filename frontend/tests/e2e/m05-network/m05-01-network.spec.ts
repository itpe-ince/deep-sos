/**
 * M05 협력 네트워크 E2E.
 *
 * 설계 근거:
 *  - feature-spec §M05-01/02/09 (협력기관 등록·목록·토글), §M05-05(MOU), §M05-07(커뮤니티)
 *  - design.md §7.2.1 (ConfirmModal)
 *
 * 6항 검증:
 *  1. 공개 /network — 협력기관·MOU·커뮤니티 탭 렌더
 *  2. admin 협력기관 목록 + 등록 모달 → POST → Toast
 *  3. M05-09 활성 토글 → PATCH /active
 *  4. M05-01 삭제 ConfirmModal → DELETE
 *  5. 공개 빈 상태
 *  6. A11y (컴포넌트 스코프)
 */
import AxeBuilder from '@axe-core/playwright';

import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect } from '../fixtures/uscp-test';

const ORGS = [
  { id: 'o-1', name: '대전시청', category: 'government', region: 'daejeon', contact: null, intro: '대전 지자체', is_active: true, created_at: new Date().toISOString() },
  { id: 'o-2', name: '공주대학교', category: 'academic', region: 'gongju', contact: null, intro: '주관대학', is_active: true, created_at: new Date().toISOString() },
];
const MOUS = [
  { id: 'mo-1', title: '교통안전 협약', organization_id: 'o-1', organization_name: '대전시청', signed_at: '2026-01-01', expires_at: '2027-01-01', status: 'active', has_attachment: false, body: null },
];
const POSTS = [
  { id: 'cp-1', title: '6월 정기 모임 안내', is_pinned: true, view_count: 10, author_name: '운영자', comment_count: 2, created_at: new Date().toISOString() },
];

async function fakeOperator(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'op-token');
    localStorage.setItem('refresh_token', 'op-refresh');
  });
  const me = {
    id: 'op-id', email: testOperator.email, name: testOperator.name,
    role: 'admin', is_active: true, email_verified: true,
  };
  await mockJson(page, '**/api/v1/auth/me', 200, me);
  await mockJson(page, '**/api/v1/users/me', 200, me);
}

test.describe('M05 협력 네트워크', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. 공개 /network 탭 렌더 ─────────────────────────────
  test('공개 /network — 협력기관·MOU·커뮤니티 탭', async ({ page }) => {
    await mockJson(page, '**/api/v1/network/organizations**', 200, { data: ORGS, meta: { total: 2, limit: 50, offset: 0 } });
    await mockJson(page, '**/api/v1/network/mous**', 200, { data: MOUS, meta: { total: 1, limit: 50, offset: 0 } });
    await mockJson(page, '**/api/v1/network/community**', 200, { data: POSTS, meta: { total: 1, limit: 20, offset: 0 } });

    await page.goto('/network');
    await expect(page.getByTestId('network-page')).toBeVisible();
    await expect(page.getByTestId('org-card')).toHaveCount(2);

    await page.getByTestId('network-tab-mous').click();
    await expect(page.getByTestId('mou-card')).toHaveCount(1);
    await expect(page.getByTestId('mou-panel')).toContainText('교통안전 협약');

    await page.getByTestId('network-tab-community').click();
    await expect(page.getByTestId('community-card')).toHaveCount(1);
    await expect(page.getByTestId('community-panel')).toContainText('6월 정기 모임');
  });

  // ── 2. admin 협력기관 목록 + 등록 ────────────────────────
  test('M05-01 협력기관 등록 — 모달 → POST → Toast', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/admin/organizations**', 200, { data: ORGS, meta: { total: 2, limit: 50, offset: 0 } });

    let body: Record<string, unknown> | null = null;
    await page.route('**/api/v1/admin/organizations', async (route) => {
      if (route.request().method() === 'POST') {
        body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ organization_id: 'o-new', message: '협력기관을 등록했습니다.' }) });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/admin/organizations');
    await expect(page.getByTestId('admin-org-item')).toHaveCount(2);
    await page.getByTestId('org-create-open').click();
    await page.getByTestId('org-name').fill('세종시청');
    await page.getByTestId('org-create-submit').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({ timeout: 5_000 });
    expect(body).toMatchObject({ name: '세종시청' });
  });

  // ── 3. M05-09 활성 토글 ──────────────────────────────────
  test('M05-09 활성 토글 → PATCH /active', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/admin/organizations?**', 200, { data: ORGS, meta: { total: 2, limit: 50, offset: 0 } });
    await mockJson(page, '**/api/v1/admin/organizations', 200, { data: ORGS, meta: { total: 2, limit: 50, offset: 0 } });

    let toggledPath: string | null = null;
    await page.route('**/api/v1/admin/organizations/*/active', async (route) => {
      toggledPath = new URL(route.request().url()).pathname;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ organization_id: 'o-1', is_active: false, message: '비공개(비활성)로 전환했습니다.' }) });
    });

    await page.goto('/admin/organizations');
    await page.getByTestId('org-toggle').first().click();
    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({ timeout: 5_000 });
    expect(toggledPath).toContain('/admin/organizations/o-1/active');
  });

  // ── 4. M05-01 삭제 ConfirmModal ──────────────────────────
  test('M05-01 협력기관 삭제 — ConfirmModal → DELETE', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/admin/organizations?**', 200, { data: ORGS, meta: { total: 2, limit: 50, offset: 0 } });
    await mockJson(page, '**/api/v1/admin/organizations', 200, { data: ORGS, meta: { total: 2, limit: 50, offset: 0 } });

    let deletedPath: string | null = null;
    await page.route('**/api/v1/admin/organizations/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        deletedPath = new URL(route.request().url()).pathname;
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ organization_id: 'o-1', deleted: true, message: '협력기관을 삭제했습니다.' }) });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/admin/organizations');
    await page.getByTestId('org-delete').first().click();
    const modal = page.getByRole('dialog', { name: '협력기관 삭제' });
    await expect(modal).toBeVisible();
    await modal.getByTestId('confirm-modal-confirm').click();
    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({ timeout: 5_000 });
    expect(deletedPath).toContain('/admin/organizations/o-1');
  });

  // ── 5. 공개 빈 상태 ──────────────────────────────────────
  test('공개 협력기관 0건 → empty', async ({ page }) => {
    await mockJson(page, '**/api/v1/network/organizations**', 200, { data: [], meta: { total: 0, limit: 50, offset: 0 } });
    await mockJson(page, '**/api/v1/network/mous**', 200, { data: [], meta: { total: 0, limit: 50, offset: 0 } });
    await mockJson(page, '**/api/v1/network/community**', 200, { data: [], meta: { total: 0, limit: 20, offset: 0 } });

    await page.goto('/network');
    await expect(page.getByTestId('org-empty')).toBeVisible();
  });

  // ── 6. A11y ──────────────────────────────────────────────
  test('A11y — 공개 협력 네트워크 WCAG 위반 0건', async ({ page }) => {
    await mockJson(page, '**/api/v1/network/organizations**', 200, { data: ORGS, meta: { total: 2, limit: 50, offset: 0 } });
    await mockJson(page, '**/api/v1/network/mous**', 200, { data: MOUS, meta: { total: 1, limit: 50, offset: 0 } });
    await mockJson(page, '**/api/v1/network/community**', 200, { data: POSTS, meta: { total: 1, limit: 20, offset: 0 } });

    await page.goto('/network');
    await expect(page.getByTestId('org-panel')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="network-page"]')
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
