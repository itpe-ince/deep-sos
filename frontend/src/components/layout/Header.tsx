'use client';

import Link from 'next/link';
import { LayoutDashboard, LogOut, Search, User } from 'lucide-react';
import { useAuth } from '@/lib/use-auth';
import { NotificationBell } from '@/components/layout/NotificationBell';

/**
 * 공개 영역 GNB — 로그인 상태에 따라 우측 영역 전환.
 */
export function Header() {
  const { user, loading, logout } = useAuth();

  return (
    <header className="sticky top-0 z-gnb h-16 border-b border-border bg-surface">
      <div className="mx-auto flex h-full max-w-layout items-center justify-between gap-6 px-6">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-extrabold text-text"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary text-xs font-black text-white">
            SOS
          </div>
          <span>SOS랩</span>
        </Link>

        <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
          <NavLink href="/about">플랫폼 소개</NavLink>
          <NavLink href="/guide">참여 방법</NavLink>
          <NavLink href="/issues">지역 문제</NavLink>
          <NavLink href="/projects">리빙랩 프로젝트</NavLink>
          <NavLink href="/volunteers">봉사활동</NavLink>
          <NavLink href="/success-cases">성공 사례</NavLink>
        </nav>

        <div className="flex items-center gap-2">
          <button
            aria-label="검색"
            className="flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text"
          >
            <Search className="h-5 w-5" />
          </button>

          {loading ? (
            <div className="h-10 w-20 animate-pulse rounded-md bg-surface-hover" />
          ) : user ? (
            <>
              <NotificationBell />
              <Link
                href="/user/dashboard"
                className="hidden items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium text-text-secondary hover:border-primary hover:text-primary sm:inline-flex"
              >
                <LayoutDashboard className="h-4 w-4" />
                <span className="hidden md:inline">{user.name}님</span>
                <span className="md:hidden">
                  <User className="h-4 w-4" />
                </span>
              </Link>
              <button
                type="button"
                onClick={logout}
                className="hidden items-center gap-1 rounded-md px-3 py-2 text-sm text-text-muted hover:bg-surface-hover sm:inline-flex"
                title="로그아웃"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary hidden sm:inline-flex">
                로그인
              </Link>
              <Link href="/login" className="btn-primary hidden sm:inline-flex">
                회원가입
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded-md px-4 py-2 text-sm font-medium text-text-secondary transition hover:bg-primary-light hover:text-primary"
    >
      {children}
    </Link>
  );
}
