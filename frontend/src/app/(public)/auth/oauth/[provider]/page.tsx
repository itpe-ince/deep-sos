'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams, useParams } from 'next/navigation';
import Link from 'next/link';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const PROVIDER_LABEL: Record<string, string> = {
  kakao: '카카오',
  naver: '네이버',
  google: 'Google',
};

function OAuthCallbackInner() {
  const router = useRouter();
  const params = useParams<{ provider: string }>();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing',
  );
  const [message, setMessage] = useState<string | null>(null);

  const provider = params?.provider ?? '';
  const label = PROVIDER_LABEL[provider] ?? provider;

  useEffect(() => {
    const token = searchParams.get('token');
    const refresh = searchParams.get('refresh');
    const error = searchParams.get('error');

    if (error) {
      setStatus('error');
      setMessage(error);
      return;
    }

    if (!token) {
      setStatus('error');
      setMessage('인증 토큰을 받지 못했습니다.');
      return;
    }

    try {
      localStorage.setItem('access_token', token);
      if (refresh) localStorage.setItem('refresh_token', refresh);
      setStatus('success');
      setTimeout(() => {
        router.replace('/user/dashboard');
      }, 800);
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : '토큰 저장 실패');
    }
  }, [searchParams, router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-12 text-center">
      {status === 'processing' && (
        <>
          <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary-light border-t-primary" />
          <h1 className="text-lg font-semibold text-text-primary">
            {label} 로그인 처리 중...
          </h1>
        </>
      )}

      {status === 'success' && (
        <>
          <div className="mb-4 rounded-full bg-secondary-light p-4 text-secondary">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-text-primary">
            {label} 로그인 완료
          </h1>
          <p className="text-sm text-text-secondary">
            대시보드로 이동합니다...
          </p>
        </>
      )}

      {status === 'error' && (
        <>
          <div className="mb-4 rounded-full bg-amber-100 p-4 text-amber-600">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h1 className="mb-2 text-2xl font-bold text-text-primary">
            {label} 로그인 실패
          </h1>
          {message && (
            <p className="mb-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {message}
            </p>
          )}
          <p className="mb-6 text-sm text-text-secondary">
            {label} OAuth client_id가 아직 설정되지 않았거나 일시적 오류가 발생했을 수 있습니다.
          </p>
          <Link
            href="/login"
            className="rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover"
          >
            로그인으로 돌아가기
          </Link>
        </>
      )}
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-text-secondary">준비 중...</div>
      }
    >
      <OAuthCallbackInner />
    </Suspense>
  );
}
