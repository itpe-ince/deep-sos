/**
 * M04 멘토·학생팀 관리 (운영자) E2E.
 *
 * 설계 근거:
 *  - feature-spec §M04-01~05 (멘토 자격 부여·해제·검색, 학생팀 구성·해체)
 *  - design.md §7.2.1 (ConfirmModal — window.confirm 금지)
 *
 * 6항 검증:
 *  1. Happy: 멘토 목록 렌더 + 탭 전환(학생팀)
 *  2. M04-01 자격 부여: 모달 → 회원 ID 입력 → POST /admin/mentors/grant → Toast
 *  3. M04-02 자격 해제: ConfirmModal danger → POST /{id}/revoke → Toast
 *  4. M04-03 검색: 이름 검색어 → 쿼리 반영
 *  5. 권한: admin 레이아웃 게이트(비admin 차단)는 layout 책임 — 본 spec 은 operator 가정
 *  6. A11y: 멘토 패널 WCAG 위반 0건 (컴포넌트 스코프)
 */
import AxeBuilder from '@axe-core/playwright';

import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect } from '../fixtures/uscp-test';

const MENTORS = [
  {
    id: 'm-1',
    user_id: 'u-1',
    name: '김멘토',
    email: 'mentor1@test.kr',
    affiliation: '공주대 도시공학과',
    expertise: ['교통', '도시계획'],
    is_active: true,
    granted_at: new Date().toISOString(),
    revoked_at: null,
  },
  {
    id: 'm-2',
    user_id: 'u-2',
    name: '이멘토',
    email: 'mentor2@test.kr',
    affiliation: '대전시 교통정책과',
    expertise: ['정책'],
    is_active: true,
    granted_at: new Date().toISOString(),
    revoked_at: null,
  },
];

const TEAMS = [
  {
    id: 't-1',
    name: '사회혁신가 1팀',
    leader_id: 'u-10',
    leader_name: '박학생',
    is_active: true,
    member_count: 4,
    created_at: new Date().toISOString(),
    disbanded_at: null,
  },
];

async function fakeOperator(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'op-token');
    localStorage.setItem('refresh_token', 'op-refresh');
  });
  // admin/layout.tsx 의 useAuth 는 /auth/me 를 호출하고 role 'admin' 을 요구한다.
  const me = {
    id: 'op-id',
    email: testOperator.email,
    name: testOperator.name,
    role: 'admin',
    is_active: true,
    email_verified: true,
  };
  await mockJson(page, '**/api/v1/auth/me', 200, me);
  await mockJson(page, '**/api/v1/users/me', 200, me);
}

async function mockLists(
  page: import('@playwright/test').Page,
  mentors = MENTORS,
  teams = TEAMS,
) {
  await mockJson(page, '**/api/v1/admin/mentors**', 200, {
    data: mentors,
    meta: { total: mentors.length, limit: 50, offset: 0 },
  });
  await mockJson(page, '**/api/v1/admin/teams**', 200, {
    data: teams,
    meta: { total: teams.length, limit: 20, offset: 0 },
  });
}

test.describe('M04 멘토·학생팀 관리', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy: 멘토 목록 + 탭 전환 ────────────────────────
  test('멘토 목록 2건 렌더 + 학생팀 탭 전환', async ({ page }) => {
    await fakeOperator(page);
    await mockLists(page);

    await page.goto('/admin/mentors');
    await expect(page.getByTestId('admin-mentors-page')).toBeVisible();
    await expect(page.getByTestId('mentor-item')).toHaveCount(2);
    await expect(page.getByTestId('mentors-panel')).toContainText('김멘토');

    await page.getByTestId('tab-teams').click();
    await expect(page.getByTestId('team-item')).toHaveCount(1);
    await expect(page.getByTestId('teams-panel')).toContainText('사회혁신가 1팀');
  });

  // ── 2. M04-01 자격 부여 ──────────────────────────────────
  test('M04-01 멘토 자격 부여 — 모달 → POST grant → Toast', async ({ page }) => {
    await fakeOperator(page);
    await mockLists(page);

    let body: Record<string, unknown> | null = null;
    await page.route('**/api/v1/admin/mentors/grant', async (route) => {
      body = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mentor_id: 'm-new',
          user_id: body.user_id,
          already_active: false,
          message: '멘토 자격을 부여했습니다.',
        }),
      });
    });

    await page.goto('/admin/mentors');
    await page.getByTestId('mentor-grant-open').click();
    await expect(page.getByTestId('grant-modal')).toBeVisible();
    await page.getByTestId('grant-user-id').fill('u-99');
    await page.getByTestId('grant-affiliation').fill('충남대 행정학과');
    await page.getByTestId('grant-submit').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({
      timeout: 5_000,
    });
    expect(body).toMatchObject({ user_id: 'u-99', affiliation: '충남대 행정학과' });
  });

  // ── 3. M04-02 자격 해제 ──────────────────────────────────
  test('M04-02 멘토 자격 해제 — ConfirmModal danger → POST revoke', async ({ page }) => {
    await fakeOperator(page);
    await mockLists(page);

    let revokedPath: string | null = null;
    await page.route('**/api/v1/admin/mentors/*/revoke', async (route) => {
      revokedPath = new URL(route.request().url()).pathname;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mentor_id: 'm-1',
          active_matchings_warning: false,
          message: '멘토 자격을 해제했습니다.',
        }),
      });
    });

    await page.goto('/admin/mentors');
    await page.getByTestId('mentor-revoke').first().click();

    const modal = page.getByRole('dialog', { name: '멘토 자격 해제' });
    await expect(modal).toBeVisible();
    await modal.getByTestId('confirm-modal-confirm').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({
      timeout: 5_000,
    });
    expect(revokedPath).toContain('/admin/mentors/m-1/revoke');
  });

  // ── 4. M04-03 검색 ───────────────────────────────────────
  test('M04-03 멘토 이름 검색 → q 쿼리 반영', async ({ page }) => {
    await fakeOperator(page);
    await mockLists(page);

    const requested: string[] = [];
    await page.route('**/api/v1/admin/mentors?**', async (route) => {
      requested.push(new URL(route.request().url()).search);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [MENTORS[0]],
          meta: { total: 1, limit: 50, offset: 0 },
        }),
      });
    });

    await page.goto('/admin/mentors');
    await page.getByTestId('mentor-search').fill('김멘토');
    // 디바운스 없이 입력 변경 시 재조회 (useCallback dep q)
    await expect
      .poll(() => requested.some((s) => s.includes('q=')), { timeout: 5_000 })
      .toBe(true);
  });

  // ── 5. 빈 목록 ───────────────────────────────────────────
  test('멘토 0건 → empty state', async ({ page }) => {
    await fakeOperator(page);
    await mockLists(page, [], []);

    await page.goto('/admin/mentors');
    await expect(page.getByTestId('mentors-empty')).toBeVisible();
  });

  // ── 6. A11y (컴포넌트 스코프) ────────────────────────────
  test('A11y — 멘토 페이지 WCAG 위반 0건', async ({ page }) => {
    await fakeOperator(page);
    await mockLists(page);

    await page.goto('/admin/mentors');
    await expect(page.getByTestId('mentors-list')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="mentors-panel"]')
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
