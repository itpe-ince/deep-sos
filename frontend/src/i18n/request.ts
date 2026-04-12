import { getRequestConfig } from 'next-intl/server';

/**
 * Sprint 6: 기본 i18n 설정. 현재 ko 고정.
 * Sprint 7에서 locale 라우팅 + 동적 전환 예정.
 */
export default getRequestConfig(async () => {
  const locale = 'ko';
  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
