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
  faqs?: Array<{ question: string; answer: string }>;
}

const defaultRouteConfigs: Record<string, RouteConfig> = {
  '/': {
    title: 'High-Speed NVMe Web Hosting, Cloud VPS & Domain Registration | Click2IT',
    description: 'Deploy ultra-fast NVMe cPanel Web Hosting, dedicated KVM Cloud VPS, and global .COM, .NET, .BD domain registration with 99.9% uptime, LiteSpeed, and 24/7 support at Click2IT.',
    keywords: 'web hosting, nvme hosting, cpanel hosting, cloud vps, kvm vps, buy domain, domain registration, bd domain, cheap vps, litespeed web hosting, fast hosting worldwide, best hosting bangladesh',
    type: 'website',
    schemaType: 'Service',
    faqs: [
      {
        question: 'What makes Click2IT NVMe Web Hosting faster than traditional hosting?',
        answer: 'Click2IT utilizes pure Enterprise NVMe SSD storage in RAID-10 arrays combined with LiteSpeed Enterprise Web Server and CloudLinux OS, delivering up to 20x faster page load speeds and superior database response times worldwide.'
      },
      {
        question: 'Does Click2IT provide free SSL certificates and automated backups?',
        answer: 'Yes! Every hosting plan includes free automated Sectigo / Let\'s Encrypt SSL certificates with instant auto-renewal, plus automated off-site backups to keep your website and database safe.'
      },
      {
        question: 'Can I host both international and local websites on Click2IT?',
        answer: 'Absolutely. Click2IT infrastructure features premium low-latency global Tier-1 uplinks alongside direct BDIX connectivity, delivering blazing speeds for visitors in Bangladesh, South Asia, North America, and Europe.'
      }
    ]
  },
  '/hosting': {
    title: 'NVMe cPanel Web Hosting - LiteSpeed, Free SSL & 99.9% Uptime | Click2IT',
    description: 'Ultra-fast NVMe cPanel web hosting powered by LiteSpeed Enterprise and CloudLinux. Includes free SSL certificates, daily backups, 1-click WordPress install, and 24/7 technical assistance.',
    keywords: 'cpanel web hosting, nvme hosting, litespeed hosting, cheap cpanel hosting, fast wordpress hosting, cloudlinux hosting, reliable web host',
    type: 'website',
    schemaType: 'Service',
    faqs: [
      {
        question: 'Which control panel is included with Click2IT shared hosting plans?',
        answer: 'All Click2IT shared hosting packages come with the industry-standard cPanel control panel, featuring 1-click Softaculous app installers, phpMyAdmin, file manager, and email configuration tools.'
      },
      {
        question: 'How quickly is my hosting account activated after ordering?',
        answer: 'Hosting accounts are provisioned instantly within seconds after payment confirmation. You will receive an automated activation email containing your cPanel credentials and nameservers.'
      }
    ]
  },
  '/services': {
    title: 'Enterprise Cloud, Web Hosting & Managed IT Infrastructure | Click2IT',
    description: 'Explore scalable web hosting services, KVM Cloud VPS instances, reseller hosting, SSL certificates, and custom cloud architecture engineered for global performance and high reliability.',
    keywords: 'hosting services, enterprise cloud, reseller hosting, kvm vps, managed hosting solutions, website security, cloud infrastructure',
    type: 'website',
    schemaType: 'Service',
  },
  '/hosting/services': {
    title: 'Enterprise Cloud, Web Hosting & Managed IT Infrastructure | Click2IT',
    description: 'Explore scalable web hosting services, KVM Cloud VPS instances, reseller hosting, SSL certificates, and custom cloud architecture engineered for global performance and high reliability.',
    keywords: 'hosting services, enterprise cloud, reseller hosting, kvm vps, managed hosting solutions, website security, cloud infrastructure',
    type: 'website',
    schemaType: 'Service',
  },
  '/pricing': {
    title: 'Web Hosting & Cloud VPS Pricing Plans - Transparent & Scalable | Click2IT',
    description: 'Affordable, transparent pricing on NVMe cPanel hosting, KVM Cloud VPS, and domain registrations. Zero setup fees, instant activation, and multiple secure payment methods.',
    keywords: 'web hosting price, cloud vps pricing, cheap nvme hosting, domain pricing list, cpanel hosting plans',
    type: 'website',
    schemaType: 'Service',
  },
  '/hosting/pricing': {
    title: 'Web Hosting & Cloud VPS Pricing Plans - Transparent & Scalable | Click2IT',
    description: 'Affordable, transparent pricing on NVMe cPanel hosting, KVM Cloud VPS, and domain registrations. Zero setup fees, instant activation, and multiple secure payment methods.',
    keywords: 'web hosting price, cloud vps pricing, cheap nvme hosting, domain pricing list, cpanel hosting plans',
    type: 'website',
    schemaType: 'Service',
  },
  '/vps': {
    title: 'KVM Cloud VPS Servers - Dedicated NVMe, Full Root Access & 1Gbps | Click2IT',
    description: 'Deploy enterprise KVM Cloud VPS servers with pure NVMe RAID-10 storage, dedicated IPv4, 1Gbps uplink, full root SSH & Windows RDP access, and guaranteed CPU/RAM resources.',
    keywords: 'kvm cloud vps, linux vps, windows vps, high iops nvme vps, root access vps, cheap cloud server, unmetered bandwidth vps, bdix vps',
    type: 'product',
    schemaType: 'Product',
    faqs: [
      {
        question: 'What virtualization technology is used for Click2IT VPS servers?',
        answer: 'We use kernel-based virtual machines (KVM) with strict resource isolation. Unlike container-based solutions, KVM ensures your CPU, RAM, and NVMe disk performance are 100% dedicated to your instance.'
      },
      {
        question: 'Do I get full root access and can I install my preferred OS?',
        answer: 'Yes. You receive complete root/administrator privileges with SSH key authentication on Linux (Ubuntu, Debian, AlmaLinux, Rocky Linux) and Administrator RDP access on Windows Server templates.'
      },
      {
        question: 'What network speed and bandwidth are included with KVM VPS?',
        answer: 'Each VPS instance connects to a high-speed 1Gbps to 10Gbps redundant network interface with high-bandwidth allocations and low-latency worldwide routing.'
      }
    ]
  },
  '/hosting/vps': {
    title: 'KVM Cloud VPS Servers - Dedicated NVMe, Full Root Access & 1Gbps | Click2IT',
    description: 'Deploy enterprise KVM Cloud VPS servers with pure NVMe RAID-10 storage, dedicated IPv4, 1Gbps uplink, full root SSH & Windows RDP access, and guaranteed CPU/RAM resources.',
    keywords: 'kvm cloud vps, linux vps, windows vps, high iops nvme vps, root access vps, cheap cloud server, unmetered bandwidth vps, bdix vps',
    type: 'product',
    schemaType: 'Product',
  },
  '/domain': {
    title: 'Domain Name Registration - Cheap .COM, .NET, .ORG & .BD Domains | Click2IT',
    description: 'Search and register domain names with instant DNS management, free WHOIS privacy protection, domain locking, and 24/7 support. Fast activation for .COM, .NET, .ORG, and .BD.',
    keywords: 'buy domain, domain registration, domain name search, cheap com domain, .net domain, .bd domain registration, domain transfer',
    type: 'product',
    schemaType: 'Product',
    faqs: [
      {
        question: 'How quickly does domain registration take to activate?',
        answer: 'Generic Top-Level Domains (.COM, .NET, .ORG, .XYZ) are registered and activated instantly via our automated registrar API within seconds of payment.'
      },
      {
        question: 'Is WHOIS privacy protection included with domain registration?',
        answer: 'Yes, Click2IT provides complimentary WHOIS privacy protection for all eligible TLDs to shield your personal contact details from spammers and identity scrapers.'
      }
    ]
  },
  '/hosting/domain': {
    title: 'Domain Name Registration - Cheap .COM, .NET, .ORG & .BD Domains | Click2IT',
    description: 'Search and register domain names with instant DNS management, free WHOIS privacy protection, domain locking, and 24/7 support. Fast activation for .COM, .NET, .ORG, and .BD.',
    keywords: 'buy domain, domain registration, domain name search, cheap com domain, .net domain, .bd domain registration, domain transfer',
    type: 'product',
    schemaType: 'Product',
  },
  '/domain/bd': {
    title: 'Official .BD Domain Registration & BTCL Partner in Bangladesh | Click2IT',
    description: 'Register official .com.bd, .net.bd, .org.bd, and .edu.bd domains with fast BTCL verification, automated paperwork support, and complete DNS management at Click2IT.',
    keywords: 'bd domain registration, buy bd domain, com bd domain, btcl domain partner, bangladesh domain, official bd domain registrar',
    type: 'product',
    schemaType: 'Product',
  },
  '/domain/transfer': {
    title: 'Domain Transfer with Free 1-Year Renewal & Zero Downtime | Click2IT',
    description: 'Transfer your existing domain to Click2IT seamlessly. Enjoy free 1-year registration extension, automated nameserver retention, zero downtime, and free WHOIS privacy.',
    keywords: 'transfer domain, domain migration, switch domain registrar, cheap domain transfer, free domain renewal',
    type: 'product',
    schemaType: 'Product',
  },
  '/domain/bulk': {
    title: 'Bulk Domain Search & Portfolio Registration Tool | Click2IT',
    description: 'Search and register multiple domain extensions simultaneously with our high-speed bulk domain tool. Ideal for brand protection, agencies, and domain investors.',
    keywords: 'bulk domain search, mass domain check, multiple domain registration, domain portfolio',
    type: 'product',
    schemaType: 'Product',
  },
  '/ssl': {
    title: 'SSL Certificates - 256-Bit HTTPS Encryption & Instant Issuance | Click2IT',
    description: 'Secure your website visitors with industry-grade Sectigo DV, Wildcard, and EV SSL certificates. Boost Google SEO rankings and enable trusted HTTPS green lock icon.',
    keywords: 'buy ssl certificate, sectigo ssl, wildcard ssl, cheap https certificate, website security, ssl installation',
    type: 'product',
    schemaType: 'Product',
    faqs: [
      {
        question: 'Why does my website need an SSL certificate?',
        answer: 'SSL encrypts data transmitted between visitors and your website, prevents man-in-the-middle attacks, removes the "Not Secure" browser warning, and is an official Google ranking factor for SEO.'
      }
    ]
  },
  '/status': {
    title: 'Real-Time Server Status & 99.9% Historical Cloud Uptime | Click2IT',
    description: 'Monitor real-time server operational metrics, network latency, node health, and scheduled maintenance announcements for Click2IT web hosting infrastructure.',
    keywords: 'server status, hosting uptime, cloud status, live network monitoring, click2it status',
    type: 'website',
    schemaType: 'WebPage',
  },
  '/support': {
    title: '24/7 Hosting Technical Support, Knowledgebase & Helpdesk | Click2IT',
    description: 'Need assistance? Access our 24/7 technical support helpdesk, cPanel knowledgebase, DNS configuration tutorials, and live ticket support system.',
    keywords: 'hosting support, cpanel helpdesk, technical assistance, support tickets, click2it support',
    type: 'website',
    schemaType: 'FAQPage',
  },
  '/about': {
    title: 'About Click2IT - Next-Generation Cloud & Web Hosting Solutions',
    description: 'Learn about Click2IT, our mission to provide high-speed, reliable NVMe web hosting, KVM Cloud VPS, and digital infrastructure with 24/7 technical excellence.',
    keywords: 'about click2it, hosting company, cloud infrastructure provider',
    type: 'website',
    schemaType: 'WebPage',
  },
  '/contact': {
    title: 'Contact Click2IT - 24/7 Sales & Technical Support Team',
    description: 'Get in touch with the Click2IT hosting and cloud solutions team. 24/7 live chat, ticket support, email, and phone assistance.',
    keywords: 'contact click2it, hosting phone number, support email, sales inquiry',
    type: 'website',
    schemaType: 'WebPage',
  },
  '/cart': {
    title: 'Hosting Cart & Order Summary | Click2IT',
    description: 'Review your selected web hosting, cloud VPS, or domain order with secure payment options.',
    keywords: 'cart, order summary',
    noindex: true,
  },
  '/checkout': {
    title: 'Secure Checkout | Click2IT',
    description: 'Complete your hosting order with instant service provisioning.',
    keywords: 'checkout, secure payment',
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

  const siteName = settings?.companyName || 'CLICK2IT Hosting & Cloud';
  const canonicalDomain = 'https://click2it.bd';

  // Dynamic values priority: Explicit prop -> Matched route config -> Default fallback
  const finalTitle = title || matchedRoute.title;
  const finalDescription = description || matchedRoute.description;
  const finalKeywords = keywords || matchedRoute.keywords;
  const finalType = type || matchedRoute.type || 'website';
  const finalNoindex = noindex !== undefined ? noindex : !!matchedRoute.noindex;

  // Canonical URL always points to the authoritative canonical domain https://click2it.bd
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const resolvedCanonical = canonicalUrl || `${canonicalDomain}${normalizedPath === '/' ? '' : normalizedPath}`;
  const currentFullUrl = `${canonicalDomain}${normalizedPath === '/' ? '' : normalizedPath}`;

  const defaultOgImage = `${canonicalDomain}/logo.png`;
  const finalImage = image || settings?.logoUrl || defaultOgImage;

  // 1. Organization Schema
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${canonicalDomain}/#organization`,
    'name': siteName,
    'alternateName': ['Click2IT', 'Click2IT BD', 'Click2IT Hosting'],
    'url': canonicalDomain,
    'logo': finalImage,
    'contactPoint': [
      {
        '@type': 'ContactPoint',
        'telephone': settings?.contactPhone || '+8809640887777',
        'contactType': 'Customer Support',
        'email': settings?.contactEmail || 'info@click2it.bd',
        'areaServed': ['Worldwide', 'BD'],
        'availableLanguage': ['English', 'Bengali'],
      },
      {
        '@type': 'ContactPoint',
        'telephone': settings?.contactPhone || '+8809640887777',
        'contactType': 'Technical Support',
        'email': 'support@click2it.bd',
        'areaServed': ['Worldwide', 'BD'],
        'availableLanguage': ['English', 'Bengali'],
      }
    ],
    'sameAs': [
      'https://www.facebook.com/click2itbd',
      'https://twitter.com/click2itbd',
      'https://linkedin.com/company/click2itbd',
    ],
  };

  // 2. WebSite Schema with Sitelinks SearchBox
  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${canonicalDomain}/#website`,
    'url': canonicalDomain,
    'name': siteName,
    'publisher': {
      '@id': `${canonicalDomain}/#organization`,
    },
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${canonicalDomain}/domain/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };

  // 3. Service / Product Schema
  const serviceSchema = {
    '@context': 'https://schema.org',
    '@type': matchedRoute.schemaType === 'Product' ? 'Product' : 'Service',
    'name': finalTitle,
    'description': finalDescription,
    'provider': {
      '@id': `${canonicalDomain}/#organization`,
    },
    'areaServed': [
      { '@type': 'AdministrativeArea', 'name': 'Worldwide' },
      { '@type': 'Country', 'name': 'Bangladesh' }
    ],
    'offers': {
      '@type': 'AggregateOffer',
      'priceCurrency': 'BDT',
      'lowPrice': '150',
      'highPrice': '18500',
      'offerCount': '24',
      'availability': 'https://schema.org/InStock',
    },
    'aggregateRating': {
      '@type': 'AggregateRating',
      'ratingValue': '4.9',
      'bestRating': '5',
      'ratingCount': '1280',
      'reviewCount': '890',
    },
  };

  // 4. FAQPage Schema if route has FAQs
  const routeFaqs = matchedRoute.faqs;
  const faqSchema = routeFaqs && routeFaqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': routeFaqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer,
      },
    })),
  } : null;

  const defaultSchemas: Record<string, any>[] = [orgSchema, websiteSchema, serviceSchema];
  if (faqSchema) {
    defaultSchemas.push(faqSchema);
  }

  const combinedSchemas = structuredData
    ? Array.isArray(structuredData)
      ? structuredData
      : [structuredData]
    : defaultSchemas;

  return (
    <Helmet>
      {/* Title */}
      <title>{finalTitle}</title>

      {/* Basic Metadata */}
      <meta name="title" content={finalTitle} />
      <meta name="description" content={finalDescription} />
      <meta name="keywords" content={finalKeywords} />
      <link rel="canonical" href={resolvedCanonical} />

      {/* Indexing Directive */}
      {finalNoindex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}

      {/* Multi-language / Alternate Hreflang Tags */}
      <link rel="alternate" hrefLang="x-default" href={resolvedCanonical} />
      <link rel="alternate" hrefLang="en" href={resolvedCanonical} />
      <link rel="alternate" hrefLang="bn" href={resolvedCanonical} />

      {/* OpenGraph / Facebook Tags */}
      <meta property="og:type" content={finalType} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:image:secure_url" content={finalImage} />
      <meta property="og:url" content={currentFullUrl} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:locale:alternate" content="bn_BD" />

      {/* Twitter Cards */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@click2itbd" />
      <meta name="twitter:creator" content="@click2itbd" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDescription} />
      <meta name="twitter:image" content={finalImage} />
      <meta name="twitter:url" content={currentFullUrl} />

      {/* Structured Data Scripts (Schema.org JSON-LD) */}
      {combinedSchemas.map((schemaObj, index) => (
        <script key={`schema-${index}`} type="application/ld+json">
          {JSON.stringify(schemaObj)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEOTags;
