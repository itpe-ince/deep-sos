'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

/**
 * USCP V2 공통 Toast 컴포넌트 + Provider.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §7.2.1
 * - window.alert 절대 금지 → toast.info/success/error/warning 으로 대체
 * - 우측 상단 stacking, 3~5초 자동 dismiss
 * - aria-live="polite" (info/success) / "assertive" (error/warning) 로 스크린리더 호환
 */
type ToastVariant = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  variant: ToastVariant;
  message: ReactNode;
  durationMs: number;
}

interface ToastContextValue {
  show: (variant: ToastVariant, message: ReactNode, durationMs?: number) => string;
  dismiss: (id: string) => void;
  success: (message: ReactNode, durationMs?: number) => string;
  error: (message: ReactNode, durationMs?: number) => string;
  info: (message: ReactNode, durationMs?: number) => string;
  warning: (message: ReactNode, durationMs?: number) => string;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const VARIANT_META: Record<
  ToastVariant,
  { bg: string; text: string; iconColor: string; Icon: typeof CheckCircle2; ariaLive: 'polite' | 'assertive' }
> = {
  success: {
    bg: 'bg-emerald-50 border-emerald-300',
    text: 'text-emerald-900',
    iconColor: 'text-emerald-600',
    Icon: CheckCircle2,
    ariaLive: 'polite',
  },
  error: {
    bg: 'bg-red-50 border-red-300',
    text: 'text-red-900',
    iconColor: 'text-red-600',
    Icon: AlertCircle,
    ariaLive: 'assertive',
  },
  info: {
    bg: 'bg-blue-50 border-blue-300',
    text: 'text-blue-900',
    iconColor: 'text-blue-600',
    Icon: Info,
    ariaLive: 'polite',
  },
  warning: {
    bg: 'bg-amber-50 border-amber-300',
    text: 'text-amber-900',
    iconColor: 'text-amber-600',
    Icon: AlertTriangle,
    ariaLive: 'assertive',
  },
};

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 3000,
  info: 3000,
  warning: 5000,
  error: 5000,
};

let toastSeq = 0;
const nextId = () => `toast-${++toastSeq}-${Date.now()}`;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback<ToastContextValue['show']>(
    (variant, message, durationMs) => {
      const id = nextId();
      const duration = durationMs ?? DEFAULT_DURATIONS[variant];
      setItems((prev) => [...prev, { id, variant, message, durationMs: duration }]);
      const timer = setTimeout(() => dismiss(id), duration);
      timersRef.current.set(id, timer);
      return id;
    },
    [dismiss],
  );

  // unmount 시 모든 타이머 정리
  useEffect(
    () => () => {
      timersRef.current.forEach((t) => clearTimeout(t));
      timersRef.current.clear();
    },
    [],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      dismiss,
      success: (m, d) => show('success', m, d),
      error: (m, d) => show('error', m, d),
      info: (m, d) => show('info', m, d),
      warning: (m, d) => show('warning', m, d),
    }),
    [show, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer items={items} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (typeof document === 'undefined') return null;
  if (items.length === 0) return null;

  return createPortal(
    <div
      className="pointer-events-none fixed right-4 top-4 z-[60] flex w-full max-w-sm flex-col gap-2"
      data-testid="toast-container"
    >
      {items.map((item) => (
        <ToastItemView key={item.id} item={item} onDismiss={onDismiss} />
      ))}
    </div>,
    document.body,
  );
}

function ToastItemView({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const meta = VARIANT_META[item.variant];
  const Icon = meta.Icon;

  return (
    <div
      role="status"
      aria-live={meta.ariaLive}
      className={cn(
        'pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 shadow-md',
        meta.bg,
        meta.text,
      )}
      data-testid={`toast-${item.variant}`}
    >
      <Icon size={20} className={cn('mt-0.5 shrink-0', meta.iconColor)} aria-hidden="true" />
      <div className="flex-1 text-sm leading-relaxed">{item.message}</div>
      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        aria-label="알림 닫기"
        className={cn(
          'shrink-0 rounded p-0.5 opacity-70 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current',
        )}
      >
        <X size={16} aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error(
      'useToast must be used within ToastProvider. Wrap your app root in <ToastProvider>.',
    );
  }
  return ctx;
}
