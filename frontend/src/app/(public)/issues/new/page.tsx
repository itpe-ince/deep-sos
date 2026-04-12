'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ImagePlus, X } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

const CATEGORIES = [
  { key: 'environment', label: '환경' },
  { key: 'safety', label: '안전' },
  { key: 'transport', label: '교통' },
  { key: 'welfare', label: '복지' },
  { key: 'culture', label: '문화' },
  { key: 'other', label: '기타' },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3810/api';

interface ImagePreview {
  file: File;
  url: string;
}

export default function IssueNewPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('environment');
  const [locationAddress, setLocationAddress] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/issues/new');
    }
  }, [authLoading, user, router]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (images.length + files.length > 5) {
      setError('최대 5장까지 업로드할 수 있습니다.');
      return;
    }
    setError(null);
    const previews = files.map((file) => ({
      file,
      url: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...previews]);
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].url);
      copy.splice(index, 1);
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const fd = new FormData();
      fd.append('title', title);
      fd.append('description', description);
      fd.append('category', category);
      if (locationAddress) fd.append('location_address', locationAddress);
      fd.append('is_anonymous', String(isAnonymous));
      images.forEach((img) => fd.append('images', img.file));

      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_URL}/v1/issues`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        body: fd,
      });

      if (!res.ok) {
        const problem = await res.json().catch(() => null);
        throw new ApiError(
          res.status,
          problem?.detail ?? `Upload failed: ${res.status}`,
          problem,
        );
      }

      const created = await res.json();
      router.push(`/issues/${created.id}`);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError('알 수 없는 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-text-secondary">
        확인 중...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/issues"
        className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> 이슈 목록으로
      </Link>

      <header className="mb-8">
        <p className="text-sm font-semibold text-primary">P-12 · BF-1 지역 문제</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">문제 제안하기</h1>
        <p className="mt-2 text-sm text-text-secondary">
          {user.name}님, 지역에서 발견한 문제를 알려주세요. 공감이 쌓이면 리빙랩 프로젝트로 전환됩니다.
        </p>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-border bg-white p-8 shadow-sm"
      >
        <div>
          <label className="mb-2 block text-sm font-semibold">
            제목 <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={5}
            maxLength={200}
            placeholder="예: 도서관 앞 횡단보도 신호가 너무 짧아요"
            className="w-full rounded-md border border-border px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            카테고리 <span className="text-danger">*</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                type="button"
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  category === cat.key
                    ? 'bg-primary text-white'
                    : 'border border-border text-text-secondary hover:border-primary hover:text-primary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            상세 설명 <span className="text-danger">*</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            minLength={10}
            rows={6}
            placeholder="문제 상황, 발생 시간, 개선 아이디어 등을 자유롭게 작성해주세요."
            className="w-full rounded-md border border-border px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">위치 (선택)</label>
          <input
            type="text"
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            placeholder="예: 대전캠퍼스 중앙도서관 앞"
            className="w-full rounded-md border border-border px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            사진 첨부 (최대 5장)
          </label>
          <div className="flex flex-wrap gap-3">
            {images.map((img, idx) => (
              <div
                key={idx}
                className="relative h-24 w-24 overflow-hidden rounded-md border border-border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={`preview-${idx}`}
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(idx)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-border text-text-muted hover:border-primary hover:text-primary">
                <ImagePlus className="h-6 w-6" />
                <span className="mt-1 text-xs">추가</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={handleImageChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          익명으로 등록
        </label>

        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {submitting ? '등록 중...' : '문제 제안하기'}
          </button>
          <Link
            href="/issues"
            className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-text-secondary hover:bg-bg-muted"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
