import DOMPurify from 'isomorphic-dompurify';

/**
 * G-M07-3/4 (Phase 7 보안) — 저장된 리치텍스트 HTML 정화.
 *
 * 운영자가 TipTap WYSIWYG / CMS 에디터로 작성해 DB에 저장한 HTML 을
 * `dangerouslySetInnerHTML` 로 렌더하기 전 반드시 통과시킨다 (stored XSS 방어).
 * isomorphic-dompurify 는 서버 컴포넌트(SSR, jsdom)·브라우저 양쪽에서 동작한다.
 *
 * 허용: 리치텍스트 표준 태그(제목·문단·목록·표·인용·코드·링크·이미지·강조).
 * 차단: <script>·<style>·<iframe>·이벤트 핸들러(on*)·javascript: 프로토콜.
 */
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: [
    'p', 'br', 'hr', 'span', 'div',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'strong', 'b', 'em', 'i', 'u', 's', 'del', 'mark', 'sub', 'sup',
    'ul', 'ol', 'li',
    'blockquote', 'pre', 'code',
    'a', 'img',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'src', 'alt', 'width', 'height', 'class', 'colspan', 'rowspan'],
  // data: 는 이미지 인라인용으로만 허용, javascript:/vbscript: 등은 DOMPurify 가 기본 차단.
  ALLOW_DATA_ATTR: false,
};

// 외부 링크(target=_blank)에 rel="noopener noreferrer" 강제 — tabnabbing 방어.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/** 저장된 리치텍스트 HTML 을 정화해 반환. null/undefined 는 빈 문자열. */
export function sanitizeRichText(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, RICH_TEXT_CONFIG);
}
