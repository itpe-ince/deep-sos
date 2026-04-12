'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  AlertCircle,
  Briefcase,
  Clock,
  MessageCircle,
  Plus,
  ThumbsUp,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

interface UserSummary {
  my_issues_count: number;
  my_projects_count: number;
  my_volunteer_hours: number;
  total_votes_received: number;
  total_comments_received: number;
  recent_activities: Array<{
    type: string;
    title: string;
    entity_id: string;
    created_at: string;
  }>;
}

interface MyIssue {
  id: string;
  title: string;
  category: string;
  status: string;
  vote_count: number;
  comment_count: number;
  created_at: string;
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number; page: number; size: number; totalPages: number };
}

const STATUS_LABEL: Record<string, string> = {
  submitted: '접수',
  reviewing: '검토',
  assigned: '배정',
  progress: '진행',
  resolved: '해결',
  rejected: '반려',
};

const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700',
  reviewing: 'bg-amber-100 text-amber-700',
  assigned: 'bg-sky-100 text-sky-700',
  progress: 'bg-primary-light text-primary',
  resolved: 'bg-secondary-light text-secondary',
  rejected: 'bg-rose-100 text-rose-700',
};

export default function UserDashboardPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [myIssues, setMyIssues] = useState<MyIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/user/dashboard');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const [s, issues] = await Promise.all([
          api.get<UserSummary>('/users/me/summary'),
          api.get<ListResponse<MyIssue>>('/users/me/issues?page=1&size=10'),
        ]);
        if (cancelled) return;
        setSummary(s);
        setMyIssues(issues.data);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : '조회 실패');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-center text-text-secondary">
        확인 중...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">P-11 · 사용자 대시보드</p>
          <h1 className="mt-2 text-3xl font-bold text-text-primary">
            안녕하세요, {user.name}님
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            {user.role} · 레벨 {user.level} · {user.points} 포인트
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/portfolio/${user.id}`}
            className="hidden items-center gap-2 rounded-md border border-border px-4 py-3 text-sm font-semibold text-text-secondary hover:border-primary hover:text-primary sm:inline-flex"
          >
            내 포트폴리오
          </Link>
          <Link
            href="/issues/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            <Plus className="h-4 w-4" /> 문제 제안
          </Link>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-12 text-center text-text-secondary">불러오는 중...</div>
      )}

      {summary && (
        <>
          <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard
              icon={<AlertCircle className="h-5 w-5 text-primary" />}
              label="내 이슈"
              value={summary.my_issues_count}
            />
            <StatCard
              icon={<Briefcase className="h-5 w-5 text-secondary" />}
              label="리드 프로젝트"
              value={summary.my_projects_count}
            />
            <StatCard
              icon={<ThumbsUp className="h-5 w-5 text-violet-600" />}
              label="받은 공감"
              value={summary.total_votes_received}
            />
            <StatCard
              icon={<MessageCircle className="h-5 w-5 text-amber-600" />}
              label="받은 댓글"
              value={summary.total_comments_received}
            />
          </section>

          <section className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">
                  내가 등록한 이슈
                </h2>
                <Link
                  href="/issues"
                  className="text-xs text-primary hover:underline"
                >
                  전체 목록 →
                </Link>
              </div>
              {myIssues.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white p-8 text-center text-text-muted">
                  <p className="mb-3">아직 제안한 이슈가 없어요.</p>
                  <Link
                    href="/issues/new"
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    <Plus className="h-3 w-3" /> 첫 이슈 제안하기
                  </Link>
                </div>
              ) : (
                <ul className="space-y-3">
                  {myIssues.map((issue) => (
                    <li key={issue.id}>
                      <Link
                        href={`/issues/${issue.id}`}
                        className="block rounded-xl border border-border bg-white p-5 transition hover:border-primary hover:shadow-sm"
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              STATUS_COLOR[issue.status] ?? 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {STATUS_LABEL[issue.status] ?? issue.status}
                          </span>
                          <span className="text-xs text-text-muted">
                            {new Date(issue.created_at).toLocaleDateString('ko-KR')}
                          </span>
                        </div>
                        <h3 className="mb-2 font-semibold text-text-primary">
                          {issue.title}
                        </h3>
                        <div className="flex gap-4 text-xs text-text-muted">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3" /> {issue.vote_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <MessageCircle className="h-3 w-3" /> {issue.comment_count}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <aside>
              <h2 className="mb-4 text-lg font-semibold text-text-primary">
                최근 활동
              </h2>
              {summary.recent_activities.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-white p-6 text-center text-sm text-text-muted">
                  최근 활동이 없어요.
                </div>
              ) : (
                <ul className="space-y-3">
                  {summary.recent_activities.map((a) => (
                    <li
                      key={a.entity_id}
                      className="rounded-xl border border-border bg-white p-4"
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs text-text-muted">
                        <Clock className="h-3 w-3" />
                        {new Date(a.created_at).toLocaleDateString('ko-KR')}
                      </div>
                      <p className="text-sm font-medium text-text-primary line-clamp-2">
                        {a.title}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </aside>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
