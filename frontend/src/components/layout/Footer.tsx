import Image from 'next/image';
import Link from 'next/link';

/**
 * M09-11: USCP V2 Footer.
 *
 * 설계 근거:
 *  - feature-spec §M09-11 (푸터)
 *  - uscp-sitemap.md §3.1.2 (공개 페이지 6종)
 *  - design.md §8.4 컴플라이언스 (개인정보처리방침·이용약관 링크 항상 노출)
 *
 * V1 → V2 변경:
 *  - 제거: /campus (캠퍼스 소개), /volunteers (봉사활동), /guide (참여 방법) — V2 out-of-scope
 *  - 추가: /network (협력 네트워크), /performance (성과자료), /terms/privacy, /terms/service
 *  - 운영 기관: V1 "지역사회특화센터·ESG센터·국제협력센터" → V2 "공주대 글로컬사업단 지역사회특화센터 + 충남대 (MOU)"
 */
export function Footer() {
  return (
    <footer
      className="mt-16 bg-[#0F172A] px-6 pb-6 pt-12 text-[#94a3b8]"
      data-testid="footer"
    >
      <div className="mx-auto max-w-layout">
        <div className="mb-8 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <div className="mb-4">
              <Image
                src="/logo.png"
                alt="국립공주대학교"
                width={180}
                height={36}
                className="brightness-0 invert"
              />
            </div>
            <p className="max-w-[400px] text-sm leading-relaxed">
              대학-지자체-시민이 함께 만드는 온라인 사회공헌 플랫폼.
              <br />
              지역의 문제를 함께 발견하고, 해결하고, 성과를 나눕니다.
            </p>
          </div>

          <FooterGroup title="플랫폼">
            <FooterLink href="/about">USCP 소개</FooterLink>
            <FooterLink href="/issues">지역문제 광장</FooterLink>
            <FooterLink href="/projects">리빙랩</FooterLink>
            <FooterLink href="/success-cases">성공사례</FooterLink>
          </FooterGroup>

          <FooterGroup title="네트워크">
            <FooterLink href="/network">협력 네트워크</FooterLink>
            <FooterLink href="/performance">성과자료</FooterLink>
            <FooterLink href="/login">회원가입 / 로그인</FooterLink>
          </FooterGroup>

          <FooterGroup title="운영 기관">
            <span className="text-sm">
              국립공주대학교
              <br />
              글로컬사업단 지역사회특화센터
            </span>
            <span className="text-sm">충남대학교 (MOU 협력)</span>
            <a
              href="mailto:sos-lab@kongju.ac.kr"
              className="mt-3 text-sm hover:text-white"
            >
              문의: sos-lab@kongju.ac.kr
            </a>
          </FooterGroup>
        </div>

        {/* §8.4 컴플라이언스 — 약관·개인정보처리방침 링크 항상 노출 */}
        <div className="mb-4 flex flex-wrap items-center gap-4 border-t border-[#1e293b] pt-6 text-xs">
          <Link
            href="/terms/service"
            className="font-medium text-[#cbd5e1] hover:text-white"
          >
            이용약관
          </Link>
          <span className="text-[#475569]">·</span>
          <Link
            href="/terms/privacy"
            className="font-semibold text-white hover:underline"
          >
            개인정보처리방침
          </Link>
          <span className="text-[#475569]">·</span>
          <span className="text-[#94a3b8]">
            개인정보 처리자: 국립공주대학교 글로컬사업단 지역사회특화센터
          </span>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 text-xs text-[#64748b] md:flex-row">
          <div>© 2026 USCP · 2025 글로컬대학 본지정 사업</div>
          <div className="flex gap-2" aria-label="UN SDGs 5종">
            {[4, 9, 10, 11, 17].map((n) => (
              <div
                key={n}
                className="flex h-6 w-6 items-center justify-center rounded-sm bg-[#1e293b] text-[10px] font-bold text-white"
                title={`UN SDG ${n}`}
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

function FooterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-white">{title}</h4>
      <ul className="flex flex-col gap-2">
        {Array.isArray(children) ? (
          children.map((child, i) => <li key={i}>{child}</li>)
        ) : (
          <li>{children}</li>
        )}
      </ul>
    </div>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-sm text-[#94a3b8] transition hover:text-white"
    >
      {children}
    </Link>
  );
}
