import React from 'react';
import DomainRenewals from '../../admin/tabs/hosting/DomainRenewals';

export function DomainRenewalsTab({ state }) {
  if (state.activeTab !== 'domain-renewals') return null;
  return (
    <div className="w-full">
      <DomainRenewals />
    </div>
  );
}
