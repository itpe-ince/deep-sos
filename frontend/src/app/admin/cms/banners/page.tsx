'use client';

import { useEffect, useState } from 'react';
import { Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { api, ApiError } from '@/lib/api';

interface Banner {
  id: string;
  position: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  order_index: number;
  is_active: boolean;
}

interface ListResponse<T> {
  data: T[];
  meta: { total: number; page: number; size: number; totalPages: number };
}

const POSITIONS = [
  { key: 'hero', label: '히어로' },
  { key: 'sub', label: '서브' },
  { key: 'footer', label: '푸터' },
];

export default function AdminCmsBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 새 배너 폼
  const [position, setPosition] = useState('hero');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const list = await api.get<ListResponse<Banner>>('/cms/banners');
      setBanners(list.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '목록 조회 실패');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<Banner>('/cms/banners', {
        position,
        title,
        subtitle: subtitle || null,
        image_url: imageUrl || null,
        link_url: linkUrl || null,
        order_index: orderIndex,
        is_active: true,
      });
      setTitle('');
      setSubtitle('');
      setImageUrl('');
      setLinkUrl('');
      setOrderIndex(0);
      setShowForm(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        const detail = (err.detail as { detail?: string } | undefined)?.detail;
        setError(detail ?? err.message);
      } else {
        setError(err instanceof Error ? err.message : '생성 실패');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(banner: Banner) {
    try {
      await api.put<Banner>(`/cms/banners/${banner.id}`, {
        is_active: !banner.is_active,
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '수정 실패');
    }
  }

  async function handleDelete(banner: Banner) {
    if (!confirm(`"${banner.title}" 배너를 삭제하시겠어요?`)) return;
    try {
      await api.delete(`/cms/banners/${banner.id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : '삭제 실패');
    }
  }

  return (
    <div className="px-8 py-12">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">CMS 배너</h1>
          <p className="mt-1 text-sm text-text-secondary">
            홈/섹션 배너 관리. 활성 배너만 공개 영역에 노출됩니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> 새 배너
        </button>
      </header>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 space-y-4 rounded-2xl border border-border bg-white p-6"
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-secondary">
                위치
              </label>
              <select
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
              >
                {POSITIONS.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-secondary">
                순서
              </label>
              <input
                type="number"
                value={orderIndex}
                onChange={(e) => setOrderIndex(Number(e.target.value))}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">
              제목
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-text-secondary">
              부제목
            </label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full rounded-md border border-border px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-secondary">
                이미지 URL
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-text-secondary">
                링크 URL
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                className="w-full rounded-md border border-border px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {submitting ? '생성 중...' : '생성'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-border px-5 py-2 text-sm text-text-secondary hover:bg-bg-muted"
            >
              취소
            </button>
          </div>
        </form>
      )}

      {error && (
        <div className="mb-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-text-muted">불러오는 중...</p>
      ) : banners.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-white p-12 text-center text-text-muted">
          등록된 배너가 없습니다.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-bg-muted text-left text-xs text-text-secondary">
              <tr>
                <th className="px-4 py-3">위치</th>
                <th className="px-4 py-3">제목</th>
                <th className="px-4 py-3">순서</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {banners.map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-medium text-primary">
                      {POSITIONS.find((p) => p.key === b.position)?.label ?? b.position}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-text-primary">{b.title}</div>
                    {b.subtitle && (
                      <div className="text-xs text-text-muted">{b.subtitle}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{b.order_index}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggle(b)}
                      className={`flex items-center gap-1 text-xs font-medium ${
                        b.is_active ? 'text-secondary' : 'text-text-muted'
                      }`}
                    >
                      {b.is_active ? (
                        <Eye className="h-3 w-3" />
                      ) : (
                        <EyeOff className="h-3 w-3" />
                      )}
                      {b.is_active ? '활성' : '비활성'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleDelete(b)}
                      className="text-text-muted hover:text-danger"
                      title="삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
