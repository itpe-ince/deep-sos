import type { Metadata } from 'next';
import { Award, Globe, FileCheck } from 'lucide-react';
import { serverFetch, type ListResponse, type SuccessCaseItem } from '@/lib/server-api';

export const metadata: Metadata = {
  title: '성공 사례',
  description: '리빙랩 프로젝트가 만든 실제 변화를 확인하세요.',
};

export default async function SuccessCasesPage() {
  const data = await serverFetch<ListResponse<SuccessCaseItem>>(
    '/success-cases?page=1&size=20&is_published=true',
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold text-primary">BF-7 · 성공 사례</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary md:text-4xl">
          리빙랩이 만든 변화
        </h1>
        <p className="mt-3 text-text-secondary">
          문제 → 해결 과정 → 결과 → 파급 효과까지 전하는 생생한 이야기 {data.meta.total}건
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-2">
        {data.data.map((c) => (
          <article
            key={c.id}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-lg"
          >
            <div className="aspect-[16/9] bg-gradient-to-br from-secondary-light to-primary-light" />
            <div className="p-6">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                {c.policy_linked && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-light px-3 py-1 text-xs font-medium text-primary">
                    <FileCheck className="h-3 w-3" /> 정책 연계
                  </span>
                )}
                {c.global_transfer_candidate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 text-xs font-medium text-violet-700">
                    <Globe className="h-3 w-3" /> 글로벌 이전 후보
                  </span>
                )}
                {c.sdg_goals && c.sdg_goals.length > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary-light px-3 py-1 text-xs font-medium text-secondary">
                    <Award className="h-3 w-3" /> SDG {c.sdg_goals.join(', ')}
                  </span>
                )}
              </div>
              <h2 className="mb-4 text-xl font-bold text-text-primary">{c.title}</h2>

              <div className="space-y-3">
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-rose-600">문제</h3>
                  <p className="line-clamp-2 text-sm text-text-secondary">
                    {c.problem_summary}
                  </p>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-amber-600">과정</h3>
                  <p className="line-clamp-2 text-sm text-text-secondary">
                    {c.process_summary}
                  </p>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold text-secondary">결과</h3>
                  <p className="line-clamp-2 text-sm text-text-secondary">
                    {c.result_summary}
                  </p>
                </div>
                {c.impact_summary && (
                  <div>
                    <h3 className="mb-1 text-xs font-semibold text-primary">파급 효과</h3>
                    <p className="line-clamp-2 text-sm text-text-secondary">
                      {c.impact_summary}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
