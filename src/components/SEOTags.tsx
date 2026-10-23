import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useSettings } from '../context/SettingsContext';

export interface SEOTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  type?: 'website' | 'article' | 'product';
  canonicalUrl?: string;
  noindex?: boolean;
  structuredData?: Record<string, any> | Array<Record<string, any>>;
}

interface RouteConfig {
  title: string;
  description: string;
  keywords: string;
  type?: 'website' | 'product' | 'article';
  noindex?: boolean;
  schemaType?: 'Service' | 'Product' | 'WebApplication' | 'FAQPage' | 'WebPage';
}

const defaultRouteConfigs: Record<string, RouteConfig> = {
  '/': {
    title: 'Click2IT Hosting - High-Speed Web Hosting, NVMe cPanel & Cloud VPS in BD',
    description: 'Fast, reliable NVMe cPanel web hosting, KVM Cloud VPS, .BD domain registration and 99.9% uptime hosting in Bangladesh with 24/7 technical support.',
    keywords: 'web hosting bangladesh, cpanel hosting, nvme hosting, vps server bd, buy domain bangladesh, bd domain registration, ssl certificate',
    type: 'website',
    schemaType: 'Service',
  },
  '/hosting': {
    title: 'NVMe Web Hosting & cPanel Solutions - Click2IT Hosting BD',
    description: 'Blazing-fast NVMe web hosting powered by LiteSpeed and CloudLinux. Free SSL, daily backups, and cPanel control panel included.',
    keywords: 'cpanel web hosting, nvme web hosting, litespeed server, cloudlinux, affordable hosting bd',
    type: 'website',
    schemaType: 'Service',
  },
  '/services': {
    title: 'Web Hosting Services & Cloud Solutions - Click2IT Hosting',
    description: 'Discover shared NVMe hosting, reseller hosting, KVM Cloud VPS, and SSL security solutions built for speed and reliability in Bangladesh.',
    keywords: 'hosting services, reseller hosting, cloud vps, website security, domain registration',
    type: 'website',
    schemaType: 'Service',
  },
  '/hosting/services': {
    title: 'Web Hosting Services & Cloud Solutions - Click2IT Hosting',
    description: 'Discover shared NVMe hosting, reseller hosting, KVM Cloud VPS, and SSL security solutions built for speed and reliability in Bangladesh.',
    keywords: 'hosting services, reseller hosting, cloud vps, website security, domain registration',
    type: 'website',
    schemaType: 'Service',
  },
  '/pricing': {
    title: 'Web Hosting & VPS Pricing Plans - Click2IT Hosting BD',
    description: 'Transparent BDT hosting pricing with zero setup fees. Choose shared hosting, KVM Cloud VPS, or domain plans with instant activation.',
    keywords: 'web hosting price bd, cheap hosting bangladesh, vps pricing bdt, cpanel hosting packages',
    type: 'website',
    schemaType: 'Service',
  },
  '/hosting/pricing': {
    title: 'Web Hosting & VPS Pricing Plans - Click2IT Hosting BD',
    description: 'Transparent BDT hosting pricing with zero setup fees. Choose shared hosting, KVM Cloud VPS, or domain plans with instant activation.',
    keywords: 'web hosting price bd, cheap hosting bangladesh, vps pricing bdt, cpanel hosting packages',
    type: 'website',
    schemaType: 'Service',
  },
  '/vps': {
    title: 'KVM Cloud VPS Hosting Bangladesh - Dedicated NVMe & Root Access',
    description: 'Deploy enterprise KVM Cloud VPS in Bangladesh with full root access, guaranteed CPU/RAM, pure NVMe storage, and DDoS protection.',
    keywords: 'kvm vps bangladesh, cloud vps server, linux vps bd, root access vps, high iops nvme vps',
    type: 'product',
    schemaType: 'Product',
  },
  '/hosting/vps': {
    title: 'KVM Cloud VPS Hosting Bangladesh - Dedicated NVMe & Root Access',
    description: 'Deploy enterprise KVM Cloud VPS in Bangladesh with full root access, guaranteed CPU/RAM, pure NVMe storage, and DDoS protection.',
    keywords: 'kvm vps bangladesh, cloud vps server, linux vps bd, root access vps, high iops nvme vps',
    type: 'product',
    schemaType: 'Product',
  },
  '/domain': {
    title: 'Buy Domain Name in Bangladesh - .BD & Global TLD Registration',
    description: 'Register .BD, .COM, .NET, .ORG, and 50+ domain extensions at cheap prices in Bangladesh with free DNS management and theft protection.',
    keywords: 'buy domain bangladesh, bd domain registration, domain price bd, .com domain buy, instant domain search',
    type: 'product',
    schemaType: 'Product',
  },
  '/hosting/domain': {
    title: 'Buy Domain Name in Bangladesh - .BD & Global TLD Registration',
    description: 'Register .BD, .COM, .NET, .ORG, and 50+ domain extensions at cheap prices in Bangladesh with free DNS management and theft protection.',
    keywords: 'buy domain bangladesh, bd domain registration, domain price bd, .com domain buy, instant domain search',
    type: 'product',
    schemaType: 'Product',
  },
  '/ssl': {
    title: 'SSL Certificates & Website Security Shield - Click2IT',
    description: 'Secure your website with Sectigo DV, OV, and EV SSL certificates, automated malware removal, and real-time WAF in Bangladesh.',
    keywords: 'buy ssl certificate bd, cheap Sectigo SSL, website security, HTTPS lock, malware scanner',
    type: 'product',
    schemaType: 'Product',
  },
  '/status': {
    title: 'Real-time Server Status & 30-Day Uptime Metrics - Click2IT',
    description: 'Live server operational status, real-time node health monitoring, and 30-day historical uptime stats for Click2IT web hosting infrastructure.',
    keywords: 'server status, hosting uptime, server health, maintenance schedule, click2it status',
    type: 'website',
    schemaType: 'WebPage',
  },
  '/support': {
    title: '24/7 Hosting Support & Knowledgebase - Click2IT Hosting',
    description: 'Get round-the-clock technical support, cPanel setup guides, domain migration help, and ticket management for Click2IT hosting.',
    keywords: 'hosting support bd, cpanel help, support ticket, click2it customer care, web hosting guide',
    type: 'website',
    schemaType: 'FAQPage',
  },
  '/cart': {
    title: 'Hosting Cart & Order Summary - Click2IT',
    description: 'Review your web hosting, VPS, or domain order with flexible payment methods including bKash, Nagad, Rocket, and cards in BD.',
    keywords: 'hosting checkout, bkash hosting payment, domain buy cart',
    noindex: true,
  },
  '/checkout': {
    title: 'Secure Hosting Checkout - Click2IT',
    description: 'Complete your hosting order securely. Instant account provision upon payment confirmation.',
    keywords: 'hosting checkout, secure payment',
    noindex: true,
  },
};

export const SEOTags: React.FC<SEOTagsProps> = ({
  title,
  description,
  keywords,
  image,
  type,
  canonicalUrl,
  noindex,
  structuredData,
}) => {
  const { settings } = useSettings();
  const location = useLocation();

  const currentPath = location.pathname.toLowerCase().replace(/\/+$/, '') || '/';
  const matchedRoute = defaultRouteConfigs[currentPath] || defaultRouteConfigs['/'];

  const siteName = settings?.companyName || 'Click2IT Hosting';
  const baseDomain = settings?.website || (settings?.primaryDomain ? `https://${settings.primaryDomain}` : 'https://click2it.bd');

  // Dynamic values priority: Explicit prop -> Matched route config -> Default fallback
  const finalTitle = title || matchedRoute.title;
  const finalDescription = description || matchedRoute.description;
  const finalKeywords = keywords || matchedRoute.keywords;
  const finalType = type || matchedRoute.type || 'website';
  const finalNoindex = noindex !== undefined ? noindex : !!matchedRoute.noindex;

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : baseDomain;
  const currentFullUrl = typeof window !== 'undefined' ? window.location.href : `${baseDomain}${location.pathname}`;
  const resolvedCanonical = canonicalUrl || `${currentOrigin}${location.pathname}`;

  const defaultOgImage = `${currentOrigin}/logo.png`;
  const finalImage = image || settings?.logoUrl || defaultOgImage;

  // Generate route-specific Schema.org JSON-LD
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': siteName,
    'url': baseDomain,
    'logo': finalImage,
    'contactPoint': {
      '@type': 'ContactPoint',
      'telephone': settings?.contactPhone || '+880 123456789',
      'contactType': 'Customer Support',
      'areaServed': 'BD',
      'availableLanguage': ['English', 'Bengali'],
    },
  };

  const hostingServiceSchema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    'name': 'NVMe Web Hosting & VPS Bangladesh',
    'serviceType': 'Web Hosting & Cloud Server Provisioning',
    'provider': {
      '@type': 'Organization',
      'name': siteName,
      'url': baseDomain,
    },
    'areaServed': {
      '@type': 'Country',
      'name': 'Bangladesh',
    },
    'description': finalDescription,
    'offers': {
      '@type': 'Offer',
      'price': '150',
      'priceCurrency': 'BDT',
      'availability': 'https://schema.org/InStock',
    },
  };

  const combinedSchemas = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : [orgSchema, hostingServiceSchema];

  return (
    <Helmet>
      {/* Title */}
      <title>{finalTitle}</title>

      {/* Basic Metadata */}
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={resolvedCanonical} />

      {/* Indexing Directive */}
      {finalNoindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* OpenGraph / Facebook Tags */}
      <meta property="og:type" content={finalType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:url" content={currentFullUrl} />
      <meta property="og:locale" content="en_US" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:url" content={currentFullUrl} />

      {/* Structured Data Scripts */}
      {combinedSchemas.map((schemaObj, index) => (
        <script key={`schema-${index}`} type="application/ld+json">
          {JSON.stringify(schemaObj)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOTags;
