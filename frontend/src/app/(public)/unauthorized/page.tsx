import type { Metadata } from 'next';

import { ErrorPage } from '@/components/layout/ErrorPage';

export const metadata: Metadata = {
  title: '로그인이 필요합니다',
  description: '이 페이지를 이용하려면 로그인이 필요합니다.',
  robots: { index: false, follow: false },
};

/**
 * 401 Unauthorized — 비로그인 상태로 보호된 페이지 접근 시.
 *
 * 사용 예: middleware 또는 server component 에서
 *  → `redirect('/unauthorized')` 로 진입한 뒤 사용자에게 로그인 안내.
 *
 * (public) 그룹 안에 있어 Header/Footer 자동 렌더 → withChrome=false.
 */
export default function UnauthorizedPage() {
  return (
    <ErrorPage
      code={401}
      title="로그인이 필요해요"
      description="이 페이지는 로그인한 회원만 이용할 수 있어요. 로그인 후 다시 시도해 주세요."
      variant="unauthorized"
      withChrome={false}
      actions={[
        { href: '/login', label: '로그인 / 회원가입', variant: 'primary' },
        { href: '/', label: '홈으로 돌아가기', variant: 'secondary' },
      ]}
    />
  );
}
