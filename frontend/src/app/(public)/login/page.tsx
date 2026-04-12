'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

type Mode = 'login' | 'signup';

/**
 * P-10 로그인/회원가입 — mockup/pages/public/login.html 포팅
 * Sprint 1: 실제 FastAPI /auth/login + /auth/register 연동
 */
export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'student' | 'professor' | 'citizen' | 'enterprise'>('citizen');
  const [campusCode, setCampusCode] = useState<'DJ' | 'GJ' | 'YS' | 'SJ' | ''>('');
  const [agreed, setAgreed] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signup') {
        if (!agreed) {
          throw new Error('이용약관에 동의해주세요.');
        }
        await api.post('/auth/register', {
          email,
          password,
          name,
          role,
          campus_code: campusCode || null,
        });
      }

      const tokens = await api.post<TokenResponse>('/auth/login', { email, password });
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      router.push('/');
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string } | undefined)?.detail;
        setError(detail ?? err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('알 수 없는 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-2">
      <aside className="relative hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex"
        style={{
          background:
            'radial-gradient(circle at 20% 20%, #2563eb 0%, transparent 40%), radial-gradient(circle at 80% 80%, #7c3aed 0%, transparent 40%), linear-gradient(135deg, #1e3a8a 0%, #4c1d95 100%)',
        }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        <Link href="/" className="relative z-10 flex items-center gap-3 text-lg font-extrabold">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm text-xs font-black">
            SOS
          </div>
          SOS랩
        </Link>
        <div className="relative z-10">
          <div className="mb-6 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-sm">
            ⭐ 2025 글로컬대학 본지정 사업
          </div>
          <h1 className="mb-5 text-4xl font-black leading-tight tracking-tight text-white">
            지역의 문제를
            <br />
            함께 해결하는 곳.
          </h1>
          <p className="mb-8 max-w-md text-md text-white/75">
            대학의 역량과 시민의 참여로 만들어가는 사회공헌 플랫폼에 함께해주세요.
            여러분의 목소리가 지역을 바꾸는 첫걸음이 됩니다.
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[
              ['해결된 문제', '127건'],
              ['진행 프로젝트', '12개'],
              ['누적 봉사시간', '2,845시간'],
              ['참여 시민', '1,438명'],
            ].map(([label, val]) => (
              <div
                key={label}
                className="rounded-lg border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
              >
                <div className="text-xs opacity-70">{label}</div>
                <div className="mt-1 text-lg font-extrabold">{val}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative z-10 text-xs opacity-60">
          © 2026 SOS랩 (USCP) · 지역사회특화센터 · ESG센터 · 국제협력센터
        </div>
      </aside>

      <div className="flex items-center justify-center overflow-y-auto bg-surface p-8 lg:p-12">
        <div className="w-full max-w-md">
          <h2 className="mb-2 text-2xl font-extrabold tracking-tight">환영합니다</h2>
          <p className="mb-8 text-text-secondary">
            {mode === 'login'
              ? '로그인하고 우리 지역을 함께 만들어가요'
              : '가입하고 활동을 시작하세요'}
          </p>

          <div className="mb-6 flex gap-0.5 rounded-md bg-surface-hover p-1">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 rounded-sm px-3 py-3 text-sm font-semibold transition ${
                mode === 'login'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-text-secondary'
              }`}
            >
              로그인
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 rounded-sm px-3 py-3 text-sm font-semibold transition ${
                mode === 'signup'
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-text-secondary'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    이름 <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="박학생"
                    className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">역할</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof role)}
                    className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                  >
                    <option value="citizen">시민</option>
                    <option value="student">학생</option>
                    <option value="professor">교수</option>
                    <option value="enterprise">기업/기관</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-semibold">캠퍼스</label>
                  <select
                    value={campusCode}
                    onChange={(e) => setCampusCode(e.target.value as typeof campusCode)}
                    className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
                  >
                    <option value="">선택 안 함</option>
                    <option value="DJ">대전</option>
                    <option value="GJ">공주</option>
                    <option value="YS">예산</option>
                    <option value="SJ">세종</option>
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                이메일 <span className="text-danger">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                비밀번호 <span className="text-danger">*</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="8자 이상"
                className="w-full rounded-md border border-border bg-surface px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
              />
            </div>

            {mode === 'signup' && (
              <label className="flex items-start gap-2 text-sm text-text-secondary">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <a href="#" className="text-primary">
                    이용약관
                  </a>{' '}
                  및{' '}
                  <a href="#" className="text-primary">
                    개인정보 처리방침
                  </a>
                  에 동의합니다
                </span>
              </label>
            )}

            {error && (
              <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-primary px-6 py-4 text-md font-semibold text-white transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? '처리 중...' : mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-3 text-right">
              <Link
                href="/password/forgot"
                className="text-xs text-text-secondary hover:text-primary hover:underline"
              >
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          )}

          <div className="my-6 flex items-center gap-3 text-xs text-text-muted">
            <div className="h-px flex-1 bg-border" />
            또는 소셜 로그인
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <a
              href="/api/v1/auth/oauth/kakao"
              className="flex items-center justify-center rounded-md border border-border bg-[#FEE500] px-4 py-3 text-sm font-semibold text-[#3C1E1E] transition hover:brightness-95"
            >
              카카오
            </a>
            <a
              href="/api/v1/auth/oauth/naver"
              className="flex items-center justify-center rounded-md border border-border bg-[#03C75A] px-4 py-3 text-sm font-semibold text-white transition hover:brightness-95"
            >
              네이버
            </a>
            <a
              href="/api/v1/auth/oauth/google"
              className="flex items-center justify-center rounded-md border border-border bg-white px-4 py-3 text-sm font-semibold text-text-primary transition hover:bg-bg-muted"
            >
              Google
            </a>
          </div>

          <div className="mt-6 text-center text-sm text-text-secondary">
            {mode === 'login' ? (
              <>
                아직 회원이 아니신가요?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-semibold text-primary"
                >
                  회원가입
                </button>
              </>
            ) : (
              <>
                이미 회원이신가요?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-semibold text-primary"
                >
                  로그인
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
