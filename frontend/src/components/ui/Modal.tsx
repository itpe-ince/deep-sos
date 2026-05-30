'use client';

import { X } from 'lucide-react';
import {
  type KeyboardEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

/**
 * USCP V2 공통 Modal 컴포넌트
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §7.2.1 (절대 규칙)
 * - header / content / footer 3분할 구조 강제
 * - content 가 커지면 내부 스크롤 (max-height: 70vh)
 * - backdrop 클릭으로 닫기 금지 (closeOnBackdrop={false} 기본값)
 * - ESC 키 닫기 옵션 (위험 액션 모달은 closeOnEscape={false} 권장)
 * - focus trap (모달 외부로 탭 이동 차단)
 * - body scroll lock
 *
 * window.alert / window.confirm 의 모든 대체 흐름은 본 컴포넌트를 통해 구현한다.
 */
export interface ModalProps {
  /** 모달 열림 상태 */
  open: boolean;
  /** 닫기 콜백 — 닫기 버튼/footer 취소/ESC 모두 본 콜백 호출 */
  onClose: () => void;
  /** 모달 제목 (header 영역, 접근성 aria-labelledby 자동 연결) */
  title: ReactNode;
  /** 모달 본문 (content 영역, 내부 스크롤 자동 적용) */
  children: ReactNode;
  /** Footer 액션 영역 (생략 시 footer 미표시) */
  footer?: ReactNode;
  /** 모달 너비 사이즈 */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** ESC 키로 닫기 허용 (위험 액션 모달은 false 권장, 기본 true) */
  closeOnEscape?: boolean;
  /** 추가 className (drawer style 등 확장용) */
  className?: string;
  /** 모달 description (스크린리더용, 선택) */
  ariaDescription?: string;
}

const SIZE_MAP = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
} as const;

let nextId = 0;
const genId = () => `modal-${++nextId}`;

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closeOnEscape = true,
  className,
  ariaDescription,
}: ModalProps) {
  const titleIdRef = useRef(genId());
  const descIdRef = useRef(genId());
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<Element | null>(null);

  // ESC 처리
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape' && closeOnEscape) {
        e.stopPropagation();
        onClose();
      }
    },
    [closeOnEscape, onClose],
  );

  // body scroll lock + focus trap setup
  useEffect(() => {
    if (!open) return undefined;

    previousActiveElementRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // 모달 열릴 때 첫 focusable 로 포커스 이동
    const focusFirst = () => {
      const root = containerRef.current;
      if (!root) return;
      const focusable = root.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    };
    const raf = requestAnimationFrame(focusFirst);

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = originalOverflow;
      // 모달 닫힐 때 이전 포커스 복원
      const prev = previousActiveElementRef.current;
      if (prev instanceof HTMLElement) prev.focus();
    };
  }, [open]);

  if (!open) return null;

  if (typeof document === 'undefined') return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      {/* Backdrop — 클릭 이벤트 핸들러 미장착 (§7.2.1: backdrop 클릭 닫기 금지) */}
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        data-testid="modal-backdrop"
      />

      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleIdRef.current}
        aria-describedby={ariaDescription ? descIdRef.current : undefined}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative z-10 flex w-full flex-col rounded-lg bg-white shadow-xl outline-none',
          'max-h-[90vh]',
          SIZE_MAP[size],
          className,
        )}
        tabIndex={-1}
      >
        {/* ── Header (고정) ── */}
        <header className="flex shrink-0 items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2
            id={titleIdRef.current}
            className="text-lg font-semibold text-gray-900"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary"
            data-testid="modal-close"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        {/* ── Content (내부 스크롤) ── */}
        <div
          id={ariaDescription ? descIdRef.current : undefined}
          className="flex-1 overflow-y-auto px-6 py-4"
          data-testid="modal-content"
        >
          {ariaDescription ? (
            <span className="sr-only">{ariaDescription}</span>
          ) : null}
          {children}
        </div>

        {/* ── Footer (고정, optional) ── */}
        {footer ? (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
