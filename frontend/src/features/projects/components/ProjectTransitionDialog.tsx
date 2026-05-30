'use client';

import { useEffect, useState } from 'react';

import { Modal, useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { transitionProject } from '../api';
import { PROJECT_STAGES, type ProjectStage } from '../types';

/**
 * M03-13 리빙랩 단계 전환 모달 (gatekeeping TransitionDialog 패턴 복제).
 */
export interface ProjectTransitionDialogProps {
  open: boolean;
  onClose: () => void;
  projectId: string;
  currentStage: ProjectStage;
  toStage: ProjectStage;
  onSuccess?: () => void;
}

export function ProjectTransitionDialog({
  open,
  onClose,
  projectId,
  currentStage,
  toStage,
  onSuccess,
}: ProjectTransitionDialogProps) {
  const toast = useToast();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) setComment('');
  }, [open]);

  async function handleConfirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await transitionProject(projectId, {
        to_stage: toStage,
        comment: comment.trim() || null,
      });
      const meta = PROJECT_STAGES.find((s) => s.code === toStage);
      toast.success(
        `프로젝트가 「${meta?.label ?? toStage}」 단계로 전환되었습니다.`,
        5000,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (detail?.code === 'invalid_transition') {
          toast.error(detail.message ?? '잘못된 단계 전환입니다.');
          return;
        }
        toast.error(detail?.message ?? err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : '단계 전환 실패');
    } finally {
      setSubmitting(false);
    }
  }

  const fromLabel = PROJECT_STAGES.find((s) => s.code === currentStage)?.label;
  const toLabel = PROJECT_STAGES.find((s) => s.code === toStage)?.label;

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={`리빙랩 단계 전환: ${fromLabel} → ${toLabel}`}
      size="md"
      closeOnEscape={!submitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg disabled:opacity-60"
            data-testid="project-transition-cancel"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={cn(
              'rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60',
            )}
            data-testid="project-transition-confirm"
          >
            {submitting ? '처리 중...' : '전환'}
          </button>
        </>
      }
    >
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">
          검토 의견 (선택, 감사 로그에 기록)
        </span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="단계 전환 사유 또는 검토 의견을 작성해 주세요."
          className="w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
          data-testid="project-transition-comment"
        />
      </label>
      <p className="mt-3 text-xs text-text-muted">
        단계 전환은 단방향(recruiting → in_progress → completed)이며 되돌릴 수
        없습니다.
      </p>
    </Modal>
  );
}
