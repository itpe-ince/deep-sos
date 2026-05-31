'use client';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/lib/use-auth';

import { ReconsentModal } from './ReconsentModal';

/**
 * M07-14 재동의 게이트 — 로그인 사용자 영역 레이아웃에 마운트.
 *
 * 로그인 상태에서만 ReconsentModal 을 활성화하고, 재동의 거부 시 로그아웃 후 홈으로 이동.
 * (서버 컴포넌트 레이아웃에서 클라이언트 모달을 안전하게 마운트하기 위한 래퍼)
 */
export function ReconsentGate() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  // 미로그인/로딩 중에는 재동의 체크 불필요
  if (loading || !user) return null;

  return (
    <ReconsentModal
      onForceLogout={() => {
        void logout();
        router.replace('/login?reason=reconsent_declined');
      }}
    />
  );
}
