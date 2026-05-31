import type { Metadata } from 'next';

import { ErrorPage } from '@/components/layout/ErrorPage';

export const metadata: Metadata = {
  title: '접근 권한이 없습니다',
  description: '요청하신 페이지에 접근할 권한이 없습니다.',
  robots: { index: false, follow: false },
};

/**
 * 403 Forbidden — 로그인은 되어 있으나 권한이 부족한 경우.
 *
 * 사용 예: 일반 사용자가 운영자 전용 페이지 접근 시
 *  → server component 에서 `redirect('/forbidden')` 로 진입.
 *
 * (public) 그룹 안에 있어 layout.tsx 가 Header/Footer 를 이미 렌더 →
 * ErrorPage 의 withChrome=false 로 중복 방지.
 */
export default function ForbiddenPage() {
  return (
    <ErrorPage
      code={403}
      title="접근 권한이 없어요"
      description="현재 계정으로는 이 페이지를 볼 수 없어요. 권한이 필요하다면 운영자에게 문의해 주세요."
      variant="forbidden"
      withChrome={false}
      actions={[
        { href: '/', label: '홈으로 돌아가기', variant: 'primary' },
        { href: '/user/my-activities', label: '내 활동', variant: 'secondary' },
      ]}
    />
  );
}
