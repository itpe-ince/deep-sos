'use client';

import { AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Modal, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { rejectIssue } from '../api';

/**
 * M02-14: 반려 모달 — 사유 30자 이상 + danger variant.
 *
 * 설계 근거:
 *  - feature-spec §M02-14 (반려 사유 30자 이상)
 *  - design.md §7.2.1 (Modal 3분할, danger 시 ESC/backdrop 비활성)
 *  - M01-10 ConfirmModal danger 패턴 복제
 */
export interface RejectDialogProps {
  open: boolean;
  onClose: () => void;
  issueId: string;
  onSuccess?: () => void;
}

const MIN_REASON_LENGTH = 30;
const MAX_REASON_LENGTH = 2000;

export function RejectDialog({
  open,
  onClose,
  issueId,
  onSuccess,
}: RejectDialogProps) {
  const toast = useToast();
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setReason('');
  }, [open]);

  const reasonOk = reason.trim().length >= MIN_REASON_LENGTH;

  async function handleConfirm() {
    if (submitting || !reasonOk) return;
    setSubmitting(true);
    try {
      await rejectIssue(issueId, reason.trim());
      toast.success(
        '제보를 반려 처리했습니다. 제보자에게 사유와 함께 이메일이 발송됩니다.',
        5000,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })?.detail;
        if (detail?.code === 'reject_reason_too_short') {
          toast.error(`사유는 ${MIN_REASON_LENGTH}자 이상 작성해 주세요.`);
          return;
        }
        toast.error(detail?.message ?? err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : '반려 처리 실패');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title="제보 반려"
      size="md"
      closeOnEscape={false} // danger — ESC 비활성 (실수 차단)
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg disabled:opacity-60"
            data-testid="reject-cancel"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting || !reasonOk}
            className={cn(
              'rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger/90',
              'disabled:cursor-not-allowed disabled:opacity-60',
            )}
            data-testid="reject-confirm"
          >
            {submitting ? '처리 중...' : '반려'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-text">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-danger"
            aria-hidden="true"
          />
          <p>
            반려된 제보는 일반 사용자에게 더 이상 표시되지 않으며, 제보자에게
            반려 사유와 함께 이메일이 자동 발송됩니다.
          </p>
        </div>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">
            반려 사유 ({MIN_REASON_LENGTH}자 이상)
          </span>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={5}
            maxLength={MAX_REASON_LENGTH}
            placeholder="구체적인 반려 사유를 입력해 주세요. (예: 동일 내용 중복 제보, 사실 관계 불명 등)"
            className={cn(
              'w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm outline-none focus:border-primary',
              reason && !reasonOk ? 'border-danger' : 'border-border',
            )}
            data-testid="reject-reason"
            aria-invalid={!!reason && !reasonOk}
          />
          <span
            className={cn(
              'mt-1 block text-xs',
              reasonOk ? 'text-success' : 'text-text-muted',
            )}
          >
            {reason.trim().length} / {MIN_REASON_LENGTH}자 이상 (현재{' '}
            {reasonOk ? '입력 완료' : '부족'})
          </span>
        </label>
      </div>
    </Modal>
  );
}
