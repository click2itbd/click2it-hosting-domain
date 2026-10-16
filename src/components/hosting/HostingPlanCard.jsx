import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button } from '../ui/Button';

export default function HostingPlanCard({ plan, billingCycle, onAddToCart }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const monthlyPrice = plan.price;
  const yearlyPrice = monthlyPrice * 10;
  const displayPrice = billingCycle === 'yearly' ? yearlyPrice : monthlyPrice;
  const savingsPercent = billingCycle === 'yearly' ? Math.round((1 - 10 / 12) * 100) : 0;

  const handleAddToCart = () => {
    if (onAddToCart) {
      onAddToCart();
      return;
    }

    const cycleLabel = billingCycle === 'yearly' ? 'Yearly' : 'Monthly';
    const product = {
      id: `hosting_${plan.id}`,
      name: `${plan.name} (${cycleLabel})`,
      description: plan.features.join(', '),
      price: displayPrice,
      category: 'Hosting & Domains',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'hosting',
      billingCycle: billingCycle,
    };
    addToCart(product);
    toast.success(`${plan.name} plan added to cart`);
    navigate('/hosting/cart');
  };

  const isPopular = plan.popular;

  return (
    <div
      className={`relative rounded-xl border p-8 flex flex-col h-full transition-all ${
        isPopular
          ? 'md:scale-105 border-[var(--c2i-red)] shadow-lg bg-white'
          : 'border-[var(--c2i-line)] bg-white hover:border-[var(--c2i-red)] hover:shadow-lg hover:-translate-y-1'
      }`}
    >
      {isPopular && (
        <div className="absolute -top-3 right-4">
          <span className="bg-[var(--c2i-red)] text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      <div className="flex-1">
        <h3 className="text-2xl font-bold mb-4 text-[var(--c2i-ink)]" style={{ fontFamily: 'var(--font-display)' }}>
          {plan.name}
        </h3>

        <div className="mb-6">
          <span className="text-4xl font-bold text-[var(--c2i-red)]" style={{ fontFamily: 'var(--font-display)' }}>
            ${displayPrice.toFixed(2)}
          </span>
          <span className="text-lg text-[var(--c2i-ink-soft)] ml-1">
            /{billingCycle === 'yearly' ? 'yr' : 'mo'}
          </span>
          {billingCycle === 'yearly' && savingsPercent > 0 && (
            <div className="mt-2">
              <span className="bg-green-50 text-green-700 px-2 py-1 rounded text-xs font-bold">
                Save {savingsPercent}%
              </span>
            </div>
          )}
        </div>

        <div className="mb-8 space-y-3 text-left">
          {plan.features?.map((feat, idx) => (
            <div key={idx} className="flex items-start gap-3 text-[var(--c2i-ink-soft)]">
              <CheckCircle2 size={18} className="text-[var(--c2i-red)] shrink-0 mt-0.5" />
              <span className="text-sm">{feat}</span>
            </div>
          ))}
        </div>
      </div>

      <Button
        onClick={handleAddToCart}
        variant={isPopular ? 'primary' : 'secondary'}
        className="w-full"
      >
        Get Started
      </Button>
    </div>
  );
}
