'use client';

import { Building2, FileText, MessagesSquare } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import {
  listOrganizations,
  listMous,
  listCommunityPosts,
  ORG_CATEGORY_LABELS,
  type Organization,
  type Mou,
  type CommunityPostItem,
  type OrgCategory,
} from '@/features/network';
import { cn } from '@/lib/utils';

/**
 * M05 협력 네트워크 공개 페이지 (/network).
 *
 * 설계 근거:
 *  - feature-spec §M05-02(협력기관)·§M05-05(MOU)·§M05-07(커뮤니티) 공개 조회
 *  - 사이트맵 #8 협력 네트워크 (누구나)
 *
 * 3개 탭(협력기관·MOU·커뮤니티)으로 통합 — 고객 여정 최소화.
 */
type Tab = 'organizations' | 'mous' | 'community';

export default function NetworkPage() {
  const [tab, setTab] = useState<Tab>('organizations');
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [mous, setMous] = useState<Mou[]>([]);
  const [posts, setPosts] = useState<CommunityPostItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [o, m, c] = await Promise.all([
        listOrganizations(),
        listMous(),
        listCommunityPosts(),
      ]);
      setOrgs(o.data);
      setMous(m.data);
      setPosts(c.data);
    } catch {
      // 공개 페이지 — 실패 시 빈 상태 유지
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const TABS: { key: Tab; label: string; icon: typeof Building2; count: number }[] = [
    { key: 'organizations', label: '협력기관', icon: Building2, count: orgs.length },
    { key: 'mous', label: 'MOU', icon: FileText, count: mous.length },
    { key: 'community', label: '커뮤니티', icon: MessagesSquare, count: posts.length },
  ];

  return (
    <div className="container-content py-10" data-testid="network-page">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-text">협력 네트워크</h1>
        <p className="mt-1 text-sm text-text-secondary">
          USCP와 함께하는 협력기관·업무협약(MOU)·커뮤니티 소식을 확인하세요.
        </p>
      </header>

      <div className="mb-6 flex gap-1 border-b border-border" role="tablist">
        {TABS.map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition',
              tab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-text-secondary hover:text-text',
            )}
            data-testid={`network-tab-${key}`}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label} ({count})
          </button>
        ))}
      </div>

      {loading ? (
        <p className="py-12 text-center text-sm text-text-muted">불러오는 중...</p>
      ) : tab === 'organizations' ? (
        <section data-testid="org-panel">
          {orgs.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-muted" data-testid="org-empty">
              등록된 협력기관이 없습니다.
            </p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2" data-testid="org-list">
              {orgs.map((o) => (
                <li
                  key={o.id}
                  className="rounded-xl border border-border bg-surface p-4"
                  data-testid="org-card"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      {ORG_CATEGORY_LABELS[o.category as OrgCategory] ?? o.category}
                    </span>
                    <h3 className="font-bold text-text">{o.name}</h3>
                  </div>
                  {o.intro ? (
                    <p className="text-sm text-text-secondary line-clamp-2">{o.intro}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : tab === 'mous' ? (
        <section data-testid="mou-panel">
          {mous.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-muted" data-testid="mou-empty">
              등록된 MOU가 없습니다.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="mou-list">
              {mous.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3"
                  data-testid="mou-card"
                >
                  <div>
                    <span className="font-semibold text-text">{m.title}</span>
                    {m.organization_name ? (
                      <span className="ml-2 text-sm text-text-secondary">
                        {m.organization_name}
                      </span>
                    ) : null}
                    <span className="ml-2 text-xs text-text-muted">
                      {m.signed_at} ~ {m.expires_at}
                    </span>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-0.5 text-xs font-medium',
                      m.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600',
                    )}
                  >
                    {m.status === 'active' ? '체결중' : '만료'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section data-testid="community-panel">
          {posts.length === 0 ? (
            <p className="py-12 text-center text-sm text-text-muted" data-testid="community-empty">
              등록된 게시글이 없습니다.
            </p>
          ) : (
            <ul className="space-y-2" data-testid="community-list">
              {posts.map((p) => (
                <li key={p.id} data-testid="community-card">
                  <Link
                    href={`/network/${p.id}`}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition hover:border-primary"
                  >
                    <span className="font-semibold text-text">
                      {p.is_pinned ? (
                        <span className="mr-1.5 rounded bg-accent/20 px-1.5 py-0.5 text-xs text-accent">
                          고정
                        </span>
                      ) : null}
                      {p.title}
                    </span>
                    <span className="text-xs text-text-muted">
                      {p.author_name ?? '운영자'} · 댓글 {p.comment_count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
