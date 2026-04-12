'use client';

import Link from 'next/link';
import { FileText, Image as ImageIcon, ArrowRight } from 'lucide-react';

const CARDS = [
  {
    href: '/admin/cms/pages',
    icon: FileText,
    title: 'CMS 페이지',
    desc: '소개 / 가이드 등 정적 페이지 TipTap 에디터',
  },
  {
    href: '/admin/cms/banners',
    icon: ImageIcon,
    title: 'CMS 배너',
    desc: '홈 히어로 / 서브 / 푸터 배너 관리',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-5xl px-8 py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold text-primary">P-20 · 관리자</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">관리자 대시보드</h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sprint 2 현재: CMS 페이지 / 배너 관리. Sprint 3 이후 이슈/프로젝트/유저 관리 확장 예정.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="group block rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:border-primary hover:shadow-md"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="mb-1 text-lg font-semibold text-text-primary group-hover:text-primary">
                {c.title}
              </h2>
              <p className="text-sm text-text-secondary">{c.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-primary">
                이동 <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
