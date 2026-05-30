'use client';

import { ArrowLeft, Bell, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/use-auth';

/**
 * USCP V2 — 시민 회원 프로필 (sitemap #13).
 *
 * 설계 근거:
 *  - feature-spec §M01-08/09/10
 *  - design.md §7.3 #13 + §7.2.1 (탈퇴=ConfirmModal danger)
 *
 * V2 변경:
 *  - V1 avatar/department/organization 입력 제거 (sitemap 범위 외)
 *  - V2 신규: 이메일 알림 수신 토글 (M01-09)
 *  - V2 신규: 회원 탈퇴 (M01-10) — ConfirmModal danger + 비밀번호 재확인
 *  - alert/confirm 0건 — 모두 Toast/ConfirmModal
 */
const NOTIFICATION_PREF_KEY = 'uscp.notification_email_enabled';

export default function UserProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();
  const toast = useToast();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [saving, setSaving] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawPw, setWithdrawPw] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/user/profile');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setPhone((user as typeof user & { phone?: string | null }).phone ?? '');
    try {
      const stored = localStorage.getItem(NOTIFICATION_PREF_KEY);
      if (stored !== null) setNotificationEnabled(stored === 'true');
    } catch {
      /* SSR / private mode */
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.patch('/users/me', { name: name.trim(), phone: phone.trim() || null });
      try {
        localStorage.setItem(NOTIFICATION_PREF_KEY, String(notificationEnabled));
      } catch {
        /* private mode */
      }
      await refresh();
      toast.success('프로필을 저장했습니다.');
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : '저장 실패';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function confirmWithdraw() {
    if (withdrawing) return;
    if (!withdrawPw.trim()) {
      toast.error('본인 확인을 위해 비밀번호를 입력해 주세요.');
      return;
    }
    setWithdrawing(true);
    try {
      await api.post('/users/me/withdraw', { password: withdrawPw, reason: null });
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.dispatchEvent(new Event('auth-change'));
      toast.success('회원 탈퇴가 처리되었습니다. 90일 후 완전 파기됩니다.', 5000);
      router.replace('/');
    } catch (err) {
      const msg =
        err instanceof ApiError && err.status === 401
          ? '비밀번호가 일치하지 않습니다.'
          : err instanceof Error
            ? err.message
            : '탈퇴 실패';
      toast.error(msg);
    } finally {
      setWithdrawing(false);
      setWithdrawOpen(false);
      setWithdrawPw('');
    }
  }

  if (authLoading || !user) {
    return (
      <div className="container-content py-12" data-testid="profile-loading">
        <p className="text-sm text-text-muted">불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="container-content py-12" data-testid="profile-page">
      <div className="mx-auto max-w-xl">
        <Link
          href="/user/my-activities"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          내 활동으로
        </Link>

        <h1 className="mb-2 text-2xl font-black text-text">프로필</h1>
        <p className="mb-8 text-sm text-text-secondary">
          기본 정보와 이메일 알림 설정을 관리하세요.
        </p>

        <form
          onSubmit={handleSave}
          className="space-y-5 rounded-xl border border-border bg-surface p-6 shadow-sm"
          data-testid="profile-form"
        >
          <Field label="이메일" hint="이메일은 본 화면에서 변경할 수 없습니다.">
            <input
              type="email"
              value={user.email}
              disabled
              className={cn(inputClass, 'bg-bg text-text-muted')}
              data-testid="profile-email"
            />
          </Field>
          <Field label="이름">
            <input
              type="text"
              required
              minLength={2}
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputClass}
              data-testid="profile-name"
            />
          </Field>
          <Field label="연락처 (선택)">
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-0000-0000"
              className={inputClass}
              data-testid="profile-phone"
            />
          </Field>

          <fieldset className="rounded-md border border-border bg-bg p-4" data-testid="notification-toggle">
            <legend className="px-1 text-sm font-semibold text-text">
              <Bell className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
              이메일 알림 수신
            </legend>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={notificationEnabled}
                onChange={(e) => setNotificationEnabled(e.target.checked)}
                className="mt-0.5 h-4 w-4"
                data-testid="notification-checkbox"
                aria-describedby="notification-help"
              />
              <span className="text-sm">
                <strong className="block text-text">의제 단계 변경 알림 받기</strong>
                <span id="notification-help" className="block text-xs text-text-secondary">
                  본인이 제보한 의제의 단계가 변경되면 이메일로 안내합니다.
                  비밀번호 재설정·약관 개정 등 의무 발송 메일은 본 설정과 무관하게 발송됩니다.
                </span>
              </span>
            </label>
          </fieldset>

          <button
            type="submit"
            disabled={saving}
            className={cn('inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:bg-text-muted')}
            data-testid="profile-save"
          >
            <Save className="h-4 w-4" aria-hidden="true" />
            {saving ? '저장 중...' : '저장'}
          </button>
        </form>

        <section
          className="mt-8 rounded-xl border border-danger/30 bg-danger/5 p-6"
          aria-labelledby="withdraw-heading"
          data-testid="withdraw-section"
        >
          <h2 id="withdraw-heading" className="mb-2 text-base font-bold text-danger">
            <Trash2 className="mr-1 inline h-4 w-4 align-text-bottom" aria-hidden="true" />
            회원 탈퇴
          </h2>
          <p className="mb-4 text-sm text-text-secondary">
            탈퇴 즉시 이름은 「****」 로 가려지고 이메일은 익명화되며, 90일이 지나면 시스템에서 완전히 삭제됩니다.
            본인이 작성한 제보·게시글·댓글은 익명 표시로 남습니다.
          </p>
          <button
            type="button"
            onClick={() => setWithdrawOpen(true)}
            className="rounded-md border border-danger px-4 py-2 text-sm font-semibold text-danger hover:bg-danger hover:text-white"
            data-testid="withdraw-open"
          >
            탈퇴 신청
          </button>
        </section>
      </div>

      <ConfirmModal
        open={withdrawOpen}
        onClose={() => {
          if (!withdrawing) {
            setWithdrawOpen(false);
            setWithdrawPw('');
          }
        }}
        onConfirm={confirmWithdraw}
        title="회원 탈퇴 확인"
        description={
          <>
            <p className="mb-3 text-sm">
              정말 탈퇴하시겠습니까? 이 작업은 90일 후 완전히 되돌릴 수 없습니다.
            </p>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-text">본인 확인 — 현재 비밀번호 입력</span>
              <input
                type="password"
                value={withdrawPw}
                onChange={(e) => setWithdrawPw(e.target.value)}
                className={inputClass}
                autoComplete="current-password"
                data-testid="withdraw-password"
              />
            </label>
          </>
        }
        confirmLabel="탈퇴"
        cancelLabel="취소"
        variant="danger"
      />
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-text">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-text-muted">{hint}</span> : null}
    </label>
  );
}
