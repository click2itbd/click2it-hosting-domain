import React from 'react';
import { useHostingBillingState } from './useHostingBillingState';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { 
  DashboardTab, DomainSearchListTab, ServerAccountsTab, AllOrdersTab, TicketsTab,
  DomainOffersTab, DomainRenewalsTab, UsersTab, FinancialTab, SalesTab, ApiSettingsTab, ModuleTabs,
  BdDomainApplicationsTab, NameserverRequestsTab, SslCertificatesTab, DnsManagementTab
} from './tabs';

export function HostingBillingDashboard() {
  const state = useHostingBillingState();
  
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      <Sidebar state={state} />
      
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative w-full lg:w-[calc(100%-260px)]">
        <TopNavbar state={state} />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 scroll-smooth">
          <div className="max-w-[1600px] mx-auto w-full">
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
            <FinancialTab state={state} />
            <SalesTab state={state} />
            <ApiSettingsTab state={state} />
            <ModuleTabs state={state} />
          </div>
        </div>
      </main>
    </div>
  );
}






