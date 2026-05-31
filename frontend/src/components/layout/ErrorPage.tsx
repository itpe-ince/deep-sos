import Link from 'next/link';

import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { cn } from '@/lib/utils';

/**
 * 사이트 전체 레이아웃(Header + Footer)을 유지하면서 표시하는 공통 에러 페이지.
 *
 * 설계 근거:
 *  - design.md §7.2.3 Mockup 우선 — GNB/Footer 일관성 유지
 *  - design.md §7.3 통일된 brand & 색 토큰 (primary/secondary 그라데이션)
 *
 * 사용처:
 *  - app/not-found.tsx (404)
 *  - app/error.tsx (500)
 *  - app/global-error.tsx (root layout 파괴 시 — Header/Footer 미렌더, 자체 마크업)
 *  - app/forbidden.tsx (403) · app/unauthorized.tsx (401)
 */

export type ErrorVariant = 'not-found' | 'error' | 'forbidden' | 'unauthorized' | 'maintenance';

interface ErrorAction {
  href: string;
  label: string;
  variant?: 'primary' | 'secondary';
}

interface ErrorPageProps {
  /** HTTP 상태 코드 (시각적 강조) */
  code: number | string;
  /** 한 줄 헤드라인 */
  title: string;
  /** 보조 설명 (1~2 문장) */
  description: string;
  /** 진행 가능한 다음 액션 (최대 2개 권장) */
  actions?: ErrorAction[];
  /** 코드 색상 톤 (variant 별 차등) */
  variant?: ErrorVariant;
  /** Header/Footer 렌더 여부 — global-error 처럼 root layout 이 깨졌을 때 false */
  withChrome?: boolean;
  /** 보조 정보 (디버깅용 에러 메시지 등 — production 에서는 숨김 권장) */
  detail?: string;
}

const VARIANT_TONE: Record<ErrorVariant, string> = {
  'not-found':
    'bg-gradient-to-br from-primary via-secondary to-primary bg-clip-text text-transparent',
  error: 'bg-gradient-to-br from-danger via-warning to-danger bg-clip-text text-transparent',
  forbidden: 'bg-gradient-to-br from-warning via-danger to-warning bg-clip-text text-transparent',
  unauthorized: 'bg-gradient-to-br from-secondary via-primary to-secondary bg-clip-text text-transparent',
  maintenance: 'bg-gradient-to-br from-text-secondary to-text bg-clip-text text-transparent',
};

const DEFAULT_ACTIONS: ErrorAction[] = [
  { href: '/', label: '홈으로 돌아가기', variant: 'primary' },
  { href: '/issues', label: '지역문제 광장', variant: 'secondary' },
];

export function ErrorPage({
  code,
  title,
  description,
  actions = DEFAULT_ACTIONS,
  variant = 'not-found',
  withChrome = true,
  detail,
}: ErrorPageProps) {
  const Body = (
    <main
      id="main-content"
      className="flex min-h-[calc(100vh-64px)] flex-col items-center justify-center bg-bg px-6 py-16"
      data-testid={`error-page-${variant}`}
    >
      <div className="mx-auto w-full max-w-2xl text-center">
        <p
          className={cn(
            'select-none text-[120px] font-black leading-none tracking-tight sm:text-[160px]',
            VARIANT_TONE[variant],
          )}
          aria-hidden="true"
        >
          {code}
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-text sm:text-3xl">
          {title}
        </h1>
        <p className="mt-3 text-base leading-relaxed text-text-secondary">{description}</p>

        {actions.length > 0 && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {actions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(
                  'inline-flex items-center justify-center rounded-md px-5 py-2.5 text-sm font-semibold transition',
                  action.variant === 'secondary'
                    ? 'border border-border bg-surface text-text hover:border-primary hover:text-primary'
                    : 'bg-primary text-white shadow-sm hover:bg-primary-hover',
                )}
              >
                {action.label}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 border-t border-border pt-6 text-left text-sm text-text-secondary">
          <p className="mb-2 font-semibold text-text">자주 묻는 경로</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
            <li>
              <Link className="hover:text-primary hover:underline" href="/about">
                USCP 소개
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary hover:underline" href="/issues">
                지역문제 광장
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary hover:underline" href="/projects">
                리빙랩
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary hover:underline" href="/success-cases">
                성공사례
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary hover:underline" href="/network">
                협력 네트워크
              </Link>
            </li>
            <li>
              <Link className="hover:text-primary hover:underline" href="/login">
                로그인 / 회원가입
              </Link>
            </li>
          </ul>
        </div>

        {detail && (
          <details className="mt-6 rounded-md border border-border bg-surface-hover p-3 text-left text-xs text-text-secondary">
            <summary className="cursor-pointer font-semibold text-text">
              기술 정보 (개발자용)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono">{detail}</pre>
          </details>
        )}
      </div>
    </main>
  );

  if (!withChrome) {
    return Body;
  }

  return (
    <>
      <Header />
      {Body}
      <Footer />
    </>
  );
}
