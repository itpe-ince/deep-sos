'use client';

import { FileUp, Upload } from 'lucide-react';
import { useRef, useState } from 'react';

import { useToast } from '@/components/ui';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { createDeliverable, uploadDeliverableFile } from '../api';

/**
 * M03-09 산출물 업로드 — presigned URL + 메타데이터 등록.
 *
 * 100MB 제한 (feature-spec §M03-09). 단계 분류는 자유 입력 (V1 호환 — 추후 ENUM).
 */
export interface DeliverableUploadProps {
  projectId: string;
  onCreated?: () => void;
}

const MAX_BYTES = 100 * 1024 * 1024;
const MAX_MB = Math.round(MAX_BYTES / (1024 * 1024));

export function DeliverableUpload({
  projectId,
  onCreated,
}: DeliverableUploadProps) {
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [uploading, setUploading] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error(`파일은 ${MAX_MB}MB 이하만 업로드 가능합니다.`);
      if (fileRef.current) fileRef.current.value = '';
      return;
    }
    setFile(f);
    if (!title.trim()) {
      setTitle(f.name.replace(/\.[^/.]+$/, ''));
    }
  }

  const titleOk = title.trim().length >= 1 && title.trim().length <= 200;
  const ready = !!file && titleOk;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !file || uploading) return;
    setUploading(true);
    try {
      // 1) presign + PUT
      const meta = await uploadDeliverableFile(projectId, file);
      // 2) 메타데이터 등록
      const tags = tagsRaw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      await createDeliverable(projectId, {
        title: title.trim(),
        minio_key: meta.minio_key,
        content_type: meta.content_type,
        size_bytes: meta.size_bytes,
        stage: stage.trim() || null,
        tags: tags.length > 0 ? tags : null,
      });
      toast.success('산출물을 등록했습니다.');
      setFile(null);
      setTitle('');
      setStage('');
      setTagsRaw('');
      if (fileRef.current) fileRef.current.value = '';
      onCreated?.();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: { code?: string; message?: string } })
          ?.detail;
        if (detail?.code === 'project_member_required') {
          toast.error('매칭된 멤버 또는 운영자만 업로드할 수 있습니다.');
          return;
        }
        if (detail?.code === 'file_too_large') {
          toast.error(`파일은 ${MAX_MB}MB 이하만 업로드 가능합니다.`);
          return;
        }
        toast.error(detail?.message ?? err.message);
        return;
      }
      toast.error(err instanceof Error ? err.message : '업로드 실패');
    } finally {
      setUploading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-md border border-border bg-surface p-4"
      data-testid="deliverable-upload"
    >
      <h3 className="text-sm font-bold text-text">산출물 업로드</h3>

      <div>
        <input
          ref={fileRef}
          type="file"
          onChange={handleFileChange}
          className="sr-only"
          id="deliverable-file"
          data-testid="deliverable-file"
        />
        <label
          htmlFor="deliverable-file"
          className={cn(
            'flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-bg px-4 py-6 text-sm text-text-secondary hover:border-primary hover:text-primary',
            file && 'border-success text-success',
          )}
          data-testid="deliverable-file-label"
        >
          {file ? (
            <>
              <FileUp className="h-4 w-4" aria-hidden="true" />
              {file.name} ({Math.round(file.size / 1024)}KB)
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" aria-hidden="true" />
              파일 선택 (최대 {MAX_MB}MB)
            </>
          )}
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-text">
          제목
          <span className="ml-1 text-danger" aria-hidden="true">
            *
          </span>
        </span>
        <input
          type="text"
          required
          minLength={1}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
          data-testid="deliverable-title"
          aria-invalid={!!title && !titleOk}
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">단계 (선택)</span>
          <input
            type="text"
            maxLength={30}
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            placeholder="예: 중간보고"
            className={inputClass}
            data-testid="deliverable-stage"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-text">태그 (선택)</span>
          <input
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="쉼표로 구분 (예: 보고서, 설계)"
            className={inputClass}
            data-testid="deliverable-tags"
          />
        </label>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!ready || uploading}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:bg-text-muted',
          )}
          data-testid="deliverable-submit"
        >
          <Upload className="h-4 w-4" aria-hidden="true" />
          {uploading ? '업로드 중...' : '업로드'}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';
