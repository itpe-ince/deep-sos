/**
 * Kakao Maps SDK 전역 타입 (간소화).
 *
 * 설계 근거: feature-spec §M09-05/06 + design.md §8.3 (정적 fallback)
 *
 * KakaoMap.tsx (M09-06 의제 마커) 와 RegionMap.tsx (M09-05 지역 핀) 가 공통으로
 * 의존하는 SDK 인터페이스. 양쪽이 동일한 declaration 을 갖도록 본 d.ts 에 통합.
 */
export {};

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
        CustomOverlay: new (options: unknown) => {
          setMap: (map: unknown) => void;
        };
        InfoWindow: new (options: { content: string }) => {
          open: (map: unknown, marker: unknown) => void;
          close: () => void;
        };
        event: {
          addListener: (
            target: unknown,
            type: string,
            handler: () => void,
          ) => void;
        };
      };
    };
  }
}
