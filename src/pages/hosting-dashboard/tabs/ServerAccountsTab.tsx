import React from 'react';
import ActiveHostingAccounts from '../../admin/tabs/hosting/ActiveHostingAccounts';

export function ServerAccountsTab({ state }) {
  if (state.activeTab !== 'server-accounts') return null;
  return (
    <div className="w-full">
      <ActiveHostingAccounts />
    </div>
  );
}
