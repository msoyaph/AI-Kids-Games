import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
const origin = window.location.origin;
export function usePageMeta(title: string, description: string, image = '/art/light-crossing-banner.svg') {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = `${title} | Ai Kids Games`;
    for (const [selector,value] of [['meta[name="description"]',description],['meta[property="og:title"]',title],['meta[property="og:description"]',description],['meta[property="og:url"]',origin+pathname],['meta[property="og:image"]',origin+image]]) document.querySelector(selector)?.setAttribute('content',value);
  },[title,description,image,pathname]);
}
