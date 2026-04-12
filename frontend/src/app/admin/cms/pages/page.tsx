'use client';

import { useEffect, useState } from 'react';
import { FileText, Save } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { TipTapEditor } from '@/components/admin/TipTapEditor';

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  content_json: Record<string, unknown>;
  content_html: string | null;
  status: string;
  updated_at: string;
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number; page: number; size: number; totalPages: number };
}

export default function AdminCmsPagesPage() {
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [active, setActive] = useState<CmsPage | null>(null);
  const [title, setTitle] = useState('');
  const [doc, setDoc] = useState<Record<string, unknown> | null>(null);
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  useEffect(() => {
    (async () => {
      try {
        const list = await api.get<ListResponse<CmsPage>>('/cms/pages?page=1&size=50');
        setPages(list.data);
        if (list.data.length > 0) {
          selectPage(list.data[0]);
        }
      } catch (err) {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : '목록 조회 실패',
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function selectPage(p: CmsPage) {
    setActive(p);
    setTitle(p.title);
    setDoc(p.content_json);
    setHtml(p.content_html ?? '');
    setMessage(null);
  }

  async function handleSave() {
    if (!active || !doc) return;
    setSaving(true);
    setMessage(null);
    try {
      const updated = await api.put<CmsPage>(`/cms/pages/${active.slug}`, {
        title,
        content_json: doc,
        content_html: html,
        status: 'published',
      });
      setPages((prev) => prev.map((p) => (p.slug === updated.slug ? updated : p)));
      setActive(updated);
      setMessage({ type: 'success', text: '저장되었습니다.' });
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string } | undefined)?.detail;
        setMessage({ type: 'error', text: detail ?? err.message });
      } else {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : '저장 실패',
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="px-8 py-12">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">CMS 페이지</h1>
        <p className="mt-1 text-sm text-text-secondary">
          공개 페이지의 콘텐츠를 TipTap 에디터로 편집합니다. 저장 즉시 공개 반영됩니다.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* 페이지 목록 */}
          <aside>
            <ul className="space-y-1">
              {pages.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => selectPage(p)}
                    className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                      active?.slug === p.slug
                        ? 'bg-primary-light text-primary font-semibold'
                        : 'text-text-secondary hover:bg-white'
                    }`}
                  >
                    <FileText className="h-4 w-4" />
                    <div className="flex-1 truncate">
                      <div>{p.title}</div>
                      <div className="font-mono text-xs text-text-muted">/{p.slug}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          {/* 에디터 */}
          <div>
            {!active ? (
              <p className="text-sm text-text-muted">페이지를 선택하세요.</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-text-secondary">
                    슬러그
                  </label>
                  <input
                    type="text"
                    value={active.slug}
                    disabled
                    className="w-full rounded-md border border-border bg-bg-muted px-4 py-2 font-mono text-sm text-text-muted"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-text-secondary">
                    제목
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-md border border-border bg-white px-4 py-2 text-base outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold text-text-secondary">
                    본문 (TipTap)
                  </label>
                  <TipTapEditor
                    key={active.slug}
                    initialContent={active.content_json}
                    onChange={(nextDoc, nextHtml) => {
                      setDoc(nextDoc);
                      setHtml(nextHtml);
                    }}
                  />
                </div>

                {message && (
                  <div
                    className={`rounded-md border p-3 text-sm ${
                      message.type === 'success'
                        ? 'border-secondary/30 bg-secondary-light text-secondary'
                        : 'border-danger/30 bg-danger/5 text-danger'
                    }`}
                  >
                    {message.text}
                  </div>
                )}

                <div className="flex items-center gap-3 border-t border-border pt-4">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
                  >
                    <Save className="h-4 w-4" />
                    {saving ? '저장 중...' : '저장'}
                  </button>
                  <span className="text-xs text-text-muted">
                    최근 수정: {new Date(active.updated_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
