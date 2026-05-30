'use client';

import {
  ArrowRight,
  ClipboardList,
  FileText,
  Image as ImageIcon,
  Sprout,
  Users as UsersIcon,
} from 'lucide-react';
import Link from 'next/link';

import { AdminStatsCards } from '@/components/admin/AdminStatsCards';

/**
 * M09-04: USCP V2 관리자 대시보드 (sitemap #14).
 *
 * 설계 근거:
 *  - feature-spec §M09-04 (관리자 대시보드)
 *  - design.md §7.3 #14 AdminStatsCards + GatekeepingQueue + ChartsSection
 *  - uscp-sitemap.md §3.2.2 (관리자 영역 11개 화면)
 *
 * V2 구성:
 *   1. AdminStatsCards          — 4종 운영 현황 카드 (대기·해결완료·리빙랩·회원)
 *   2. GatekeepingQueuePreview  — 게이트키핑 큐 상위 5건 (Sprint 2 활성화)
 *   3. NavGrid                  — 6개 관리자 메뉴 카드 그리드 + Sprint 배지
 */
const ADMIN_NAV = [
  {
    href: '/admin/issues',
    icon: ClipboardList,
    title: '게이트키핑',
    desc: '6단계 워크플로우 + 트랙 라벨 + 키워드 검색',
    sprint: 'Sprint 2',
  },
  {
    href: '/admin/projects',
    icon: Sprout,
    title: '리빙랩 관리',
    desc: '프로젝트 등록·상태·산출물·게시판 조정',
    sprint: 'Sprint 3',
  },
  {
    href: '/admin/mentors',
    icon: UsersIcon,
    title: '멘토·학생팀',
    desc: '멘토 자격·학생팀 편성·매칭',
    sprint: 'Sprint 4',
  },
  {
    href: '/admin/organizations',
    icon: ImageIcon,
    title: '협력기관',
    desc: '지·산·학·관 + MOU 생애주기 관리',
    sprint: 'Sprint 5',
  },
  {
    href: '/admin/kpi',
    icon: FileText,
    title: '성과지표',
    desc: 'KPI 정의·실적 입력·자동 집계',
    sprint: 'Sprint 5',
  },
  {
    href: '/admin/cms-banners',
    icon: ImageIcon,
    title: '콘텐츠 관리',
    desc: '공지·이벤트·자료실·배너·약관',
    sprint: 'Sprint 4',
  },
];

export default function AdminDashboardPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8" data-testid="admin-dashboard">
      <header className="mb-8">
        <p className="text-sm font-semibold text-primary">관리자 영역 · USCP V2</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight text-text">대시보드</h1>
        <p className="mt-2 text-sm text-text-secondary">
          운영 현황 요약과 게이트키핑 대기 큐를 한 화면에서 확인하세요.
        </p>
      </header>

      <section className="mb-10" aria-label="운영 현황 요약">
        <AdminStatsCards />
      </section>

      <section
        className="mb-10 rounded-xl border border-border bg-surface p-6"
        aria-labelledby="gatekeeping-preview-heading"
        data-testid="admin-gatekeeping-preview"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="gatekeeping-preview-heading" className="text-lg font-bold text-text">
            게이트키핑 대기 큐 미리 보기
          </h2>
          <Link
            href="/admin/issues?stage=reported"
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            전체 보기
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div
          className="rounded-md border border-dashed border-border bg-bg p-8 text-center text-sm text-text-muted"
          data-testid="admin-gatekeeping-empty"
        >
          Sprint 2 M02-07~08 에서 게이트키핑 큐가 활성화됩니다.
        </div>
      </section>

      <section aria-label="관리자 메뉴">
        <h2 className="mb-4 text-lg font-bold text-text">관리 영역</h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="admin-nav-grid">
          {ADMIN_NAV.map((c) => {
            const Icon = c.icon;
            return (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="group flex h-full flex-col rounded-xl border border-border bg-surface p-5 shadow-sm transition hover:border-primary hover:shadow-md"
                  data-testid={`admin-nav-${c.href.replace(/[/:]/g, '-')}`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-light text-primary">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </div>
                    <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                      {c.sprint}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-text group-hover:text-primary">{c.title}</h3>
                  <p className="mt-1 text-sm text-text-secondary">{c.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    이동
                    <ArrowRight className="h-3 w-3" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
