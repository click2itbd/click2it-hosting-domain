import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export const WebsitePopup: React.FC = () => {
  const { settings } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [hasBeenShown, setHasBeenShown] = useState(false);

  useEffect(() => {
    if (!settings.popupEnabled || hasBeenShown) return;

    const timer = setTimeout(() => {
      // Check session storage to avoid showing multiple times in one session
      const shownInSession = sessionStorage.getItem('popup_shown');
      if (!shownInSession) {
        setIsOpen(true);
        setHasBeenShown(true);
        sessionStorage.setItem('popup_shown', 'true');
      }
    }, settings.popupDelay * 1000);

    return () => clearTimeout(timer);
  }, [settings.popupEnabled, settings.popupDelay, hasBeenShown]);

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
          >
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full text-gray-500 hover:text-gray-800 transition-all z-10 shadow-sm"
            >
              <X size={20} />
            </button>

            {settings.popupImageUrl && (
              <div className="h-64 overflow-hidden">
                <img
                  src={settings.popupImageUrl}
                  alt={settings.popupTitle}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}

            <div className={cn("p-8 text-center", !settings.popupImageUrl && "pt-12")}>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">{settings.popupTitle}</h2>
              <p className="text-gray-600 mb-8 leading-relaxed">
                {settings.popupMessage}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {settings.popupLink && (
                  <a
                    href={settings.popupLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-[#EF4444] text-white font-bold rounded-lg hover:bg-red-600 transition-all"
                  >
                    Learn More <ExternalLink size={18} />
                  </a>
                )}
                <button
                  onClick={handleClose}
                  className="px-8 py-3 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
