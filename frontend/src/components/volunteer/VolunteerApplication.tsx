'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Send, CheckCircle2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

interface Participation {
  id: string;
  activity_id: string;
  user_id: string;
  status: string;
  applied_at: string;
  confirmed_hours: number | null;
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number; page: number; size: number; totalPages: number };
}

interface Props {
  activityId: string;
}

const STATUS_LABEL: Record<string, string> = {
  applied: '신청 완료',
  confirmed: '참여 확정',
  completed: '완료',
  cancelled: '취소',
};

export function VolunteerApplication({ activityId }: Props) {
  const { user, loading: authLoading } = useAuth();
  const [myParticipation, setMyParticipation] = useState<Participation | null>(
    null,
  );
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMy = useCallback(async () => {
    if (!user) return;
    try {
      const list = await api.get<ListResponse<{ id: string; activity_id: string; status: string; applied_at: string; confirmed_hours: number | null; user_id: string }>>(
        `/users/me/volunteers?page=1&size=100`,
      );
      // /users/me/volunteers returns VolunteerActivity, 비교만으로는 참여 내역 못 찾음.
      // 대안: 직접 participation 조회 가능한 엔드포인트가 없어, 활동 목록에 activityId가 있는지로 판단.
      // 참여 상세는 간단히 POST 시도 → 409면 존재로 간주.
      const hasActivity = list.data.some(
        (v: { id: string }) => v.id === activityId,
      );
      if (hasActivity) {
        setMyParticipation({
          id: 'current',
          activity_id: activityId,
          user_id: user.id,
          status: 'applied',
          applied_at: new Date().toISOString(),
          confirmed_hours: null,
        });
      }
    } catch {
      /* ignore */
    }
  }, [user, activityId]);

  useEffect(() => {
    if (!authLoading) loadMy();
  }, [authLoading, loadMy]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const part = await api.post<Participation>(
        `/volunteers/${activityId}/apply`,
        { note: note || null },
      );
      setMyParticipation(part);
      setNote('');
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string } | undefined)?.detail;
        setError(detail ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : '신청 실패');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!confirm('신청을 취소하시겠어요?')) return;
    try {
      await api.delete(`/volunteers/${activityId}/apply`);
      setMyParticipation(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '취소 실패');
    }
  }

  if (authLoading) {
    return (
      <div className="rounded-xl border border-border bg-white p-6 text-center text-sm text-text-muted">
        확인 중...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-text-secondary">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          로그인
        </Link>
        {' '}후 봉사활동에 신청할 수 있습니다.
      </div>
    );
  }

  if (myParticipation) {
    return (
      <div className="rounded-xl border border-secondary/30 bg-secondary-light p-6">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-secondary">
          <CheckCircle2 className="h-4 w-4" />
          {STATUS_LABEL[myParticipation.status] ?? myParticipation.status}
        </div>
        <p className="text-sm text-text-secondary">
          이 봉사활동에 이미 신청하셨습니다.
          {myParticipation.confirmed_hours &&
            ` 확정 시간: ${myParticipation.confirmed_hours}시간`}
        </p>
        {myParticipation.status === 'applied' && (
          <button
            type="button"
            onClick={handleCancel}
            className="mt-3 text-xs text-text-muted hover:text-danger"
          >
            신청 취소
          </button>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={handleApply}
      className="space-y-3 rounded-xl border border-border bg-white p-6"
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        <Send className="h-4 w-4 text-primary" /> 봉사활동 신청
      </h3>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="참여 동기나 경험을 적어주세요 (선택)"
        rows={3}
        maxLength={1000}
        className="w-full rounded-md border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
      />
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
          {error}
        </div>
      )}
      <button
        type="submit"
        disabled={submitting}
        className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
      >
        <Send className="h-3 w-3" />
        {submitting ? '신청 중...' : '참여 신청'}
      </button>
    </form>
  );
}
