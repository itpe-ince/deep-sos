'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

export default function PasswordForgotPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post<{ message: string }>('/auth/password/forgot', { email });
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : '요청 실패');
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
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">비밀번호 찾기</h1>
          <p className="mt-2 text-sm text-text-secondary">
            가입하신 이메일을 입력하면 비밀번호 재설정 링크를 보내드려요.
          </p>
        </div>

        {sent ? (
          <div className="space-y-4">
            <div className="rounded-md border border-secondary/30 bg-secondary-light p-4 text-sm text-secondary">
              <p className="font-semibold">이메일 전송 요청 접수됨</p>
              <p className="mt-1 text-xs">
                해당 이메일로 가입된 계정이 있다면 재설정 링크를 받으실 수 있습니다. 30분 내에 링크를 사용해주세요.
              </p>
            </div>
            <Link
              href="/login"
              className="block rounded-md bg-primary px-6 py-3 text-center text-sm font-semibold text-white hover:bg-primary-hover"
            >
              로그인 페이지로
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-semibold">이메일</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
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
              disabled={loading}
              className="w-full rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {loading ? '전송 중...' : '재설정 링크 받기'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
