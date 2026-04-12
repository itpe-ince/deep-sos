import Link from 'next/link';
import type { Metadata } from 'next';
import { MapPin, Clock, Users } from 'lucide-react';
import { serverFetch, type ListResponse, type VolunteerItem } from '@/lib/server-api';

export const metadata: Metadata = {
  title: '자원봉사 참여',
  description: '지역 리빙랩과 연계된 자원봉사 활동에 참여하세요.',
};

const STATUS_LABEL: Record<string, string> = {
  upcoming: '모집 중',
  ongoing: '진행 중',
  completed: '종료',
  cancelled: '취소',
};

const STATUS_COLOR: Record<string, string> = {
  upcoming: 'bg-primary-light text-primary',
  ongoing: 'bg-secondary-light text-secondary',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-rose-100 text-rose-600',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
}

export default async function VolunteersPage() {
  const data = await serverFetch<ListResponse<VolunteerItem>>('/volunteers?page=1&size=20');

  return (
    <div className="mx-auto max-w-7xl px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold text-primary">BF-5 · 자원봉사</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary md:text-4xl">
          자원봉사 참여
        </h1>
        <p className="mt-3 text-text-secondary">
          리빙랩과 연계된 {data.meta.total}개의 봉사활동이 참여를 기다리고 있어요.
          VMS/1365 자동 연동으로 활동 시간이 기록됩니다.
        </p>
      </header>

      <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {data.data.map((v) => (
          <li
            key={v.id}
            className="rounded-2xl border border-border bg-white shadow-sm transition hover:shadow-md"
          >
            <Link href={`/volunteers/${v.id}`} className="block p-6">
            <div className="mb-3 flex items-center justify-between">
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  STATUS_COLOR[v.status] ?? 'bg-slate-100 text-slate-700'
                }`}
              >
                {STATUS_LABEL[v.status] ?? v.status}
              </span>
              {v.activity_type && (
                <span className="text-xs text-text-muted">{v.activity_type}</span>
              )}
            </div>
            <h2 className="mb-2 line-clamp-2 text-lg font-semibold text-text-primary">
              {v.title}
            </h2>
            <p className="mb-4 line-clamp-3 text-sm text-text-secondary">
              {v.description}
            </p>
            <div className="space-y-2 text-xs text-text-muted">
              {v.location && (
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {v.location}
                </p>
              )}
              <p className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDate(v.start_datetime)} ~{' '}
                {formatDate(v.end_datetime)}
              </p>
              <p className="flex items-center gap-1">
                <Users className="h-3 w-3" /> {v.current_participants}
                {v.max_participants ? ` / ${v.max_participants}` : ''} 참여
              </p>
            </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
