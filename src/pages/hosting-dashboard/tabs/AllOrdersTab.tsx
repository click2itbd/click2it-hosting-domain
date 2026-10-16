import React from 'react';
import HostingOrders from '../../admin/tabs/hosting/HostingOrders';

export function AllOrdersTab({ state }) {
  if (state.activeTab !== 'all-orders') return null;
  return (
    <div className="w-full">
      <HostingOrders />
    </div>
  );
}
