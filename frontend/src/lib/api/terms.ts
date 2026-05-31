/**
 * 약관 데이터 fetch 레이어 — DB 우선, 실패 시 정적 fallback.
 *
 * 설계 근거:
 *  - design.md §4.2 M07: GET /terms/{kind}/current (public)
 *  - design.md §8.4 컴플라이언스: 약관/개인정보처리방침 항상 노출
 *
 * 운영자가 terms_versions 에 발행된 약관이 없거나 (M07 admin 미사용)
 * 백엔드 마이그레이션이 아직 적용되지 않은 dev 환경에서도 본문이 보이도록
 * 정적 fallback (lib/content/static-terms) 으로 대체한다.
 */
import { STATIC_TERMS, type StaticTerms, type TermsKind } from '@/lib/content/static-terms';
import { serverFetch } from '@/lib/server-api';

export interface TermsApiResponse {
  id: string;
  kind: string;
  version: string;
  body: string;
  effective_at: string | null;
  require_reconsent: boolean;
}

export interface ResolvedTerms extends StaticTerms {
  /** DB 발행본 사용 시 true, fallback 정적 본문 사용 시 false */
  isPublished: boolean;
}

/**
 * 약관 단일 조회 — DB 본문이 있으면 우선, 없으면 정적 fallback.
 *
 * 실패 정책:
 *  - 404 (terms_not_found): 운영자가 아직 발행하지 않음 → fallback
 *  - 5xx, 네트워크 에러: 백엔드 마이그레이션 미적용 또는 장애 → fallback
 *  - kind 유효성은 호출 측에서 검증 (없으면 notFound() 처리)
 */
export async function getTermsContent(kind: TermsKind): Promise<ResolvedTerms> {
  const fallback = STATIC_TERMS[kind];
  try {
    const res = await serverFetch<TermsApiResponse>(`/terms/${kind}/current`);
    if (!res?.body) {
      return { ...fallback, isPublished: false };
    }
    return {
      ...fallback,
      version: res.version || fallback.version,
      effectiveAt: res.effective_at ?? fallback.effectiveAt,
      body: res.body,
      isPublished: true,
    };
  } catch {
    return { ...fallback, isPublished: false };
  }
}
