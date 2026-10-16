import React, { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

export const TrackingScripts: React.FC = () => {
  const { settings } = useSettings();

  useEffect(() => {
    if (!settings) return;

    // --- Google Analytics (GA4) ---
    if (settings.googleAnalyticsId) {
      const gaId = settings.googleAnalyticsId;
      if (!document.getElementById('ga-script')) {
        const script = document.createElement('script');
        script.id = 'ga-script';
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
        document.head.appendChild(script);

        const script2 = document.createElement('script');
        script2.id = 'ga-inline';
        script2.innerHTML = `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `;
        document.head.appendChild(script2);
      }
    } else {
      // Remove if disabled
      const el1 = document.getElementById('ga-script');
      const el2 = document.getElementById('ga-inline');
      if (el1) el1.remove();
      if (el2) el2.remove();
    }

    // --- Facebook Pixel ---
    if (settings.facebookPixelId) {
      const fbId = settings.facebookPixelId;
      if (!document.getElementById('fb-pixel')) {
        const script = document.createElement('script');
        script.id = 'fb-pixel';
        script.innerHTML = `
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${fbId}');
          fbq('track', 'PageView');
        `;
        document.head.appendChild(script);
      }
    } else {
      const el = document.getElementById('fb-pixel');
      if (el) el.remove();
    }

    // --- Google Tag Manager (GTM) ---
    if (settings.googleTagManagerId) {
      const gtmId = settings.googleTagManagerId;
      if (!document.getElementById('gtm-script')) {
        const script = document.createElement('script');
        script.id = 'gtm-script';
        script.innerHTML = `
          (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
          new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
          j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
          'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
          })(window,document,'script','dataLayer','${gtmId}');
        `;
        document.head.appendChild(script);
      }
    } else {
      const el = document.getElementById('gtm-script');
      if (el) el.remove();
    }
  }, [settings?.googleAnalyticsId, settings?.facebookPixelId, settings?.googleTagManagerId]);

  return null;
};
