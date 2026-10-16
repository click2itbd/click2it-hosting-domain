import type { Product, Order, Customer, Vendor, Transaction, TransactionCategory, NavigationMenu, UserProfile, Campaign, DiscountCode, HostingPlan, HostingService, Employee, EmployeeLeave, EmployeeSalary, PaymentAccount, SoldSerial, ServiceRecord } from '../../types';

export type AdminTab =
  | 'dashboard'
  | 'analytics'
  | 'inventory'
  | 'orders'
  | 'sales'
  | 'quotations'
  | 'purchases'
  | 'purchase_return'
  | 'sale_return'
  | 'customers'
  | 'vendors'
  | 'transactions'
  | 'menus'
  | 'reports'
  | 'all_reports'
  | 'customer_receive_report'
  | 'ledger'
  | 'manual_income'
  | 'manual_expense'
  | 'tx_categories'
  | 'users'
  | 'campaigns'
  | 'discountCodes'
  | 'hostingPlans'
  | 'hostingServices'
  | 'settings'
  | 'services'
  | 'employees'
  | 'leave'
  | 'salary'
  | 'conveyance'
  | 'deposits_withdrawals'
  | 'account_balance'
  | 'account_statement'
  | 'balance_sheet'
  | 'trial_balance'
  | 'transaction_history'
  | 'payment_accounts'
  | 'crm'
  | 'tasks'
  | 'support_tickets';

export interface AdminSharedState {
  products: Product[];
  orders: Order[];
  customers: Customer[];
  vendors: Vendor[];
  transactions: Transaction[];
  transactionCategories: TransactionCategory[];
  menus: NavigationMenu[];
  conveyances: any[];
  users: UserProfile[];
  campaigns: Campaign[];
  discountCodes: DiscountCode[];
  hostingPlans: HostingPlan[];
  hostingServices: HostingService[];
  employees: Employee[];
  employeeLeaves: EmployeeLeave[];
  employeeSalaries: EmployeeSalary[];
  paymentAccounts: PaymentAccount[];
  soldSerials: SoldSerial[];
  serviceRecords: ServiceRecord[];
  loading: boolean;
}

export interface AdminRefreshFunctions {
  refreshProducts: () => Promise<void>;
  refreshOrders: () => Promise<void>;
  refreshCustomers: () => Promise<void>;
  refreshVendors: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  refreshTransactionCategories: () => Promise<void>;
  refreshMenus: () => Promise<void>;
  refreshConveyances: () => Promise<void>;
  refreshUsers: () => Promise<void>;
  refreshCampaigns: () => Promise<void>;
  refreshDiscountCodes: () => Promise<void>;
  refreshHostingPlans: () => Promise<void>;
  refreshHostingServices: () => Promise<void>;
  refreshEmployees: () => Promise<void>;
  refreshEmployeeLeaves: () => Promise<void>;
  refreshEmployeeSalaries: () => Promise<void>;
  refreshPaymentAccounts: () => Promise<void>;
  refreshSoldSerials: () => Promise<void>;
  refreshServiceRecords: () => Promise<void>;
  refreshAll: () => Promise<void>;
}
