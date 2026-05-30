'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

import { cn } from '@/lib/utils';

/**
 * M09-02: 6단계 의제 라이프사이클 안내 바.
 *
 * 설계 근거:
 *  - feature-spec §M09-02 (6단계 프로세스 안내)
 *  - design.md §3.2 issue_stage ENUM + §7.3 #1 홈 ProcessBar
 *  - mockup/pages/index.html .lifecycle (수평 6단계)
 *
 * 본 컴포넌트는 정보 제공용 정적 그래픽. 사용자 상호작용은 없으며
 * "지역문제 광장 둘러보기" CTA 만 제공. 단계별 동작 자체는 §M02 게이트키핑 참조.
 */

type StageColor =
  | 'reported'
  | 'reviewing'
  | 'published'
  | 'mentor-assigned'
  | 'in-progress'
  | 'resolved';

interface Step {
  num: number;
  title: string;
  desc: string;
  color: StageColor;
}

const STEPS: ReadonlyArray<Step> = [
  {
    num: 1,
    title: '제보',
    desc: '시민 회원이 5개 지역 분류와 사진 첨부로 지역문제를 제보합니다.',
    color: 'reported',
  },
  {
    num: 2,
    title: '검토중',
    desc: '운영자가 검토 의견을 기록하고 트랙 라벨(정책반영·정책참고·시민자율)을 지정합니다.',
    color: 'reviewing',
  },
  {
    num: 3,
    title: '공개등록',
    desc: '승인된 의제가 광장에 공개되어 공감투표·댓글이 가능해집니다.',
    color: 'published',
  },
  {
    num: 4,
    title: '멘토배정',
    desc: '운영자가 멘토단과 학생팀을 수동 매칭하고 이메일로 통보합니다.',
    color: 'mentor-assigned',
  },
  {
    num: 5,
    title: '처리중',
    desc: '리빙랩 활동 타임라인이 작성되고 산출물이 단계별로 업로드됩니다.',
    color: 'in-progress',
  },
  {
    num: 6,
    title: '해결완료',
    desc: '성공사례 4단계 스토리(문제→과정→결과→정책반영)로 아카이빙됩니다.',
    color: 'resolved',
  },
];

const NUM_BG: Record<StageColor, string> = {
  reported: 'bg-stage-reported',
  reviewing: 'bg-stage-reviewing',
  published: 'bg-stage-published',
  'mentor-assigned': 'bg-stage-mentor-assigned',
  'in-progress': 'bg-stage-in-progress',
  resolved: 'bg-stage-resolved',
};

export function ProcessBar() {
  return (
    <section
      aria-labelledby="process-heading"
      className="bg-bg py-16"
      data-testid="home-process-bar"
    >
      <div className="container-content">
        <div className="mb-10 text-center">
          <div className="mb-2 inline-block text-sm font-semibold uppercase tracking-wider text-primary">
            의제 라이프사이클
          </div>
          <h2
            id="process-heading"
            className="text-2xl font-black text-text md:text-3xl"
          >
            6단계로 투명하게 공개되는 처리 과정
          </h2>
          <p className="mt-3 text-base text-text-secondary">
            시민의 제보부터 해결까지, 모든 단계를 회원이 추적할 수 있고 단계
            변경 시 이메일로 알림을 받습니다.
          </p>
        </div>

        {/* 데스크탑: 가로 6단계 / 모바일: 세로 6단계 */}
        <ol
          className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6"
          role="list"
        >
          {STEPS.map((step, idx) => (
            <li
              key={step.num}
              className="relative flex flex-col items-start gap-3 rounded-xl border border-border bg-surface p-5 shadow-sm"
              data-testid={`process-step-${step.num}`}
              data-stage={step.color}
            >
              <div className="flex w-full items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-black text-white',
                    NUM_BG[step.color],
                  )}
                  aria-hidden="true"
                >
                  {step.num}
                </div>
                <div className="text-sm font-bold text-text">{step.title}</div>
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">
                {step.desc}
              </p>
              {idx < STEPS.length - 1 ? (
                <ChevronRight
                  aria-hidden="true"
                  className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-text-muted lg:block"
                />
              ) : null}
            </li>
          ))}
        </ol>

        <div className="mt-8 text-center">
          <Link
            href="/issues"
            className="inline-flex items-center gap-1.5 rounded-md border border-primary px-5 py-2.5 text-sm font-semibold text-primary hover:bg-primary-light"
            data-testid="process-bar-cta"
          >
            지역문제 광장 둘러보기
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
