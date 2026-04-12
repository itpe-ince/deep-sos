'use client';

import { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  Briefcase,
  CheckCircle2,
  TrendingUp,
  Users,
  UserCheck,
  Clock,
} from 'lucide-react';
import { api } from '@/lib/api';

interface Summary {
  total_users: number;
  active_users_30d: number;
  total_issues: number;
  resolved_issues: number;
  resolved_rate: number;
  active_projects: number;
  completed_projects: number;
  total_volunteer_hours: number;
  success_cases: number;
}

interface CampusKpi {
  campus_id: string;
  code: string;
  name: string;
  issues_count: number;
  projects_count: number;
  volunteer_hours: number;
}

interface CategoryKpi {
  category: string;
  count: number;
}

interface TimeseriesPoint {
  day: string;
  new_issues: number;
  new_users: number;
}

interface TimeseriesResponse {
  days: number;
  points: TimeseriesPoint[];
}

const CAT_LABEL: Record<string, string> = {
  environment: '환경',
  safety: '안전',
  transport: '교통',
  welfare: '복지',
  culture: '문화',
  other: '기타',
};

const CAT_COLOR: Record<string, string> = {
  environment: '#059669',
  safety: '#dc2626',
  transport: '#2563eb',
  welfare: '#7c3aed',
  culture: '#ea580c',
  other: '#64748b',
};

export default function AdminKpiPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [campuses, setCampuses] = useState<CampusKpi[]>([]);
  const [categories, setCategories] = useState<CategoryKpi[]>([]);
  const [timeseries, setTimeseries] = useState<TimeseriesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [s, c, cat, ts] = await Promise.all([
          api.get<Summary>('/admin/kpi/summary'),
          api.get<{ data: CampusKpi[] }>('/admin/kpi/campuses'),
          api.get<{ data: CategoryKpi[] }>('/admin/kpi/categories'),
          api.get<TimeseriesResponse>('/admin/kpi/timeseries?days=30'),
        ]);
        setSummary(s);
        setCampuses(c.data);
        setCategories(cat.data);
        setTimeseries(ts);
      } catch (err) {
        setError(err instanceof Error ? err.message : '조회 실패');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="px-8 py-12 text-sm text-text-muted">불러오는 중...</div>
    );
  }

  if (error) {
    return (
      <div className="px-8 py-12">
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-text-primary">KPI 대시보드</h1>
        <p className="mt-1 text-sm text-text-secondary">
          플랫폼 전체 통계 · 캠퍼스별 · 카테고리별 · 30일 시계열
        </p>
      </header>

      {/* Summary Cards */}
      {summary && (
        <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-primary" />}
            label="총 사용자"
            value={summary.total_users}
          />
          <StatCard
            icon={<UserCheck className="h-5 w-5 text-secondary" />}
            label="활성 (30일)"
            value={summary.active_users_30d}
          />
          <StatCard
            icon={<AlertCircle className="h-5 w-5 text-amber-600" />}
            label="총 이슈"
            value={summary.total_issues}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-secondary" />}
            label="해결률"
            value={`${(summary.resolved_rate * 100).toFixed(1)}%`}
          />
          <StatCard
            icon={<Briefcase className="h-5 w-5 text-violet-600" />}
            label="진행 프로젝트"
            value={summary.active_projects}
          />
          <StatCard
            icon={<CheckCircle2 className="h-5 w-5 text-text-muted" />}
            label="완료 프로젝트"
            value={summary.completed_projects}
          />
          <StatCard
            icon={<Clock className="h-5 w-5 text-rose-600" />}
            label="봉사 시간"
            value={`${summary.total_volunteer_hours}h`}
          />
          <StatCard
            icon={<Award className="h-5 w-5 text-amber-700" />}
            label="성공 사례"
            value={summary.success_cases}
          />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Campuses */}
        <section className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">
            캠퍼스별 활동
          </h2>
          {campuses.length === 0 ? (
            <p className="text-sm text-text-muted">데이터 없음</p>
          ) : (
            <CampusBars data={campuses} />
          )}
        </section>

        {/* Categories */}
        <section className="rounded-xl border border-border bg-white p-6">
          <h2 className="mb-4 text-sm font-semibold text-text-primary">
            이슈 카테고리 분포
          </h2>
          {categories.length === 0 ? (
            <p className="text-sm text-text-muted">데이터 없음</p>
          ) : (
            <CategoryDonut data={categories} />
          )}
        </section>
      </div>

      {/* Timeseries */}
      <section className="mt-6 rounded-xl border border-border bg-white p-6">
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-text-primary">
          <TrendingUp className="h-4 w-4 text-primary" /> 최근 30일 일별 추이
        </h2>
        {timeseries && <TimeseriesLine data={timeseries.points} />}
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-2">{icon}</div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      <p className="text-xs text-text-muted">{label}</p>
    </div>
  );
}

function CampusBars({ data }: { data: CampusKpi[] }) {
  const maxIssues = Math.max(1, ...data.map((c) => c.issues_count));
  const maxProjects = Math.max(1, ...data.map((c) => c.projects_count));
  return (
    <div className="space-y-4">
      {data.map((c) => (
        <div key={c.campus_id}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-text-primary">
              {c.name} ({c.code})
            </span>
            <span className="text-text-muted">
              이슈 {c.issues_count} · 프로젝트 {c.projects_count} · {c.volunteer_hours}h
            </span>
          </div>
          <div className="flex gap-1">
            <div className="h-2 flex-1 rounded-full bg-bg-muted">
              <div
                className="h-2 rounded-full bg-primary"
                style={{ width: `${(c.issues_count / maxIssues) * 100}%` }}
              />
            </div>
            <div className="h-2 flex-1 rounded-full bg-bg-muted">
              <div
                className="h-2 rounded-full bg-secondary"
                style={{ width: `${(c.projects_count / maxProjects) * 100}%` }}
              />
            </div>
          </div>
        </div>
      ))}
      <div className="mt-3 flex gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-full bg-primary" /> 이슈
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-full bg-secondary" /> 프로젝트
        </span>
      </div>
    </div>
  );
}

function CategoryDonut({ data }: { data: CategoryKpi[] }) {
  const total = data.reduce((sum, c) => sum + c.count, 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex items-center gap-6">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="20"
        />
        {data.map((c) => {
          const pct = c.count / total;
          const dashLength = pct * circumference;
          const segment = (
            <circle
              key={c.category}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={CAT_COLOR[c.category] ?? '#94a3b8'}
              strokeWidth="20"
              strokeDasharray={`${dashLength} ${circumference}`}
              strokeDashoffset={-offset}
              transform="rotate(-90 80 80)"
            />
          );
          offset += dashLength;
          return segment;
        })}
        <text
          x="80"
          y="78"
          textAnchor="middle"
          className="fill-text-primary text-lg font-bold"
        >
          {total}
        </text>
        <text
          x="80"
          y="94"
          textAnchor="middle"
          className="fill-text-muted text-[10px]"
        >
          총 이슈
        </text>
      </svg>
      <ul className="flex-1 space-y-2 text-sm">
        {data.map((c) => (
          <li key={c.category} className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ background: CAT_COLOR[c.category] ?? '#94a3b8' }}
              />
              <span className="text-text-primary">
                {CAT_LABEL[c.category] ?? c.category}
              </span>
            </span>
            <span className="text-text-muted">
              {c.count} ({((c.count / total) * 100).toFixed(0)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TimeseriesLine({ data }: { data: TimeseriesPoint[] }) {
  const width = 720;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const maxY = Math.max(
    1,
    ...data.map((p) => Math.max(p.new_issues, p.new_users)),
  );

  const xStep = data.length > 1 ? innerW / (data.length - 1) : innerW;
  const yScale = (v: number) => innerH - (v / maxY) * innerH;

  const issuesPath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * xStep} ${yScale(p.new_issues)}`)
    .join(' ');
  const usersPath = data
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * xStep} ${yScale(p.new_users)}`)
    .join(' ');

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="min-w-full">
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/* Y axis grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}>
              <line
                x1={0}
                y1={innerH * (1 - t)}
                x2={innerW}
                y2={innerH * (1 - t)}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={-6}
                y={innerH * (1 - t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-text-muted text-[10px]"
              >
                {Math.round(maxY * t)}
              </text>
            </g>
          ))}
          {/* Lines */}
          <path d={issuesPath} stroke="#2563eb" strokeWidth="2" fill="none" />
          <path d={usersPath} stroke="#059669" strokeWidth="2" fill="none" />
          {/* Dots */}
          {data.map((p, i) => (
            <g key={p.day}>
              {p.new_issues > 0 && (
                <circle
                  cx={i * xStep}
                  cy={yScale(p.new_issues)}
                  r="3"
                  fill="#2563eb"
                />
              )}
              {p.new_users > 0 && (
                <circle
                  cx={i * xStep}
                  cy={yScale(p.new_users)}
                  r="3"
                  fill="#059669"
                />
              )}
            </g>
          ))}
          {/* X axis labels (5개만) */}
          {[0, Math.floor(data.length / 4), Math.floor(data.length / 2), Math.floor((data.length * 3) / 4), data.length - 1]
            .filter((i, idx, arr) => arr.indexOf(i) === idx)
            .map((i) => (
              <text
                key={i}
                x={i * xStep}
                y={innerH + 16}
                textAnchor="middle"
                className="fill-text-muted text-[10px]"
              >
                {data[i]?.day.slice(5)}
              </text>
            ))}
        </g>
      </svg>
      <div className="mt-2 flex gap-4 text-xs text-text-muted">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-full bg-primary" /> 신규 이슈
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-4 rounded-full bg-secondary" /> 신규 사용자
        </span>
      </div>
    </div>
  );
}
