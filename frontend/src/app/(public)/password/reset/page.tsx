'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Lock } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

function PasswordResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = params.get('token');
    if (t) setToken(t);
  }, [params]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      await api.post<{ message: string }>('/auth/password/reset', {
        token,
        new_password: password,
      });
      router.replace('/login?reset=1');
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string } | undefined)?.detail;
        setError(detail ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : '재설정 실패');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-md flex-col justify-center px-4 py-12">
      <Link
        href="/login"
        className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> 로그인으로
      </Link>

      <div className="rounded-2xl border border-border bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">비밀번호 재설정</h1>
          <p className="mt-2 text-sm text-text-secondary">
            새 비밀번호를 입력해주세요.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-semibold">재설정 토큰</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              required
              placeholder="이메일로 받은 토큰"
              className="w-full rounded-md border border-border px-4 py-3 font-mono text-sm outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
            />
            <p className="mt-1 text-xs text-text-muted">
              토큰은 발급 후 30분간 유효합니다.
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">새 비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="8자 이상"
              className="w-full rounded-md border border-border px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">비밀번호 확인</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-border px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
            />
          </div>
          {error && (
            <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !token || !password || !confirm}
            className="w-full rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? '재설정 중...' : '비밀번호 변경'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function PasswordResetPage() {
  return (
    <Suspense
      fallback={
        <div className="py-12 text-center text-text-secondary">불러오는 중...</div>
      }
    >
      <PasswordResetForm />
    </Suspense>
  );
}
