import React from 'react';
import { WebsiteSettingsModule } from '../admin/WebsiteSettingsModule';

export function WebsiteSettingsTab({ state }: { state?: any }) {
  if (state && state.activeTab !== 'website-settings') return null;

  return (
    <div className="w-full">
      <WebsiteSettingsModule />
    </div>
  );
}
