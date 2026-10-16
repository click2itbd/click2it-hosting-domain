import React, { useState } from 'react';
import { CheckCircle2, XCircle, ShoppingCart, Sparkles } from 'lucide-react';
import { DomainAvailabilityResult, DomainPricing } from '../../services/hostingApi';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { cn } from '../../lib/utils';

interface DomainResultCardProps {
  result: DomainAvailabilityResult;
  pricing: DomainPricing | undefined;
  onSearchAlternative: (domain: string) => void;
}

export const DomainResultCard: React.FC<DomainResultCardProps> = ({ result, pricing, onSearchAlternative }) => {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [selectedYears, setSelectedYears] = useState<number>(1);

  const quotedPrice = Number(result.priceBdt ?? result.price ?? pricing?.registerPrice);
  const baseAnnualPrice = Number.isFinite(quotedPrice) && quotedPrice > 0 ? quotedPrice : null;
  const totalPrice = (baseAnnualPrice || 0) * selectedYears;

  const handleAddToCart = () => {
    if (baseAnnualPrice === null) {
      toast.error('Live Openprovider pricing is unavailable for this domain.');
      return;
    }
    const tld = result.domain.split('.').pop() || '';
    const product = {
      id: `domain_${result.domain}_${selectedYears}yr`,
      name: `Domain Registration - ${result.domain} (${selectedYears} ${selectedYears === 1 ? 'Year' : 'Years'})`,
      description: `${selectedYears} Year${selectedYears > 1 ? 's' : ''} Registration (Includes WHOIS Privacy)`,
      price: totalPrice,
      category: 'Hosting & Domains',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'domain' as const,
      domainTld: tld,
      termYears: selectedYears,
      baseAnnualPrice: baseAnnualPrice,
    };
    addToCart(product as any);
    toast.success(`Domain ${result.domain} (${selectedYears} Year${selectedYears > 1 ? 's' : ''}) added to cart!`);
    navigate('/hosting/cart');
  };

  const isAvailable = result.available;
  const baseName = result.domain.substring(0, result.domain.lastIndexOf('.'));
  const tld = result.domain.substring(result.domain.lastIndexOf('.'));

  return (
    <div 
      className={cn(
        "p-5 rounded-2xl border flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all duration-300",
        isAvailable 
          ? "bg-[#0b1b16] border-green-500/30 shadow-[0_4px_30px_rgba(34,197,94,0.05)]" 
          : "bg-[#1b0b0b] border-red-500/30 shadow-[0_4px_30px_rgba(239,68,68,0.05)]"
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center border shrink-0",
          isAvailable 
            ? "bg-green-500/10 border-green-500/50" 
            : "bg-red-500/10 border-red-500/50"
        )}>
          {isAvailable ? (
            <CheckCircle2 className="text-green-500 shadow-green-500/50 drop-shadow-lg" size={24} />
          ) : (
            <XCircle className="text-red-500 shadow-red-500/50 drop-shadow-lg" size={24} />
          )}
        </div>
        
        <div>
          <div className="flex items-baseline gap-0.5">
            <span className="font-semibold text-xl text-gray-200">{baseName}</span>
            <span className="font-bold text-xl text-white">{tld}</span>
          </div>
          <div className="text-sm">
            {isAvailable ? (
              <span className="text-green-400 font-medium tracking-wide">is available!</span>
            ) : (
              <span className="text-red-400 font-medium tracking-wide">already taken</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 sm:gap-6">
        {isAvailable && (
          <div className="flex items-center gap-3">
            {/* Multi-Year Dropdown */}
            <div className="relative">
              <select
                value={selectedYears}
                onChange={(e) => setSelectedYears(Number(e.target.value))}
                className="bg-gray-800 text-white text-xs font-bold px-3 py-2 rounded-xl border border-gray-700 outline-none cursor-pointer hover:border-green-500 transition-colors"
              >
                <option value={1}>1 Year</option>
                <option value={2}>2 Years</option>
                <option value={3}>3 Years</option>
                <option value={4}>4 Years</option>
                <option value={5}>5 Years</option>
              </select>
            </div>

            {/* Price display */}
            <div className="text-right">
              <div className="font-bold text-xl text-white">
                {baseAnnualPrice === null ? 'Price unavailable' : `৳${totalPrice.toLocaleString()}`}
              </div>
              <div className="text-xs text-gray-400">
                for {selectedYears} {selectedYears === 1 ? 'year' : 'years'}
              </div>
            </div>
          </div>
        )}
        
        {isAvailable && (
          <button
            onClick={handleAddToCart}
            disabled={baseAnnualPrice === null}
            className="bg-[#10b981] hover:bg-[#059669] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:-translate-y-0.5"
          >
            <ShoppingCart size={16} /> Add to Cart
          </button>
        )}
      </div>
    </div>
  );
};
