import Link from 'next/link';
import type { Metadata } from 'next';
import { ArrowRight, Check } from 'lucide-react';
import { fetchCmsPage } from '@/lib/server-api';

export const metadata: Metadata = {
  title: '참여 방법 안내',
  description:
    '누구나 쉽게 우리 지역의 문제를 함께 해결할 수 있습니다. 시민·학생·교수·지자체·기관 각자의 참여 방식을 안내합니다.',
};

const STEPS = [
  {
    num: 1,
    title: '회원가입 및 로그인',
    desc:
      'SOS랩 홈페이지에서 간단한 정보 입력으로 가입할 수 있습니다. 카카오·네이버·구글 계정으로도 바로 시작할 수 있습니다.',
    items: [
      '이메일 주소와 기본 정보만으로 가입',
      '소셜 로그인 지원 (카카오·네이버·구글)',
      '거주 지역 선택 (대전/공주/예산/세종)',
    ],
  },
  {
    num: 2,
    title: '지역 문제 제보하기',
    desc:
      '일상에서 발견한 지역의 문제를 제목·설명·사진·위치와 함께 등록합니다. 익명 제보도 가능합니다.',
    items: [
      '카테고리 선택 (환경·안전·교통·복지·문화·기타)',
      '지도에서 위치 선택 또는 GPS 자동 인식',
      '사진 최대 5장 첨부 가능',
    ],
  },
  {
    num: 3,
    title: '공감 · 댓글로 의견 나누기',
    desc:
      '다른 시민이 제보한 문제에 공감 투표하고 의견을 댓글로 남겨주세요. 공감이 많은 문제가 우선적으로 리빙랩 프로젝트로 전환됩니다.',
    items: [
      '공감 투표로 우선순위 결정',
      '처리 상태 실시간 확인 (접수→검토→처리→완료)',
    ],
  },
  {
    num: 4,
    title: '리빙랩 프로젝트 참여',
    desc:
      '관심 있는 리빙랩 프로젝트에 직접 참여할 수 있습니다. 설문, 인터뷰, 시제품 테스트 등 다양한 방식으로 참여 가능합니다.',
    items: [
      '현장 피드백 등록 (설문·체크리스트·사진·메모)',
      '아이디어 보드에서 팀원과 협업',
      '참여 활동은 봉사시간으로 자동 인증',
    ],
  },
  {
    num: 5,
    title: '봉사시간 인증 받기',
    desc:
      '플랫폼에서 참여한 봉사활동은 VMS(자원봉사 인증관리)와 1365 자원봉사포털에 자동으로 인증되어 포트폴리오에 기록됩니다.',
    items: ['VMS · 1365 자동 연동', '개인 포트폴리오 PDF 다운로드 가능'],
  },
];

const FAQS = [
  {
    q: 'SOS랩에 참여하려면 대학교 구성원이어야 하나요?',
    a: '아닙니다. 대전·공주·예산·세종 지역의 모든 시민이 참여할 수 있습니다. 교수, 학생뿐만 아니라 지역 주민, 공무원, 지역기업 관계자 누구나 회원가입 후 이용 가능합니다.',
  },
  {
    q: '익명으로 문제를 제보할 수 있나요?',
    a: '가능합니다. 제보 시 "익명 제보" 옵션을 선택하면 다른 사용자에게 작성자가 공개되지 않습니다. 단, 관리자는 악성 제보 방지를 위해 작성자 정보를 확인할 수 있습니다.',
  },
  {
    q: '봉사시간은 어떻게 인정받나요?',
    a: 'SOS랩의 봉사활동과 리빙랩 참여는 VMS(사회복지자원봉사인증관리)와 1365 자원봉사포털에 자동으로 연동됩니다. 활동 종료 후 관리자 확인을 거쳐 봉사시간이 공식 인정되며, 개인 포트폴리오에도 기록됩니다.',
  },
  {
    q: '제보한 문제는 어떻게 처리되나요?',
    a: '제보 즉시 관리자가 검토하며, 담당자가 배정되면 상태가 실시간으로 업데이트됩니다. 단순 민원은 지자체에 전달되고, 구조적 문제는 리빙랩 프로젝트로 전환되어 대학 연구진이 참여해 해결합니다.',
  },
  {
    q: '참여에 비용이 드나요?',
    a: '모든 플랫폼 이용은 무료입니다. 회원가입, 제보, 리빙랩 참여, 봉사활동 신청 등 어떤 기능도 별도 비용이 들지 않습니다.',
  },
];

export default async function GuidePage() {
  const cms = await fetchCmsPage('guide');
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
      <section className="bg-gradient-to-b from-secondary-light to-bg py-16 text-center">
        <div className="container-content">
          <nav className="mb-4 flex justify-center gap-2 text-xs text-text-muted">
            <Link href="/">홈</Link>
            <span>/</span>
            <Link href="/about">플랫폼 소개</Link>
            <span>/</span>
            <span>참여 방법</span>
          </nav>
          <h1 className="mb-4 text-3xl font-black tracking-tight">
            SOS랩에 참여하는 방법
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-text-secondary">
            누구나 쉽게 우리 지역의 문제를 함께 해결할 수 있습니다.
            <br />
            시민·학생·교수·지자체·기관 각자의 참여 방식을 안내해드립니다.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container-content max-w-3xl">
          {STEPS.map((step, idx) => (
            <div key={step.num} className="relative mb-8 grid grid-cols-[80px_1fr] gap-6 last:mb-0">
              {idx !== STEPS.length - 1 && (
                <div className="absolute left-[40px] top-20 bottom-[-32px] w-0.5 -translate-x-1/2 bg-border" />
              )}
              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary text-3xl font-black text-white shadow-lg">
                {step.num}
              </div>
              <div className="card">
                <h2 className="mb-3 text-xl font-extrabold tracking-tight">{step.title}</h2>
                <p className="mb-4 text-base leading-relaxed text-text-secondary">{step.desc}</p>
                <div className="space-y-2">
                  {step.items.map((it) => (
                    <div key={it} className="flex items-center gap-3 rounded-md bg-bg p-3 text-sm">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary-light text-secondary">
                        <Check className="h-3.5 w-3.5" strokeWidth={3} />
                      </div>
                      <span>{it}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}

          <div className="mt-12 text-center">
            <Link href="/login" className="btn-primary text-md">
              지금 시작하기
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface py-12">
        <div className="container-content max-w-3xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold tracking-tight">자주 묻는 질문</h2>
            <p className="mt-2 text-text-secondary">궁금한 점을 해결해드립니다</p>
          </div>
          <div className="space-y-3">
            {FAQS.map((f) => (
              <details
                key={f.q}
                className="group overflow-hidden rounded-lg border border-border bg-surface"
              >
                <summary className="flex cursor-pointer items-center justify-between p-5 text-base font-semibold marker:hidden">
                  <span>
                    <span className="mr-3 font-black text-primary">Q.</span>
                    {f.q}
                  </span>
                  <span className="text-text-muted transition group-open:rotate-180">⌃</span>
                </summary>
                <div className="border-t border-border px-5 py-4 pl-14 text-sm leading-relaxed text-text-secondary">
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
