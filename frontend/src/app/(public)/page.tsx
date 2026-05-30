import Link from 'next/link';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

import {
  ProcessBar,
  RecentIssues,
  RegionMap,
  StatsCards,
} from '@/components/home';

/**
 * USCP V2 홈 화면 (sitemap #1).
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §7.3 #1 홈
 *
 * V2 구성:
 *   1. Hero       — 환영 메시지 + 핵심 CTA (V1 유지, 콘텐츠 V2 정합)
 *   2. StatsCards — M09-01 운영 현황 4종 카드
 *   3. ProcessBar — M09-02 6단계 의제 라이프사이클 안내
 *   4. RegionMap  — M09-05 5개 지역 현황 지도 (KakaoMap + fallback)
 *   5. RecentIssues — M09-03 최근 제보 3건 카드 그리드
 *   6. ProjectsSection — 진행 중 리빙랩 (V1 유지, V2 sitemap 정합)
 *   7. CTASection — 참여 유도 (V1 유지)
 *
 * V1 제거: CampusSection (V2 sitemap §3.1.2 에 캠퍼스 페이지 없음, /about 으로 통합)
 */
export default function HomePage() {
  return (
    <>
      <HeroSection />
      <StatsCards />
      <ProcessBar />
      <RegionMap />
      <RecentIssues />
      <ProjectsSection />
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
