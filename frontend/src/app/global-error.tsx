'use client';

/**
 * Root layout 자체가 파괴된 최후 fallback.
 *
 * Next.js 규약: global-error.tsx 는 <html>/<body> 를 직접 렌더해야 한다.
 * Header/Footer 도 의존하지 않는 최소 마크업으로 사이트 다운 상황을 안내.
 */
export default function GlobalCatastrophicError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          padding: '24px',
          background: '#0f172a',
          color: '#e2e8f0',
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Pretendard", "Apple SD Gothic Neo", "Segoe UI", sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 560, textAlign: 'center' }}>
          <p
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1,
              margin: 0,
              background: 'linear-gradient(135deg, #ef4444, #f59e0b)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            500
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '16px 0 8px' }}>
            사이트에 일시적인 장애가 발생했어요
          </h1>
          <p style={{ fontSize: 14, color: '#94a3b8', lineHeight: 1.6 }}>
            잠시 후 다시 시도해 주세요. 문제가 계속될 경우 운영팀
            (<a href="mailto:sos-lab@kongju.ac.kr" style={{ color: '#93c5fd' }}>sos-lab@kongju.ac.kr</a>)
            으로 문의 부탁드립니다.
          </p>
          {error?.digest && (
            <p style={{ fontSize: 11, color: '#64748b', marginTop: 16, fontFamily: 'monospace' }}>
              error digest: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: 24,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: 'white',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
