import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Users, Target, Calendar, Award } from 'lucide-react';
import { serverFetch, type ProjectItem } from '@/lib/server-api';
import { ProjectMembership } from '@/components/project/ProjectMembership';

const PHASES = [
  { key: 'discover', label: '탐색', desc: '문제 탐색' },
  { key: 'execute', label: '실행', desc: '실행 설계' },
  { key: 'develop', label: '개발', desc: '솔루션 개발' },
  { key: 'verify', label: '검증', desc: '현장 검증' },
  { key: 'utilize', label: '활용', desc: '확산/활용' },
];

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectDetailPage({ params }: PageProps) {
  const { id } = await params;
  let project: ProjectItem;
  try {
    project = await serverFetch<ProjectItem>(`/projects/${id}`);
  } catch {
    notFound();
  }

  const currentPhase = PHASES.findIndex((p) => p.key === project.phase);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Link
        href="/projects"
        className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> 프로젝트 목록
      </Link>

      <article className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <header className="mb-8 border-b border-border pb-6">
          <h1 className="mb-3 text-3xl font-bold text-text-primary md:text-4xl">
            {project.title}
          </h1>
          <p className="text-text-secondary">{project.description}</p>
        </header>

        <section className="mb-10">
          <h2 className="mb-4 text-sm font-semibold text-text-secondary">
            리빙랩 5단계 진행 상황
          </h2>
          <div className="flex items-center gap-2">
            {PHASES.map((p, i) => {
              const done = i < currentPhase;
              const active = i === currentPhase;
              return (
                <div key={p.key} className="flex flex-1 flex-col items-center gap-2">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold ${
                      active
                        ? 'bg-primary text-white ring-4 ring-primary-light'
                        : done
                          ? 'bg-primary text-white'
                          : 'bg-bg-muted text-text-muted'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <div className="text-center">
                    <p
                      className={`text-xs font-medium ${
                        active || done ? 'text-primary' : 'text-text-muted'
                      }`}
                    >
                      {p.label}
                    </p>
                    <p className="text-xs text-text-muted">{p.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-text-secondary">전체 진행률</span>
              <span className="font-semibold text-primary">{project.progress}%</span>
            </div>
            <div className="h-3 rounded-full bg-bg-muted">
              <div
                className="h-3 rounded-full bg-primary"
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </section>

        <section className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-xl bg-bg-muted p-4 text-center">
            <Users className="mx-auto mb-1 h-5 w-5 text-primary" />
            <p className="text-lg font-bold text-text-primary">{project.member_count}</p>
            <p className="text-xs text-text-muted">팀원</p>
          </div>
          <div className="rounded-xl bg-bg-muted p-4 text-center">
            <Target className="mx-auto mb-1 h-5 w-5 text-secondary" />
            <p className="text-lg font-bold text-text-primary">{project.partner_count}</p>
            <p className="text-xs text-text-muted">파트너</p>
          </div>
          <div className="rounded-xl bg-bg-muted p-4 text-center">
            <Calendar className="mx-auto mb-1 h-5 w-5 text-amber-600" />
            <p className="text-sm font-semibold text-text-primary">
              {project.start_date ?? '-'}
            </p>
            <p className="text-xs text-text-muted">시작일</p>
          </div>
          <div className="rounded-xl bg-bg-muted p-4 text-center">
            <Award className="mx-auto mb-1 h-5 w-5 text-violet-600" />
            <p className="text-sm font-semibold text-text-primary">
              SDG {project.target_sdgs?.join(', ') ?? '-'}
            </p>
            <p className="text-xs text-text-muted">목표</p>
          </div>
        </section>

        {project.outcome_summary && (
          <section className="rounded-xl bg-secondary-light p-6">
            <h3 className="mb-2 text-sm font-semibold text-secondary">성과 요약</h3>
            <p className="whitespace-pre-line text-text-primary">{project.outcome_summary}</p>
          </section>
        )}
      </article>

      <ProjectMembership projectId={project.id} leaderId={project.leader_id} />
    </div>
  );
}
