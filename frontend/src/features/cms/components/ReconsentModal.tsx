'use client';

import { useEffect, useState } from 'react';

import { Modal, useToast } from '@/components/ui';

import { checkReconsentRequired, submitReconsent } from '../api';
import type { ReconsentPending } from '../types';

/**
 * M07-14 약관 재동의 요청 모달.
 *
 * 설계 근거:
 *  - feature-spec §M07-14 (다음 로그인 시 변경 약관 재동의, 거부=로그아웃·탈퇴 안내)
 *  - design.md §7.2.1 (Modal 3분할, backdrop 닫기 금지)
 *  - 개인정보보호법 §15/§22 권고
 *
 * 로그인 직후 마운트하여 재동의 필요 여부를 확인하고, 필요 시 모달을 강제 노출.
 * 동의 → 이력 갱신. 거부 → onForceLogout 콜백(로그아웃 처리).
 */
interface Props {
  /** 재동의 거부 시 호출 — 상위에서 로그아웃 처리 */
  onForceLogout: () => void;
}

export function ReconsentModal({ onForceLogout }: Props) {
  const toast = useToast();
  const [pending, setPending] = useState<ReconsentPending[]>([]);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const r = await checkReconsentRequired();
        if (active && r.required && r.pending.length > 0) {
          setPending(r.pending);
          setOpen(true);
        }
      } catch {
        // 미인증/오류 시 모달 미노출
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function handleAccept() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await submitReconsent(
        pending.map((p) => p.terms_id),
        true,
      );
      toast.success(r.message);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '재동의 처리 실패');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await submitReconsent([], false);
      // force_logout=true 예상
      toast.warning(r.message, 6000);
      setOpen(false);
      if (r.force_logout) onForceLogout();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '처리 실패');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      open={open}
      onClose={() => undefined} // 재동의는 닫기 불가 (강제 — backdrop 금지 기본, ESC 비활성)
      title="약관 재동의 안내"
      closeOnEscape={false}
      ariaDescription="개정된 약관에 재동의가 필요합니다"
    >
      <div data-testid="reconsent-modal" className="space-y-3 text-sm text-text">
        <p>
          개정된 약관에 대한 재동의가 필요합니다. 아래 약관을 확인하고 동의해 주세요.
          (개인정보보호법 권고 사항)
        </p>
        <ul className="space-y-1 rounded-md border border-border bg-bg-muted p-3">
          {pending.map((p) => (
            <li key={p.terms_id} className="font-medium text-text">
              · {p.kind_label} <span className="text-text-muted">({p.version})</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-text-muted">
          재동의를 거부하시면 로그아웃되며, 서비스 이용을 계속하시려면 재동의 또는 탈퇴가 필요합니다.
        </p>
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg disabled:opacity-60"
            data-testid="reconsent-reject"
          >
            거부 (로그아웃)
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={submitting}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            data-testid="reconsent-accept"
          >
            동의
          </button>
        </div>
      </div>
    </Modal>
  );
}
