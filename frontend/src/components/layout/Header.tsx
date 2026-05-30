'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, LogOut, Menu, User } from 'lucide-react';
import { useState } from 'react';

import { Modal } from '@/components/ui';
import { NotificationBell } from '@/components/layout/NotificationBell';
import { useAuth } from '@/lib/use-auth';
import { cn } from '@/lib/utils';

/**
 * M09-10: USCP V2 공개 영역 GNB (Global Navigation Bar).
 *
 * 설계 근거:
 *  - feature-spec §M09-10 (헤더 GNB)
 *  - design.md §7.3 #1~9 (홈·소개·광장·리빙랩·성공사례·네트워크·성과자료·로그인)
 *  - uscp-sitemap.md §3.1.2 (비로그인 공개 페이지 6종 + 로그인 영역)
 *  - design.md §7.2.1 모바일 메뉴는 Modal 컴포넌트 사용 (window.alert 금지·3분할)
 *
 * V1 → V2 메뉴 변경:
 *  - 제거: /guide (참여 방법), /volunteers (봉사활동) — V2 out-of-scope
 *  - 추가: /network (협력 네트워크), /performance (성과자료)
 *  - 모든 항목 sitemap 24개 화면에 정합
 */

interface NavItem {
  href: string;
  label: string;
  /** 활성 상태로 표시할 경로 패턴 (startsWith 비교) */
  matchPrefix?: string;
}

const PUBLIC_NAV: ReadonlyArray<NavItem> = [
  { href: '/about', label: 'USCP 소개', matchPrefix: '/about' },
  { href: '/issues', label: '지역문제 광장', matchPrefix: '/issues' },
  { href: '/projects', label: '리빙랩', matchPrefix: '/projects' },
  { href: '/success-cases', label: '성공사례', matchPrefix: '/success-cases' },
  { href: '/network', label: '협력 네트워크', matchPrefix: '/network' },
  { href: '/performance', label: '성과자료', matchPrefix: '/performance' },
];

export function Header() {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname() ?? '/';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header
        className="sticky top-0 z-gnb h-16 border-b border-border bg-surface"
        data-testid="header-gnb"
      >
        <div className="mx-auto flex h-full max-w-layout items-center justify-between gap-6 px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-3" aria-label="USCP 홈">
            <Image
              src="/logo.png"
              alt="국립공주대학교"
              width={160}
              height={32}
              priority
            />
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-xl font-black tracking-tight text-transparent">
                USCP
              </span>
              <span className="text-xs font-semibold tracking-wider text-text-secondary">
                온라인 사회공헌 플랫폼
              </span>
            </div>
          </Link>

          {/* 데스크탑 메뉴 — lg 이상 */}
          <nav
            className="hidden flex-1 items-center justify-center gap-1 lg:flex"
            aria-label="주요 메뉴"
          >
            {PUBLIC_NAV.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                active={isActive(pathname, item)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {loading ? (
              <div className="h-10 w-20 animate-pulse rounded-md bg-surface-hover" />
            ) : user ? (
              <UserMenu name={user.name} onLogout={logout} />
            ) : (
              <GuestMenu />
            )}

            {/* 모바일 햄버거 — lg 미만 */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="메뉴 열기"
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-modal"
              className="flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover lg:hidden"
              data-testid="header-mobile-menu-toggle"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* 모바일 네비게이션 모달 (§7.2.1 3분할 + backdrop 비활성) */}
      <Modal
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        title="메뉴"
        size="md"
      >
        <nav aria-label="모바일 주요 메뉴" id="mobile-nav-modal">
          <ul className="flex flex-col gap-1">
            {PUBLIC_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'block rounded-md px-4 py-3 text-base font-medium',
                    isActive(pathname, item)
                      ? 'bg-primary-light text-primary'
                      : 'text-text hover:bg-surface-hover',
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-border pt-3">
              {user ? (
                <>
                  <Link
                    href="/user/my-activities"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-4 py-3 text-base font-medium text-text hover:bg-surface-hover"
                  >
                    내 활동
                  </Link>
                  <Link
                    href="/user/profile"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-md px-4 py-3 text-base font-medium text-text hover:bg-surface-hover"
                  >
                    프로필
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="block w-full rounded-md px-4 py-3 text-left text-base font-medium text-danger hover:bg-surface-hover"
                  >
                    로그아웃
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block rounded-md bg-primary px-4 py-3 text-center text-base font-semibold text-white hover:bg-primary-hover"
                >
                  로그인 / 회원가입
                </Link>
              )}
            </li>
          </ul>
        </nav>
      </Modal>
    </>
  );
}

function isActive(pathname: string, item: NavItem): boolean {
  if (!item.matchPrefix) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.matchPrefix}/`);
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'rounded-md px-4 py-2 text-sm font-medium transition',
        active
          ? 'bg-primary-light text-primary'
          : 'text-text-secondary hover:bg-primary-light hover:text-primary',
      )}
    >
      {children}
    </Link>
  );
}

function UserMenu({
  name,
  onLogout,
}: {
  name: string;
  onLogout: () => void;
}) {
  return (
    <>
      <NotificationBell />
      <Link
        href="/user/my-activities"
        className="hidden items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:border-primary hover:text-primary sm:inline-flex"
        data-testid="header-user-menu"
      >
        <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
        <span className="hidden md:inline">{name}님</span>
        <span className="md:hidden">
          <User className="h-4 w-4" aria-hidden="true" />
        </span>
      </Link>
      <button
        type="button"
        onClick={onLogout}
        className="hidden items-center gap-1 rounded-md px-3 py-2 text-sm text-text-muted hover:bg-surface-hover sm:inline-flex"
        title="로그아웃"
        aria-label="로그아웃"
        data-testid="header-logout"
      >
        <LogOut className="h-4 w-4" aria-hidden="true" />
      </button>
    </>
  );
}

function GuestMenu() {
  return (
    <>
      <Link
        href="/login"
        className="hidden rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:border-primary hover:text-primary sm:inline-flex"
        data-testid="header-login"
      >
        로그인
      </Link>
      <Link
        href="/login?tab=signup"
        className="hidden rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-hover sm:inline-flex"
        data-testid="header-signup"
      >
        회원가입
      </Link>
    </>
  );
}
