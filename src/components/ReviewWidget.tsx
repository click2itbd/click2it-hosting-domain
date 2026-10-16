import React, { useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { Star, ExternalLink, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';

export const ReviewWidget: React.FC = () => {
  const { settings } = useSettings();
  const widgetContainerRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
    if (settings.reviewWidgetEnabled && settings.reviewWidgetConfig && widgetContainerRef.current) {
      const sanitizedConfig = DOMPurify.sanitize(settings.reviewWidgetConfig, {
        ADD_TAGS: ['script'],
        ADD_ATTR: ['src', 'async', 'defer'],
      });
      
      if (sanitizedConfig.includes('<script')) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = sanitizedConfig;
        
        const scripts = tempDiv.getElementsByTagName('script');
        for (let i = 0; i < scripts.length; i++) {
          const script = document.createElement('script');
          const oldScript = scripts[i];
          
          if (oldScript.src) {
            script.src = oldScript.src;
          } else {
            script.textContent = oldScript.textContent;
          }
          
          if (oldScript.async) script.async = true;
          if (oldScript.defer) script.defer = true;
          
          document.body.appendChild(script);
        }
        
        widgetContainerRef.current.innerHTML = tempDiv.innerHTML;
      } else {
        widgetContainerRef.current.innerHTML = sanitizedConfig;
      }
    }
  }, [settings.reviewWidgetEnabled, settings.reviewWidgetConfig]);

  if (!settings.reviewWidgetEnabled) return null;

  return (
    <div className="mt-16 pt-16 border-t border-gray-100">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-[#081621] mb-2">Verified Reviews</h2>
          <p className="text-gray-500 text-sm">Aggregated from Amazon, Google, and official retailers</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-xs font-bold border border-green-100">
          <ShieldCheck size={16} />
          Verified Secure Integration
        </div>
      </div>

      <div ref={widgetContainerRef} className="min-h-[200px] bg-white rounded-xl shadow-sm border border-gray-100 p-8 flex flex-col items-center justify-center text-center">
        {/* Placeholder if no real widget config is provided */}
        {!settings.reviewWidgetConfig && (
          <div className="max-w-md">
            <div className="flex justify-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={24} className="fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <h3 className="text-lg font-bold text-[#081621] mb-2">Excellent 4.9/5</h3>
            <p className="text-gray-500 text-sm mb-6">Connect your Trustpilot, Elfsight, or Reviews.io widget in the admin settings to display your aggregated reviews here.</p>
            <div className="flex gap-4 justify-center">
              <div className="h-6 w-24 bg-gray-100 rounded"></div>
              <div className="h-6 w-24 bg-gray-100 rounded"></div>
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-6 flex justify-center gap-8 opacity-40 grayscale group-hover:grayscale-0 transition-all">
        <img src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg" className="h-4" alt="Amazon" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg" className="h-5" alt="Google" />
        <img src="https://upload.wikimedia.org/wikipedia/commons/4/4c/Trustpilot_Logo_%282022%29.svg" className="h-5" alt="Trustpilot" />
      </div>
    </div>
  );
};
