import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: 'website' | 'article';
  noIndex?: boolean;
}

export const SEO = ({
  title,
  description = 'Система анонимных опросов для студентов',
  canonical,
  ogImage = '/og-default.png',
  ogType = 'website',
  noIndex = false,
}: SEOProps) => {
  useEffect(() => {

    document.title = `${title} | Poll System`;

    updateMeta('description', description);
    updateMeta('keywords', 'опросы, голосование, студенты, анонимно');

    updateMeta('robots', noIndex ? 'noindex, nofollow' : 'index, follow');

    if (canonical) {
      updateCanonical(canonical);
    }

    updateMeta('og:title', `${title} | Poll System`, 'property');
    updateMeta('og:description', description, 'property');
    updateMeta('og:type', ogType, 'property');
    updateMeta('og:image', ogImage, 'property');
    updateMeta('og:url', window.location.href, 'property');

    updateMeta('twitter:card', 'summary_large_image');
    updateMeta('twitter:title', title);
    updateMeta('twitter:description', description);
    updateMeta('twitter:image', ogImage);

    return () => {
    };
  }, [title, description, canonical, ogImage, ogType, noIndex]);

  return null;
};

function updateMeta(name: string, content: string, attr: 'name' | 'property' = 'name') {
  let meta = document.querySelector(`meta[${attr}="${name}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute(attr, name);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', content);
}

function updateCanonical(href: string) {
  let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = href;
}

export default SEO;