import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '../ui/Button';

export default function HostingPlanComparison({ plans, billingCycle, onSelectPlan }) {
  if (!plans.length) return null;

  const monthlyPrice = (plan) => plan.price;
  const yearlyPrice = (plan) => plan.price * 10;
  const displayPrice = (plan) => (billingCycle === 'yearly' ? yearlyPrice(plan) : monthlyPrice(plan));

  const allFeatures = Array.from(new Set(plans.flatMap((plan) => plan.features || [])));

  const popularIds = plans.filter((p) => p.popular).map((p) => p.id);

  return (
    <div className="bg-white rounded-xl border border-[var(--c2i-line)] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-[var(--c2i-ink)] text-white text-xs uppercase">
            <tr>
              <th className="px-6 py-4">Feature</th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  className={`px-6 py-4 text-center ${
                    popularIds.includes(plan.id) ? 'bg-[var(--c2i-red)]/10' : ''
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <span className="text-base font-bold">{plan.name}</span>
                    {plan.popular && (
                      <span className="bg-[var(--c2i-red)] text-white px-2 py-0.5 rounded text-[10px] font-bold">
                        POPULAR
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c2i-line)]">
            <tr className="bg-[var(--c2i-paper)]">
              <td className="px-6 py-4 font-bold text-[var(--c2i-ink)]">Price</td>
              {plans.map((plan) => (
                <td
                  key={plan.id}
                  className={`px-6 py-4 text-center ${
                    popularIds.includes(plan.id) ? 'bg-[var(--c2i-red)]/5' : ''
                  }`}
                >
                  <div className="text-2xl font-bold text-[var(--c2i-red)]" style={{ fontFamily: 'var(--font-display)' }}>
                    ${displayPrice(plan).toFixed(2)}
                  </div>
                  <div className="text-xs text-[var(--c2i-ink-soft)]">
                    /{billingCycle === 'yearly' ? 'year' : 'month'}
                  </div>
                  {billingCycle === 'yearly' && (
                    <div className="mt-1">
                      <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold">
                        Save {Math.round((1 - 10 / 12) * 100)}%
                      </span>
                    </div>
                  )}
                </td>
              ))}
            </tr>
            {allFeatures.map((feature, idx) => (
              <tr key={idx} className="hover:bg-[var(--c2i-paper)] transition-colors">
                <td className="px-6 py-4 text-sm text-[var(--c2i-ink-soft)]">{feature}</td>
                {plans.map((plan) => {
                  const hasFeature = (plan.features || []).includes(feature);
                  const isPopular = popularIds.includes(plan.id);
                  return (
                    <td
                      key={plan.id}
                      className={`px-6 py-4 text-center ${
                        isPopular ? 'bg-[var(--c2i-red)]/5' : ''
                      }`}
                    >
                      {hasFeature ? (
                        <CheckCircle2 className="text-green-500 mx-auto" size={20} />
                      ) : (
                        <XCircle className="text-gray-300 mx-auto" size={20} />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td className="px-6 py-4" />
              {plans.map((plan) => (
                <td
                  key={plan.id}
                  className={`px-6 py-4 text-center ${
                    popularIds.includes(plan.id) ? 'bg-[var(--c2i-red)]/5' : ''
                  }`}
                >
                  <Button
                    onClick={() => onSelectPlan?.(plan.id)}
                    variant={plan.popular ? 'primary' : 'secondary'}
                    className="w-full"
                    size="sm"
                  >
                    Get Started
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
