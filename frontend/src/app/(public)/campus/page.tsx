import { DeprecatedNotice } from '@/components/layout/DeprecatedNotice';

/**
 * Sprint 2 Day 1 — V1 캠퍼스 페이지 격리 (CR-5).
 * V2 sitemap §3.1.2 에 캠퍼스 페이지 없음 — /about 으로 통합.
 */
export default function CampusDeprecatedPage() {
  return (
    <DeprecatedNotice
      pageTitle="캠퍼스 소개"
      reason="USCP V2 (2026-05-16 합의) 에서 캠퍼스 소개는 USCP 소개 페이지로 통합되었습니다. 본 페이지는 곧 제거됩니다."
      alternative={{ href: '/about', label: 'USCP 소개 보기' }}
    />
  );
}
