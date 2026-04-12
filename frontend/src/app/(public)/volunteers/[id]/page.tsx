import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, MapPin, Users } from 'lucide-react';
import { serverFetch, type VolunteerItem } from '@/lib/server-api';
import { VolunteerApplication } from '@/components/volunteer/VolunteerApplication';

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

interface PageProps {
  params: Promise<{ id: string }>;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function VolunteerDetailPage({ params }: PageProps) {
  const { id } = await params;
  let activity: VolunteerItem;
  try {
    activity = await serverFetch<VolunteerItem>(`/volunteers/${id}`);
  } catch {
    notFound();
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Link
        href="/volunteers"
        className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> 봉사활동 목록
      </Link>

      <article className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <header className="mb-6 border-b border-border pb-6">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                STATUS_COLOR[activity.status] ?? 'bg-slate-100 text-slate-700'
              }`}
            >
              {STATUS_LABEL[activity.status] ?? activity.status}
            </span>
            {activity.activity_type && (
              <span className="text-xs text-text-muted">{activity.activity_type}</span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-text-primary">{activity.title}</h1>
        </header>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold text-text-secondary">활동 소개</h2>
          <p className="whitespace-pre-line text-text-primary">{activity.description}</p>
        </section>

        <section className="mb-8 grid gap-4 rounded-xl bg-bg-muted p-5 md:grid-cols-2">
          {activity.location && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-text-muted">위치</p>
                <p className="text-sm font-medium text-text-primary">{activity.location}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 text-secondary" />
            <div>
              <p className="text-xs text-text-muted">시작</p>
              <p className="text-sm font-medium text-text-primary">
                {formatDateTime(activity.start_datetime)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 text-amber-600" />
            <div>
              <p className="text-xs text-text-muted">종료</p>
              <p className="text-sm font-medium text-text-primary">
                {formatDateTime(activity.end_datetime)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="mt-0.5 h-4 w-4 text-violet-600" />
            <div>
              <p className="text-xs text-text-muted">참여 인원</p>
              <p className="text-sm font-medium text-text-primary">
                {activity.current_participants}
                {activity.max_participants ? ` / ${activity.max_participants}` : ''} 명
              </p>
            </div>
          </div>
        </section>
      </article>

      <div className="mt-6">
        <VolunteerApplication activityId={activity.id} />
      </div>
    </div>
  );
}
