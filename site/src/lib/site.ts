/**
 * The site's identity, in one place. The header, the homepage Large Title,
 * every document title, the Open Graph and Twitter cards, the RSS feed and the
 * web app manifest all read these values, so a rename touches only this file.
 */
export const SITE_NAME = 'Passion Project';
export const SITE_DESCRIPTION = 'Passion Project — 개인 지식 베이스와 작업 기록';
export const SITE_URL = 'https://rvnnt.dev';
export const SITE_LOCALE = 'ko_KR';

/**
 * The document title for a page: "<page> — Passion Project", or the site name
 * alone for the homepage (or any page titled after the site itself).
 */
export function documentTitle(pageTitle?: string): string {
  const title = pageTitle?.trim();
  if (!title || title === SITE_NAME) return SITE_NAME;
  return `${title} — ${SITE_NAME}`;
}
