import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-16 bg-[#111827] px-6 pb-6 pt-12 text-[#9ca3af]">
      <div className="mx-auto max-w-layout">
        <div className="mb-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Image src="/logo.png" alt="국립공주대학교" width={180} height={36} className="brightness-0 invert" />
            </div>
            <p className="max-w-[400px] text-sm leading-relaxed">
              대학-지자체-시민이 함께하는 온라인 사회공헌 플랫폼.
              <br />
              지역의 문제를 함께 발견하고, 해결하고, 성과를 나눕니다.
            </p>
          </div>

          <FooterGroup title="플랫폼">
            <FooterLink href="/about">USCP란?</FooterLink>
            <FooterLink href="/campus">캠퍼스 소개</FooterLink>
            <FooterLink href="/guide">참여 방법</FooterLink>
            <FooterLink href="/success-cases">성공 사례</FooterLink>
          </FooterGroup>

          <FooterGroup title="활동">
            <FooterLink href="/issues">지역 문제</FooterLink>
            <FooterLink href="/projects">리빙랩 프로젝트</FooterLink>
            <FooterLink href="/volunteers">봉사활동</FooterLink>
          </FooterGroup>

          <FooterGroup title="운영 기관">
            <span className="text-sm">지역사회특화센터</span>
            <span className="text-sm">ESG센터</span>
            <span className="text-sm">국제협력센터</span>
            <a href="mailto:sos-lab@univ.ac.kr" className="mt-3 text-sm">
              문의: sos-lab@univ.ac.kr
            </a>
          </FooterGroup>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-[#374151] pt-6 text-xs text-[#6b7280] md:flex-row">
          <div>© 2026 USCP · 2025 글로컬대학 본지정 사업</div>
          <div className="flex gap-2">
            {[4, 9, 10, 11, 17].map((n) => (
              <div
                key={n}
                className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#374151] text-[10px] font-bold text-white"
                title={`SDG ${n}`}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-white">{title}</h4>
      <ul className="flex flex-col gap-2">
        {Array.isArray(children)
          ? children.map((child, i) => <li key={i}>{child}</li>)
          : <li>{children}</li>}
      </ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-[#9ca3af] transition hover:text-white">
      {children}
    </Link>
  );
}
