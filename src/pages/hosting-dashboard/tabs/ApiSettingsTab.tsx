import React from 'react';
import { HostingApiSettings } from '../admin/HostingApiSettings';
import { EpsPaymentSettings } from '../admin/EpsPaymentSettings';
import { CloudLinuxApiSettings } from '../admin/CloudLinuxApiSettings';
import { SystemConnectionStatus } from '../components/SystemConnectionStatus';

export function ApiSettingsTab({ state }) {
  if (state.activeTab !== 'api-settings') return null;
  
  return (
    <div className="w-full space-y-6">
      <SystemConnectionStatus onNavigateTab={state.setActiveTab} currentTab={state.activeTab} />
      <EpsPaymentSettings />
      <HostingApiSettings />
      <CloudLinuxApiSettings />
    </div>
  );
}
