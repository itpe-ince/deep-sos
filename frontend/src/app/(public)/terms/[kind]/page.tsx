import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { getTermsContent } from '@/lib/api/terms';
import { STATIC_TERMS, isTermsKind, type TermsKind } from '@/lib/content/static-terms';
import { sanitizeRichText } from '@/lib/sanitize';

/**
 * /terms/service · /terms/privacy 동적 페이지.
 *
 * 설계 근거:
 *  - design.md §4.2 M07 GET /terms/{kind}/current
 *  - design.md §8.4 컴플라이언스 — 항상 노출 + 푸터 링크
 *  - design.md §7.2.3 Mockup 우선 — (public) layout 의 Header/Footer 자동 포함
 *
 * 라우팅:
 *  - service · privacy 외 kind 는 notFound() (글로벌 404 페이지로 폴백)
 *
 * 콘텐츠 소스 우선순위:
 *  1) DB 발행본 (terms_versions, M07 admin)
 *  2) 정적 fallback (lib/content/static-terms.ts) + "임시 본문" 안내
 */

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ kind: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kind } = await params;
  if (!isTermsKind(kind)) {
    return { title: '약관' };
  }
  const meta = STATIC_TERMS[kind];
  return {
    title: meta.title,
    description: `${meta.title} — ${meta.subtitle}`,
    robots: { index: true, follow: true },
  };
}

export default async function TermsPage({ params }: PageProps) {
  const { kind } = await params;
  if (!isTermsKind(kind)) {
    notFound();
  }
  const terms = await getTermsContent(kind as TermsKind);
  const safeHtml = sanitizeRichText(terms.body);
  const counterpart: TermsKind = kind === 'service' ? 'privacy' : 'service';
  const counterpartLabel = STATIC_TERMS[counterpart].title;

  return (
    <article
      className="mx-auto w-full max-w-4xl px-4 py-12 lg:px-6 lg:py-16"
      data-testid={`terms-page-${kind}`}
    >
      <header className="mb-8 border-b border-border pb-6">
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">
          {terms.subtitle}
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-text sm:text-4xl">
          {terms.title}
        </h1>
        <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-text-secondary">
          <div className="inline-flex items-center gap-1.5">
            <dt className="font-medium">버전</dt>
            <dd className="font-mono">v{terms.version}</dd>
          </div>
          <div className="inline-flex items-center gap-1.5">
            <dt className="font-medium">시행일</dt>
            <dd>{terms.effectiveAt}</dd>
          </div>
          {!terms.isPublished && (
            <span
              className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-semibold text-warning"
              title="운영자가 정식 본문을 발행하면 자동으로 갱신됩니다."
            >
              임시 본문
            </span>
          )}
        </dl>
      </header>

      {!terms.isPublished && (
        <aside
          role="note"
          className="mb-8 rounded-md border border-warning/30 bg-warning/5 p-4 text-sm leading-relaxed text-text"
        >
          <p className="font-semibold text-warning">
            본 약관은 정식 발행 전 임시 본문입니다.
          </p>
          <p className="mt-1 text-text-secondary">
            운영자가 약관 관리 화면에서 발행을 완료하면 본 페이지가 자동으로 갱신됩니다.
            문의: <a href="mailto:sos-lab@kongju.ac.kr" className="text-primary hover:underline">sos-lab@kongju.ac.kr</a>
          </p>
        </aside>
      )}

      <div
        className="prose prose-slate max-w-none prose-h2:mt-8 prose-h2:text-xl prose-h2:font-bold prose-h2:text-text prose-p:leading-relaxed prose-p:text-text prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-ul:my-3 prose-li:my-1"
        // sanitizeRichText 로 정화된 안전한 HTML 만 주입 (XSS 방어)
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />

      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6 text-sm">
        <Link
          href={`/terms/${counterpart}`}
          className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
        >
          → {counterpartLabel} 보기
        </Link>
        <span className="text-text-secondary">
          최종 시행일: <strong className="text-text">{terms.effectiveAt}</strong>
        </span>
      </footer>
    </article>
  );
}
