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
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      /* ignore */
    }
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setState({ user: null, loading: false, error: null });
  }, []);

  return { ...state, refresh, logout };
}
