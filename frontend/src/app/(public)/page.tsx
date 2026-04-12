import Link from 'next/link';
import { ArrowRight, CheckCircle2, TrendingUp } from 'lucide-react';

/**
 * P-01 홈 — mockup/pages/index.html 포팅
 * Sprint 1 완전 구현: 히어로 + KPI 4종 + 최근 이슈/프로젝트 + 캠퍼스 4개 + CTA
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <KPISection />
      <RecentIssuesSection />
      <ProjectsSection />
      <CampusSection />
      <CTASection />
    </>
  );
}

// ── Hero ────────────────────────────────────────────
function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-surface py-20">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at top right, #dbeafe 0%, transparent 50%), radial-gradient(ellipse at bottom left, #d1fae5 0%, transparent 50%)',
        }}
      />
      <div className="container-content relative">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold text-primary">
          <CheckCircle2 className="h-4 w-4" />
          2025 글로컬대학 본지정 사업 · Local-to-Global 사회 책무성 실현
        </div>
        <h1 className="mb-5 max-w-3xl text-4xl font-black leading-tight tracking-tight text-text md:text-5xl">
          대학과 지역이 함께 만드는
          <br />
          <em className="not-italic bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">
            사회공헌 플랫폼
          </em>
        </h1>
        <p className="mb-8 max-w-[640px] text-lg leading-relaxed text-text-secondary">
          지역의 문제를 함께 발견하고, 대학의 역량으로 해결하며, 성과를 지역에
          환원합니다. 리빙랩 5단계 프로세스를 통해 문제 해결의 전 과정을 투명하게
          공개합니다.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/issues" className="btn-primary text-md">
            지역 문제 제보하기
            <ArrowRight className="h-5 w-5" />
          </Link>
          <Link href="/projects" className="btn-secondary text-md">
            리빙랩 둘러보기
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── KPI ─────────────────────────────────────────────
function KPISection() {
  const kpis = [
    {
      label: '해결된 문제',
      value: '127',
      unit: '건',
      trend: '+12',
      trendLabel: '지난달 대비',
      color: 'primary' as const,
    },
    {
      label: '진행 중인 프로젝트',
      value: '12',
      unit: '개',
      trend: null,
      trendLabel: '4개 캠퍼스 전체',
      color: 'secondary' as const,
    },
    {
      label: '누적 봉사 시간',
      value: '2,845',
      unit: '시간',
      trend: '+580',
      trendLabel: '이번 학기',
      color: 'purple' as const,
    },
    {
      label: '참여 시민',
      value: '1,438',
      unit: '명',
      trend: null,
      trendLabel: '교수·학생·시민',
      color: 'orange' as const,
    },
  ];

  return (
    <section className="border-b border-border bg-surface py-12">
      <div className="container-content">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((k) => (
            <KPICard key={k.label} {...k} />
          ))}
        </div>
      </div>
    </section>
  );
}

const KPI_ICON_STYLE = {
  primary: 'bg-primary-light text-primary',
  secondary: 'bg-secondary-light text-secondary',
  purple: 'bg-[#ede9fe] text-[#7c3aed]',
  orange: 'bg-[#ffedd5] text-[#ea580c]',
} as const;

function KPICard({
  label,
  value,
  unit,
  trend,
  trendLabel,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  trend: string | null;
  trendLabel: string;
  color: keyof typeof KPI_ICON_STYLE;
}) {
  return (
    <div className="card">
      <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-lg ${KPI_ICON_STYLE[color]}`}>
        <TrendingUp className="h-5 w-5" />
      </div>
      <div className="text-xs font-medium uppercase tracking-wider text-text-secondary">
        {label}
      </div>
      <div className="my-2 text-3xl font-black leading-tight text-text">
        {value}
        <span className="ml-1 text-lg font-medium text-text-muted">{unit}</span>
      </div>
      <div className="flex items-center gap-1 text-xs text-text-muted">
        {trend && <span className="font-bold text-success">▲ {trend}</span>}
        <span>{trendLabel}</span>
      </div>
    </div>
  );
}

// ── Recent Issues ───────────────────────────────────
function RecentIssuesSection() {
  const issues = [
    {
      id: '1',
      title: '공주캠퍼스 앞 횡단보도 신호 대기 시간이 너무 깁니다',
      description:
        '아침 통학 시간에 공주캠퍼스 앞 횡단보도 신호가 너무 길어 학생들의 안전이 우려됩니다.',
      category: '안전',
      status: '처리중',
      campus: '공주',
      campusColor: 'bg-[#d1fae5] text-[#059669]',
      votes: 142,
      comments: 23,
      time: '6일 전',
    },
    {
      id: '2',
      title: '대전캠퍼스 도서관 주변 쓰레기 무단 투기 심각',
      description:
        '대전캠퍼스 중앙도서관 뒤편에 쓰레기가 계속 쌓이고 있습니다. 분리수거함 설치와 정기적인 청소가 필요합니다.',
      category: '환경',
      status: '담당 배정',
      campus: '대전',
      campusColor: 'bg-[#dbeafe] text-[#2563eb]',
      votes: 89,
      comments: 12,
      time: '3일 전',
    },
    {
      id: '3',
      title: '예산 지역 고령자 디지털 교육 수요 증가',
      description:
        '예산 지역 어르신들이 키오스크, 스마트폰 사용에 어려움을 겪고 있습니다. 정기적인 디지털 교육 프로그램이 필요합니다.',
      category: '복지',
      status: '해결됨',
      campus: '예산',
      campusColor: 'bg-[#ede9fe] text-[#7c3aed]',
      votes: 203,
      comments: 45,
      time: '2주 전',
    },
  ];

  return (
    <section className="py-12">
      <div className="container-content">
        <SectionHead
          title="최근 제보된 지역 문제"
          subtitle="시민이 직접 발견한 우리 지역의 문제들"
          moreHref="/issues"
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {issues.map((i) => (
            <Link
              key={i.id}
              href={`/issues/${i.id}`}
              className="card card-hover block"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="flex gap-2">
                  <span className="inline-flex items-center rounded-full border border-border px-3 py-0.5 text-xs font-semibold text-text-secondary">
                    {i.category}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-[#fef3c7] px-3 py-0.5 text-xs font-semibold text-[#d97706]">
                    {i.status}
                  </span>
                </div>
                <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${i.campusColor}`}>
                  {i.campus}
                </span>
              </div>
              <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-snug text-text">
                {i.title}
              </h3>
              <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">
                {i.description}
              </p>
              <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-text-muted">
                <span>👍 {i.votes}</span>
                <span>💬 {i.comments}</span>
                <span className="ml-auto">{i.time}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Projects ────────────────────────────────────────
function ProjectsSection() {
  const projects = [
    {
      id: 'prj-001',
      title: "청년 일자리 경험 플랫폼 '대전잡스'",
      description:
        'ICT 기반 청년 일자리 실험 및 농촌형 주거·일·경험 플랫폼 개발. 지역 청년들이 다양한 일 경험을 통해 진로를 탐색할 수 있도록 지원합니다.',
      campus: '대전 · 청년정착',
      campusColor: 'bg-[#dbeafe] text-[#2563eb]',
      phase: '실행 단계',
      progress: 35,
      progressColor: 'from-primary to-[#60a5fa]',
      members: 12,
      partners: 4,
      endDate: '~ 2026.12',
    },
    {
      id: 'prj-002',
      title: '백제문화권 청년 문화기획자 양성',
      description:
        '공주의 백제문화 자원을 활용한 청년 문화기획자 양성 프로그램. 유휴공간을 활용한 문화 창업 랩 운영.',
      campus: '공주 · 문화재생',
      campusColor: 'bg-[#d1fae5] text-[#059669]',
      phase: '개발 단계',
      progress: 60,
      progressColor: 'from-secondary to-[#34d399]',
      members: 8,
      partners: 3,
      endDate: '~ 2026.11',
    },
    {
      id: 'prj-003',
      title: '예산 고령자 돌봄테크 리빙랩',
      description:
        '원격진료 부스, 건강 모니터링, 디지털 역량 강화 플랫폼을 통한 고령자 돌봄 서비스 구축.',
      campus: '예산 · 고령자돌봄',
      campusColor: 'bg-[#ede9fe] text-[#7c3aed]',
      phase: '검증 단계',
      progress: 80,
      progressColor: 'from-[#7c3aed] to-[#a78bfa]',
      members: 15,
      partners: 6,
      endDate: '~ 2026.10',
    },
  ];

  return (
    <section className="bg-surface py-12">
      <div className="container-content">
        <SectionHead
          title="진행 중인 리빙랩 프로젝트"
          subtitle="대학이 주도하는 지역 혁신 실험실"
          moreHref="/projects"
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              href={`/projects/${p.id}`}
              className="card card-hover block"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${p.campusColor}`}>
                  {p.campus}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#fef3c7] px-3 py-0.5 text-xs font-semibold text-[#d97706]">
                  {p.phase}
                </span>
              </div>
              <h3 className="mb-2 line-clamp-2 text-lg font-bold leading-snug">
                {p.title}
              </h3>
              <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-text-secondary">
                {p.description}
              </p>
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-text-secondary">진행률</span>
                  <span className="font-bold text-primary">{p.progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-hover">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${p.progressColor}`}
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-text-muted">
                <span>👥 {p.members}명</span>
                <span>🏢 {p.partners}기관</span>
                <span className="ml-auto">{p.endDate}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Campus ──────────────────────────────────────────
function CampusSection() {
  const campuses = [
    {
      code: '대전캠퍼스',
      name: '청년정착 리빙랩',
      type: 'ICT 기반 청년일자리 실험, 농촌형 주거·일·경험 플랫폼',
      projects: 4,
      members: 35,
      color: '#2563eb',
    },
    {
      code: '공주캠퍼스',
      name: '교육·역사·문화재생 리빙랩',
      type: '백제문화권 청년문화기획, 도시유휴공간 활용 창업랩',
      projects: 3,
      members: 28,
      color: '#059669',
    },
    {
      code: '예산캠퍼스',
      name: '고령자돌봄테크 리빙랩',
      type: '원격진료부스, 건강 모니터링, 디지털 역량강화 플랫폼',
      projects: 3,
      members: 42,
      color: '#7c3aed',
    },
    {
      code: '세종캠퍼스',
      name: '모빌리티 리빙랩',
      type: '자율주행, 차량공유서비스, 교통문제 해결 플랫폼',
      projects: 2,
      members: 20,
      color: '#ea580c',
    },
  ];

  return (
    <section className="py-16">
      <div className="container-content">
        <div className="mb-8 text-center">
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight">
            캠퍼스별 특화 리빙랩
          </h2>
          <p className="text-md text-text-secondary">
            4개 캠퍼스가 각 지역 특성에 맞춘 리빙랩을 운영합니다
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {campuses.map((c) => (
            <Link
              key={c.code}
              href="/campus"
              className="relative overflow-hidden rounded-xl border border-border bg-surface p-6 transition hover:-translate-y-1 hover:shadow-lg"
              style={{ borderTop: `4px solid ${c.color}` }}
            >
              <div
                className="mb-3 inline-block rounded-sm px-3 py-1 text-xs font-bold text-white"
                style={{ backgroundColor: c.color }}
              >
                {c.code}
              </div>
              <h3 className="mb-2 text-lg font-extrabold">{c.name}</h3>
              <p className="mb-4 text-sm text-text-secondary">{c.type}</p>
              <div className="flex items-center gap-4 border-t border-border pt-4 text-xs text-text-muted">
                <span>프로젝트 {c.projects}건</span>
                <span>·</span>
                <span>참여 {c.members}명</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ─────────────────────────────────────────────
function CTASection() {
  return (
    <section className="bg-gradient-to-br from-primary to-[#7c3aed] py-16 text-center text-white">
      <div className="container-content">
        <h2 className="mb-4 text-3xl font-black tracking-tight text-white">
          여러분의 참여가 변화를 만듭니다
        </h2>
        <p className="mx-auto mb-8 max-w-[600px] text-md text-white/85">
          지역의 문제를 알고 계신가요? 여러분의 제보 하나가
          <br />
          대학과 지역을 움직이는 출발점이 됩니다.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/login"
            className="rounded-md bg-white px-6 py-4 text-md font-semibold text-primary transition hover:bg-white/90"
          >
            지금 시작하기
          </Link>
          <Link
            href="/about"
            className="rounded-md border border-white/30 bg-white/10 px-6 py-4 text-md font-semibold text-white transition hover:bg-white/20"
          >
            자세히 알아보기
          </Link>
        </div>
      </div>
    </section>
  );
}

// ── Reusable ────────────────────────────────────────
function SectionHead({
  title,
  subtitle,
  moreHref,
}: {
  title: string;
  subtitle: string;
  moreHref: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="mb-1 text-2xl font-extrabold tracking-tight">{title}</h2>
        <p className="text-md text-text-secondary">{subtitle}</p>
      </div>
      <Link href={moreHref} className="btn-ghost shrink-0">
        전체 보기
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
