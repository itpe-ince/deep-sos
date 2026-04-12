'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/use-auth';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number; page: number; size: number; totalPages: number };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3810/api';

/**
 * 알림 스토어 훅 — REST 초기 로드 + SSE 실시간 수신.
 * Header bell 등에서 사용.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const esRef = useRef<EventSource | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get<ListResponse<Notification>>(
        '/notifications?page=1&size=20',
      );
      setItems(res.data);
      setUnreadCount(res.data.filter((n) => !n.is_read).length);
    } catch {
      /* ignore */
    }
  }, [user]);

  // 초기 로드 + SSE 구독
  useEffect(() => {
    if (!user) {
      setItems([]);
      setUnreadCount(0);
      return;
    }

    load();

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const url = `${API_URL}/v1/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const notif = JSON.parse(event.data) as Notification;
        setItems((prev) => [notif, ...prev].slice(0, 50));
        setUnreadCount((n) => n + 1);
      } catch {
        /* ignore */
      }
    };

    es.onerror = () => {
      // 자동 재연결은 EventSource가 수행. 로그만.
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [user, load]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((n) => Math.max(0, n - 1));
    } catch {
      /* ignore */
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.put('/notifications/read-all');
      setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      /* ignore */
    }
  }, []);

  return { items, unreadCount, markRead, markAllRead, refresh: load };
}
