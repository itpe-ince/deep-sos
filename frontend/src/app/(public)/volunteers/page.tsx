import { DeprecatedNotice } from '@/components/layout/DeprecatedNotice';

/**
 * Sprint 2 Day 1 — V1 봉사활동 페이지 격리 (CR-5).
 * V2 plan §7.2 (본 사업 범위 외) — VMS/1365 연계 봉사활동 관리 제거.
 */
export default function VolunteersDeprecatedPage() {
  return (
    <DeprecatedNotice
      pageTitle="봉사활동"
      reason="USCP V2 (2026-05-16 합의) 에서 봉사활동 관리는 본 사업 범위에서 제외되었습니다. 지역사회 참여는 지역문제 광장과 리빙랩을 통해 진행됩니다."
      alternative={{ href: '/issues', label: '지역문제 광장 둘러보기' }}
    />
  );
}
