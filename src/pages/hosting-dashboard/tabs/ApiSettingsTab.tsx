import React from 'react';
import { HostingApiSettings } from '../admin/HostingApiSettings';
import { EpsPaymentSettings } from '../admin/EpsPaymentSettings';
import { SystemConnectionStatus } from '../components/SystemConnectionStatus';

export function ApiSettingsTab({ state }) {
  if (state.activeTab !== 'api-settings') return null;
  
  return (
    <div className="w-full space-y-6">
      <SystemConnectionStatus onNavigateTab={state.setActiveTab} currentTab={state.activeTab} />
      <EpsPaymentSettings />
      <HostingApiSettings />
    </div>
  );
}
