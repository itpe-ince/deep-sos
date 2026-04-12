'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useAuth, type AuthUser } from '@/lib/use-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3810/api';

export default function UserProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refresh } = useAuth();

  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [organization, setOrganization] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?next=/user/profile');
      return;
    }
    if (user) {
      setName(user.name);
      setDepartment(user.department ?? '');
      setOrganization((user as AuthUser & { organization?: string }).organization ?? '');
    }
  }, [authLoading, user, router]);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      // 1. 프로필 필드 업데이트
      await api.put<AuthUser>('/auth/me', {
        name,
        department: department || null,
        organization: organization || null,
      });

      // 2. 아바타가 있으면 업로드
      if (avatarFile) {
        const fd = new FormData();
        fd.append('file', avatarFile);
        const token = localStorage.getItem('access_token');
        const res = await fetch(`${API_URL}/v1/auth/me/avatar`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        });
        if (!res.ok) {
          const problem = await res.json().catch(() => null);
          throw new ApiError(res.status, problem?.detail ?? 'Avatar upload failed');
        }
      }

      setSuccess('프로필이 저장되었습니다.');
      setAvatarFile(null);
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
        setAvatarPreview(null);
      }
      await refresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError(err instanceof Error ? err.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center text-text-secondary">
        확인 중...
      </div>
    );
  }

  const avatarSrc = avatarPreview ?? user.profile_image_url;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Link
        href="/user/dashboard"
        className="mb-6 inline-flex items-center gap-2 text-sm text-text-secondary hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" /> 대시보드로
      </Link>

      <header className="mb-8">
        <p className="text-sm font-semibold text-primary">P-18 · 프로필</p>
        <h1 className="mt-2 text-3xl font-bold text-text-primary">프로필 수정</h1>
      </header>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-2xl border border-border bg-white p-8 shadow-sm"
      >
        {/* 아바타 */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="h-24 w-24 overflow-hidden rounded-full bg-primary-light">
              {avatarSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarSrc}
                  alt="avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-primary">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <label className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-primary text-white shadow-md hover:bg-primary-hover">
              <Camera className="h-4 w-4" />
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarChange}
                className="hidden"
              />
            </label>
          </div>
          <div>
            <p className="text-lg font-semibold text-text-primary">{user.email}</p>
            <p className="text-sm text-text-muted">
              {user.role} · 레벨 {user.level} · {user.points}점
            </p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            이름 <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={100}
            className="w-full rounded-md border border-border px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">학과 / 부서</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            maxLength={100}
            placeholder="예: 컴퓨터공학과"
            className="w-full rounded-md border border-border px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">소속 기관</label>
          <input
            type="text"
            value={organization}
            onChange={(e) => setOrganization(e.target.value)}
            maxLength={200}
            placeholder="예: 대전캠퍼스 ESG센터"
            className="w-full rounded-md border border-border px-4 py-3 text-base outline-none focus:border-primary focus:ring-3 focus:ring-primary/10"
          />
        </div>

        {error && (
          <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-md border border-secondary/30 bg-secondary-light p-3 text-sm text-secondary">
            {success}
          </div>
        )}

        <div className="flex items-center gap-3 border-t border-border pt-6">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? '저장 중...' : '저장'}
          </button>
          <Link
            href="/user/dashboard"
            className="rounded-md border border-border px-6 py-3 text-sm font-semibold text-text-secondary hover:bg-bg-muted"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
