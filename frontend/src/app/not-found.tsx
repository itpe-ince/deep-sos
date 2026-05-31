import type { Metadata } from 'next';

import { ErrorPage } from '@/components/layout/ErrorPage';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  description: '요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.',
  robots: { index: false, follow: false },
};

/**
 * Root 404 — Next.js App Router 글로벌 not-found.
 *
 * 매칭되는 라우트가 없거나 `notFound()` 호출 시 표시.
 * `app/(public)/layout.tsx` 가 적용되지 않는 root 단에서도
 * Header/Footer 일관성을 유지하기 위해 ErrorPage 가 직접 chrome 을 렌더한다.
 */
export default function NotFound() {
  return (
    <ErrorPage
      code={404}
      title="페이지를 찾을 수 없어요"
      description="요청하신 페이지가 존재하지 않거나, 주소가 변경되었을 수 있어요. 아래 메뉴에서 원하는 정보를 다시 찾아보세요."
      variant="not-found"
    />
  );
}
