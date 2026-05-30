'use client';

import { ArrowLeft, Send } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useToast } from '@/components/ui';
import {
  PhotoUpload,
  RegionSelect,
  submitIssue,
  uploadPhoto,
  type PhotoMeta,
  type RegionCode,
  type SubmitIssueError,
} from '@/features/issues';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/use-auth';

/**
 * USCP V2 — 지역문제 제보 작성 (sitemap #11).
 *
 * 설계 근거:
 *  - feature-spec §M02-01 (지역문제 제보 등록)
 *  - design.md §7.3 #11 (RegionSelect + ImageUpload + MapPicker)
 *  - design.md §7.2.1 (alert 금지)
 *  - design.md §10.3.3 (6항 검증)
 *
 * 권한: 시민 회원 이상 (비로그인 → /login?next=/user/issue-new)
 *
 * V2 변경:
 *  - V1 `(public)/issues/new/page.tsx` 의 보호 안 된 작성 경로 제거
 *  - sitemap §3.1.3 의 `/user/issue-new` 위치 정합성 확보
 *  - features/issues 의 RegionSelect + PhotoUpload + submitIssue 사용
 */
const MIN_TITLE = 1;
const MAX_TITLE = 100;
const MIN_BODY = 10;
const MAX_BODY = 5000;

export default function IssueNewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const toast = useToast();

  const [region, setRegion] = useState<RegionCode | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [photos, setPhotos] = useState<PhotoMeta[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/user/issue-new');
    }
  }, [authLoading, user, router]);

  // ── 사진 추가 (presign + PUT) ────────────────────────────
  async function handleAddFiles(files: File[]) {
    setUploading(true);
    try {
      const uploaded: PhotoMeta[] = [];
      for (const f of files) {
        try {
          const meta = await uploadPhoto(f);
          uploaded.push(meta);
        } catch (err) {
          toast.error(
            err instanceof Error
              ? `${f.name}: ${err.message}`
              : `${f.name} 업로드 실패`,
          );
        }
      }
      if (uploaded.length > 0) {
        setPhotos((prev) => [...prev, ...uploaded]);
      }
    } finally {
      setUploading(false);
    }
  }

  function handleRemovePhoto(idx: number) {
    setPhotos((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      // 미리보기 URL 메모리 해제
      const removed = prev[idx];
      if (removed?.preview_url) URL.revokeObjectURL(removed.preview_url);
      return next;
    });
  }

  // ── 제출 ────────────────────────────────────────────────
  const titleOk = title.trim().length >= MIN_TITLE && title.trim().length <= MAX_TITLE;
  const bodyOk = body.trim().length >= MIN_BODY && body.trim().length <= MAX_BODY;
  const formOk = region !== null && titleOk && bodyOk && !uploading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formOk || submitting || !region) return;
    setSubmitting(true);
    try {
      const result = await submitIssue({
        region,
        title: title.trim(),
        body: body.trim(),
        photos: photos.map((p) => ({
          minio_key: p.minio_key,
          filename: p.filename,
          mime_type: p.mime_type,
          size_bytes: p.size_bytes,
        })),
      });
      toast.success(result.message, 5000);
      router.replace(`/issues/${result.issue_id}`);
    } catch (err) {
      handleError(err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleError(err: unknown) {
    if (err instanceof ApiError) {
      const detail = (err.detail as { detail?: SubmitIssueError })?.detail;
      const code = detail?.code;
      switch (code) {
        case 'invalid_region':
          toast.error('지역을 선택해 주세요.');
          return;
        case 'invalid_title_length':
          toast.error('제목은 1~100자로 입력해 주세요.');
          return;
        case 'invalid_body_length':
          toast.error('본문은 10~5000자로 입력해 주세요.');
          return;
        case 'too_many_photos':
          toast.error('사진은 최대 5장까지 첨부 가능합니다.');
          return;
        case 'invalid_photo_mime':
          toast.error('JPG · PNG · WebP 형식만 허용됩니다.');
          return;
        case 'photo_too_large':
          toast.error('사진 1장당 5MB 이하로 첨부 가능합니다.');
          return;
        case 'spam_throttled':
          toast.warning(
            '같은 지역에 5분 내 3건 이상 제보할 수 없습니다. 잠시 후 다시 시도해 주세요.',
          );
          return;
      }
      toast.error(detail?.message ?? err.message);
      return;
    }
    toast.error(err instanceof Error ? err.message : '제보 등록 실패');
  }

  if (authLoading || !user) {
    return (
      <div className="container-content py-12" data-testid="issue-new-loading">
        <p className="text-sm text-text-muted">확인 중...</p>
      </div>
    );
  }

  return (
    <div className="container-content py-12" data-testid="issue-new-page">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/issues"
          className="mb-4 inline-flex items-center gap-1 text-sm text-text-secondary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          지역문제 광장으로
        </Link>

        <h1 className="mb-2 text-2xl font-black text-text">지역문제 제보</h1>
        <p className="mb-8 text-sm text-text-secondary">
          5개 지역 중 한 곳을 선택하고 발견하신 문제를 알려주세요. 운영자 검토
          후 단계가 변경되면 이메일로 안내드립니다.
        </p>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border border-border bg-surface p-6 shadow-sm"
          data-testid="issue-new-form"
          noValidate
        >
          <RegionSelect value={region} onChange={setRegion} label="지역" />

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text">
              제목
              <span className="ml-1 text-danger" aria-hidden="true">
                *
              </span>
            </span>
            <input
              type="text"
              required
              minLength={MIN_TITLE}
              maxLength={MAX_TITLE}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="문제 상황을 한 문장으로 요약해 주세요"
              className={inputClass}
              data-testid="issue-title"
              aria-invalid={!!title && !titleOk}
            />
            <span className="mt-1 block text-xs text-text-muted">
              {title.length} / {MAX_TITLE}
            </span>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-text">
              본문
              <span className="ml-1 text-danger" aria-hidden="true">
                *
              </span>
            </span>
            <textarea
              required
              minLength={MIN_BODY}
              maxLength={MAX_BODY}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="문제 상황·위치·요청 사항을 자유롭게 작성해 주세요 (10자 이상)"
              className={cn(inputClass, 'resize-y')}
              data-testid="issue-body"
              aria-invalid={!!body && !bodyOk}
            />
            <span className="mt-1 block text-xs text-text-muted">
              {body.length} / {MAX_BODY} (최소 {MIN_BODY}자)
            </span>
          </label>

          <PhotoUpload
            photos={photos}
            onAddFiles={handleAddFiles}
            onRemove={handleRemovePhoto}
            uploading={uploading}
          />

          <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:bg-bg"
              data-testid="issue-cancel"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!formOk || submitting}
              className={cn(
                'inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover',
                'disabled:cursor-not-allowed disabled:bg-text-muted',
              )}
              data-testid="issue-submit"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? '등록 중...' : '제보 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
