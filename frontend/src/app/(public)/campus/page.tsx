import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight } from 'lucide-react';

export const metadata: Metadata = {
  title: '캠퍼스별 리빙랩',
  description:
    '대전·공주·예산·세종 4개 캠퍼스가 각 지역 특성에 맞춘 리빙랩을 운영합니다.',
};

const CAMPUSES = [
  {
    code: 'DJ',
    codeLabel: 'DAEJEON CAMPUS',
    name: '대전캠퍼스',
    type: '청년정착 리빙랩',
    heading: 'ICT 기반 청년일자리 실험 및 농촌형 주거·일·경험 플랫폼',
    desc: '대전의 청년 인구 유출 문제를 해결하기 위해, ICT 기술을 활용한 청년 일자리 실험과 농촌형 주거·일·경험을 결합한 청년정착 플랫폼을 운영합니다. 대전·충남도·한국수자원공사 등과 협력하여 지역 재난대응, 기후변화, 산업수학 분야의 융합연구를 진행합니다.',
    tags: ['ICT', '청년일자리', '농촌형 주거', '재난대응', '기후변화'],
    projects: 4,
    members: 35,
    bg: 'bg-[#dbeafe]',
    textColor: 'text-[#1e3a8a]',
    tagBg: 'bg-[#dbeafe] text-[#2563eb]',
  },
  {
    code: 'GJ',
    codeLabel: 'GONGJU CAMPUS',
    name: '공주캠퍼스',
    type: '교육·역사·문화재생 리빙랩',
    heading: '백제문화권 청년문화기획 및 도시유휴공간 활용 창업랩',
    desc: '공주의 역사·문화 자원을 활용한 청년 문화기획자 양성 프로그램을 운영합니다. 유휴공간을 활용한 문화 창업 인큐베이팅, 다문화 가정 및 소외계층을 위한 디지털 교육격차 해소 프로그램을 통해 지역의 문화적 가치를 높이고 청년 창업 생태계를 조성합니다.',
    tags: ['문화재생', '청년창업', '디지털격차 해소', '다문화'],
    projects: 3,
    members: 28,
    bg: 'bg-[#d1fae5]',
    textColor: 'text-[#064e3b]',
    tagBg: 'bg-[#d1fae5] text-[#059669]',
  },
  {
    code: 'YS',
    codeLabel: 'YESAN CAMPUS',
    name: '예산캠퍼스',
    type: '고령자돌봄테크 리빙랩',
    heading: '원격진료 부스, 건강 모니터링, 첨단 디지털 역량강화 플랫폼',
    desc: '예산의 고령화 문제에 대응하여, 원격진료 부스와 건강 모니터링 시스템, 디지털 역량강화 플랫폼을 운영합니다. 의료 취약 계층을 위한 테크 기반 돌봄 솔루션을 개발하고, 고령자가 디지털 사회에 참여할 수 있도록 지원합니다.',
    tags: ['고령자돌봄', '원격진료', '헬스케어', '디지털 역량'],
    projects: 3,
    members: 42,
    bg: 'bg-[#ede9fe]',
    textColor: 'text-[#4c1d95]',
    tagBg: 'bg-[#ede9fe] text-[#7c3aed]',
  },
  {
    code: 'SJ',
    codeLabel: 'SEJONG CAMPUS',
    name: '세종캠퍼스',
    type: '모빌리티 리빙랩',
    heading: '자율주행, 차량공유서비스, 교통문제 해결 플랫폼',
    desc: '세종시의 스마트시티 특성을 활용하여 자율주행 실증, 차량공유 서비스, 통합 모빌리티 플랫폼을 운영합니다. 미래 교통 문제 해결을 위한 실증 공간으로서, 대학과 기업·지자체가 협력하여 차세대 모빌리티 서비스를 개발합니다.',
    tags: ['자율주행', '차량공유', '스마트시티', '모빌리티'],
    projects: 2,
    members: 20,
    bg: 'bg-[#ffedd5]',
    textColor: 'text-[#7c2d12]',
    tagBg: 'bg-[#ffedd5] text-[#ea580c]',
  },
];

export default function CampusPage() {
  return (
    <>
      <section className="bg-surface py-12 pb-8">
        <div className="container-content">
          <nav className="mb-2 flex gap-2 text-xs text-text-muted">
            <Link href="/">홈</Link>
            <span>/</span>
            <Link href="/about">플랫폼 소개</Link>
            <span>/</span>
            <span>캠퍼스별 리빙랩</span>
          </nav>
          <h1 className="text-2xl font-black tracking-tight">캠퍼스별 특화 리빙랩</h1>
          <p className="mt-2 text-md text-text-secondary">
            대전·공주·예산·세종 4개 캠퍼스가 지역 특성에 맞춘 리빙랩을 운영합니다
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-content space-y-6">
          {CAMPUSES.map((c) => (
            <article
              key={c.code}
              className="grid overflow-hidden rounded-xl border border-border bg-surface lg:grid-cols-[320px_1fr]"
            >
              <div className={`flex min-h-[340px] flex-col justify-between p-8 ${c.bg} ${c.textColor}`}>
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest opacity-80">
                    {c.codeLabel}
                  </div>
                  <h2 className="mt-2 text-3xl font-black tracking-tight">{c.name}</h2>
                  <p className="mt-2 font-semibold opacity-85">{c.type}</p>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <div className="rounded-md bg-white/50 p-4 backdrop-blur-sm">
                    <div className="text-xs opacity-75">진행 프로젝트</div>
                    <div className="mt-1 text-xl font-black">{c.projects}건</div>
                  </div>
                  <div className="rounded-md bg-white/50 p-4 backdrop-blur-sm">
                    <div className="text-xs opacity-75">참여 인원</div>
                    <div className="mt-1 text-xl font-black">{c.members}명</div>
                  </div>
                </div>
              </div>
              <div className="p-8">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                  LIVING LAB
                </div>
                <h3 className="mb-4 text-xl font-bold leading-snug">{c.heading}</h3>
                <p className="mb-6 text-base leading-relaxed text-text-secondary">{c.desc}</p>
                <div className="mb-6 flex flex-wrap gap-2">
                  {c.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold ${c.tagBg}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link href="/projects" className="btn-primary">
                  진행 중인 프로젝트 보기
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
