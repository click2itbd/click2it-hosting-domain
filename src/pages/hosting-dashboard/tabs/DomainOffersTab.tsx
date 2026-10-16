import React from 'react';
import DomainOffers from '../../admin/tabs/hosting/DomainOffers';

export function DomainOffersTab({ state }) {
  if (state.activeTab !== 'domain-offers') return null;
  return (
    <div className="w-full">
      <DomainOffers />
    </div>
  );
}
