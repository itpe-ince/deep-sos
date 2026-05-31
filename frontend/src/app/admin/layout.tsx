'use client';

import type { ReactNode } from 'react';
import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  BarChart3,
  Building2,
  FileText,
  Image as ImageIcon,
  LayoutDashboard,
  Megaphone,
  ScrollText,
  Shield,
  UserCog,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/use-auth';

const NAV = [
  { href: '/admin', label: '대시보드', icon: LayoutDashboard },
  { href: '/admin/mentors', label: '멘토·학생팀', icon: Users },
  { href: '/admin/organizations', label: '협력기관', icon: Building2 },
  { href: '/admin/kpi', label: 'KPI', icon: BarChart3 },
  { href: '/admin/cms/contents', label: '공지·이벤트', icon: Megaphone },
  { href: '/admin/cms/pages', label: 'CMS 페이지', icon: FileText },
  { href: '/admin/cms/banners', label: 'CMS 배너', icon: ImageIcon },
  { href: '/admin/users', label: '사용자·권한', icon: UserCog },
  { href: '/admin/audit', label: '감사 로그', icon: ScrollText },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  // V2 역할 모델: 관리자 = operator (마이그레이션 0008 admin→operator 변환).
  // 'admin' 은 마이그레이션 미적용 환경 호환을 위해 함께 허용.
  const isOperator = user?.role === 'operator' || user?.role === 'admin';

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login?next=' + encodeURIComponent(pathname));
      return;
    }
    if (!isOperator) {
      router.replace('/?error=admin_required');
    }
  }, [loading, user, isOperator, router, pathname]);

  if (loading || !user || !isOperator) {
    return (
      <div className="flex min-h-screen items-center justify-center text-text-secondary">
        권한 확인 중...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-bg-muted">
      <aside className="w-60 border-r border-border bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-border px-6 text-sm font-bold text-primary">
          <Shield className="h-4 w-4" /> USCP 관리자
        </div>
        <nav className="p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/admin'
                ? pathname === '/admin'
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-primary-light text-primary'
                    : 'text-text-secondary hover:bg-bg-muted'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main id="main-content" className="flex-1 overflow-x-hidden">{children}</main>
    </div>
  );
}
