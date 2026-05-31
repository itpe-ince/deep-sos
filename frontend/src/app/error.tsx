'use client';

import { useEffect } from 'react';

import { ErrorPage } from '@/components/layout/ErrorPage';

/**
 * Root 에러 바운더리 (500 등 서버/클라이언트 예외 공통).
 *
 * Next.js App Router 규약: error.tsx 는 반드시 client component.
 * Header/Footer 가 포함된 ErrorPage 로 사이트 톤 유지.
 */
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry 등 모니터링이 활성화되어 있다면 자동 캡쳐 — 여기서는 콘솔만.
    if (typeof window !== 'undefined') {
      console.error('[ErrorBoundary]', error);
    }
  }, [error]);

  const showDetail = process.env.NODE_ENV !== 'production';
  const detail = showDetail
    ? `${error.name}: ${error.message}${error.digest ? `\n(digest: ${error.digest})` : ''}`
    : undefined;

  return (
    <ErrorPage
      code={500}
      title="일시적인 오류가 발생했어요"
      description="서버 또는 화면 표시 중 문제가 발생했습니다. 잠시 후 다시 시도하거나 다른 페이지를 이용해 주세요."
      variant="error"
      detail={detail}
      actions={[
        // reset 은 Link 가 아니지만 ErrorPage 의 일관성을 위해 별도 처리는 페이지 컴포넌트 측에서 추후 확장.
        { href: '/', label: '홈으로 돌아가기', variant: 'primary' },
        { href: '/issues', label: '지역문제 광장', variant: 'secondary' },
      ]}
    />
  );
}
