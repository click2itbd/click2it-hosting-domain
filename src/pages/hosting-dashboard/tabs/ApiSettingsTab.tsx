import React from 'react';
import { HostingApiSettings } from '../../../components/admin/hosting/HostingApiSettings';

export function ApiSettingsTab({ state }) {
  if (state.activeTab !== 'api-settings') return null;
  
  return (
    <div className="w-full">
      <HostingApiSettings />
    </div>
  );
}
