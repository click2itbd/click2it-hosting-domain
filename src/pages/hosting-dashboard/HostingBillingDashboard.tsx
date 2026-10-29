import React, { Suspense, lazy } from 'react';
import { useHostingBillingState } from './useHostingBillingState';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';

// Lazy load each dashboard tab so heavy modules, sub-components, charts, and tables
// are only downloaded when the admin actually views that tab.
const DashboardTab = lazy(() => import('./tabs/DashboardTab').then(m => ({ default: m.DashboardTab })));
const DomainSearchListTab = lazy(() => import('./tabs/DomainSearchListTab').then(m => ({ default: m.DomainSearchListTab })));
const ServerAccountsTab = lazy(() => import('./tabs/ServerAccountsTab').then(m => ({ default: m.ServerAccountsTab })));
const AllOrdersTab = lazy(() => import('./tabs/AllOrdersTab').then(m => ({ default: m.AllOrdersTab })));
const TicketsTab = lazy(() => import('./tabs/TicketsTab').then(m => ({ default: m.TicketsTab })));
const DomainOffersTab = lazy(() => import('./tabs/DomainOffersTab').then(m => ({ default: m.DomainOffersTab })));
const DomainRenewalsTab = lazy(() => import('./tabs/DomainRenewalsTab').then(m => ({ default: m.DomainRenewalsTab })));
const UsersTab = lazy(() => import('./tabs/UsersTab').then(m => ({ default: m.UsersTab })));
const FinancialTab = lazy(() => import('./tabs/FinancialTab').then(m => ({ default: m.FinancialTab })));
const SalesTab = lazy(() => import('./tabs/SalesTab').then(m => ({ default: m.SalesTab })));
const ApiSettingsTab = lazy(() => import('./tabs/ApiSettingsTab').then(m => ({ default: m.ApiSettingsTab })));
const ModuleTabs = lazy(() => import('./tabs/ModuleTabs').then(m => ({ default: m.ModuleTabs })));
const BdDomainApplicationsTab = lazy(() => import('./tabs/BdDomainApplicationsTab').then(m => ({ default: m.BdDomainApplicationsTab })));
const NameserverRequestsTab = lazy(() => import('./tabs/NameserverRequestsTab').then(m => ({ default: m.NameserverRequestsTab })));
const SslCertificatesTab = lazy(() => import('./tabs/SslCertificatesTab').then(m => ({ default: m.SslCertificatesTab })));
const DnsManagementTab = lazy(() => import('./tabs/DnsManagementTab').then(m => ({ default: m.DnsManagementTab })));
const WhatsAppCrmTab = lazy(() => import('./tabs/WhatsAppCrmTab').then(m => ({ default: m.WhatsAppCrmTab })));
const MetaCampaignsTab = lazy(() => import('./tabs/MetaCampaignsTab').then(m => ({ default: m.MetaCampaignsTab })));
const StaffHostsTab = lazy(() => import('./tabs/StaffHostsTab').then(m => ({ default: m.StaffHostsTab })));
const HostingCrmTab = lazy(() => import('./tabs/HostingCrmTab').then(m => ({ default: m.HostingCrmTab })));
const WebsiteSettingsTab = lazy(() => import('./tabs/WebsiteSettingsTab').then(m => ({ default: m.WebsiteSettingsTab })));

export function HostingBillingDashboard() {
  const state = useHostingBillingState();
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar state={state} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full lg:w-[calc(100%-260px)]">
        <TopNavbar state={state} />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto w-full">
            <Suspense fallback={
              <div className="flex items-center justify-center p-12 text-slate-500 font-medium">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3"></div>
                Loading dashboard view...
              </div>
            }>
              <DashboardTab state={state} />
              <DomainSearchListTab state={state} />
              <ServerAccountsTab state={state} />
              <AllOrdersTab state={state} />
              <TicketsTab state={state} />
              <DomainOffersTab state={state} />
              <DomainRenewalsTab state={state} />
              <BdDomainApplicationsTab state={state} />
              <NameserverRequestsTab state={state} />
              <SslCertificatesTab state={state} />
              <DnsManagementTab state={state} />
              <UsersTab state={state} />
              {state.activeTab === 'staff-hosts' && <StaffHostsTab state={state} />}
              {state.activeTab === 'hosting-crm' && <HostingCrmTab state={state} />}
              <FinancialTab state={state} />
              <SalesTab state={state} />
              <ApiSettingsTab state={state} />
              {state.activeTab === 'website-settings' && <WebsiteSettingsTab state={state} />}
              <ModuleTabs state={state} />
              {state.activeTab === 'whatsapp-crm' && <WhatsAppCrmTab state={state} />}
              {state.activeTab === 'meta-campaigns' && <MetaCampaignsTab state={state} />}
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
