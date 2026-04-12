import Link from 'next/link';
import type { Metadata } from 'next';
import { Users, Target, Calendar } from 'lucide-react';
import { serverFetch, type ListResponse, type ProjectItem } from '@/lib/server-api';

export const metadata: Metadata = {
  title: '리빙랩 프로젝트',
  description: '대학-지역이 함께 만드는 리빙랩 프로젝트를 확인하세요.',
};

const PHASE_LABEL: Record<string, string> = {
  discover: '탐색',
  execute: '실행',
  develop: '개발',
  verify: '검증',
  utilize: '활용',
};

const PHASE_COLOR: Record<string, string> = {
  discover: 'bg-sky-100 text-sky-700',
  execute: 'bg-primary-light text-primary',
  develop: 'bg-violet-100 text-violet-700',
  verify: 'bg-amber-100 text-amber-700',
  utilize: 'bg-secondary-light text-secondary',
};

export default async function ProjectsPage() {
  const data = await serverFetch<ListResponse<ProjectItem>>('/projects?page=1&size=20');

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold text-primary">BF-3 · 리빙랩 프로젝트</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary md:text-4xl">
          진행 중인 리빙랩 프로젝트
        </h1>
        <p className="mt-3 text-text-secondary">
          총 {data.meta.total}개의 프로젝트가 탐색 → 실행 → 개발 → 검증 → 활용 5단계로 운영되고 있어요.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.data.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="group block overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-lg"
          >
            <div className="aspect-[16/9] bg-gradient-to-br from-primary-light to-secondary-light" />
            <div className="p-6">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    PHASE_COLOR[p.phase] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {PHASE_LABEL[p.phase] ?? p.phase}
                </span>
                <span className="text-xs text-text-muted">{p.status}</span>
              </div>
              <h2 className="mb-2 line-clamp-2 text-lg font-semibold text-text-primary group-hover:text-primary">
                {p.title}
              </h2>
              <p className="mb-4 line-clamp-2 text-sm text-text-secondary">
                {p.description}
              </p>
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-xs text-text-muted">
                  <span>진행률</span>
                  <span>{p.progress}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> {p.member_count}
                </span>
                <span className="flex items-center gap-1">
                  <Target className="h-3 w-3" /> {p.partner_count} 파트너
                </span>
                {p.start_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {p.start_date}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
