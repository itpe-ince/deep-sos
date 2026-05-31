import type { ReactNode } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ReconsentGate } from '@/features/cms';

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main id="main-content" className="flex-1 bg-bg">{children}</main>
      <Footer />
      {/* M07-14 약관 재동의 — 로그인 사용자 진입 시 변경 약관 모달 */}
      <ReconsentGate />
    </div>
  );
}
