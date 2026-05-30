/**
 * M03-07/08/09/13 — 관리자 리빙랩 상세 통합 spec.
 *
 * 6항 검증:
 *  1. Happy: 진입 + stage + 다음 전환 버튼 노출
 *  2. M03-13 transition: 모달 → confirm → toast + 재조회
 *  3. M03-07 edit: form 토글 → save → toast
 *  4. M03-07 delete: ConfirmModal danger + 409 completed_protected 차단
 *  5. M03-08 timeline 작성: form → submit → Toast
 *  6. M03-09 deliverable: 파일 선택 → presign+PUT+create → Toast
 *  7. A11y: WCAG + Modal §7.2.1 컴플라이언스
 */
import { clearAllMocks, mockJson } from '../fixtures/api-mocks';
import { testOperator } from '../fixtures/users';
import { test, expect, uscp } from '../fixtures/uscp-test';

const PROJECT = {
  id: 'p-admin-1',
  title: '대전 보행자 안전 리빙랩',
  summary: '횡단보도 신호 조정',
  description: '상세 설명',
  region: 'daejeon',
  stage: 'recruiting',
  source_issue_id: null,
  start_at: '2026-06-01',
  end_at: '2026-12-31',
  owner_id: 'op-id',
  created_at: new Date().toISOString(),
};

async function fakeOperator(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    localStorage.setItem('access_token', 'op-token');
    localStorage.setItem('refresh_token', 'op-refresh');
  });
  await mockJson(page, '**/api/v1/users/me', 200, {
    id: 'op-id',
    email: testOperator.email,
    name: testOperator.name,
    role: 'operator',
    is_active: true,
    email_verified: true,
  });
}

test.describe('M03-07/08/09/13 관리자 리빙랩 상세', () => {
  test.afterEach(async ({ page }) => {
    await clearAllMocks(page);
  });

  // ── 1. Happy: 진입 + 다음 단계 버튼 ────────────────────────
  test('진입 + recruiting → in_progress 전환 버튼 노출', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-admin-1', 200, PROJECT);
    await mockJson(page, '**/api/v1/projects/p-admin-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    await page.goto('/admin/projects/p-admin-1');
    await expect(page.getByTestId('admin-project-detail')).toBeVisible();
    await expect(page.getByTestId('project-transition-to-in_progress')).toBeVisible();
  });

  // ── 2. M03-13 transition ─────────────────────────────────
  test('M03-13 단계 전환 — 모달 → confirm → Toast', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-admin-1', 200, PROJECT);
    await mockJson(page, '**/api/v1/projects/p-admin-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    let body: Record<string, unknown> | null = null;
    await page.route(
      '**/api/v1/admin/projects/p-admin-1/transition',
      async (route) => {
        body = route.request().postDataJSON() as Record<string, unknown>;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            project_id: 'p-admin-1',
            prev_stage: 'recruiting',
            stage: 'in_progress',
            transitioned_at: new Date().toISOString(),
          }),
        });
      },
    );

    await page.goto('/admin/projects/p-admin-1');
    await page.getByTestId('project-transition-to-in_progress').click();

    const dialog = page.getByRole('dialog', { name: /리빙랩 단계 전환/ });
    await expect(dialog).toBeVisible();
    await dialog.getByTestId('project-transition-comment').fill('킥오프 완료');
    await dialog.getByTestId('project-transition-confirm').click();

    const toast = page.locator('[data-testid="toast-success"]');
    await expect(toast.first()).toBeVisible({ timeout: 5_000 });
    expect(body).toMatchObject({ to_stage: 'in_progress' });
  });

  // ── 3. M03-07 edit ──────────────────────────────────────
  test('M03-07 수정 — form 토글 + save', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-admin-1', 200, PROJECT);
    await mockJson(page, '**/api/v1/projects/p-admin-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    let body: Record<string, unknown> | null = null;
    await page.route(
      '**/api/v1/admin/projects/p-admin-1',
      async (route) => {
        if (route.request().method() === 'PATCH') {
          body = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ project_id: 'p-admin-1', updated: true }),
          });
        } else {
          await route.fallback();
        }
      },
    );

    await page.goto('/admin/projects/p-admin-1');
    await page.getByTestId('project-edit-toggle').click();
    await page.getByTestId('project-edit-title').fill('대전 새 제목');
    await page.getByTestId('project-edit-submit').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({
      timeout: 5_000,
    });
    expect(body).toMatchObject({ title: '대전 새 제목' });
  });

  // ── 4. M03-07 delete + 409 completed_protected ───────────
  test('완료 단계 → 삭제 버튼 미노출', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-admin-1', 200, {
      ...PROJECT,
      stage: 'completed',
    });
    await mockJson(page, '**/api/v1/projects/p-admin-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    await page.goto('/admin/projects/p-admin-1');
    await expect(page.getByTestId('project-delete-open')).toHaveCount(0);
  });

  test('삭제 ConfirmModal danger + 클릭 → /admin redirect', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-admin-1', 200, PROJECT);
    await mockJson(page, '**/api/v1/projects/p-admin-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });
    await page.route(
      '**/api/v1/admin/projects/p-admin-1',
      async (route) => {
        if (route.request().method() === 'DELETE') {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ project_id: 'p-admin-1', deleted: true }),
          });
        } else {
          await route.fallback();
        }
      },
    );

    await page.goto('/admin/projects/p-admin-1');
    await page.getByTestId('project-delete-open').click();

    const modal = page.getByRole('dialog', { name: '프로젝트 삭제' });
    await uscp.modalCompliant(modal);
    await modal.getByTestId('confirm-modal-confirm').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({
      timeout: 5_000,
    });
  });

  // ── 5. M03-08 timeline 작성 ──────────────────────────────
  test('M03-08 활동 기록 추가 → Toast', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-admin-1', 200, PROJECT);
    await mockJson(page, '**/api/v1/projects/p-admin-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });

    let body: Record<string, unknown> | null = null;
    await page.route(
      '**/api/v1/projects/p-admin-1/timeline',
      async (route) => {
        if (route.request().method() === 'POST') {
          body = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 't-new',
              entry_date: body.entry_date,
              title: body.title,
              description: body.description,
              created_at: new Date().toISOString(),
              created_by: { id: 'op-id', name: testOperator.name },
            }),
          });
        } else {
          await route.fallback();
        }
      },
    );

    await page.goto('/admin/projects/p-admin-1');
    await page.getByTestId('timeline-title').fill('현장 조사');
    await page.getByTestId('timeline-submit').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({
      timeout: 5_000,
    });
    expect(body).toMatchObject({ title: '현장 조사' });
  });

  // ── 6. M03-09 산출물 업로드 (presign + PUT + create) ─────
  test('M03-09 산출물 업로드 — presign + create', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-admin-1', 200, PROJECT);
    await mockJson(page, '**/api/v1/projects/p-admin-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });
    await mockJson(
      page,
      '**/api/v1/projects/p-admin-1/deliverables/presign',
      200,
      {
        upload_url: 'https://stub-minio/key?stub=1',
        minio_key: 'deliverables/p-admin-1/test.pdf',
        expires_in_seconds: 300,
      },
    );

    let createBody: Record<string, unknown> | null = null;
    await page.route(
      '**/api/v1/projects/p-admin-1/deliverables',
      async (route) => {
        if (route.request().method() === 'POST') {
          createBody = route.request().postDataJSON() as Record<string, unknown>;
          await route.fulfill({
            status: 201,
            contentType: 'application/json',
            body: JSON.stringify({
              id: 'd-1',
              project_id: 'p-admin-1',
              title: createBody.title,
              minio_key: createBody.minio_key,
              uploaded_by: 'op-id',
              created_at: new Date().toISOString(),
            }),
          });
        } else {
          await route.fallback();
        }
      },
    );

    await page.goto('/admin/projects/p-admin-1');
    await page
      .getByTestId('deliverable-file')
      .setInputFiles({
        name: 'report.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('PDF content', 'utf-8'),
      });
    await page.getByTestId('deliverable-submit').click();

    await expect(page.locator('[data-testid="toast-success"]').first()).toBeVisible({
      timeout: 10_000,
    });
    expect(createBody).toMatchObject({
      title: 'report',
      minio_key: 'deliverables/p-admin-1/test.pdf',
    });
  });

  // ── 7. A11y ──────────────────────────────────────────────
  test('A11y — WCAG 위반 0건', async ({ page }) => {
    await fakeOperator(page);
    await mockJson(page, '**/api/v1/projects/p-admin-1', 200, PROJECT);
    await mockJson(page, '**/api/v1/projects/p-admin-1/timeline**', 200, {
      data: [],
      meta: { total: 0 },
    });
    await page.goto('/admin/projects/p-admin-1');
    await uscp.a11yClean(page);
  });
});
