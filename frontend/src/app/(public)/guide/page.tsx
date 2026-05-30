import { DeprecatedNotice } from '@/components/layout/DeprecatedNotice';

/**
 * Sprint 2 Day 1 — V1 참여 방법 페이지 격리 (CR-5).
 * V2 sitemap §3.1.2 에 별도 참여 가이드 없음 — /about 으로 통합.
 */
export default function GuideDeprecatedPage() {
  return (
    <DeprecatedNotice
      pageTitle="참여 방법"
      reason="USCP V2 (2026-05-16 합의) 에서 참여 방법 안내는 USCP 소개 페이지로 통합되었습니다."
      alternative={{ href: '/about', label: 'USCP 소개 보기' }}
    />
  );
}
