import React from 'react';
import { cn } from '../../lib/utils';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  FileText,
  ShoppingBag,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Download,
  Upload,
  Layers,
  Cpu,
  Users,
  Briefcase,
  CreditCard,
  Menu as MenuIcon,
  ChevronRight,
  Settings,
  Search,
  AlertTriangle,
  Mail,
  Phone,
  MessageCircle,
  Send,
  List,
  Ticket,
  ShieldAlert,
  Receipt,
  Server,
  Edit,
  X,
  ArrowLeftRight,
  ShieldCheck,
  ShoppingCart,
  Tag,
  Percent,
  LogOut,
  User,
  Book,
  CheckSquare,
  ArrowLeft,
  LifeBuoy,
  Activity,
  BarChart2,
  Monitor,
  Fan,
  Keyboard,
  Mouse,
  Speaker,
  Headphones,
  Wifi,
  BatteryCharging,
  HardDrive,
  Plug,
  Zap,
  Database,
  Star,
  ArrowRight,
} from 'lucide-react';

interface AdminSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isAdmin: boolean;
  isManager: boolean;
  isStaff?: boolean;
  hasPermission: (permission: string) => boolean;
  navigate: (path: string) => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeTab,
  setActiveTab,
  isAdmin,
  isManager,
  isStaff,
  hasPermission,
  navigate,
}) => {
  return (
    <aside className="w-[260px] bg-white border-r border-gray-200 flex flex-col h-screen sticky top-0 overflow-y-auto shrink-0 shadow-sm z-20 hidden lg:flex">
      <div className="h-[60px] flex items-center px-6 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-[#0f172a]">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <ShoppingBag size={18} />
          </div>
          CLICK POS <span className="opacity-50 text-xs mt-1 border border-gray-200 px-1 rounded-full">+</span>
        </div>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        {/* Section 1 */}
        <div className="px-4 mb-2">
          <button onClick={() => setActiveTab('dashboard')} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors", activeTab === 'dashboard' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 font-medium hover:bg-gray-50")}>
            <Activity size={18} className={activeTab === 'dashboard' ? "text-blue-600" : "text-gray-400"} /> Overview
          </button>
          <button onClick={() => setActiveTab('analytics')} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors", activeTab === 'analytics' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 font-medium hover:bg-gray-50")}>
            <BarChart2 size={18} className={activeTab === 'analytics' ? "text-blue-600" : "text-gray-400"} /> Analytics
          </button>
          <button onClick={() => setActiveTab('inventory')} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors", activeTab === 'inventory' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 font-medium hover:bg-gray-50")}>
            <Package size={18} className={activeTab === 'inventory' ? "text-blue-600" : "text-gray-400"} /> Stock
          </button>
          {hasPermission('manage_inventory') && (
            <button onClick={() => setActiveTab('menus')} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors", activeTab === 'menus' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 font-medium hover:bg-gray-50")}>
              <Layers size={18} className={activeTab === 'menus' ? "text-blue-600" : "text-gray-400"} /> Categories
            </button>
          )}
          <button onClick={() => window.open('/pos', '_blank')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors text-gray-600 font-medium hover:bg-gray-50">
            <ShoppingCart size={18} className="text-gray-400" /> CLICK POS
          </button>
        </div>

        {/* Section 2: Sale & Customer */}
        <div className="px-4 mb-2">
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">Sale & Customer</div>
          {hasPermission('manage_orders') && (
            <button onClick={() => setActiveTab('sales')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'sales' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <ShoppingCart size={16} className={activeTab === 'sales' ? "text-blue-600" : "text-gray-400"} /> Sale
            </button>
          )}
          {hasPermission('manage_orders') && (
            <button onClick={() => setActiveTab('sale_return')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'sale_return' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <ArrowLeftRight size={16} className={activeTab === 'sale_return' ? "text-blue-600" : "text-gray-400"} /> Sale Return
            </button>
          )}
          <button onClick={() => setActiveTab('orders')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'orders' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
            <Receipt size={16} className={activeTab === 'orders' ? "text-blue-600" : "text-gray-400"} /> Orders & Docs
          </button>
          <button onClick={() => setActiveTab('customers')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'customers' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
            <Users size={16} className={activeTab === 'customers' ? "text-blue-600" : "text-gray-400"} /> Customer
          </button>
          <button onClick={() => setActiveTab('customer_due_list')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'customer_due_list' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
            <CreditCard size={16} className={activeTab === 'customer_due_list' ? "text-blue-600" : "text-gray-400"} /> Customer Due List
          </button>
          <button onClick={() => setActiveTab('quotations')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'quotations' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
            <FileText size={16} className={activeTab === 'quotations' ? "text-blue-600" : "text-gray-400"} /> Quotation System
          </button>
        </div>

        {/* Section 3: Purchase & Supplier */}
        <div className="px-4 mb-2">
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">Purchase & Supplier</div>
          {hasPermission('manage_inventory') && (
            <button onClick={() => setActiveTab('purchases')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'purchases' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <ShoppingBag size={16} className={activeTab === 'purchases' ? "text-blue-600" : "text-gray-400"} /> Purchase
            </button>
          )}
          {hasPermission('manage_inventory') && (
            <button onClick={() => setActiveTab('purchase_return')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'purchase_return' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <ArrowLeftRight size={16} className={activeTab === 'purchase_return' ? "text-blue-600" : "text-gray-400"} /> Purchase Return
            </button>
          )}
          <button onClick={() => setActiveTab('vendors')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'vendors' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
            <Briefcase size={16} className={activeTab === 'vendors' ? "text-blue-600" : "text-gray-400"} /> Supplier
          </button>
        </div>

        {/* Warranty */}
        <div className="px-4 mb-2">
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">Warranty & Servicing</div>
          {hasPermission('manage_services') && (
            <button onClick={() => setActiveTab('services')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'services' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <ShieldCheck size={16} className={activeTab === 'services' ? "text-blue-600" : "text-gray-400"} /> Warranty & Service
            </button>
          )}
        </div>

        {/* Accounting */}
        <div className="px-4 mb-2">
          <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">Accounting</div>
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('payment_accounts')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'payment_accounts' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <CreditCard size={16} className={activeTab === 'payment_accounts' ? "text-blue-600" : "text-gray-400"} /> Payment Account
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('ledger')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'ledger' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <Book size={16} className={activeTab === 'ledger' ? "text-blue-600" : "text-gray-400"} /> Ledger
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('manual_income')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'manual_income' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <Download size={16} className={activeTab === 'manual_income' ? "text-blue-600" : "text-gray-400"} /> Income
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('manual_expense')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'manual_expense' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <Upload size={16} className={activeTab === 'manual_expense' ? "text-blue-600" : "text-gray-400"} /> Expense
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('tx_categories')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'tx_categories' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <List size={16} className={activeTab === 'tx_categories' ? "text-blue-600" : "text-gray-400"} /> Categories
            </button>
          )}
          {hasPermission('manage_reports') && (
            <button onClick={() => setActiveTab('reports')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'reports' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <FileText size={16} className={activeTab === 'reports' ? "text-blue-600" : "text-gray-400"} /> Sales Accounting
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('deposits_withdrawals')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'deposits_withdrawals' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <ArrowLeftRight size={16} className={activeTab === 'deposits_withdrawals' ? "text-blue-600" : "text-gray-400"} /> Deposit/Withdraw
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('account_balance')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'account_balance' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <CreditCard size={16} className={activeTab === 'account_balance' ? "text-blue-600" : "text-gray-400"} /> Account Balance
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('account_statement')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'account_statement' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <FileText size={16} className={activeTab === 'account_statement' ? "text-blue-600" : "text-gray-400"} /> Account Statement
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('balance_sheet')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'balance_sheet' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <Book size={16} className={activeTab === 'balance_sheet' ? "text-blue-600" : "text-gray-400"} /> Balance Sheet
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('trial_balance')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'trial_balance' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <Book size={16} className={activeTab === 'trial_balance' ? "text-blue-600" : "text-gray-400"} /> Trial Balance
            </button>
          )}
          {hasPermission('manage_finances') && (
            <button onClick={() => setActiveTab('transaction_history')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'transaction_history' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <List size={16} className={activeTab === 'transaction_history' ? "text-blue-600" : "text-gray-400"} /> Transaction History
            </button>
          )}
          {hasPermission('manage_reports') && (
            <button onClick={() => setActiveTab('all_reports')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'all_reports' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <FileText size={16} className={activeTab === 'all_reports' ? "text-blue-600" : "text-gray-400"} /> All Reports
            </button>
          )}
        </div>

        {/* Marketing */}
        {(!isStaff || isAdmin || isManager) && (
          <div className="px-4 mb-2">
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">Marketing</div>
            {hasPermission('manage_marketing') && (
              <button onClick={() => setActiveTab('campaigns')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'campaigns' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Tag size={16} className={activeTab === 'campaigns' ? "text-blue-600" : "text-gray-400"} /> Marketing
              </button>
            )}
            {hasPermission('manage_marketing') && (
              <button onClick={() => setActiveTab('discountCodes')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'discountCodes' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Percent size={16} className={activeTab === 'discountCodes' ? "text-blue-600" : "text-gray-400"} /> Discounts
              </button>
            )}
          </div>
        )}

        {/* HR */}
        {(!isStaff || isAdmin || isManager) && (
          <div className="px-4 mb-2">
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">Human Resource</div>
            {hasPermission('manage_users') && (
              <button onClick={() => setActiveTab('users')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'users' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Users size={16} className={activeTab === 'users' ? "text-blue-600" : "text-gray-400"} /> App Access
              </button>
            )}
            {hasPermission('manage_hr') && (
              <>
                <button onClick={() => setActiveTab('employees')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'employees' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                  <Briefcase size={16} className={activeTab === 'employees' ? "text-blue-600" : "text-gray-400"} /> Employees
                </button>
                <button onClick={() => setActiveTab('leave')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'leave' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                  <CheckCircle size={16} className={activeTab === 'leave' ? "text-blue-600" : "text-gray-400"} /> Leave
                </button>
                <button onClick={() => setActiveTab('salary')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'salary' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                  <CreditCard size={16} className={activeTab === 'salary' ? "text-blue-600" : "text-gray-400"} /> Salary Overview
                </button>
              </>
            )}
          </div>
        )}

        {/* Other */}
        {(!isStaff || isAdmin || isManager) && (
          <div className="px-4 mb-6">
            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">Other</div>

            <button onClick={() => setActiveTab('crm')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'crm' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <Users size={16} className={activeTab === 'crm' ? "text-blue-600" : "text-gray-400"} /> CRM System
            </button>
            <button onClick={() => setActiveTab('tasks')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'tasks' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <CheckSquare size={16} className={activeTab === 'tasks' ? "text-blue-600" : "text-gray-400"} /> To-Do List
            </button>
            <button onClick={() => setActiveTab('support_tickets')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'support_tickets' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
              <LifeBuoy size={16} className={activeTab === 'support_tickets' ? "text-blue-600" : "text-gray-400"} /> Support Tickets
            </button>
            {hasPermission('manage_services') && (
              <button onClick={() => setActiveTab('hostingPlans')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'hostingPlans' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Server size={16} className={activeTab === 'hostingPlans' ? "text-blue-600" : "text-gray-400"} /> Hosting Plans
              </button>
            )}
            {hasPermission('manage_services') && (
              <button onClick={() => setActiveTab('hostingServices')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'hostingServices' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Server size={16} className={activeTab === 'hostingServices' ? "text-blue-600" : "text-gray-400"} /> Hosting Services
              </button>
            )}
            {isAdmin && (
              <button onClick={() => setActiveTab('hosting_api_settings')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'hosting_api_settings' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Plug size={16} className={activeTab === 'hosting_api_settings' ? "text-blue-600" : "text-gray-400"} /> API Settings
              </button>
            )}
            {hasPermission('manage_services') && (
              <button onClick={() => setActiveTab('domainOrders')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'domainOrders' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Server size={16} className={activeTab === 'domainOrders' ? "text-blue-600" : "text-gray-400"} /> Domain Orders
              </button>
            )}
            {(isAdmin || isManager) && (
              <button onClick={() => setActiveTab('provisioningLogs')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'provisioningLogs' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Server size={16} className={activeTab === 'provisioningLogs' ? "text-blue-600" : "text-gray-400"} /> Provisioning Logs
              </button>
            )}
            {hasPermission('manage_services') && (
              <button onClick={() => setActiveTab('hostingAccounts')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'hostingAccounts' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Server size={16} className={activeTab === 'hostingAccounts' ? "text-blue-600" : "text-gray-400"} /> Hosting Accounts
              </button>
            )}
            {hasPermission('manage_services') && (
              <button onClick={() => setActiveTab('domainPricing')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'domainPricing' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Server size={16} className={activeTab === 'domainPricing' ? "text-blue-600" : "text-gray-400"} /> Domain Pricing
              </button>
            )}
            {hasPermission('manage_settings') && (
              <button onClick={() => setActiveTab('settings')} className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors", activeTab === 'settings' ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50")}>
                <Settings size={16} className={activeTab === 'settings' ? "text-blue-600" : "text-gray-400"} /> Settings
              </button>
            )}
            {isAdmin && (
              <button onClick={() => navigate('/admin/billing')} className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-purple-600 font-bold hover:bg-purple-50">
                <ArrowLeftRight size={16} className="text-purple-600" /> Web Host Billing
              </button>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
