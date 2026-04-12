'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Circle,
  Clock,
  Crown,
  Send,
  Users,
  UserPlus,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

interface Member {
  id: string;
  project_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

interface Application {
  id: string;
  project_id: string;
  user_id: string;
  message: string | null;
  status: string;
  decided_at: string | null;
  created_at: string;
}

interface Milestone {
  id: string;
  project_id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  status: string;
  order_index: number;
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number; page: number; size: number; totalPages: number };
}

interface Props {
  projectId: string;
  leaderId: string | null;
}

const MILESTONE_LABEL: Record<string, string> = {
  pending: '대기',
  in_progress: '진행',
  done: '완료',
};

export function ProjectMembership({ projectId, leaderId }: Props) {
  const { user, loading: authLoading } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  const [applyMessage, setApplyMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isLeader = user?.id === leaderId || user?.role === 'admin';
  const isMember = user ? members.some((m) => m.user_id === user.id) : false;
  const hasApplication = user
    ? applications.some(
        (a) => a.user_id === user.id && a.status === 'pending',
      )
    : false;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [memberList, milestoneList] = await Promise.all([
        api.get<ListResponse<Member>>(`/projects/${projectId}/members`),
        api.get<ListResponse<Milestone>>(`/projects/${projectId}/milestones`),
      ]);
      setMembers(memberList.data);
      setMilestones(milestoneList.data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadApplications = useCallback(async () => {
    if (!isLeader) return;
    try {
      const list = await api.get<ListResponse<Application>>(
        `/projects/${projectId}/applications?status=pending`,
      );
      setApplications(list.data);
    } catch {
      /* ignore */
    }
  }, [isLeader, projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!authLoading) loadApplications();
  }, [authLoading, loadApplications]);

  async function handleApply(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setError('로그인이 필요합니다.');
      return;
    }
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      await api.post<Application>(`/projects/${projectId}/apply`, {
        message: applyMessage || null,
      });
      setSuccess('참여 신청이 접수되었습니다. 리더 승인을 기다려주세요.');
      setApplyMessage('');
      await loadApplications();
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

  async function handleDecide(appId: string, decision: 'accepted' | 'rejected') {
    try {
      await api.put<Application>(
        `/projects/${projectId}/applications/${appId}`,
        { status: decision },
      );
      await Promise.all([loadData(), loadApplications()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '처리 실패');
    }
  }

  return (
    <section className="mt-8 space-y-6">
      {/* 팀원 섹션 */}
      <div className="rounded-xl border border-border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Users className="h-4 w-4 text-primary" />
            팀원 ({members.length + (leaderId ? 1 : 0)}명)
          </h3>
        </div>
        {loading ? (
          <p className="text-sm text-text-muted">불러오는 중...</p>
        ) : members.length === 0 && !leaderId ? (
          <p className="text-sm text-text-muted">아직 팀원이 없습니다.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {leaderId && (
              <li className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                <Crown className="h-3 w-3" /> 리더
              </li>
            )}
            {members.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-full bg-primary-light px-3 py-1.5 text-xs font-medium text-primary"
              >
                <UserPlus className="h-3 w-3" />
                {m.role === 'mentor' ? '멘토' : '팀원'}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 마일스톤 섹션 */}
      {milestones.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">
            마일스톤
          </h3>
          <ul className="space-y-3">
            {milestones.map((ms) => (
              <li
                key={ms.id}
                className="flex items-start gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <div className="mt-0.5">
                  {ms.status === 'done' ? (
                    <CheckCircle2 className="h-5 w-5 text-secondary" />
                  ) : ms.status === 'in_progress' ? (
                    <Clock className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-text-muted" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-text-primary">{ms.title}</h4>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        ms.status === 'done'
                          ? 'bg-secondary-light text-secondary'
                          : ms.status === 'in_progress'
                            ? 'bg-primary-light text-primary'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {MILESTONE_LABEL[ms.status] ?? ms.status}
                    </span>
                  </div>
                  {ms.description && (
                    <p className="mt-1 text-sm text-text-secondary">
                      {ms.description}
                    </p>
                  )}
                  {ms.due_date && (
                    <p className="mt-1 text-xs text-text-muted">
                      마감: {ms.due_date}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 참여 신청 (로그인 + 비멤버/비리더만) */}
      {!authLoading && user && !isLeader && !isMember && (
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Send className="h-4 w-4 text-primary" />
            이 프로젝트에 참여하기
          </h3>
          {hasApplication ? (
            <div className="rounded-md bg-primary-light p-4 text-sm text-primary">
              신청이 접수되었습니다. 리더 승인 대기 중입니다.
            </div>
          ) : (
            <form onSubmit={handleApply} className="space-y-3">
              <textarea
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                placeholder="왜 이 프로젝트에 참여하고 싶으신가요? (선택)"
                rows={3}
                maxLength={1000}
                className="w-full rounded-md border border-border px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10"
              />
              {error && (
                <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md border border-secondary/30 bg-secondary-light p-3 text-xs text-secondary">
                  {success}
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
          )}
        </div>
      )}

      {/* 비로그인 CTA */}
      {!authLoading && !user && (
        <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-text-secondary">
          <Link href="/login" className="font-semibold text-primary hover:underline">
            로그인
          </Link>
          {' '}후 프로젝트 참여 신청이 가능합니다.
        </div>
      )}

      {/* 리더: 대기 중 신청 목록 */}
      {isLeader && applications.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-6">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Clock className="h-4 w-4 text-amber-600" />
            대기 중인 신청 ({applications.length}건)
          </h3>
          <ul className="space-y-3">
            {applications.map((app) => (
              <li
                key={app.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-border p-4"
              >
                <div className="flex-1">
                  <div className="mb-1 text-xs text-text-muted">
                    {new Date(app.created_at).toLocaleString('ko-KR')}
                  </div>
                  <p className="text-sm text-text-primary">
                    {app.message || '(메시지 없음)'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleDecide(app.id, 'accepted')}
                    className="rounded-md bg-secondary px-3 py-1.5 text-xs font-semibold text-white hover:opacity-90"
                  >
                    수락
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecide(app.id, 'rejected')}
                    className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-bg-muted"
                  >
                    거절
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
