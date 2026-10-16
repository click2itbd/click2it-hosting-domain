import React from 'react';
import { 
  Globe, Server, FileText, HeadphonesIcon, TrendingUp, DollarSign, CheckCircle2, User, Search, RefreshCw, Plus, Edit2, Shield, ShieldOff, Trash2, ArrowUpRight
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { formatCurrency, cn } from '../../../lib/utils';
import SupportTickets from '../../admin/tabs/hosting/SupportTickets';
import HostingPlans from '../../admin/tabs/hosting/HostingPlans';
import { DomainPricingManager } from '../../../components/admin/hosting/DomainPricingManager';
import {
  PagesEditorModule, CategoriesModule, ExtraServicesModule, 
  AddonPackagesModule, PromoCodesModule, ServersModule, DomainRegistrarsModule,
  EmailTemplatesModule, WhatsAppSmsModule
} from '../modules';

export function ModuleTabs({ state }) {
  const {
    activeTab, setActiveTab, pendingDomainCount, pendingHostingCount, unpaidInvoicesCount,
    activeTicketsCount, thisMonthRevenue, lastMonthRevenue, dynamicPieData, totalOutstanding,
    totalPaid, selectedYear, setSelectedYear, yearOptions, areaData, orders, PAID_STATUSES, 
    tickets, domainQuery, setDomainQuery, handleDomainSearch, isSearchingDomain, domainResults,
    pagedDomainOrders, domainOrdersPages, domainOrderPage, setDomainOrderPage, domainStatusEdits,
    setDomainStatusEdits, saveDomainOrderStatus, savingDomainStatus, showNewAccountModal,
    setShowNewAccountModal, newAccountForm, setNewAccountForm, handleProvisionAccount,
    provisioningAccount, hostingAccounts, handleAccountAction, accountActionLoading,
    orderStatusFilter, setOrderStatusFilter, PENDING_STATUSES, pagedOrders, orderPages,
    orderPage, setOrderPage, orderStatusEdits, setOrderStatusEdits, saveOrderStatus,
    savingOrderStatus, userSearch, setUserSearch, filteredUsers, userRoleEdits, setUserRoleEdits,
    saveUserRole, savingUserRole, settingsFormData, setSettingsFormData, saveSettings
  } = state;

  return (
    <>
      {/*  */}
      {activeTab === 'pages-editor' && <PagesEditorModule />}
            {activeTab === 'categories' && <CategoriesModule />}
            {activeTab === 'plan-packages' && <HostingPlans />}
            {activeTab === 'extra-services' && <ExtraServicesModule />}
            {activeTab === 'addon-packages' && <AddonPackagesModule />}
            {activeTab === 'promo-codes' && <PromoCodesModule />}
            {activeTab === 'servers' && <ServersModule />}
            {activeTab === 'domain-pricing' && <DomainPricingManager setActiveTab={setActiveTab} />}
            {activeTab === 'domain-registrars' && <DomainRegistrarsModule />}
            {activeTab === 'email-templates' && <EmailTemplatesModule />}
            {activeTab === 'whatsapp-sms' && <WhatsAppSmsModule />}
    </>
  );
}
