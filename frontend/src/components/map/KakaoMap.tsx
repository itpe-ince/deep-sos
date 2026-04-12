'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Script from 'next/script';
import { MapPin } from 'lucide-react';

interface IssueMarker {
  id: string;
  title: string;
  category: string;
  vote_count: number;
  location_lat: number | null;
  location_lng: number | null;
  location_address: string | null;
}

interface Props {
  issues: IssueMarker[];
}

// Kakao Map SDK 전역 타입 선언 (간소화)
declare global {
  interface Window {
    kakao: {
      maps: {
        load: (cb: () => void) => void;
        Map: new (container: HTMLElement, options: unknown) => unknown;
        LatLng: new (lat: number, lng: number) => unknown;
        LatLngBounds: new () => {
          extend: (latlng: unknown) => void;
          isEmpty: () => boolean;
        };
        Marker: new (options: unknown) => {
          setMap: (map: unknown) => void;
        };
        InfoWindow: new (options: { content: string }) => {
          open: (map: unknown, marker: unknown) => void;
          close: () => void;
        };
        event: {
          addListener: (target: unknown, type: string, handler: () => void) => void;
        };
      };
    };
  }
}

const CATEGORY_LABEL: Record<string, string> = {
  environment: '환경',
  safety: '안전',
  transport: '교통',
  welfare: '복지',
  culture: '문화',
  other: '기타',
};

export function KakaoMap({ issues }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<unknown>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? '';
  const located = issues.filter(
    (i) => i.location_lat !== null && i.location_lng !== null,
  );

  useEffect(() => {
    if (!sdkReady || !mapRef.current) return;
    if (typeof window === 'undefined' || !window.kakao?.maps) return;

    try {
      window.kakao.maps.load(() => {
        const kakao = window.kakao;
        const center = new kakao.maps.LatLng(36.3504, 127.3845); // 대전 중심
        const map = new kakao.maps.Map(mapRef.current!, {
          center,
          level: 8,
        });
        mapInstance.current = map;

        const bounds = new kakao.maps.LatLngBounds();
        let openedWindow: { close: () => void } | null = null;

        located.forEach((issue) => {
          const pos = new kakao.maps.LatLng(
            Number(issue.location_lat),
            Number(issue.location_lng),
          );
          bounds.extend(pos);

          const marker = new kakao.maps.Marker({ position: pos, map });
          const catLabel = CATEGORY_LABEL[issue.category] ?? issue.category;
          const html = `
            <div style="padding:10px 14px;max-width:260px;font-family:inherit">
              <div style="font-size:11px;color:#2563eb;font-weight:600;margin-bottom:4px">${catLabel}</div>
              <div style="font-size:13px;font-weight:600;color:#0f172a;margin-bottom:6px">${issue.title}</div>
              <div style="font-size:11px;color:#64748b;margin-bottom:8px">공감 ${issue.vote_count}</div>
              <a href="/issues/${issue.id}" style="font-size:11px;color:#2563eb;text-decoration:none;font-weight:600">자세히 보기 →</a>
            </div>
          `;
          const infoWindow = new kakao.maps.InfoWindow({ content: html });
          kakao.maps.event.addListener(marker, 'click', () => {
            if (openedWindow) openedWindow.close();
            infoWindow.open(map, marker);
            openedWindow = infoWindow;
          });
        });

        if (!bounds.isEmpty()) {
          (map as { setBounds: (b: unknown) => void }).setBounds(bounds);
        }
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '지도 로드 실패');
    }
  }, [sdkReady, located]);

  // Fallback: API 키 미설정
  if (!apiKey) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-16 text-center">
        <MapPin className="mb-3 h-12 w-12 text-text-muted" />
        <h3 className="mb-2 text-lg font-semibold text-text-primary">
          지도 보기 준비 중
        </h3>
        <p className="text-sm text-text-secondary">
          카카오맵 API 키가 아직 설정되지 않았습니다.
          <br />
          환경 변수 <code className="rounded bg-bg-muted px-2 py-0.5 text-xs">NEXT_PUBLIC_KAKAO_MAP_KEY</code>
          를 설정하세요.
        </p>
        <div className="mt-6 w-full max-w-md rounded-lg bg-bg-muted p-4 text-left">
          <p className="mb-2 text-xs font-semibold text-text-secondary">
            위치 정보가 있는 이슈 ({located.length}건)
          </p>
          <ul className="space-y-1 text-xs text-text-muted">
            {located.slice(0, 5).map((i) => (
              <li key={i.id} className="flex items-center gap-1">
                <MapPin className="h-3 w-3 shrink-0" />
                <Link
                  href={`/issues/${i.id}`}
                  className="truncate hover:text-primary"
                >
                  {i.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`//dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false`}
        strategy="afterInteractive"
        onLoad={() => setSdkReady(true)}
        onError={() => setError('SDK 로드 실패')}
      />
      {error ? (
        <div className="rounded-xl border border-danger/30 bg-danger/5 p-6 text-sm text-danger">
          {error}
        </div>
      ) : located.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-white p-16 text-center">
          <MapPin className="mb-3 h-10 w-10 text-text-muted" />
          <p className="text-sm text-text-muted">
            위치 정보가 있는 이슈가 아직 없습니다.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          <div
            ref={mapRef}
            className="h-[560px] w-full"
            style={{ background: '#f1f5f9' }}
          />
          <div className="border-t border-border bg-white px-4 py-2 text-xs text-text-muted">
            위치 마커 {located.length}건 · 마커 클릭 시 상세 정보 표시
          </div>
        </div>
      )}
    </>
  );
}
