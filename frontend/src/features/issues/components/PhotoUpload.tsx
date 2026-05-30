'use client';

import { Upload, X } from 'lucide-react';
import { useId, useRef } from 'react';

import { useToast } from '@/components/ui';
import { cn } from '@/lib/utils';

import {
  ALLOWED_PHOTO_MIMES,
  MAX_PHOTOS,
  MAX_PHOTO_SIZE_BYTES,
  type PhotoMeta,
  type PhotoMime,
} from '../types';

/**
 * 사진 첨부 (최대 5장 · 각 5MB · JPG/PNG/WebP).
 *
 * 설계 근거:
 *  - feature-spec §M02-01 (사진 첨부 정책)
 *  - design.md §7.2.1 (alert 금지 — Toast 사용)
 *
 * 실제 업로드(presign + PUT)는 호출자가 `onPick` 콜백 내에서 `uploadPhoto()` 호출.
 * 본 컴포넌트는 파일 선택·검증·미리보기·제거 UI 만 담당.
 */
export interface PhotoUploadProps {
  photos: PhotoMeta[];
  onAddFiles: (files: File[]) => void | Promise<void>;
  onRemove: (index: number) => void;
  /** 업로드 중 상태 표시 (선택) */
  uploading?: boolean;
}

const MAX_MB = Math.round(MAX_PHOTO_SIZE_BYTES / (1024 * 1024));

export function PhotoUpload({
  photos,
  onAddFiles,
  onRemove,
  uploading,
}: PhotoUploadProps) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);

    // 1) 개수 검증
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) {
      toast.error(`사진은 최대 ${MAX_PHOTOS}장까지 첨부 가능합니다.`);
      return;
    }
    const selected = files.slice(0, remaining);
    if (files.length > remaining) {
      toast.warning(
        `사진 ${remaining}장만 추가했습니다 (최대 ${MAX_PHOTOS}장).`,
      );
    }

    // 2) MIME / 크기 검증
    const accepted: File[] = [];
    for (const f of selected) {
      if (!ALLOWED_PHOTO_MIMES.includes(f.type as PhotoMime)) {
        toast.error(`${f.name}: JPG · PNG · WebP 형식만 허용됩니다.`);
        continue;
      }
      if (f.size > MAX_PHOTO_SIZE_BYTES) {
        toast.error(
          `${f.name}: 1장당 ${MAX_MB}MB 이하로 첨부 가능합니다.`,
        );
        continue;
      }
      accepted.push(f);
    }

    if (accepted.length > 0) {
      void onAddFiles(accepted);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div data-testid="photo-upload">
      <label
        htmlFor={inputId}
        className="mb-2 block text-sm font-semibold text-text"
      >
        사진 첨부 (선택)
        <span className="ml-2 text-xs font-normal text-text-muted">
          최대 {MAX_PHOTOS}장 · 1장 {MAX_MB}MB · JPG/PNG/WebP
        </span>
      </label>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {photos.map((p, idx) => (
          <div
            key={p.minio_key}
            className="relative aspect-[4/3] overflow-hidden rounded-md border border-border bg-bg"
            data-testid={`photo-item-${idx}`}
          >
            {p.preview_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.preview_url}
                alt={p.filename}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-text-muted">
                {p.filename}
              </div>
            )}
            <button
              type="button"
              onClick={() => onRemove(idx)}
              aria-label={`사진 ${idx + 1} 제거`}
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-danger text-white hover:bg-danger/80"
              data-testid={`photo-remove-${idx}`}
            >
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        ))}

        {photos.length < MAX_PHOTOS ? (
          <label
            htmlFor={inputId}
            className={cn(
              'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-bg text-sm text-text-secondary transition hover:border-primary hover:text-primary',
              uploading && 'pointer-events-none opacity-60',
            )}
            data-testid="photo-add"
          >
            <Upload size={20} aria-hidden="true" />
            {uploading ? '업로드 중...' : '사진 추가'}
            <span className="text-[11px] text-text-muted">
              {photos.length} / {MAX_PHOTOS}
            </span>
          </label>
        ) : null}
      </div>

      <input
        ref={fileInputRef}
        id={inputId}
        type="file"
        accept={ALLOWED_PHOTO_MIMES.join(',')}
        multiple
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
        data-testid="photo-input"
      />
    </div>
  );
}
