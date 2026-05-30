'use client';

import { CheckCircle2, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Modal, useToast } from '@/components/ui';
import { listComments, type CommentItem } from '@/features/issues';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { resolveByComment } from '../api';

/**
 * M02-21: 댓글로 해결 종결 모달.
 *
 * 설계 근거:
 *  - feature-spec §M02-21 (댓글 답변으로 해결된 제보 종결)
 *  - design.md §7.2.1 (Modal 3분할 + danger 가까운 패턴)
 *
 * 동작:
 *  1. 모달 진입 시 해당 issue 의 댓글 목록 fetch
 *  2. 운영자가 해결로 인정할 댓글 1개 라디오 선택
 *  3. 확인 → POST /admin/issues/{id}/resolve-by-comment
 *  4. 성공 → resolved + 제보자 notify_resolved 발송
 */
export interface ResolveByCommentDialogProps {
  open: boolean;
  onClose: () => void;
  issueId: string;
  onSuccess?: () => void;
}

export function ResolveByCommentDialog({
  open,
  onClose,
  issueId,
  onSuccess,
}: ResolveByCommentDialogProps) {
  const toast = useToast();
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelected(null);
      setComments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await listComments(issueId);
        if (!cancelled) {
          // 삭제되지 않은 댓글만
          setComments(res.data.filter((c) => !c.is_deleted));
        }
      } catch {
        if (!cancelled) setComments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, issueId]);

  async function handleConfirm() {
    if (submitting || !selected) return;
    setSubmitting(true);
    try {
      await resolveByComment(issueId, selected);
      toast.success(
        '제보를 「해결완료」 로 종결했습니다. 제보자에게 이메일이 발송됩니다.',
        5000,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })?.detail;
        if (detail?.code === 'invalid_transition') {
          toast.error(detail.message ?? '현재 단계에서는 종결할 수 없습니다.');
          return;
        }
        if (detail?.code === 'comment_issue_mismatch') {
          toast.error('선택한 댓글이 본 제보 소속이 아닙니다.');
          return;
        }
        toast.error(detail?.message ?? err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : '종결 처리 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="댓글로 해결 종결"
      size="lg"
      closeOnEscape={!submitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg disabled:opacity-60"
            data-testid="resolve-cancel"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !selected}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md bg-success px-4 py-2 text-sm font-semibold text-white',
              'hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-60',
            )}
            data-testid="resolve-confirm"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            {submitting ? '처리 중...' : '해결완료로 종결'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/5 p-3 text-sm text-text">
          <MessageCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-warning"
            aria-hidden="true"
          />
          <p>
            6단계 정상 워크플로우를 우회하여 즉시 「해결완료」 로 종결합니다.
            <strong className="font-bold"> 운영자 책임 하에 신중히 사용</strong>해
            주세요. 종결 사유는 「comment_resolution」 으로 자동 기록되며,
            제보자에게 이메일이 발송됩니다.
          </p>
        </div>

        <fieldset data-testid="resolve-comments">
          <legend className="mb-2 text-sm font-semibold text-text">
            해결로 인정할 댓글 1개 선택
          </legend>
          {loading ? (
            <p className="text-sm text-text-muted">댓글 목록 로딩 중...</p>
          ) : comments.length === 0 ? (
            <p
              className="rounded-md border border-dashed border-border bg-bg p-6 text-center text-sm text-text-muted"
              data-testid="resolve-no-comments"
            >
              아직 댓글이 없습니다. 댓글 작성 후 다시 시도해 주세요.
            </p>
          ) : (
            <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
              {comments.map((c) => (
                <label
                  key={c.id}
                  className={cn(
                    'cursor-pointer rounded-md border p-3 text-sm transition',
                    selected === c.id
                      ? 'border-primary bg-primary-light'
                      : 'border-border bg-surface hover:border-primary',
                  )}
                  data-testid={`resolve-comment-${c.id}`}
                >
                  <div className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="resolve-comment"
                      value={c.id}
                      checked={selected === c.id}
                      onChange={() => setSelected(c.id)}
                      className="mt-1 h-4 w-4"
                    />
                    <div className="flex-1">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-bold text-text">
                          {c.author.name}
                        </span>
                        <span className="text-xs text-text-muted">
                          {new Date(c.created_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {c.content}
                      </p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </div>
    </Modal>
  );
}
