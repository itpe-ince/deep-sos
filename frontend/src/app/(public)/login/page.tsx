'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useToast } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M01-01/02/03/04 — USCP V2 로그인 / 회원가입 (sitemap #10).
 *
 * 설계 근거:
 *  - feature-spec §M01-01 (이메일 회원가입)
 *  - feature-spec §M01-02 (만 14세 이상 확인)
 *  - feature-spec §M01-03 (개인정보·이용약관 통합 동의)
 *  - feature-spec §M01-04 (이메일 로그인)
 *  - feature-spec §M01-13 (비밀번호 보안 정책)
 *  - design.md §7.2.1 (window.alert/confirm 금지 → Toast/ConfirmModal)
 *  - mockup/pages/public/login.html (Auth 탭·통합 동의 UI)
 *
 * URL 분기:
 *   /login                — 로그인 탭 기본 (default mode='login')
 *   /login?tab=signup     — 회원가입 탭 (Header GuestMenu '회원가입' 진입점)
 *   /login?next=/user/profile — 인증 redirect 시 복귀 URL 보존 (§2.4.2)
 */

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface SignupResponse {
  user_id: string;
  email: string;
  name: string;
  email_verification_sent: boolean;
  message: string;
}

interface SignupErrorDetail {
  code:
    | 'agreements_required'
    | 'age_below_minimum'
    | 'password_too_weak'
    | 'email_already_registered';
  message: string;
}

type Mode = 'login' | 'signup';

const CURRENT_YEAR = new Date().getFullYear();
const MIN_BIRTH_YEAR = 1900;
const MAX_BIRTH_YEAR = CURRENT_YEAR - 14;

const PW_PATTERN =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]{8,}$/;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialMode: Mode =
    (searchParams?.get('tab') as Mode) === 'signup' ? 'signup' : 'login';
  const nextUrl = searchParams?.get('next') ?? '/';

  const [mode, setMode] = useState<Mode>(initialMode);
  const [loading, setLoading] = useState(false);

  // ── Login fields ─────────────────────────────────────────
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // ── Signup-only fields ───────────────────────────────────
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState<string>('');
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedService, setAgreedService] = useState(false);
  const [agreedAge, setAgreedAge] = useState(false);

  // URL ?tab= 변경 시 모드 동기화
  useEffect(() => {
    const t = searchParams?.get('tab');
    if (t === 'signup' || t === 'login') {
      setMode(t);
    }
  }, [searchParams]);

  // ── Validations (M01-02/03/13) ───────────────────────────
  const birthYearNum = Number(birthYear);
  const isBirthYearValid = useMemo(() => {
    if (!birthYear) return false;
    if (!Number.isInteger(birthYearNum)) return false;
    return birthYearNum >= MIN_BIRTH_YEAR && birthYearNum <= MAX_BIRTH_YEAR;
  }, [birthYear, birthYearNum]);

  const isPasswordValid = useMemo(
    () => (password ? PW_PATTERN.test(password) : false),
    [password],
  );

  const isSignupReady =
    !!email.trim() &&
    isPasswordValid &&
    name.trim().length >= 2 &&
    isBirthYearValid &&
    agreedPrivacy &&
    agreedService &&
    agreedAge;

  function switchMode(next: Mode) {
    setMode(next);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    if (next === 'signup') {
      params.set('tab', 'signup');
    } else {
      params.delete('tab');
    }
    const qs = params.toString();
    router.replace(qs ? `/login?${qs}` : '/login');
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    if (!isSignupReady || loading) return;
    setLoading(true);
    try {
      const res = await api.post<SignupResponse>('/auth/signup', {
        email: email.trim(),
        password,
        name: name.trim(),
        birth_year: birthYearNum,
        agreements: { privacy: agreedPrivacy, service: agreedService },
      });
      toast.success(
        res.email_verification_sent
          ? '회원가입 완료! 이메일 인증 메일을 확인해 주세요.'
          : '회원가입 완료. 로그인하여 이용해 주세요.',
        5000,
      );
      // 가입 직후 로그인 탭으로 전환
      switchMode('login');
      setPassword(''); // 보안: 가입 후 비밀번호 입력값 초기화
    } catch (err) {
      handleSignupError(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSignupError(err: unknown) {
    if (err instanceof ApiError) {
      const detail = (err.detail as { detail?: SignupErrorDetail })?.detail;
      const code = detail?.code;
      if (code === 'agreements_required') {
        toast.error('이용약관·개인정보 처리방침에 모두 동의해 주세요.');
        return;
      }
      if (code === 'age_below_minimum') {
        toast.error('만 14세 이상부터 이용 가능합니다.');
        return;
      }
      if (code === 'password_too_weak') {
        toast.error(
          '비밀번호는 8자 이상이며 영문·숫자·특수문자를 모두 포함해야 합니다.',
        );
        return;
      }
      if (code === 'email_already_registered') {
        toast.error('이미 등록된 이메일입니다. 로그인해 주세요.');
        return;
      }
      toast.error(detail?.message ?? err.message);
      return;
    }
    toast.error(err instanceof Error ? err.message : '회원가입 실패');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const tokens = await api.post<TokenResponse>('/auth/login', {
        email: email.trim(),
        password,
      });
      localStorage.setItem('access_token', tokens.access_token);
      localStorage.setItem('refresh_token', tokens.refresh_token);
      window.dispatchEvent(new Event('auth-change'));
      toast.success('로그인되었습니다.');
      router.push(nextUrl);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 423) {
          toast.error('5회 실패로 30분간 계정이 잠금되었습니다.');
        } else if (err.status === 401) {
          toast.error('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (err.status === 429) {
          toast.warning('로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요.');
        } else {
          toast.error('로그인 실패: ' + err.message);
        }
      } else {
        toast.error(err instanceof Error ? err.message : '로그인 실패');
      }
    } finally {
      setLoading(false);
    }
  }

  function toggleAgreeAll(checked: boolean) {
    setAgreedAge(checked);
    setAgreedPrivacy(checked);
    setAgreedService(checked);
  }

  const allAgreed = agreedAge && agreedPrivacy && agreedService;

  return (
    <div
      className="container-content py-12"
      data-testid={mode === 'signup' ? 'signup-page' : 'login-page'}
    >
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-center">
          <Image
            src="/logo.png"
            alt="국립공주대학교 글로컬사업단 지역사회특화센터"
            width={200}
            height={40}
            priority
          />
        </div>

        <h1 className="mb-6 text-center text-2xl font-black text-text">
          {mode === 'signup' ? 'USCP 회원가입' : '로그인'}
        </h1>

        {/* Auth 탭 */}
        <div
          className="mb-6 grid grid-cols-2 overflow-hidden rounded-md border border-border bg-bg"
          role="tablist"
          aria-label="인증 모드"
        >
          {(['login', 'signup'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              aria-controls={m === 'signup' ? 'signup-form' : 'login-form'}
              onClick={() => switchMode(m)}
              data-testid={`auth-tab-${m}`}
              className={cn(
                'px-4 py-3 text-sm font-semibold transition',
                mode === m
                  ? 'bg-surface text-primary'
                  : 'text-text-secondary hover:text-text',
              )}
            >
              {m === 'login' ? '로그인' : '회원가입'}
            </button>
          ))}
        </div>

        {mode === 'login' ? (
          <form
            id="login-form"
            onSubmit={handleLogin}
            className="space-y-4"
            data-testid="login-form"
          >
            <Field label="이메일">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="비밀번호">
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </Field>
            <button
              type="submit"
              disabled={loading || !email || !password}
              data-testid="login-submit"
              className={cn(submitClass, 'bg-primary hover:bg-primary-hover')}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/password/forgot"
                className="text-text-secondary hover:text-primary"
              >
                비밀번호를 잊으셨나요?
              </Link>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-semibold text-primary hover:underline"
              >
                회원가입
              </button>
            </div>
          </form>
        ) : (
          <form
            id="signup-form"
            onSubmit={handleSignup}
            className="space-y-4"
            data-testid="signup-form"
            noValidate
          >
            <Notice>
              <strong>USCP 회원가입 안내</strong>
              <br />
              <span className="text-xs">
                만 14세 이상만 이용 가능합니다. 광고성 정보 발송은 없으며,
                모든 알림은 의제 진행 상황 이메일로만 전달됩니다.
              </span>
            </Notice>

            <Field label="이메일">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                data-testid="signup-email"
              />
            </Field>

            <Field
              label="비밀번호"
              hint="8자 이상 · 영문 · 숫자 · 특수문자 모두 포함 (M01-13)"
              hintValid={!!password && isPasswordValid}
              hintInvalid={!!password && !isPasswordValid}
            >
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                data-testid="signup-password"
                aria-invalid={!!password && !isPasswordValid}
              />
            </Field>

            <Field label="이름">
              <input
                type="text"
                autoComplete="name"
                required
                minLength={2}
                maxLength={20}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                data-testid="signup-name"
              />
            </Field>

            <Field
              label="출생연도 (만 14세 확인)"
              hint={
                isBirthYearValid
                  ? '확인 완료'
                  : birthYear
                    ? `만 14세 이상은 ${MAX_BIRTH_YEAR}년 이전 출생자만 가능합니다`
                    : '4자리 숫자 입력 (예: 2008)'
              }
              hintValid={isBirthYearValid}
              hintInvalid={!!birthYear && !isBirthYearValid}
            >
              <input
                type="number"
                inputMode="numeric"
                min={MIN_BIRTH_YEAR}
                max={MAX_BIRTH_YEAR}
                placeholder={String(MAX_BIRTH_YEAR - 10)}
                required
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className={inputClass}
                data-testid="signup-birth-year"
                aria-invalid={!!birthYear && !isBirthYearValid}
              />
            </Field>

            {/* M01-03 통합 동의 */}
            <fieldset
              className="rounded-md border border-border bg-surface p-4"
              data-testid="signup-agreements"
            >
              <legend className="px-1 text-sm font-semibold text-text">
                약관 및 개인정보 동의 (필수)
              </legend>
              <label className="mb-2 flex cursor-pointer items-center gap-2 border-b border-border pb-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={allAgreed}
                  onChange={(e) => toggleAgreeAll(e.target.checked)}
                  className="h-4 w-4"
                  data-testid="signup-agree-all"
                />
                모두 동의합니다
              </label>
              <label className="mb-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agreedAge}
                  onChange={(e) => setAgreedAge(e.target.checked)}
                  className="h-4 w-4"
                  data-testid="signup-agree-age"
                />
                <strong>[필수]</strong> 만 14세 이상입니다
              </label>
              <label className="mb-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agreedService}
                  onChange={(e) => setAgreedService(e.target.checked)}
                  className="h-4 w-4"
                  data-testid="signup-agree-service"
                />
                <strong>[필수]</strong>{' '}
                <Link
                  href="/terms/service"
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  이용약관
                </Link>
                에 동의합니다
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={agreedPrivacy}
                  onChange={(e) => setAgreedPrivacy(e.target.checked)}
                  className="h-4 w-4"
                  data-testid="signup-agree-privacy"
                />
                <strong>[필수]</strong>{' '}
                <Link
                  href="/terms/privacy"
                  target="_blank"
                  className="text-primary hover:underline"
                >
                  개인정보 수집·이용
                </Link>
                에 동의합니다
              </label>
              <p className="mt-3 text-xs text-text-muted">
                · 필수 항목에 동의하지 않으면 회원가입이 제한됩니다.
                <br />· 광고성 정보 발송 동의 항목은 별도 제공하지 않습니다.
              </p>
            </fieldset>

            <button
              type="submit"
              disabled={loading || !isSignupReady}
              data-testid="signup-submit"
              className={cn(
                submitClass,
                'bg-primary hover:bg-primary-hover disabled:bg-text-muted',
              )}
            >
              {loading ? '가입 처리 중...' : '회원가입'}
            </button>

            <div className="text-center text-sm">
              이미 계정이 있으신가요?{' '}
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="font-semibold text-primary hover:underline"
              >
                로그인
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputClass =
  'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary';

const submitClass =
  'w-full rounded-md px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed';

function Field({
  label,
  hint,
  hintValid,
  hintInvalid,
  children,
}: {
  label: string;
  hint?: string;
  hintValid?: boolean;
  hintInvalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-text">{label}</span>
      {children}
      {hint ? (
        <span
          className={cn(
            'mt-1 flex items-center gap-1 text-xs',
            hintValid ? 'text-success' : hintInvalid ? 'text-danger' : 'text-text-muted',
          )}
        >
          {hintValid ? (
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          ) : hintInvalid ? (
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
          ) : null}
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border-l-4 border-warning bg-warning/10 p-3 text-sm text-text">
      {children}
    </div>
  );
}
