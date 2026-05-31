'use client';

import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import {
  listAdminContents,
  createContent,
  deleteContent,
  type AdminContentItem,
} from '@/features/cms';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M07-01~04 공지·이벤트 관리 (운영자, /admin/cms/contents).
 *
 * 설계 근거:
 *  - feature-spec §M07-01~04 (공지·이벤트 작성·수정·삭제, TipTap)
 *  - design.md §7.2.1 (ConfirmModal)
 *
 * 본문 편집은 단순 textarea(TipTap 통합은 후속). 카테고리 탭으로 공지/이벤트 구분.
 */
type CategoryTab = 'notice' | 'event';

export default function AdminContentsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<CategoryTab>('notice');
  const [items, setItems] = useState<AdminContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AdminContentItem | null>(null);

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const r = await listAdminContents(tab);
      setItems(r.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [tab, toast]);

  useEffect(() => {
    void fetchItems();
  }, [fetchItems]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    try {
      const r = await createContent({
        category: tab,
        title: title.trim(),
        body: body.trim(),
        is_pinned: isPinned,
        publish: true,
      });
      toast.success(r.message);
      setCreateOpen(false);
      setTitle('');
      setBody('');
      setIsPinned(false);
      void fetchItems();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { message?: string } })?.detail;
        toast.error(detail?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : '작성 실패');
      }
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const r = await deleteContent(deleteTarget.id);
      toast.success(r.message);
      void fetchItems();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '삭제 실패');
    } finally {
      setDeleteTarget(null);
    }
  }

  return (
    <div className="container-content py-10" data-testid="admin-contents-page">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-black text-text">
            <Megaphone className="h-6 w-6 text-primary" aria-hidden="true" />
            공지·이벤트 관리
          </h1>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
            data-testid="content-create-open"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {tab === 'notice' ? '공지 작성' : '이벤트 작성'}
          </button>
        </div>

        <div className="mb-6 flex gap-1 border-b border-border" role="tablist">
          {(['notice', 'event'] as CategoryTab[]).map((c) => (
            <button
              key={c}
              type="button"
              role="tab"
              aria-selected={tab === c}
              onClick={() => setTab(c)}
              className={cn(
                'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition',
                tab === c
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-secondary hover:text-text',
              )}
              data-testid={`content-tab-${c}`}
            >
              {c === 'notice' ? '공지사항' : '이벤트'}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-text-muted">불러오는 중...</p>
        ) : items.length === 0 ? (
          <p className="py-12 text-center text-sm text-text-muted" data-testid="content-empty">
            등록된 항목이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2" data-testid="content-list">
            {items.map((it) => (
              <li
                key={it.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                data-testid="content-item"
              >
                <span className="font-semibold text-text">
                  {it.is_pinned ? <span className="mr-1 text-accent">📌</span> : null}
                  {it.title}
                  {!it.is_published ? (
                    <span className="ml-2 text-xs text-text-muted">(임시저장)</span>
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(it)}
                  className="inline-flex items-center gap-1 rounded-md border border-red-700 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                  data-testid="content-delete"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" /> 삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {createOpen ? (
        <div className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/40 p-4">
          <form
            onSubmit={handleCreate}
            className="w-full max-w-lg rounded-xl bg-surface p-6 shadow-xl"
            data-testid="content-create-modal"
          >
            <h2 className="mb-4 text-lg font-bold text-text">
              {tab === 'notice' ? '공지사항 작성' : '이벤트 작성'}
            </h2>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-text">제목 *</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                data-testid="content-title"
              />
            </label>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-text">본문 *</span>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                data-testid="content-body"
              />
            </label>
            <label className="mb-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                data-testid="content-pinned"
              />
              상단 고정
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
                disabled={!title.trim() || !body.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                data-testid="content-create-submit"
              >
                게시
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmModal
        open={deleteTarget !== null}
        title="콘텐츠 삭제"
        description={
          deleteTarget
            ? `「${deleteTarget.title}」 을(를) 삭제하시겠습니까?${deleteTarget.is_published ? ' 이미 시민에게 노출된 항목입니다.' : ''}`
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
