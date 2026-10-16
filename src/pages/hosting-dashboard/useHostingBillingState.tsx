import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useSettings } from '../../context/SettingsContext';
import { useDashboardData, PENDING_STATUSES, PAID_STATUSES, COLORS } from './hooks/useDashboardData';
import { useDomainManagement } from './hooks/useDomainManagement';
import { useHostingAccountsManagement } from './hooks/useHostingAccountsManagement';
import { useOrderUserManagement } from './hooks/useOrderUserManagement';

function computeMonthRevenue(orders, year, month) {
  return orders
    .filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt.toDate ? o.createdAt.toDate() : o.createdAt);
      return d.getFullYear() === year && d.getMonth() === month && (PAID_STATUSES.includes(o.status) || o.paymentStatus === 'paid');
    })
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);
}

function computeAreaData(orders, year) {
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return MONTHS.map((m, idx) => {
    const monthOrders = orders.filter(o => {
      if (!o.createdAt) return false;
      const d = new Date(o.createdAt.toDate ? o.createdAt.toDate() : o.createdAt);
      return d.getFullYear() === year && d.getMonth() === idx;
    });
    const paid = monthOrders.filter(o => PAID_STATUSES.includes(o.status) || o.paymentStatus === 'paid').reduce((s, o) => s + (Number(o.total) || 0), 0);
    const invoiced = monthOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    return { name: m, paid, invoiced };
  });
}

function getMonthYear(dateVal) {
  if (!dateVal) return null;
  const d = new Date(dateVal.toDate ? dateVal.toDate() : dateVal);
  return { month: d.getMonth(), year: d.getFullYear() };
}

export function useHostingBillingState() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(new URLSearchParams(window.location.search).get('tab') || 'dashboard');
  const { settings, updateSettings } = useSettings();
  const [settingsFormData, setSettingsFormData] = useState(settings || {});
  
  const [loginAsUserId, setLoginAsUserId] = useState('');
  const [multiSettingOpen, setMultiSettingOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const yearOptions = [];
  for (let y = 2024; y <= currentYear + 1; y++) yearOptions.push(y);

  // 1. Data Hooks
  const {
    orders, setOrders,
    domainOrders, setDomainOrders,
    hostingAccounts, setHostingAccounts,
    tickets, setTickets,
    users, setUsers,
    loading
  } = useDashboardData();

  // 2. Feature Hooks
  const domainState = useDomainManagement(domainOrders, setDomainOrders);
  const hostingState = useHostingAccountsManagement(hostingAccounts, setHostingAccounts);
  const orderUserState = useOrderUserManagement(orders, setOrders, users, setUsers);

  // 3. Computed Stats
  const unpaidInvoicesCount = orders.filter(o => PENDING_STATUSES.includes(o.status)).length;
  const activeTicketsCount = tickets.filter(t => t.status !== 'closed' && t.status !== 'answered').length;
  const totalOutstanding = orders.filter(o => PENDING_STATUSES.includes(o.status)).reduce((a, o) => a + (Number(o.total) || 0), 0);
  const totalPaid = orders.filter(o => PAID_STATUSES.includes(o.status) || o.paymentStatus === 'paid').reduce((a, o) => a + (Number(o.total) || 0), 0);

  const pendingDomainCount = domainOrders.filter(d => d.status === 'pending').length;
  const pendingHostingCount = orders.filter(o => PENDING_STATUSES.includes(o.status) || o.paymentStatus === 'pending').length;

  const dynamicPieData = [
    { name: 'Outstanding', value: totalOutstanding },
    { name: 'Paid', value: totalPaid },
  ];

  const areaData = useMemo(() => computeAreaData(orders, selectedYear), [orders, selectedYear]);

  const now = new Date();
  const thisMonthRevenue = useMemo(() => computeMonthRevenue(orders, now.getFullYear(), now.getMonth()), [orders]);
  const lastMonthRevenue = useMemo(() => {
    const lm = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const ly = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return computeMonthRevenue(orders, ly, lm);
  }, [orders]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings(settingsFormData);
      toast.success('API Settings saved successfully!');
    } catch {
      toast.error('Failed to update API settings');
    }
  };

  return {
    navigate,
    sidebarOpen, setSidebarOpen,
    activeTab, setActiveTab,
    loginAsUserId, setLoginAsUserId,
    multiSettingOpen, setMultiSettingOpen,
    financialOpen, setFinancialOpen,
    selectedYear, setSelectedYear, yearOptions,
    settingsFormData, setSettingsFormData, saveSettings: handleSaveSettings,
    
    orders, domainOrders, hostingAccounts, tickets, users, loading,
    
    unpaidInvoicesCount, activeTicketsCount, totalOutstanding, totalPaid,
    pendingDomainCount, pendingHostingCount, dynamicPieData,
    areaData, thisMonthRevenue, lastMonthRevenue,
    
    PENDING_STATUSES, PAID_STATUSES, COLORS,
    
    ...domainState,
    ...hostingState,
    ...orderUserState
  };
}
