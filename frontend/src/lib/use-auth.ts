'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  campus_id: string | null;
  department: string | null;
  profile_image_url: string | null;
  level: string;
  points: number;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

/**
 * 클라이언트 컴포넌트용 인증 상태 훅.
 * localStorage의 access_token을 읽어 /auth/me 조회.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (!token) {
      setState({ user: null, loading: false, error: null });
      return;
    }
    try {
      const user = await api.get<AuthUser>('/auth/me');
      setState({ user, loading: false, error: null });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      setState({ user: null, loading: false, error: 'session expired' });
    }
  }, []);

  useEffect(() => {
    refresh();

    // 같은 탭에서 localStorage 변경 시에도 감지 (login/logout)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'access_token') refresh();
    };
    // 커스텀 이벤트: 같은 탭 내 토큰 변경 감지
    const onAuthChange = () => refresh();

    window.addEventListener('storage', onStorage);
    window.addEventListener('auth-change', onAuthChange);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('auth-change', onAuthChange);
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.dispatchEvent(new Event('auth-change'));
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, refresh, logout };
}
