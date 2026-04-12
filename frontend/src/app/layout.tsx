import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SOS랩 (USCP) — 대학과 지역이 함께 만드는 사회공헌 플랫폼',
    template: '%s · SOS랩',
  },
  description:
    '지역의 문제를 함께 발견하고, 대학의 역량으로 해결하며, 성과를 지역에 환원하는 온라인 사회공헌 플랫폼입니다.',
  keywords: ['리빙랩', '사회공헌', '글로컬대학', 'SDGs', '시민참여', 'USCP'],
  openGraph: {
    title: 'SOS랩 (USCP)',
    description: '대학과 지역이 함께 만드는 사회공헌 플랫폼',
    locale: 'ko_KR',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:shadow-lg"
        >
          본문으로 건너뛰기
        </a>
        {children}
      </body>
    </html>
  );
}
