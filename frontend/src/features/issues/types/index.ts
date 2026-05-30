/**
 * USCP V2 Features / issues — 타입 정의.
 *
 * 설계 근거: docs/02-design/features/uscp-v2.design.md §3.2 (region/issue_stage/issue_track ENUM)
 */
import type { IssueStage } from '@/components/domain/StageStepper';
import type { IssueTrack } from '@/components/domain/TrackBadge';

export type RegionCode =
  | 'daejeon'
  | 'gongju'
  | 'yesan'
  | 'cheonan'
  | 'sejong';

export const REGIONS: ReadonlyArray<{
  code: RegionCode;
  label: string;
  color: string;
}> = [
  { code: 'daejeon', label: '대전', color: '#1E40AF' },
  { code: 'gongju', label: '공주', color: '#059669' },
  { code: 'yesan', label: '예산', color: '#7c3aed' },
  { code: 'cheonan', label: '천안', color: '#0891b2' },
  { code: 'sejong', label: '세종', color: '#ea580c' },
];

export const ALLOWED_PHOTO_MIMES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;
export type PhotoMime = (typeof ALLOWED_PHOTO_MIMES)[number];

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_SIZE_BYTES = 5 * 1024 * 1024;

export interface PhotoMeta {
  /** MinIO 객체 키 (presigned 단계에서 발급) */
  minio_key: string;
  filename: string;
  mime_type: PhotoMime;
  size_bytes: number;
  /** 클라이언트 미리보기 URL (createObjectURL). 서버 전송 시 제외. */
  preview_url?: string;
}

export interface PresignResponse {
  upload_url: string;
  minio_key: string;
  expires_in_seconds: number;
}

export interface SubmitIssueRequest {
  region: RegionCode;
  title: string;
  body: string;
  photos: Omit<PhotoMeta, 'preview_url'>[];
  location_lat?: number | null;
  location_lng?: number | null;
}

export interface SubmitIssueResponse {
  issue_id: string;
  stage: IssueStage;
  region: RegionCode;
  created_at: string;
  notification_enqueued: boolean;
  message: string;
}

export interface SubmitIssueError {
  code:
    | 'invalid_region'
    | 'invalid_title_length'
    | 'invalid_body_length'
    | 'too_many_photos'
    | 'invalid_photo_mime'
    | 'photo_too_large'
    | 'spam_throttled';
  message: string;
  [key: string]: unknown;
}

export type { IssueStage, IssueTrack };

// ── M02-02 ~ M02-05 (Sprint 2 Day 2-3) ───────────────────────

export interface IssueListItem {
  id: string;
  title: string;
  body?: string | null;
  region?: RegionCode | null;
  stage?: IssueStage | null;
  track?: IssueTrack | null;
  vote_count: number;
  comment_count: number;
  created_at: string;
}

export interface IssueListResponse {
  data: IssueListItem[];
  meta: {
    limit: number;
    has_more: boolean;
    next_cursor: string | null;
  };
}

export interface IssueListFilters {
  region?: RegionCode | null;
  stage?: IssueStage | null;
  track?: IssueTrack | null;
  q?: string;
  sort?: '-created_at' | '-vote_count';
  cursor?: string;
  limit?: number;
}

export interface IssueStageHistoryEntry {
  stage: IssueStage;
  prev_stage?: IssueStage | null;
  at: string;
  actor?: string | null;
  comment?: string | null;
}

export interface IssuePhoto {
  minio_key: string;
  title: string;
  mime_type: string;
  size_bytes: number;
  order_index: number;
}

export interface IssueDetail extends IssueListItem {
  reporter: { id: string | null; name: string | null };
  location: { lat: number; lng: number } | null;
  voted: boolean;
  history: IssueStageHistoryEntry[];
  photos: IssuePhoto[];
  /** M03-14 이 제보가 발전한 리빙랩 프로젝트 {id,title,stage}. */
  linked_project?: { id: string; title: string; stage?: string | null } | null;
}

export interface VoteResponse {
  voted: boolean;
  vote_count: number;
}

export interface CommentItem {
  id: string;
  content: string;
  is_deleted: boolean;
  author: { id: string | null; name: string };
  created_at: string;
}

export interface CommentListResponse {
  data: CommentItem[];
  meta: { total: number };
}
