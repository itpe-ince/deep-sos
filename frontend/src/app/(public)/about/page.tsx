import Link from 'next/link';
import type { Metadata } from 'next';
import { fetchCmsPage } from '@/lib/server-api';

export const metadata: Metadata = {
  title: 'USCP란?',
  description:
    'USCP(Union Social Contribution Platform)는 대학과 지역사회가 함께 문제를 발굴하고 해결하는 온라인 사회공헌 플랫폼입니다.',
};

/**
 * P-02 USCP란? — mockup/pages/public/about.html 포팅
 * Sprint 2: 상단에 CMS에서 관리하는 동적 콘텐츠 섹션 노출.
 */
export default async function AboutPage() {
  const cms = await fetchCmsPage('about');
  return (
    <>
      {cms?.content_html && (
        <section className="border-b border-border bg-white py-10">
          <div className="container-content">
            <div className="mb-2 text-xs font-semibold text-primary">CMS 편집 가능</div>
            <div
              className="prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: cms.content_html }}
            />
          </div>
        </section>
      )}
      <section className="bg-gradient-to-b from-primary-light to-bg py-16 text-center">
        <div className="container-content">
          <nav className="mb-4 flex justify-center gap-2 text-xs text-text-muted">
            <Link href="/">홈</Link>
            <span>/</span>
            <span>플랫폼 소개</span>
          </nav>
          <h1 className="mb-4 text-3xl font-black tracking-tight">USCP란?</h1>
          <p className="mx-auto max-w-2xl text-lg text-text-secondary">
            대학과 지역사회가 함께 문제를 발굴하고 해결하는
            <br />
            온라인 사회공헌 플랫폼입니다.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-content">
          <div className="grid gap-12 lg:grid-cols-[1fr_2fr]">
            <div>
              <div className="mb-2 text-sm font-bold uppercase tracking-wider text-primary">
                What We Do
              </div>
              <h2 className="text-2xl font-extrabold leading-snug tracking-tight">
                지역의 문제를 함께 해결합니다
              </h2>
            </div>
            <div className="space-y-4 text-base leading-relaxed text-text-secondary">
              <p>
                <strong className="text-text">
                  온라인 사회공헌 플랫폼(USCP, Union Social Contribution Platform)
                </strong>
                은 2025 글로컬대학 본지정 사업의 핵심 플랫폼으로, 대학의 역량을
                지역사회 문제 해결에 연결하는 디지털 인프라입니다.
              </p>
              <p>
                대전·공주·예산·세종 4개 캠퍼스를 기반으로, 교수와 학생, 시민,
                지자체, 지역기업이 함께 모여 지역의 현안을 발굴하고, 리빙랩
                방식으로 해결하며, 그 성과를 다시 지역에 환원합니다.
              </p>
              <p>
                봉사활동은{' '}
                <strong className="text-text">
                  사회복지자원봉사인증관리(VMS) 및 1365 자원봉사포털과 자동 연계
                </strong>
                되며, 활동 성과는 UN-SDGs 프레임으로 측정·보고됩니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-12">
        <div className="container-content">
          <div className="mb-8 text-center">
            <div className="mb-2 text-sm font-bold uppercase tracking-wider text-primary">
              How It Works
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">
              리빙랩 5단계 프로세스
            </h2>
            <p className="mt-3 text-text-secondary">
              문제 정의부터 성과 확산까지, 체계적인 5단계로 진행됩니다.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { num: 1, name: '탐색', desc: '지역문제 정의\n수집 및 제공' },
              { num: 2, name: '실행', desc: '리빙랩 프로젝트\n기획 및 수행' },
              { num: 3, name: '개발', desc: '시제품 등\n설계·개발' },
              { num: 4, name: '검증', desc: '유용성 시험\n피드백 평가' },
              { num: 5, name: '활용', desc: '성과 확산\n정책 연계' },
            ].map((step) => (
              <div key={step.num} className="rounded-lg border border-border bg-surface p-5 text-center">
                <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-base font-black text-white">
                  {step.num}
                </div>
                <div className="mb-1 text-base font-bold">{step.name}</div>
                <div className="whitespace-pre-line text-xs text-text-secondary">
                  {step.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container-content">
          <div className="mb-8 text-center">
            <div className="mb-2 text-sm font-bold uppercase tracking-wider text-primary">
              Who We Are
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight">운영 기관</h2>
            <p className="mt-3 text-text-secondary">3개 전문 센터가 유기적으로 협력합니다.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                name: '지역사회특화센터',
                roles: [
                  '지역사회문제 리빙랩 운영',
                  '교육·연구 연계 기획·조정',
                  'K-SDGs 협력 프로그램',
                  '메이커 운동 결합',
                ],
                bg: 'bg-primary-light',
                color: 'text-primary',
              },
              {
                name: 'ESG센터',
                roles: [
                  '통합대학 ESG 활동',
                  '기후위기 대응 시민역량',
                  '탄소중립 시범 캠퍼스',
                  'UN-SDGs 지역맞춤 프로그램',
                ],
                bg: 'bg-secondary-light',
                color: 'text-secondary',
              },
              {
                name: '국제협력센터',
                roles: [
                  'ODA 기반 국제협력',
                  '개발도상국 맞춤 국제연수',
                  '한국형 리빙랩 글로벌 확산',
                  'KOICA·UNDP 연계',
                ],
                bg: 'bg-[#ede9fe]',
                color: 'text-[#7c3aed]',
              },
            ].map((org) => (
              <div key={org.name} className="card">
                <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg ${org.bg} ${org.color} text-xl font-black`}>
                  ★
                </div>
                <h3 className="mb-3 text-lg font-bold">{org.name}</h3>
                <ul className="space-y-1.5">
                  {org.roles.map((r) => (
                    <li key={r} className="flex gap-2 text-sm text-text-secondary">
                      <span className="text-primary">·</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
