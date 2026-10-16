import React from 'react';
import { BdDomainApplicationsManager } from './BdDomainApplicationsManager';

export function BdDomainApplicationsTab({ state }: { state: any }) {
  if (state.activeTab !== 'bd-domain-apps') return null;
  return (
    <div className="w-full">
      <BdDomainApplicationsManager />
    </div>
  );
}
