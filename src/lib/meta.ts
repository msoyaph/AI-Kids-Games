import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
const origin = window.location.origin;
export function usePageMeta(title: string, description: string, image = '/og/site.jpg') {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${title} | Ai Kids Games`;
    for (const [selector,value] of [['meta[name="description"]',description],['meta[property="og:title"]',title],['meta[property="og:description"]',description],['meta[property="og:url"]',origin+pathname],['meta[property="og:image"]',origin+image],['meta[name="twitter:image"]',origin+image]]) document.querySelector(selector)?.setAttribute('content',value);
    // Canonical URL: same origin, path only (filters and search terms are not separate pages).
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement('link'); canonical.rel = 'canonical'; document.head.append(canonical); }
    canonical.href = origin+pathname;
  },[title,description,image,pathname]);
}
