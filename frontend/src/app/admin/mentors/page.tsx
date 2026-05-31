'use client';

import { UserPlus, Users, Link2Off, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import { ConfirmModal, useToast } from '@/components/ui';
import {
  listMentors,
  grantMentor,
  revokeMentor,
  listTeams,
  type Mentor,
  type StudentTeam,
} from '@/features/mentors';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M04 멘토·학생팀 관리 (운영자).
 *
 * 설계 근거:
 *  - feature-spec §M04-01~05 (멘토 자격 부여·해제·검색, 학생팀 구성·해체)
 *  - design.md §7.2.1 (ConfirmModal — window.confirm 금지)
 *
 * 탭 1개 화면(멘토/학생팀)으로 운영자 여정 최소화.
 */
type Tab = 'mentors' | 'teams';

export default function AdminMentorsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('mentors');

  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [teams, setTeams] = useState<StudentTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  const [grantOpen, setGrantOpen] = useState(false);
  const [grantUserId, setGrantUserId] = useState('');
  const [grantAffiliation, setGrantAffiliation] = useState('');
  const [revokeTarget, setRevokeTarget] = useState<Mentor | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [m, t] = await Promise.all([
        listMentors({ q: q.trim() || undefined, limit: 50 }),
        listTeams(),
      ]);
      setMentors(m.data);
      setTeams(t.data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }, [q, toast]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  async function handleGrant(e: React.FormEvent) {
    e.preventDefault();
    if (!grantUserId.trim()) return;
    try {
      const r = await grantMentor({
        user_id: grantUserId.trim(),
        affiliation: grantAffiliation.trim() || null,
      });
      toast.success(r.message);
      setGrantOpen(false);
      setGrantUserId('');
      setGrantAffiliation('');
      void fetchData();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { message?: string } })?.detail;
        toast.error(detail?.message ?? err.message);
      } else {
        toast.error(err instanceof Error ? err.message : '멘토 자격 부여 실패');
      }
    }
  }

  async function confirmRevoke() {
    if (!revokeTarget) return;
    try {
      const r = await revokeMentor(revokeTarget.id);
      toast.success(r.message);
      void fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '자격 해제 실패');
    } finally {
      setRevokeTarget(null);
    }
  }

  return (
    <div className="container-content py-10" data-testid="admin-mentors-page">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-black text-text">
          <Users className="h-6 w-6 text-primary" aria-hidden="true" />
          멘토·학생팀 관리
        </h1>
        <p className="mb-6 text-sm text-text-secondary">
          멘토 자격을 부여·관리하고 학생팀을 편성합니다. (M04)
        </p>

        {/* 탭 */}
        <div className="mb-6 flex gap-1 border-b border-border" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'mentors'}
            onClick={() => setTab('mentors')}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition',
              tab === 'mentors'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text',
            )}
            data-testid="tab-mentors"
          >
            멘토 ({mentors.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'teams'}
            onClick={() => setTab('teams')}
            className={cn(
              'px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition',
              tab === 'teams'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text',
            )}
            data-testid="tab-teams"
          >
            학생팀 ({teams.length})
          </button>
        </div>

        {loading ? (
          <p className="py-12 text-center text-sm text-text-muted">불러오는 중...</p>
        ) : tab === 'mentors' ? (
          <section data-testid="mentors-panel">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="relative flex-1 max-w-xs">
                <Search
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="이름으로 검색"
                  className="w-full rounded-md border border-border bg-surface py-2 pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  data-testid="mentor-search"
                />
              </div>
              <button
                type="button"
                onClick={() => setGrantOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover"
                data-testid="mentor-grant-open"
              >
                <UserPlus className="h-4 w-4" aria-hidden="true" />
                멘토 자격 부여
              </button>
            </div>

            {mentors.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-muted" data-testid="mentors-empty">
                등록된 멘토가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="mentors-list">
                {mentors.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                    data-testid="mentor-item"
                  >
                    <div>
                      <span className="font-semibold text-text">{m.name ?? m.user_id}</span>
                      {m.affiliation ? (
                        <span className="ml-2 text-sm text-text-secondary">{m.affiliation}</span>
                      ) : null}
                      {m.expertise.length > 0 ? (
                        <span className="ml-2 text-xs text-text-muted">
                          {m.expertise.join(' · ')}
                        </span>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(m)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-700 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50"
                      data-testid="mentor-revoke"
                    >
                      <Link2Off className="h-4 w-4" aria-hidden="true" />
                      자격 해제
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <section data-testid="teams-panel">
            {teams.length === 0 ? (
              <p className="py-12 text-center text-sm text-text-muted" data-testid="teams-empty">
                구성된 학생팀이 없습니다.
              </p>
            ) : (
              <ul className="space-y-2" data-testid="teams-list">
                {teams.map((t) => (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                    data-testid="team-item"
                  >
                    <div>
                      <span className="font-semibold text-text">{t.name}</span>
                      <span className="ml-2 text-sm text-text-secondary">
                        팀장: {t.leader_name ?? '—'} · 팀원 {t.member_count}명
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>

      {/* 멘토 자격 부여 모달 */}
      {grantOpen ? (
        <div
          className="fixed inset-0 z-modal-backdrop flex items-center justify-center bg-black/40 p-4"
          data-testid="grant-modal-backdrop"
        >
          <form
            onSubmit={handleGrant}
            className="w-full max-w-md rounded-xl bg-surface p-6 shadow-xl"
            data-testid="grant-modal"
          >
            <h2 className="mb-4 text-lg font-bold text-text">멘토 자격 부여</h2>
            <label className="mb-3 block text-sm">
              <span className="mb-1 block font-medium text-text">회원 ID *</span>
              <input
                type="text"
                value={grantUserId}
                onChange={(e) => setGrantUserId(e.target.value)}
                placeholder="멘토로 지정할 회원의 UUID"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                data-testid="grant-user-id"
              />
            </label>
            <label className="mb-4 block text-sm">
              <span className="mb-1 block font-medium text-text">소속 (선택)</span>
              <input
                type="text"
                value={grantAffiliation}
                onChange={(e) => setGrantAffiliation(e.target.value)}
                placeholder="예: 공주대 도시공학과"
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                data-testid="grant-affiliation"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setGrantOpen(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-text hover:bg-bg"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!grantUserId.trim()}
                className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                data-testid="grant-submit"
              >
                부여
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <ConfirmModal
        open={revokeTarget !== null}
        title="멘토 자격 해제"
        description={
          revokeTarget
            ? `${revokeTarget.name ?? revokeTarget.user_id} 님의 멘토 자격을 해제하시겠습니까? 과거 활동 이력은 보존됩니다.`
            : ''
        }
        confirmLabel="자격 해제"
        cancelLabel="취소"
        onConfirm={confirmRevoke}
        onClose={() => setRevokeTarget(null)}
        variant="danger"
      />
    </div>
  );
}
