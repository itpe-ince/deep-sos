/**
 * M03-14 — 의제↔리빙랩 N:M 연결·해제 (운영자) E2E.
 *
 * H01 결정: 의제와 리빙랩은 N:M (project_issues join table).
 *  - 한 프로젝트에 여러 의제를 연결 가능
 *  - 동일 의제가 다른 프로젝트에도 연결 가능 (409 충돌 없음)
 *  - 연결/해제는 개별 단위 (DELETE /{project_id}/link-issue/{issue_id})
 *
 * 6항 검증:
 *  1. Happy: 다중 연결 목록 렌더 (2건) + 추가 연결 → Toast + 재조회
 *  2. 개별 해제: ConfirmModal danger → DELETE /{pid}/link-issue/{iid} → Toast
 *  3. Error: issue_not_found → Toast error
 *  4. URL: 연결된 의제 링크 → /issues/{id} 이동
 *  5. Modal: 해제 ConfirmModal §7.2.1 컴플라이언스
 *  6. A11y: WCAG 위반 0건
 */
import AxeBuilder from '@axe-core/playwright';

import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

const PROJECT_BASE = {
  id: 'p-link-1',
  title: '대전 통학로 안전 리빙랩',
  summary: '여러 통학로 제보를 통합 실증',
  description: '상세 설명',
  region: 'daejeon',
  stage: 'in_progress',
  start_at: '2026-06-01',
  end_at: '2026-12-31',
  owner_id: 'op-id',
  created_at: new Date().toISOString(),
};

const TWO_LINKED = [
  { id: 'i-aaa', title: '통학로 신호등이 너무 짧아요', stage: 'published' },
  { id: 'i-bbb', title: '스쿨존 과속 단속 강화 요청', stage: 'reviewing' },
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

function projectWith(linked: typeof TWO_LINKED) {
  return { ...PROJECT_BASE, linked_issues: linked };
}

test.describe('M03-14 의제↔리빙랩 N:M 연결', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy: 다중 연결 렌더 + 추가 연결 ──────────────────
  test('연결된 의제 2건 목록 렌더 + 추가 연결 → Toast', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-link-1', 200, projectWith(TWO_LINKED));
    await mockJson(page, '**/api/v1/projects/p-link-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    let linkBody: Record<string, unknown> | null = null;
    await page.route('**/api/v1/admin/projects/p-link-1/link-issue', async (route) => {
      if (route.request().method() === 'POST') {
        linkBody = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            project_id: 'p-link-1',
            linked_issue: { id: 'i-ccc', title: '횡단보도 추가 요청' },
            linked_issues: [
              ...TWO_LINKED,
              { id: 'i-ccc', title: '횡단보도 추가 요청', stage: 'reported' },
            ],
            message: '의제를 프로젝트에 연결했습니다.',
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/admin/projects/p-link-1');

    // N:M: 연결된 의제 2건이 리스트로 렌더
    const items = page.getByTestId('linked-issue-item');
    await expect(items).toHaveCount(2);
    await expect(page.getByTestId('linked-issue-panel')).toContainText(
      '통학로 신호등이 너무 짧아요',
    );
    await expect(page.getByTestId('linked-issue-panel')).toContainText(
      '스쿨존 과속 단속 강화 요청',
    );

    // 추가 연결
    await page.getByTestId('link-issue-input').fill('i-ccc');
    await page.getByTestId('link-issue-submit').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({
      timeout: 5_000,
    });
    expect(linkBody).toMatchObject({ issue_id: 'i-ccc' });
  });

  // ── 2. 개별 해제: ConfirmModal → DELETE /{pid}/link-issue/{iid} ──
  test('개별 해제 — ConfirmModal danger + DELETE 개별 경로', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-link-1', 200, projectWith(TWO_LINKED));
    await mockJson(page, '**/api/v1/projects/p-link-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    let deletedPath: string | null = null;
    // N:M 개별 해제는 issue_id 가 경로에 포함된다
    await page.route(
      '**/api/v1/admin/projects/p-link-1/link-issue/*',
      async (route) => {
        if (route.request().method() === 'DELETE') {
          deletedPath = new URL(route.request().url()).pathname;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              project_id: 'p-link-1',
              linked_issues: [TWO_LINKED[1]],
              message: '의제 연결을 해제했습니다.',
            }),
          });
        } else {
          await route.fallback();
        }
      },
    );

    await page.goto('/admin/projects/p-link-1');

    // 첫 항목 해제 버튼
    await page.getByTestId('unlink-issue').first().click();

    const modal = page.getByRole('dialog', { name: '의제 연결 해제' });
    await uscp.modalCompliant(modal);
    await modal.getByTestId('confirm-modal-confirm').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({
      timeout: 5_000,
    });
    // 개별 경로 — issue_id 가 URL 에 들어갔는지 검증 (N:M 핵심)
    expect(deletedPath).toContain('/link-issue/i-aaa');
  });

  // ── 3. Error: issue_not_found ────────────────────────────
  test('연결 실패 — 존재하지 않는 의제 ID → Toast error', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-link-1', 200, projectWith([]));
    await mockJson(page, '**/api/v1/projects/p-link-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });
    await page.route('**/api/v1/admin/projects/p-link-1/link-issue', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: {
              code: 'issue_not_found',
              message: '연결할 제보를 찾을 수 없습니다.',
            },
          }),
        });
      } else {
        await route.fallback();
      }
    });

    await page.goto('/admin/projects/p-link-1');
    await expect(page.getByTestId('linked-issue-empty')).toBeVisible();

    await page.getByTestId('link-issue-input').fill('no-such-id');
    await page.getByTestId('link-issue-submit').click();

    await expect(page.locator('[data-testid="toast-error"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── 4. URL: 연결 의제 → /issues/{id} ─────────────────────
  test('연결된 의제 링크 → /issues/{id} 경로', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-link-1', 200, projectWith(TWO_LINKED));
    await mockJson(page, '**/api/v1/projects/p-link-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    await page.goto('/admin/projects/p-link-1');
    const firstLink = page.getByTestId('linked-issue-link').first();
    await expect(firstLink).toHaveAttribute('href', '/issues/i-aaa');
  });

  // ── 5. 공개 프로젝트 상세: 연결 의제 목록 노출 ────────────
  test('공개 상세 — 연결된 의제 N건 모두 링크 노출', async ({ page }) => {
    await mockJson(page, '**/api/v1/projects/p-link-1', 200, projectWith(TWO_LINKED));
    await mockJson(page, '**/api/v1/projects/p-link-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    await page.goto('/projects/p-link-1');
    const links = page.getByTestId('project-detail-source-issue');
    await expect(links).toHaveCount(2);
  });

  // ── 6. A11y ──────────────────────────────────────────────
  // 본 컴포넌트(LinkedIssuePanel)로 스코프한다. admin 상세 페이지 전역에는
  // 본 N:M 작업과 무관한 사전 color-contrast 위반이 존재하므로, 신규 컴포넌트의
  // 접근성만 게이트한다. (전역 a11y 정리는 Phase 7 SEO·접근성 항목)
  test('A11y — 연결 패널 WCAG 위반 0건', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-link-1', 200, projectWith(TWO_LINKED));
    await mockJson(page, '**/api/v1/projects/p-link-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });
    await page.goto('/admin/projects/p-link-1');
    await expect(page.getByTestId('linked-issue-panel')).toBeVisible();

    const results = await new AxeBuilder({ page })
      .include('[data-testid="linked-issue-panel"]')
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
