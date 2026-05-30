'use client';

import { type ReactNode, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

/**
 * window.confirm() 대체 컴포넌트.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §7.2.1
 * - window.confirm 절대 금지 → 본 컴포넌트로 대체
 * - 위험 액션 (삭제·반려 등) 은 variant="danger" + closeOnEscape={false} 권장
 * - onConfirm 이 Promise 를 반환하면 자동 loading 상태 표시
 */
export interface ConfirmModalProps {
  /** 모달 열림 상태 */
  open: boolean;
  /** 닫기 (취소·X 클릭·ESC) */
  onClose: () => void;
  /** 확인 콜백 — Promise 반환 시 처리 중 버튼 disabled + 'Loading…' */
  onConfirm: () => void | Promise<void>;
  /** 제목 (예: "삭제하시겠습니까?") */
  title: ReactNode;
  /** 설명 본문 (예: "이 작업은 되돌릴 수 없습니다.") */
  description?: ReactNode;
  /** 확인 버튼 라벨 (기본: "확인") */
  confirmLabel?: string;
  /** 취소 버튼 라벨 (기본: "취소") */
  cancelLabel?: string;
  /** 위험 액션 여부 — danger 시 빨간 confirm 버튼 + ESC 비활성 */
  variant?: 'default' | 'danger';
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = '확인',
  cancelLabel = '취소',
  variant = 'default',
}: ConfirmModalProps) {
  const [pending, setPending] = useState(false);
  const isDanger = variant === 'danger';

  const handleConfirm = async () => {
    if (pending) return;
    try {
      setPending(true);
      await onConfirm();
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={pending ? () => undefined : onClose}
      title={title}
      ariaDescription={
        typeof description === 'string' ? description : undefined
      }
      size="sm"
      closeOnEscape={!isDanger && !pending}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="confirm-modal-cancel"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pending}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2',
              isDanger
                ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                : 'bg-primary hover:bg-primary-dark focus:ring-primary',
            )}
            data-testid="confirm-modal-confirm"
          >
            {pending ? '처리 중…' : confirmLabel}
          </button>
        </>
      }
    >
      {description ? (
        <p className="text-sm text-gray-700">{description}</p>
      ) : null}
    </Modal>
  );
}
