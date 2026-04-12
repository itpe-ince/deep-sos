'use client';

import { useState } from 'react';
import { Download, FileDown, Loader2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

interface Props {
  targetUserId: string;
}

export function PortfolioPdfButton({ targetUserId }: Props) {
  const { user, loading } = useAuth();
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 본인 포트폴리오일 때만 표시
  if (loading || !user || user.id !== targetUserId) return null;

  async function handleDownload() {
    setError(null);
    setGenerating(true);
    try {
      const res = await api.post<{ url: string }>(
        '/users/me/portfolio/pdf',
        {},
      );
      // 새 탭에서 presigned URL 열기
      window.open(res.url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string } | undefined)?.detail;
        setError(detail ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : 'PDF 생성 실패');
      }
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mb-6 flex flex-col items-end gap-2" data-pdf-hidden>
      <button
        type="button"
        onClick={handleDownload}
        disabled={generating}
        className="flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
      >
        {generating ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            PDF 생성 중...
          </>
        ) : (
          <>
            <FileDown className="h-4 w-4" />
            PDF 다운로드
          </>
        )}
      </button>
      {error && (
        <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
          {error}
        </div>
      )}
      <p className="text-xs text-text-muted">
        <Download className="inline h-3 w-3" /> 생성까지 5~10초 소요
      </p>
    </div>
  );
}
