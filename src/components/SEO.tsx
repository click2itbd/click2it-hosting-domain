import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useSettings } from '../context/SettingsContext';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  canonical?: string;
  type?: 'website' | 'article' | 'product';
  schema?: Record<string, any> | Array<Record<string, any>>;
  noindex?: boolean;
}

export const SEO: React.FC<SEOProps> = ({ 
  title, 
  description, 
  keywords, 
  image,
  url,
  canonical,
  type = 'website',
  schema,
  noindex = false
}) => {
  const { settings } = useSettings();
  
  const currentDomain = typeof window !== 'undefined' ? window.location.hostname : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const isHostingDomain = currentDomain === 'click2it.bd' || currentDomain === 'www.click2it.bd' || currentDomain === '127.0.0.1' || pathname.startsWith('/hosting') || pathname.startsWith('/domain') || pathname.startsWith('/vps') || pathname.startsWith('/ssl') || pathname.startsWith('/services') || pathname.startsWith('/pricing');
  
  const siteName = settings?.companyName || (isHostingDomain ? 'Click2IT Hosting' : 'Click2IT');
  const baseDomain = isHostingDomain ? 'https://click2it.bd' : 'https://click2itbd.com';
  
  const defaultTitle = isHostingDomain 
    ? `${siteName} - High-Speed Web Hosting, VPS & Domain in Bangladesh`
    : `${siteName} - Computer, Laptop, Component & Custom PC Builder in Bangladesh`;
    
  const defaultDescription = isHostingDomain
    ? settings?.companyDescription || 'Fast, reliable NVMe cPanel web hosting, KVM Cloud VPS, .BD domain registration and website security services in Bangladesh with 99.9% uptime.'
    : 'Shop best price laptops, desktop computers, gaming PC components, CCTV and tech accessories in Bangladesh at Click2IT. Build your dream custom PC with warranty.';
    
  const defaultKeywords = isHostingDomain
    ? 'web hosting bangladesh, cpanel hosting, nvme hosting, vps server bd, buy domain bangladesh, bd domain registration, ssl certificate, cloud hosting'
    : 'computer shop bd, pc builder bangladesh, gaming laptop price bd, desktop pc, intel amd processor, monitor, cctv camera, tech accessories dhaka';
  
  const seoTitle = title 
    ? (title.includes(siteName) ? title : `${title} | ${siteName}`) 
    : defaultTitle;
  const seoDescription = description || defaultDescription;
  const seoKeywords = keywords || defaultKeywords;
  const seoImage = image || settings?.logoUrl || `${baseDomain}/logo.png`;
  const seoUrl = url || (typeof window !== 'undefined' ? window.location.href : baseDomain);
  const canonicalUrl = canonical || (typeof window !== 'undefined' ? `${baseDomain}${window.location.pathname}` : baseDomain);

  // Default Organization & Website Schema
  const defaultOrgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': siteName,
    'url': baseDomain,
    'logo': `${baseDomain}/logo.png`,
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': settings?.phone || '+8801700000000',
      'contactType': 'Customer Support',
      'areaServed': 'BD',
      'availableLanguage': ['English', 'Bengali']
    },
    'sameAs': [
      settings?.facebook || 'https://facebook.com/click2itbd'
    ]
  };

  const defaultWebSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': siteName,
    'url': baseDomain,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${baseDomain}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };

  const finalSchema = schema 
    ? (Array.isArray(schema) ? schema : [schema])
    : [defaultOrgSchema, defaultWebSiteSchema];

  return (
    <Helmet>
      {/* Standard metadata tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      
      {/* Robots meta */}
      {noindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Open Graph tags (Facebook, LinkedIn, etc.) */}
      <meta property="og:type" content={type === 'product' ? 'product' : type === 'article' ? 'article' : 'website'} />
      <meta property="og:url" content={seoUrl} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={seoUrl} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />

      {/* Structured Data (JSON-LD) */}
      {finalSchema.map((item, idx) => (
        <script key={idx} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
};
