'use client';

import { useEffect, useState } from 'react';

import { Modal, useToast } from '@/components/ui';
import { ISSUE_TRACKS, type IssueTrack } from '@/components/domain';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { transitionIssue, type AdminStage } from '../api';

/**
 * M02-09~13: 단계 전환 모달.
 *
 * 설계 근거:
 *  - feature-spec §M02-09 (reviewing 진입 시 트랙 필수)
 *  - design.md §7.2.1 (Modal 3분할, backdrop 비반응)
 *  - design.md §10.3.3 6항
 *
 * 동작:
 *  - to_stage 가 'reviewing' 일 때 track 선택 UI 노출 + 필수 검증
 *  - 그 외 단계는 단순 검토 의견(comment) 입력
 *  - 409 invalid_transition → Toast 안내 + 모달 유지
 */
export interface TransitionDialogProps {
  open: boolean;
  onClose: () => void;
  issueId: string;
  currentStage: AdminStage;
  toStage: AdminStage;
  onSuccess?: () => void;
}

const STAGE_LABEL: Record<string, string> = {
  reported: '제보',
  reviewing: '검토중',
  published: '공개등록',
  mentor_assigned: '멘토배정',
  in_progress: '처리중',
  resolved: '해결완료',
  rejected: '반려',
};

export function TransitionDialog({
  open,
  onClose,
  issueId,
  currentStage,
  toStage,
  onSuccess,
}: TransitionDialogProps) {
  const toast = useToast();
  const [comment, setComment] = useState('');
  const [track, setTrack] = useState<IssueTrack | ''>('');
  const [submitting, setSubmitting] = useState(false);

  const needsTrack = toStage === 'reviewing';

  useEffect(() => {
    if (!open) {
      setComment('');
      setTrack('');
    }
  }, [open]);

  async function handleConfirm() {
    if (submitting) return;
    if (needsTrack && !track) {
      toast.error('검토중 진입 시 트랙 라벨을 선택해 주세요.');
      return;
    }
    setSubmitting(true);
    try {
      await transitionIssue(issueId, {
        to_stage: toStage,
        comment: comment.trim() || null,
        track: needsTrack ? (track as IssueTrack) : null,
      });
      toast.success(
        `단계가 「${STAGE_LABEL[toStage] ?? toStage}」 로 전환되었습니다. 제보자에게 이메일 안내가 발송됩니다.`,
        5000,
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })?.detail;
        if (detail?.code === 'invalid_transition') {
          toast.error(detail.message ?? '잘못된 단계 전환입니다.');
          return;
        }
        if (detail?.code === 'track_required') {
          toast.error('검토중 진입 시 트랙 라벨이 필요합니다.');
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

  return (
    <Modal
      open={open}
      onClose={submitting ? () => undefined : onClose}
      title={`단계 전환: ${STAGE_LABEL[currentStage]} → ${STAGE_LABEL[toStage]}`}
      size="md"
      closeOnEscape={!submitting}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg disabled:opacity-60"
            data-testid="transition-cancel"
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
            data-testid="transition-confirm"
          >
            {submitting ? '처리 중...' : '전환'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {needsTrack ? (
          <fieldset
            className="rounded-md border border-warning/40 bg-warning/5 p-4"
            data-testid="transition-track-fieldset"
          >
            <legend className="px-1 text-sm font-semibold text-warning">
              트랙 라벨 (필수, M02-09/19)
            </legend>
            <div className="mt-2 flex flex-col gap-2">
              {ISSUE_TRACKS.map((t) => (
                <label
                  key={t.value}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition',
                    track === t.value
                      ? 'border-primary bg-primary-light'
                      : 'border-border bg-surface hover:border-primary',
                  )}
                  data-testid={`transition-track-${t.value}`}
                >
                  <input
                    type="radio"
                    name="track"
                    value={t.value}
                    checked={track === t.value}
                    onChange={() => setTrack(t.value)}
                    className="h-4 w-4"
                  />
                  <span>
                    {t.icon} {t.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

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
            data-testid="transition-comment"
          />
        </label>

        <p className="text-xs text-text-muted">
          단계 전환 시 제보자에게 이메일 안내가 발송되며, 감사 로그(M08-05)에 자동
          기록됩니다.
        </p>
      </div>
    </Modal>
  );
}
