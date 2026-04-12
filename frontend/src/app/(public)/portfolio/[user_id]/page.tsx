import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AlertCircle,
  Award,
  Briefcase,
  Clock,
  Crown,
  ThumbsUp,
  UserCircle,
} from 'lucide-react';
import { serverFetch } from '@/lib/server-api';
import { PortfolioPdfButton } from '@/components/portfolio/PortfolioPdfButton';

interface PortfolioResponse {
  user: {
    id: string;
    name: string;
    role: string;
    level: string;
    points: number;
    department: string | null;
    organization: string | null;
    profile_image_url: string | null;
  };
  stats: {
    issues_count: number;
    projects_count: number;
    volunteer_hours: number;
    total_votes_received: number;
  };
  issues: Array<{
    id: string;
    title: string;
    category: string;
    status: string;
    vote_count: number;
    created_at: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    phase: string;
    role: string;
    joined_at: string;
  }>;
  volunteers: Array<{
    id: string;
    title: string;
    status: string;
    confirmed_hours: number | null;
    applied_at: string;
  }>;
}

interface PageProps {
  params: Promise<{ user_id: string }>;
  searchParams: Promise<{ pdf?: string }>;
}

export default async function PortfolioPage({ params, searchParams }: PageProps) {
  const { user_id } = await params;
  const { pdf } = await searchParams;
  const isPdfMode = pdf === '1';

  let portfolio: PortfolioResponse;
  try {
    portfolio = await serverFetch<PortfolioResponse>(`/users/${user_id}/portfolio`);
  } catch {
    notFound();
  }

  const { user, stats, issues, projects, volunteers } = portfolio;

  return (
    <div
      className={`mx-auto max-w-5xl px-4 py-12 ${
        isPdfMode ? 'pdf-mode' : ''
      }`}
      data-pdf={isPdfMode ? '1' : '0'}
    >
      {!isPdfMode && <PortfolioPdfButton targetUserId={user_id} />}
      {/* Profile Hero */}
      <header className="mb-10 rounded-2xl border border-border bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center md:flex-row md:text-left">
          <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full bg-primary-light">
            {user.profile_image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.profile_image_url}
                alt={user.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-primary">
                {user.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-primary">P-17 · 포트폴리오</p>
            <h1 className="mt-1 text-3xl font-bold text-text-primary">{user.name}</h1>
            <p className="mt-1 text-sm text-text-secondary">
              {user.role} · 레벨 {user.level} · {user.points}점
              {user.department && ` · ${user.department}`}
            </p>
            {user.organization && (
              <p className="text-xs text-text-muted">{user.organization}</p>
            )}
          </div>
        </div>
      </header>

      {/* Stats */}
      <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={<AlertCircle className="h-5 w-5 text-primary" />}
          label="제안 이슈"
          value={stats.issues_count}
        />
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-secondary" />}
          label="참여 프로젝트"
          value={stats.projects_count}
        />
        <StatCard
          icon={<Clock className="h-5 w-5 text-amber-600" />}
          label="봉사 시간"
          value={`${stats.volunteer_hours}h`}
        />
        <StatCard
          icon={<ThumbsUp className="h-5 w-5 text-violet-600" />}
          label="받은 공감"
          value={stats.total_votes_received}
        />
      </section>

      {/* Issues */}
      {issues.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
            <AlertCircle className="h-4 w-4 text-primary" /> 제안한 이슈
          </h2>
          <ul className="space-y-3">
            {issues.map((i) => (
              <li key={i.id}>
                <Link
                  href={`/issues/${i.id}`}
                  className="block rounded-xl border border-border bg-white p-4 transition hover:border-primary hover:shadow-sm"
                >
                  <div className="mb-1 flex items-center gap-2 text-xs text-text-muted">
                    <span className="rounded-full bg-bg-muted px-2 py-0.5">
                      {i.category}
                    </span>
                    <span>
                      {new Date(i.created_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  <h3 className="font-semibold text-text-primary">{i.title}</h3>
                  <p className="mt-1 text-xs text-text-muted">
                    공감 {i.vote_count} · 상태 {i.status}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Briefcase className="h-4 w-4 text-secondary" /> 참여 프로젝트
          </h2>
          <ul className="space-y-3">
            {projects.map((p) => (
              <li key={p.id + p.role}>
                <Link
                  href={`/projects/${p.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-white p-4 transition hover:border-primary hover:shadow-sm"
                >
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      {p.role === 'leader' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                          <Crown className="h-3 w-3" /> 리더
                        </span>
                      ) : (
                        <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary">
                          팀원
                        </span>
                      )}
                      <span className="text-xs text-text-muted">{p.phase}</span>
                    </div>
                    <h3 className="font-semibold text-text-primary">{p.title}</h3>
                  </div>
                  <span className="text-xs text-text-muted">
                    {new Date(p.joined_at).toLocaleDateString('ko-KR')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Volunteers */}
      {volunteers.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-text-primary">
            <Award className="h-4 w-4 text-amber-600" /> 봉사활동
          </h2>
          <ul className="space-y-3">
            {volunteers.map((v) => (
              <li key={v.id + v.applied_at}>
                <Link
                  href={`/volunteers/${v.id}`}
                  className="flex items-center justify-between rounded-xl border border-border bg-white p-4 transition hover:border-primary hover:shadow-sm"
                >
                  <div>
                    <h3 className="font-semibold text-text-primary">{v.title}</h3>
                    <p className="mt-1 text-xs text-text-muted">
                      {v.status}
                      {v.confirmed_hours && ` · ${v.confirmed_hours}h 인증`}
                    </p>
                  </div>
                  <span className="text-xs text-text-muted">
                    {new Date(v.applied_at).toLocaleDateString('ko-KR')}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {issues.length === 0 &&
        projects.length === 0 &&
        volunteers.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center text-text-muted">
            <UserCircle className="mx-auto mb-3 h-12 w-12" />
            <p>아직 활동 이력이 없습니다.</p>
          </div>
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
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5 text-center">
      <div className="mb-2 flex justify-center">{icon}</div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}
