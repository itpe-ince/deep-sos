import Link from 'next/link';
import type { Metadata } from 'next';
import { List, MapPin, MessageCircle, ThumbsUp, Eye, Map as MapIcon } from 'lucide-react';
import { serverFetch, type ListResponse, type IssueItem } from '@/lib/server-api';
import { KakaoMap } from '@/components/map/KakaoMap';

export const metadata: Metadata = {
  title: '지역 문제 제안',
  description: '대학과 지역이 함께 해결할 지역 사회 문제를 제안하고 논의합니다.',
};

const CATEGORY_LABEL: Record<string, string> = {
  environment: '환경',
  safety: '안전',
  transport: '교통',
  welfare: '복지',
  culture: '문화',
  other: '기타',
};

const STATUS_LABEL: Record<string, string> = {
  submitted: '접수',
  reviewing: '검토 중',
  assigned: '배정',
  progress: '진행 중',
  resolved: '해결',
  rejected: '반려',
};

const STATUS_COLOR: Record<string, string> = {
  submitted: 'bg-slate-100 text-slate-700',
  reviewing: 'bg-amber-100 text-amber-700',
  assigned: 'bg-sky-100 text-sky-700',
  progress: 'bg-primary-light text-primary',
  resolved: 'bg-secondary-light text-secondary',
  rejected: 'bg-rose-100 text-rose-700',
};

interface PageProps {
  searchParams: Promise<{ view?: string; category?: string }>;
}

export default async function IssuesPage({ searchParams }: PageProps) {
  const { view } = await searchParams;
  const isMap = view === 'map';
  const size = isMap ? 100 : 20;
  const data = await serverFetch<ListResponse<IssueItem>>(
    `/issues?page=1&size=${size}`,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-8">
        <p className="text-sm font-semibold text-primary">BF-1 · 지역 문제</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary md:text-4xl">
          지역 문제 제안 게시판
        </h1>
        <p className="mt-3 text-text-secondary">
          누구나 지역에서 발견한 문제를 제안할 수 있습니다. 현재 {data.meta.total}건의 문제가 공유되고 있어요.
        </p>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/issues"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white"
          >
            전체
          </Link>
          {Object.entries(CATEGORY_LABEL).map(([key, label]) => (
            <Link
              key={key}
              href={`/issues?category=${key}`}
              className="rounded-full border border-border px-4 py-2 text-sm text-text-secondary hover:border-primary hover:text-primary"
            >
              {label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1 rounded-full border border-border bg-white p-1">
          <Link
            href="/issues"
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              !isMap
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-primary'
            }`}
          >
            <List className="h-3 w-3" /> 목록
          </Link>
          <Link
            href="/issues?view=map"
            className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              isMap
                ? 'bg-primary text-white'
                : 'text-text-secondary hover:text-primary'
            }`}
          >
            <MapIcon className="h-3 w-3" /> 지도
          </Link>
        </div>
      </div>

      {isMap ? (
        <KakaoMap
          issues={data.data.map((i) => ({
            id: i.id,
            title: i.title,
            category: i.category,
            vote_count: i.vote_count,
            location_lat: i.location_lat,
            location_lng: i.location_lng,
            location_address: i.location_address,
          }))}
        />
      ) : (
      <ul className="grid gap-4 md:grid-cols-2">
        {data.data.map((issue) => (
          <li
            key={issue.id}
            className="rounded-2xl border border-border bg-white p-6 shadow-sm transition hover:shadow-md"
          >
            <Link href={`/issues/${issue.id}`} className="block">
              <div className="mb-3 flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    STATUS_COLOR[issue.status] ?? 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {STATUS_LABEL[issue.status] ?? issue.status}
                </span>
                <span className="rounded-full bg-bg-muted px-3 py-1 text-xs text-text-secondary">
                  {CATEGORY_LABEL[issue.category] ?? issue.category}
                </span>
              </div>
              <h2 className="mb-2 line-clamp-2 text-lg font-semibold text-text-primary">
                {issue.title}
              </h2>
              <p className="mb-4 line-clamp-2 text-sm text-text-secondary">
                {issue.description}
              </p>
              {issue.location_address && (
                <p className="mb-3 flex items-center gap-1 text-xs text-text-muted">
                  <MapPin className="h-3 w-3" />
                  {issue.location_address}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-3 w-3" /> {issue.vote_count}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" /> {issue.comment_count}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" /> {issue.view_count}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </div>
  );
}
