import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileCheck, CalendarCheck } from 'lucide-react';

import { serverFetch, type SuccessCaseItem } from '@/lib/server-api';
import { sanitizeRichText } from '@/lib/sanitize';

/**
 * M03-11/12 — 성공사례 상세 (공개).
 *
 * 설계 근거:
 *  - feature-spec §M03-11 (4단계 스토리 공개)
 *  - feature-spec §M03-12 (정책 반영 기록 노출)
 *
 * 본문(problem/process/result/policy_detail)은 운영자가 TipTap 으로 작성한
 * HTML. prose 로 렌더링하며, sanitizeRichText 로 정화 후 출력 (G-M07-3/4 stored XSS 방어).
 */

async function fetchCase(id: string): Promise<SuccessCaseItem | null> {
  try {
    return await serverFetch<SuccessCaseItem>(`/success-cases/${id}`);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const c = await fetchCase(id);
  return {
    title: c ? `${c.title} · 성공 사례` : '성공 사례',
    description: c ? c.title : '리빙랩 성공 사례',
  };
}

function Stage({
  step,
  label,
  color,
  html,
}: {
  step: string;
  label: string;
  color: string;
  html: string;
}) {
  return (
    <section className="mb-8">
      <h2 className={`mb-2 text-sm font-bold ${color}`}>
        {step} {label}
      </h2>
      <div
        className="prose prose-sm max-w-none text-text-secondary"
        dangerouslySetInnerHTML={{ __html: sanitizeRichText(html) }}
      />
    </section>
  );
}

export default async function SuccessCaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await fetchCase(id);
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/success-cases"
        className="mb-6 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        성공 사례 목록
      </Link>

      <header className="mb-8">
        <p className="text-sm font-semibold text-primary">BF-7 · 성공 사례</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">{c.title}</h1>
      </header>

      {c.cover_image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.cover_image_url}
          alt=""
          className="mb-8 w-full rounded-2xl object-cover"
        />
      ) : null}

      <Stage step="①" label="어떤 문제였는가" color="text-rose-600" html={c.problem_summary} />
      <Stage step="②" label="어떻게 해결했는가" color="text-amber-600" html={c.process_summary} />
      <Stage step="③" label="어떤 결과를 얻었는가" color="text-secondary" html={c.result_summary} />

      {/* ④ M03-12 정책반영 기록 */}
      {c.policy_linked ? (
        <section className="mt-10 rounded-2xl border border-primary/30 bg-primary-light/40 p-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-primary">
            <FileCheck className="h-4 w-4" aria-hidden="true" />④ 정책 반영
          </h2>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            {c.policy_name ? (
              <span className="font-semibold text-text-primary">{c.policy_name}</span>
            ) : null}
            {c.effective_date ? (
              <span className="inline-flex items-center gap-1 text-text-secondary">
                <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                시행일 {c.effective_date}
              </span>
            ) : null}
          </div>
          {c.policy_detail ? (
            <div
              className="prose prose-sm max-w-none text-text-secondary"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(c.policy_detail) }}
            />
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
