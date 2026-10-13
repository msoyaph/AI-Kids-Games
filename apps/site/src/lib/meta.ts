import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { pageMeta } from '../seo/meta';

/**
 * Keeps the title, description, share tags and canonical URL right as people move around. The
 * build writes the same into each page's static HTML, from the same pageMeta().
 */
export function usePageMeta() {
  const { pathname } = useLocation();
  useEffect(() => {
    const origin = window.location.origin, meta = pageMeta(pathname);
    document.title = meta.fullTitle;
    for (const [selector,value] of [['meta[name="description"]',meta.description],['meta[property="og:title"]',meta.title],['meta[property="og:description"]',meta.description],['meta[property="og:url"]',origin+pathname],['meta[property="og:image"]',origin+meta.image],['meta[property="og:image:alt"]',meta.imageAlt],['meta[name="twitter:image"]',origin+meta.image]]) document.querySelector(selector)?.setAttribute('content',value);
    // Canonical URL: same origin, path only (filters and search terms are not separate pages).
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = origin+pathname;
  },[pathname]);
}
