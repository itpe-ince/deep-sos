/**
 * USCP V2 Features / cms — 타입 정의 (M07 콘텐츠 관리).
 *
 * 설계 근거: design.md §4.2 M07, feature-spec §M07-01~16
 */

// ── M07-01~04 공지·이벤트 (운영자 목록) ─────────────────────
export interface AdminContentItem {
  id: string;
  category: 'notice' | 'event' | string;
  title: string;
  is_pinned: boolean;
  is_published: boolean;
  published_at: string | null;
  event_at: string | null;
}

export interface CreateContentRequest {
  category: 'notice' | 'event';
  title: string;
  body: string;
  is_pinned?: boolean;
  event_at?: string | null;
  publish?: boolean;
}

// ── M07-07~09 배너 ──────────────────────────────────────────
export interface Banner {
  id: string;
  position: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  order_index: number;
  is_active: boolean;
}

export interface CreateBannerRequest {
  title: string;
  image_url: string;
  position?: string;
  subtitle?: string | null;
  link_url?: string | null;
  order_index?: number;
}

// ── M07-10~14 약관 ──────────────────────────────────────────
export type TermsKind = 'service' | 'privacy';

export const TERMS_KIND_LABELS: Record<TermsKind, string> = {
  service: '이용약관',
  privacy: '개인정보처리방침',
};

export interface TermsVersion {
  id: string;
  kind: TermsKind | string;
  kind_label: string;
  version: string;
  effective_at: string | null;
  require_reconsent: boolean;
  published_at: string | null;
}

export interface CurrentTerms {
  id: string;
  kind: TermsKind | string;
  kind_label: string;
  version: string;
  body: string;
  effective_at: string | null;
  require_reconsent: boolean;
}

export interface ReconsentPending {
  terms_id: string;
  kind: string;
  kind_label: string;
  version: string;
}

export interface ReconsentRequiredResponse {
  required: boolean;
  pending: ReconsentPending[];
}

export interface ReconsentSubmitResponse {
  accepted: boolean;
  force_logout: boolean;
  message: string;
}
