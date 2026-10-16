import React from 'react';
import { HostingApiSettings } from '../admin/HostingApiSettings';

export function ApiSettingsTab({ state }) {
  if (state.activeTab !== 'api-settings') return null;
  
  return (
    <div className="w-full">
      <HostingApiSettings />
    </div>
  );
}
