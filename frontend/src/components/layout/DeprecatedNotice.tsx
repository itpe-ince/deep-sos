import { AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

/**
 * USCP V2 — V1 잔재 페이지 deprecation 알림.
 *
 * 설계 근거:
 *  - design.md §9 Implementation Order (Sprint 2 Day 1 V1 격리, CR-5)
 *  - design.md §8.4 (V2 sitemap §3.1.2 의 6개 공개 메뉴 외 항목은 본 컴포넌트로 안내)
 *
 * 본 컴포넌트는 410 Gone 시맨틱이 SSR static 페이지에서 곤란하므로,
 * 페이지 자체를 노출하되 "본 사업 범위 외" 안내 + /about 또는 메인으로 유도.
 *
 * `app/(public)/{campus,volunteers,portfolio,guide}/page.tsx` 가 본 컴포넌트만 렌더.
 */
export interface DeprecatedNoticeProps {
  pageTitle: string;
  /** "본 사업 범위 외" 사유 */
  reason: string;
  /** 대체 페이지 경로 + 라벨 */
  alternative?: { href: string; label: string };
}

export function DeprecatedNotice({
  pageTitle,
  reason,
  alternative = { href: '/about', label: 'USCP 소개 보기' },
}: DeprecatedNoticeProps) {
  return (
    <div
      className="container-content py-16"
      data-testid="deprecated-notice"
      data-page-title={pageTitle}
    >
      <div className="mx-auto max-w-xl rounded-xl border border-warning/30 bg-warning/5 p-8 text-center">
        <AlertCircle
          className="mx-auto mb-4 h-10 w-10 text-warning"
          aria-hidden="true"
        />
        <h1 className="mb-2 text-2xl font-black text-text">{pageTitle}</h1>
        <p className="mb-6 text-sm leading-relaxed text-text-secondary">
          {reason}
        </p>
        <Link
          href={alternative.href}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover hover:text-white"
          data-testid="deprecated-cta"
        >
          {alternative.label}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
