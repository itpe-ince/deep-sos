'use client';

import { Send, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/use-auth';

import { createComment, deleteComment, listComments } from '../api';
import type { CommentItem } from '../types';

/**
 * M02-05 댓글 작성·수정·삭제 섹션.
 *
 * 설계 근거:
 *  - feature-spec §M02-05 (댓글, 작성자 본인 또는 운영자만 수정·삭제)
 *  - design.md §7.2.1 (삭제 = ConfirmModal danger — M01-10 패턴 복제)
 */
export interface CommentSectionProps {
  issueId: string;
  initialCount?: number;
}

export function CommentSection({
  issueId,
  initialCount = 0,
}: CommentSectionProps) {
  const { user } = useAuth();
  const toast = useToast();

  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // M01-10 패턴 복제 — 삭제 ConfirmModal
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listComments(issueId);
      setItems(res.data);
    } catch {
      // 빈 목록 fallback
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const trimmed = body.trim();
    if (!trimmed) {
      toast.error('댓글 내용을 입력해 주세요.');
      return;
    }
    if (trimmed.length > 1000) {
      toast.error('댓글은 1000자 이내로 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      const created = await createComment(issueId, trimmed);
      setItems((prev) => [...prev, created]);
      setBody('');
      toast.success('댓글을 작성했습니다.');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        toast.warning('로그인이 필요합니다.');
        return;
      }
      toast.error(err instanceof Error ? err.message : '댓글 작성 실패');
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    try {
      await deleteComment(deleteId);
      setItems((prev) =>
        prev.map((c) =>
          c.id === deleteId
            ? { ...c, is_deleted: true, content: '[삭제된 댓글입니다]' }
            : c,
        ),
      );
      toast.success('댓글을 삭제했습니다.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '댓글 삭제 실패');
    } finally {
      setDeleteId(null);
    }
  }

  const totalActive = items.filter((c) => !c.is_deleted).length;

  return (
    <section
      aria-labelledby="comments-heading"
      className="mt-8"
      data-testid="comment-section"
    >
      <h2 id="comments-heading" className="mb-4 text-lg font-bold text-text">
        댓글 {Math.max(totalActive, initialCount)}
      </h2>

      {/* 댓글 입력 */}
      {user ? (
        <form
          onSubmit={handleSubmit}
          className="mb-6 rounded-md border border-border bg-surface p-4"
          data-testid="comment-form"
        >
          <label htmlFor="comment-body" className="sr-only">
            댓글 작성
          </label>
          <textarea
            id="comment-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="댓글을 작성해 주세요 (최대 1000자)"
            className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
            data-testid="comment-input"
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-text-muted">
              {body.length} / 1000
            </span>
            <button
              type="submit"
              disabled={submitting || !body.trim()}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:bg-text-muted',
              )}
              data-testid="comment-submit"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? '작성 중...' : '댓글 작성'}
            </button>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-md border border-border bg-bg p-4 text-center text-sm text-text-secondary">
          댓글을 작성하려면{' '}
          <Link
            href={`/login?next=/issues/${issueId}`}
            className="font-semibold text-primary hover:underline"
          >
            로그인
          </Link>{' '}
          해주세요.
        </div>
      )}

      {/* 댓글 목록 */}
      {loading ? (
        <p className="text-sm text-text-muted">댓글을 불러오는 중...</p>
      ) : items.length === 0 ? (
        <p
          className="rounded-md border border-dashed border-border bg-bg p-6 text-center text-sm text-text-muted"
          data-testid="comment-empty"
        >
          첫 번째 댓글을 작성해 보세요.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" data-testid="comment-list">
          {items.map((c) => (
            <li
              key={c.id}
              data-testid="comment-item"
              data-is-deleted={c.is_deleted}
              className={cn(
                'rounded-md border border-border bg-surface p-4',
                c.is_deleted && 'border-dashed bg-bg text-text-muted',
              )}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-bold text-text">
                  {c.author.name}
                </span>
                <span className="text-xs text-text-muted">
                  {new Date(c.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
              <p
                className={cn(
                  'whitespace-pre-wrap text-sm leading-relaxed',
                  c.is_deleted && 'italic',
                )}
              >
                {c.content}
              </p>
              {!c.is_deleted && user && user.id === c.author.id ? (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteId(c.id)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-danger hover:bg-danger/10"
                    data-testid={`comment-delete-${c.id}`}
                  >
                    <Trash2 className="h-3 w-3" aria-hidden="true" />
                    삭제
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <ConfirmModal
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="댓글 삭제"
        description="댓글을 삭제하시겠습니까? 삭제 후에도 '[삭제된 댓글입니다]'로 표시됩니다."
        confirmLabel="삭제"
        cancelLabel="취소"
        variant="danger"
      />
    </section>
  );
}
