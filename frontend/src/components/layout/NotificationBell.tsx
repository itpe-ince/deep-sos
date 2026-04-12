'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useNotifications } from '@/lib/use-notifications';

export function NotificationBell() {
  const { items, unreadCount, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-10 w-10 items-center justify-center rounded-md text-text-secondary hover:bg-surface-hover hover:text-text"
        aria-label="알림"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-dropdown w-80 rounded-xl border border-border bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary">알림</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <CheckCheck className="h-3 w-3" /> 모두 읽음
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-text-muted">
                알림이 없습니다
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => {
                  const content = (
                    <div
                      className={`px-4 py-3 transition ${
                        n.is_read ? 'opacity-60' : 'bg-primary-light/20'
                      } hover:bg-bg-muted`}
                    >
                      <div className="mb-1 flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-text-primary">
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                      </div>
                      {n.body && (
                        <p className="mb-1 line-clamp-2 text-xs text-text-secondary">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-text-muted">
                        {new Date(n.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>
                  );
                  return (
                    <li
                      key={n.id}
                      onClick={() => {
                        if (!n.is_read) markRead(n.id);
                      }}
                    >
                      {n.link_url ? (
                        <Link
                          href={n.link_url}
                          onClick={() => setOpen(false)}
                          className="block"
                        >
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
