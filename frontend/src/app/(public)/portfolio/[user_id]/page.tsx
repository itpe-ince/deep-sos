import { DeprecatedNotice } from '@/components/layout/DeprecatedNotice';

/**
 * Sprint 2 Day 1 — V1 포트폴리오 페이지 격리 (CR-5).
 * V2 plan §7.2 (본 사업 범위 외) — 사회공헌 포트폴리오 제거.
 */
export default function PortfolioDeprecatedPage() {
  return (
    <DeprecatedNotice
      pageTitle="사회공헌 포트폴리오"
      reason="USCP V2 (2026-05-16 합의) 에서 사회공헌 포트폴리오는 본 사업 범위에서 제외되었습니다. 본인 제보 이력은 마이페이지 내 활동에서 확인하실 수 있습니다."
      alternative={{ href: '/user/my-activities', label: '내 활동 보기' }}
    />
  );
}
