'use client';

import { Building2, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import {
  listOrganizations,
  createOrganization,
  deleteOrganization,
  toggleOrganizationActive,
  ORG_CATEGORY_LABELS,
  type Organization,
  type OrgCategory,
} from '@/features/network';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M05 협력기관 관리 (운영자, /admin/organizations).
 *
 * 설계 근거:
 *  - feature-spec §M05-01(등록·삭제)·§M05-09(활성 토글)
 *  - design.md §7.2.1 (ConfirmModal — window.confirm 금지)
 */
const CATEGORIES: OrgCategory[] = ['government', 'industry', 'academic', 'public'];

export default function AdminOrganizationsPage() {
  const toast = useToast();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Organization | null>(null);

  const [name, setName] = useState('');
  const [category, setCategory] = useState<OrgCategory>('government');
  const [intro, setIntro] = useState('');

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    try {
      // 운영자 화면은 비활성 포함 — 공개 엔드포인트가 활성만 반환하므로 includeInactive
      const r = await listOrganizations(undefined, true);
      setOrgs(r.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchOrgs();
  }, [fetchOrgs]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const r = await createOrganization({ name: name.trim(), category, intro: intro.trim() || null });
      toast.success(r.message);
      setCreateOpen(false);
      setName('');
      setIntro('');
      void fetchOrgs();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { message?: string } })?.detail;
        toast.error(detail?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : '등록 실패');
      }
    }
  }

  async function handleToggle(org: Organization) {
    try {
      const r = await toggleOrganizationActive(org.id, !org.is_active);
      toast.success(r.message);
      void fetchOrgs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '토글 실패');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const r = await deleteOrganization(deleteTarget.id);
      toast.success(r.message);
      void fetchOrgs();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })?.detail;
        // M05-01: 연관 MOU/프로그램 있으면 409 → 토글 안내
        toast.error(detail?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : '삭제 실패');
      }
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="container-content py-10" data-testid="admin-orgs-page">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-black text-text">
            <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
            협력기관 관리
          </h1>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            data-testid="org-create-open"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            협력기관 등록
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-text-muted">불러오는 중...</p>
        ) : orgs.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted" data-testid="admin-org-empty">
            등록된 협력기관이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="admin-org-list">
            {orgs.map((o) => (
              <li
                key={o.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface px-4 py-3',
                  o.is_active ? 'border-border' : 'border-border bg-bg-muted opacity-70',
                )}
                data-testid="admin-org-item"
              >
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                    {ORG_CATEGORY_LABELS[o.category as OrgCategory] ?? o.category}
                  </span>
                  <span className="font-semibold text-text">{o.name}</span>
                  {!o.is_active ? (
                    <span className="text-xs text-text-muted">(비공개)</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleToggle(o)}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg"
                    data-testid="org-toggle"
                  >
                    {o.is_active ? (
                      <>
                        <EyeOff className="h-4 w-4" aria-hidden="true" /> 비공개
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4" aria-hidden="true" /> 공개
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(o)}
                    className="inline-flex items-center gap-1 rounded-md border border-red-700 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                    data-testid="org-delete"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" /> 삭제
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 등록 모달 */}
      {createOpen ? (
        <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl"
            data-testid="org-create-modal"
          >
            <h2 className="mb-4 text-lg font-bold text-text">협력기관 등록</h2>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-text">기관명 *</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                data-testid="org-name"
              />
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-text">유형 *</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as OrgCategory)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
                data-testid="org-category"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {ORG_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </label>
            <label className="mb-4 block text-sm">
              <span className="mb-1 block font-medium text-text">소개 (선택)</span>
              <textarea
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                rows={3}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                data-testid="org-intro"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                data-testid="org-create-submit"
              >
                등록
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteTarget !== null}
        title="협력기관 삭제"
        description={
          deleteTarget
            ? `「${deleteTarget.name}」 기관을 삭제하시겠습니까? 연관된 MOU·프로그램이 있으면 삭제할 수 없으며, 대신 비공개 토글을 사용하세요.`
            : ''
        }
        confirmLabel="삭제"
        cancelLabel="취소"
        onConfirm={confirmDelete}
        onClose={() => setDeleteTarget(null)}
        variant="danger"
      />
    </div>
  );
}
