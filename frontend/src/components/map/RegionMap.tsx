'use client';

import Link from 'next/link';
import Script from 'next/script';
import { MapPin } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

/**
 * M09-05: 5개 지역 현황 지도 (홈 화면).
 *
 * 설계 근거:
 *  - feature-spec §M09-05 (5개 지역 현황 지도)
 *  - design.md §7.3 #1 홈 KakaoMap
 *  - design.md §8.3 "카카오맵 서비스가 일시 장애로 로드되지 않을 경우, 정적 지도 이미지로 자동 대체"
 *  - design.md §3.2 region ENUM 5종
 *
 * 동작:
 *   1. /common/regions/map API 호출 → 5개 지역 메타데이터 + 지역별 통계 수신
 *   2. Kakao Map SDK 로드 → 5개 핀 표시 (region 색상 + active_issues 카운트)
 *   3. 핀 클릭 → /issues?region={code} 이동
 *   4. API 키 미설정 / SDK 로드 실패 → fallback 정적 카드 그리드 (5개 지역)
 *
 * 본 컴포넌트는 region 단위 (5개 핀). 의제·리빙랩 개별 위치 핀(M09-06)은
 * 기존 `KakaoMap.tsx` 가 담당하며 /issues 페이지의 지도 뷰에서 사용.
 */

interface RegionInfo {
  code: string;
  label: string;
  color: string;
  lat: number;
  lng: number;
  active_issues: number;
  resolved_issues: number;
  active_projects: number;
}

interface RegionsMapResponse {
  regions: RegionInfo[];
  center: { lat: number; lng: number };
}

// 전역 Window.kakao 타입은 src/types/kakao-maps.d.ts 에 정의.

const FALLBACK_REGIONS: RegionInfo[] = [
  {
    code: 'daejeon',
    label: '대전',
    color: '#1E40AF',
    lat: 36.3504,
    lng: 127.3845,
    active_issues: 0,
    resolved_issues: 0,
    active_projects: 0,
  },
  {
    code: 'gongju',
    label: '공주',
    color: '#059669',
    lat: 36.4467,
    lng: 127.119,
    active_issues: 0,
    resolved_issues: 0,
    active_projects: 0,
  },
  {
    code: 'yesan',
    label: '예산',
    color: '#7c3aed',
    lat: 36.6802,
    lng: 126.8447,
    active_issues: 0,
    resolved_issues: 0,
    active_projects: 0,
  },
  {
    code: 'cheonan',
    label: '천안',
    color: '#0891b2',
    lat: 36.8151,
    lng: 127.1139,
    active_issues: 0,
    resolved_issues: 0,
    active_projects: 0,
  },
  {
    code: 'sejong',
    label: '세종',
    color: '#ea580c',
    lat: 36.4801,
    lng: 127.289,
    active_issues: 0,
    resolved_issues: 0,
    active_projects: 0,
  },
];

interface RegionMapProps {
  /** SSR 초기값 — undefined 시 client fetch */
  initial?: RegionsMapResponse;
}

export function RegionMap({ initial }: RegionMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<RegionsMapResponse | null>(initial ?? null);
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';

  // ── 1) 지역 데이터 fetch ─────────────────────────────────
  useEffect(() => {
    if (initial) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<RegionsMapResponse>('/common/regions/map');
        if (!cancelled) setData(res);
      } catch {
        if (!cancelled) {
          // §8.3 fallback — 정적 5개 지역 데이터
          setData({
            regions: FALLBACK_REGIONS,
            center: { lat: 36.55, lng: 127.13 },
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initial]);

  // ── 2) Kakao Map SDK 로드 + 5개 핀 표시 ──────────────────
  useEffect(() => {
    if (!sdkReady || !mapRef.current || !data) return;
    if (typeof window === 'undefined' || !window.kakao?.maps) return;

    try {
      window.kakao.maps.load(() => {
        const kakao = window.kakao;
        const center = new kakao.maps.LatLng(data.center.lat, data.center.lng);
        const map = new kakao.maps.Map(mapRef.current!, {
          center,
          level: 11,
        });

        const bounds = new kakao.maps.LatLngBounds();

        data.regions.forEach((region) => {
          const pos = new kakao.maps.LatLng(region.lat, region.lng);
          bounds.extend(pos);

          // 커스텀 overlay — region 색상 + active count badge
          const overlayHtml = `
            <a href="/issues?region=${region.code}"
               style="display:flex;flex-direction:column;align-items:center;text-decoration:none;font-family:inherit;cursor:pointer">
              <div style="position:relative;display:flex;align-items:center;justify-content:center;width:48px;height:48px;border-radius:50%;background:${region.color};color:#fff;font-weight:800;font-size:14px;box-shadow:0 4px 8px rgba(0,0,0,0.18);border:3px solid #fff">
                ${region.label}
                ${region.active_issues > 0 ? `<span style="position:absolute;top:-6px;right:-6px;min-width:22px;height:22px;padding:0 6px;border-radius:11px;background:#ef4444;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;border:2px solid #fff">${region.active_issues}</span>` : ''}
              </div>
              <div style="margin-top:4px;padding:2px 8px;border-radius:12px;background:#fff;font-size:11px;font-weight:600;color:#0f172a;box-shadow:0 2px 4px rgba(0,0,0,0.08);white-space:nowrap">
                리빙랩 ${region.active_projects} · 해결 ${region.resolved_issues}
              </div>
            </a>
          `;

          new kakao.maps.CustomOverlay({
            position: pos,
            content: overlayHtml,
            map,
            yAnchor: 1,
          });
        });

        if (!bounds.isEmpty()) {
          (map as { setBounds: (b: unknown) => void }).setBounds(bounds);
        }
      });
    } catch (err) {
      setSdkError(err instanceof Error ? err.message : '지도 로드 실패');
    }
  }, [sdkReady, data]);

  // ── 3) Fallback: API 키 미설정 또는 SDK 로드 실패 ────────
  const showFallback = !apiKey || sdkError !== null;
  const regions = data?.regions ?? FALLBACK_REGIONS;

  return (
    <section
      aria-labelledby="region-map-heading"
      className="container-content py-16"
      data-testid="home-region-map"
    >
      <header className="mb-8 text-center">
        <div className="mb-2 inline-block text-sm font-semibold uppercase tracking-wider text-primary">
          5개 지역 현황
        </div>
        <h2
          id="region-map-heading"
          className="text-2xl font-black text-text md:text-3xl"
        >
          대전·공주·예산·천안·세종
        </h2>
        <p className="mt-3 text-base text-text-secondary">
          각 지역의 진행 중 의제와 리빙랩 프로젝트를 한눈에 확인하세요.
        </p>
      </header>

      {showFallback ? (
        // ── Static fallback ──────────────────────────────
        <div data-testid="region-map-fallback">
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
            {regions.map((r) => (
              <li key={r.code}>
                <Link
                  href={`/issues?region=${r.code}`}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface p-5 text-center transition hover:shadow-md"
                  data-testid={`region-fallback-${r.code}`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-base font-black text-white"
                    style={{ backgroundColor: r.color }}
                    aria-hidden="true"
                  >
                    {r.label}
                  </div>
                  <div className="text-base font-bold text-text">{r.label}</div>
                  <div className="text-xs text-text-secondary">
                    의제 {r.active_issues} · 리빙랩 {r.active_projects}
                  </div>
                  <div className="text-xs text-text-muted">
                    해결완료 {r.resolved_issues}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {!apiKey ? (
            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-text-muted">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              카카오맵 API 키 미설정 — 정적 지역 카드로 표시 중입니다
            </p>
          ) : null}
        </div>
      ) : (
        // ── Kakao Map ────────────────────────────────────
        <>
          <Script
            src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`}
            strategy="afterInteractive"
            onLoad={() => setSdkReady(true)}
            onError={() => setSdkError('SDK 로드 실패')}
          />
          <div
            ref={mapRef}
            className={cn(
              'h-[420px] w-full overflow-hidden rounded-xl border border-border bg-bg',
            )}
            role="application"
            aria-label="5개 지역 현황 지도"
            data-testid="region-map-canvas"
          />
          {/* 시각 사용자용 보조 그리드 (스크린리더·키보드 사용자 접근성) */}
          <ul
            className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5"
            aria-label="지역별 의제·리빙랩 요약"
          >
            {regions.map((r) => (
              <li key={r.code}>
                <Link
                  href={`/issues?region=${r.code}`}
                  className="block rounded-md border border-border bg-surface p-3 text-sm hover:border-primary"
                  data-testid={`region-summary-${r.code}`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: r.color }}
                      aria-hidden="true"
                    />
                    <span className="font-bold text-text">{r.label}</span>
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    의제 {r.active_issues} · 리빙랩 {r.active_projects}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
