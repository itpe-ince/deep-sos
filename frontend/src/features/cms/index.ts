/**
 * USCP V2 Features / cms — barrel export (M07 콘텐츠 관리).
 */
export {
  listAdminContents,
  createContent,
  updateContent,
  deleteContent,
  presignResource,
  createResource,
  listAdminBanners,
  listPublicBanners,
  createBanner,
  updateBanner,
  listTermsVersions,
  publishTerms,
  getCurrentTerms,
  checkReconsentRequired,
  submitReconsent,
} from './api';

export {
  TERMS_KIND_LABELS,
  type AdminContentItem,
  type CreateContentRequest,
  type Banner,
  type CreateBannerRequest,
  type TermsKind,
  type TermsVersion,
  type CurrentTerms,
  type ReconsentPending,
  type ReconsentRequiredResponse,
  type ReconsentSubmitResponse,
} from './types';

export { ReconsentModal } from './components/ReconsentModal';
export { ReconsentGate } from './components/ReconsentGate';
