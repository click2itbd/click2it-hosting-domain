import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';

export const HostingPromoBanner: React.FC = () => {
  const { promoSettings } = useCart();

  if (!promoSettings || !promoSettings.isFreeDomainEnabled) return null;

  // Check validity dates
  const now = new Date();
  if (promoSettings.startDate && new Date(promoSettings.startDate) > now) return null;
  if (promoSettings.endDate && new Date(promoSettings.endDate) < now) return null;

  const bgGradient = promoSettings.bannerColor || 'from-blue-600 to-blue-800';
  const text = promoSettings.bannerText || 'Limited Time Offer! Get a FREE domain when you buy our selected Hosting plans.';

  return (
    <div className={`bg-gradient-to-r ${bgGradient} text-white`}>
      <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <span className="flex p-2 rounded-lg bg-white/20">
              <Sparkles className="h-5 w-5 text-white" />
            </span>
            <p className="font-bold text-sm sm:text-base">
              {text}
            </p>
          </div>
          <Link
            to="/hosting/domains"
            className="flex items-center gap-2 px-4 py-2 bg-white text-gray-900 font-bold rounded-full text-sm hover:bg-gray-50 transition-colors shrink-0 shadow-sm"
          >
            Claim Free Domain <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
};
