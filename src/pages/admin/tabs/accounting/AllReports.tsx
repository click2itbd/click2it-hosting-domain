import React, { useState, useMemo } from "react";
import {
  FileText,
  ShoppingBag,
  TrendingUp,
  Users,
  Package,
  Truck,
  DollarSign,
  BarChart2,
  ArrowRight,
  Search,
  AlertCircle,
  RotateCcw,
  CreditCard,
  Wallet,
  Briefcase,
  ChevronRight,
  Medal,
  Activity,
  ShieldCheck,
  Clock,
  BookOpen,
  Layers,
  Sparkles,
  Award,
  Filter,
  X,
  Calculator,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "../../../../lib/utils";

interface AllReportsProps {
  setActiveTab: (tab: string) => void;
}

interface ReportItem {
  name: string;
  description: string;
  icon: React.ReactNode;
  tab: string;
  badge?: string;
  badgeColor?: string;
  color: string;
  bgColor: string;
  borderColor: string;
  isPopular?: boolean;
}

interface ReportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  reports: ReportItem[];
}

export const AllReports: React.FC<AllReportsProps> = ({ setActiveTab }) => {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories: ReportCategory[] = useMemo(() => [
    {
      id: "sales",
      title: "Sales & Revenue",
      description: "Invoices, receivables, sales returns, quotations & customer loyalty",
      icon: <ShoppingBag size={18} className="text-blue-600" />,
      color: "text-blue-600",
      reports: [
        {
          name: "Sales Report",
          description: "All sales invoices, challans & receipts with date range, customer and payment status filters.",
          icon: <ShoppingBag size={20} />,
          tab: "reports",
          badge: "Live",
          badgeColor: "bg-emerald-100 text-emerald-800",
          color: "text-blue-700",
          bgColor: "bg-blue-50/50",
          borderColor: "border-blue-200",
          isPopular: true,
        },
        {
          name: "Profit & Margin Analytics",
          description: "Live revenue trajectory, wholesale product COGS, net margin % and customer profitability rankings.",
          icon: <TrendingUp size={20} />,
          tab: "analytics",
          badge: "Analytics",
          badgeColor: "bg-purple-100 text-purple-800",
          color: "text-purple-700",
          bgColor: "bg-purple-50/50",
          borderColor: "border-purple-200",
          isPopular: true,
        },
        {
          name: "Customer Due List",
          description: "Outstanding customer balances, due aging, opening balance ledger & WhatsApp reminders.",
          icon: <AlertCircle size={20} />,
          tab: "customer_due_list",
          badge: "Receivables",
          badgeColor: "bg-rose-100 text-rose-800",
          color: "text-rose-700",
          bgColor: "bg-rose-50/50",
          borderColor: "border-rose-200",
          isPopular: true,
        },
        {
          name: "Customer Receive Report",
          description: "Collection log of all payments received from customers across Cash, Bank & MFS accounts.",
          icon: <CreditCard size={20} />,
          tab: "customer_receive_report",
          badge: "Live",
          badgeColor: "bg-emerald-100 text-emerald-800",
          color: "text-emerald-700",
          bgColor: "bg-emerald-50/50",
          borderColor: "border-emerald-200",
        },
        {
          name: "Sale Return Report",
          description: "Customer product returns, restocked units, credit memo adjustments & cash refund vouchers.",
          icon: <RotateCcw size={20} />,
          tab: "sale_return",
          badge: "Returns",
          badgeColor: "bg-amber-100 text-amber-800",
          color: "text-amber-700",
          bgColor: "bg-amber-50/50",
          borderColor: "border-amber-200",
        },
        {
          name: "Quotations & Estimates",
          description: "Formal sales price quotations and proforma estimates generated for institutional & retail clients.",
          icon: <FileText size={20} />,
          tab: "quotations",
          badge: "Estimates",
          badgeColor: "bg-sky-100 text-sky-800",
          color: "text-sky-700",
          bgColor: "bg-sky-50/50",
          borderColor: "border-sky-200",
        },
        {
          name: "Loyalty Points Report",
          description: "Customer earned reward points balance, points redemption log and equivalent cash discount value.",
          icon: <Medal size={20} />,
          tab: "loyalty_points",
          badge: "Rewards",
          badgeColor: "bg-indigo-100 text-indigo-800",
          color: "text-indigo-700",
          bgColor: "bg-indigo-50/50",
          borderColor: "border-indigo-200",
        },
        {
          name: "Deliveries & Shipping",
          description: "Courier shipment tracking, delivery partner status (Steadfast), package weight and tracking codes.",
          icon: <Truck size={20} />,
          tab: "deliveries",
          badge: "Courier",
          badgeColor: "bg-teal-100 text-teal-800",
          color: "text-teal-700",
          bgColor: "bg-teal-50/50",
          borderColor: "border-teal-200",
        },
      ],
    },
    {
      id: "purchase",
      title: "Purchases & Suppliers",
      description: "Procurement bills, supplier payables, purchase returns & vendor ledgers",
      icon: <Truck size={18} className="text-purple-600" />,
      color: "text-purple-600",
      reports: [
        {
          name: "Purchase Bills Report",
          description: "Product procurement invoices from suppliers, wholesale costs, quantities and billing terms.",
          icon: <Truck size={20} />,
          tab: "purchases",
          badge: "Live",
          badgeColor: "bg-emerald-100 text-emerald-800",
          color: "text-purple-700",
          bgColor: "bg-purple-50/50",
          borderColor: "border-purple-200",
          isPopular: true,
        },
        {
          name: "Supplier Due List",
          description: "Outstanding balances owed to suppliers/vendors, pending purchase payments and aging breakdown.",
          icon: <AlertCircle size={20} />,
          tab: "vendor_due_list",
          badge: "Payables",
          badgeColor: "bg-rose-100 text-rose-800",
          color: "text-rose-700",
          bgColor: "bg-rose-50/50",
          borderColor: "border-rose-200",
          isPopular: true,
        },
        {
          name: "Purchase Return Report",
          description: "Faulty/excess stock returned to suppliers with vendor debit notes and refund tracking.",
          icon: <RotateCcw size={20} />,
          tab: "purchase_return",
          badge: "RMA",
          badgeColor: "bg-pink-100 text-pink-800",
          color: "text-pink-700",
          bgColor: "bg-pink-50/50",
          borderColor: "border-pink-200",
        },
        {
          name: "Supplier Ledger Report",
          description: "Complete chronological transaction ledger for every vendor — bills, payments and net balance.",
          icon: <BookOpen size={20} />,
          tab: "ledger",
          badge: "Ledger",
          badgeColor: "bg-indigo-100 text-indigo-800",
          color: "text-indigo-700",
          bgColor: "bg-indigo-50/50",
          borderColor: "border-indigo-200",
        },
      ],
    },
    {
      id: "inventory",
      title: "Inventory & Stock Valuation",
      description: "Real-time stock quantities, low stock reorder alerts, COGS and profit margins",
      icon: <Package size={18} className="text-amber-600" />,
      color: "text-amber-600",
      reports: [
        {
          name: "Stock & Inventory Report",
          description: "Real-time physical stock counts across categories, buying prices, selling prices and warehouse levels.",
          icon: <Package size={20} />,
          tab: "inventory",
          badge: "Live",
          badgeColor: "bg-emerald-100 text-emerald-800",
          color: "text-amber-700",
          bgColor: "bg-amber-50/50",
          borderColor: "border-amber-200",
          isPopular: true,
        },
        {
          name: "Low Stock Alert Report",
          description: "Critical list of products that have reached zero or are below minimum safety stock levels.",
          icon: <AlertCircle size={20} />,
          tab: "inventory",
          badge: "Action Req",
          badgeColor: "bg-red-100 text-red-800",
          color: "text-red-700",
          bgColor: "bg-red-50/50",
          borderColor: "border-red-200",
        },
        {
          name: "Stock Accounting & Valuation",
          description: "Live total inventory asset valuation, weighted average COGS, and gross profit per SKU.",
          icon: <BarChart2 size={20} />,
          tab: "stock_accounting",
          badge: "Valuation",
          badgeColor: "bg-teal-100 text-teal-800",
          color: "text-teal-700",
          bgColor: "bg-teal-50/50",
          borderColor: "border-teal-200",
          isPopular: true,
        },
        {
          name: "Product Profitability Report",
          description: "In-depth margin analysis comparing acquisition cost vs final retail selling price per item.",
          icon: <TrendingUp size={20} />,
          tab: "stock_accounting",
          badge: "Margins",
          badgeColor: "bg-emerald-100 text-emerald-800",
          color: "text-emerald-700",
          bgColor: "bg-emerald-50/50",
          borderColor: "border-emerald-200",
        },
      ],
    },
    {
      id: "finance",
      title: "Financial Statements & Cash Desk",
      description: "Official P&L statement, balance sheet, trial balance, day book & account statements",
      icon: <DollarSign size={18} className="text-emerald-600" />,
      color: "text-emerald-600",
      reports: [
        {
          name: "Profit & Loss Statement (P&L)",
          description: "Official comprehensive financial statement: Gross Revenue, Product COGS, OpEx, Gross & Net Profit.",
          icon: <Calculator size={20} />,
          tab: "profit_loss",
          badge: "Financial",
          badgeColor: "bg-emerald-100 text-emerald-800",
          color: "text-emerald-700",
          bgColor: "bg-emerald-50/50",
          borderColor: "border-emerald-200",
          isPopular: true,
        },
        {
          name: "Day Book / Cash Register",
          description: "Daily register tracking: Opening cash, cash-in, cash-out, counted cash vs expected balance discrepancy.",
          icon: <BookOpen size={20} />,
          tab: "day_book",
          badge: "Cash Desk",
          badgeColor: "bg-amber-100 text-amber-800",
          color: "text-amber-700",
          bgColor: "bg-amber-50/50",
          borderColor: "border-amber-200",
          isPopular: true,
        },
        {
          name: "Balance Sheet",
          description: "Formal snapshot of business assets, current liabilities, vendor payables and owner equity balance.",
          icon: <FileText size={20} />,
          tab: "balance_sheet",
          badge: "Statement",
          badgeColor: "bg-indigo-100 text-indigo-800",
          color: "text-indigo-700",
          bgColor: "bg-indigo-50/50",
          borderColor: "border-indigo-200",
        },
        {
          name: "Trial Balance",
          description: "Double-entry debit and credit equality report ensuring zero reconciliation errors across accounts.",
          icon: <Activity size={20} />,
          tab: "trial_balance",
          badge: "Audited",
          badgeColor: "bg-blue-100 text-blue-800",
          color: "text-blue-700",
          bgColor: "bg-blue-50/50",
          borderColor: "border-blue-200",
        },
        {
          name: "Account Balance Summary",
          description: "Real-time liquidity summary of all bank accounts, cash drawer, and mobile banking (bKash/Nagad) wallets.",
          icon: <Wallet size={20} />,
          tab: "account_balance",
          badge: "Liquid Cash",
          badgeColor: "bg-cyan-100 text-cyan-800",
          color: "text-cyan-700",
          bgColor: "bg-cyan-50/50",
          borderColor: "border-cyan-200",
        },
        {
          name: "Account Statement (Running Ledger)",
          description: "Granular chronological statement of debits, credits, and running balance for any selected payment account.",
          icon: <CreditCard size={20} />,
          tab: "account_statement",
          badge: "Statement",
          badgeColor: "bg-teal-100 text-teal-800",
          color: "text-teal-700",
          bgColor: "bg-teal-50/50",
          borderColor: "border-teal-200",
        },
        {
          name: "Unified Transaction History",
          description: "Master journal of all recorded financial movements — sales, payments, purchases, expenses & transfers.",
          icon: <Layers size={20} />,
          tab: "transaction_history",
          badge: "Journal",
          badgeColor: "bg-violet-100 text-violet-800",
          color: "text-violet-700",
          bgColor: "bg-violet-50/50",
          borderColor: "border-violet-200",
        },
        {
          name: "Manual Expense Report (OpEx)",
          description: "All non-COGS overhead expenditures — rent, utility bills, maintenance, staff conveyance & refreshments.",
          icon: <DollarSign size={20} />,
          tab: "manual_expense",
          badge: "Expense",
          badgeColor: "bg-red-100 text-red-800",
          color: "text-red-700",
          bgColor: "bg-red-50/50",
          borderColor: "border-red-200",
        },
        {
          name: "Manual Income Report",
          description: "All non-sale miscellaneous revenue entries — consultation, scrap sales, service fees & adjustments.",
          icon: <TrendingUp size={20} />,
          tab: "manual_income",
          badge: "Income",
          badgeColor: "bg-emerald-100 text-emerald-800",
          color: "text-emerald-700",
          bgColor: "bg-emerald-50/50",
          borderColor: "border-emerald-200",
        },
        {
          name: "Deposits & Fund Transfers",
          description: "Inter-account fund transfers, cash contra entries, bank deposits and bank-to-cash withdrawals.",
          icon: <ArrowRight size={20} />,
          tab: "deposits_withdrawals",
          badge: "Transfers",
          badgeColor: "bg-blue-100 text-blue-800",
          color: "text-blue-700",
          bgColor: "bg-blue-50/50",
          borderColor: "border-blue-200",
        },
        {
          name: "Payment Accounts Directory",
          description: "List of all registered bank accounts, branch details, account numbers, and payment routing options.",
          icon: <CreditCard size={20} />,
          tab: "payment_accounts",
          badge: "Config",
          badgeColor: "bg-slate-100 text-slate-800",
          color: "text-slate-700",
          bgColor: "bg-slate-50/50",
          borderColor: "border-slate-200",
        },
      ],
    },
    {
      id: "operations",
      title: "Operations, HR & Audit Trails",
      description: "Service & warranty tracking, staff performance, payroll, leave records & audit logs",
      icon: <ShieldCheck size={18} className="text-indigo-600" />,
      color: "text-indigo-600",
      reports: [
        {
          name: "Warranty & Service Report",
          description: "Hardware repairs log, RMA vendor warranty shipments, repair statuses, and service charge income.",
          icon: <Briefcase size={20} />,
          tab: "services",
          badge: "Repairs",
          badgeColor: "bg-indigo-100 text-indigo-800",
          color: "text-indigo-700",
          bgColor: "bg-indigo-50/50",
          borderColor: "border-indigo-200",
          isPopular: true,
        },
        {
          name: "Audit Logs & Security Trail",
          description: "Chronological security log of user actions — sales edits, item deletions, login activity & status changes.",
          icon: <ShieldCheck size={20} />,
          tab: "audit_logs",
          badge: "Security",
          badgeColor: "bg-rose-100 text-rose-800",
          color: "text-rose-700",
          bgColor: "bg-rose-50/50",
          borderColor: "border-rose-200",
          isPopular: true,
        },
        {
          name: "Staff Performance Report",
          description: "Employee productivity metrics, sales closed, service tickets handled and individual contributions.",
          icon: <Award size={20} />,
          tab: "staff_performance",
          badge: "KPIs",
          badgeColor: "bg-blue-100 text-blue-800",
          color: "text-blue-700",
          bgColor: "bg-blue-50/50",
          borderColor: "border-blue-200",
        },
        {
          name: "Employee Salary Disbursement",
          description: "Monthly staff payroll logs, base salary, overtime bonus, deductions and payment disbursements.",
          icon: <DollarSign size={20} />,
          tab: "salary",
          badge: "Payroll",
          badgeColor: "bg-emerald-100 text-emerald-800",
          color: "text-emerald-700",
          bgColor: "bg-emerald-50/50",
          borderColor: "border-emerald-200",
        },
        {
          name: "Conveyance & Travel Claims",
          description: "Staff transportation bills, field visit conveyance claims and management approval records.",
          icon: <Truck size={20} />,
          tab: "conveyance",
          badge: "Claims",
          badgeColor: "bg-orange-100 text-orange-800",
          color: "text-orange-700",
          bgColor: "bg-orange-50/50",
          borderColor: "border-orange-200",
        },
        {
          name: "Employee Leave Records",
          description: "Staff leave applications, casual/sick leave balance, pending requests and approved leaves.",
          icon: <Clock size={20} />,
          tab: "leave",
          badge: "HR",
          badgeColor: "bg-gray-100 text-gray-800",
          color: "text-gray-700",
          bgColor: "bg-gray-50/50",
          borderColor: "border-gray-200",
        },
      ],
    },
  ], []);

  // Filter categories and reports based on search and selected category filter
  const searchLower = search.toLowerCase().trim();

  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => selectedCategory === "all" || cat.id === selectedCategory)
      .map((cat) => ({
        ...cat,
        reports: cat.reports.filter(
          (r) =>
            !searchLower ||
            r.name.toLowerCase().includes(searchLower) ||
            r.description.toLowerCase().includes(searchLower) ||
            cat.title.toLowerCase().includes(searchLower) ||
            (r.badge && r.badge.toLowerCase().includes(searchLower))
        ),
      }))
      .filter((cat) => cat.reports.length > 0);
  }, [categories, selectedCategory, searchLower]);

  const totalReports = useMemo(() => {
    return categories.reduce((sum, c) => sum + c.reports.length, 0);
  }, [categories]);

  const visibleReportsCount = useMemo(() => {
    return filteredCategories.reduce((sum, c) => sum + c.reports.length, 0);
  }, [filteredCategories]);

  // Frequently accessed top reports
  const quickAccessReports = useMemo(() => {
    const list: ReportItem[] = [];
    categories.forEach((c) => {
      c.reports.forEach((r) => {
        if (r.isPopular) list.push(r);
      });
    });
    return list.slice(0, 6);
  }, [categories]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-50 text-[#EF4444] rounded-xl shadow-xs">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900">All Reports Directory</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Ledger Synced
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Comprehensive reporting hub — {totalReports} reports across {categories.length} business domains. Click any report to view instant data.
                </p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search reports by name, tag, or domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-9 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-100 focus:border-[#EF4444] transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 border-t border-gray-100 pt-4 scrollbar-none">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
              selectedCategory === "all"
                ? "bg-[#081621] text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            <Filter size={13} />
            All Reports ({totalReports})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5",
                selectedCategory === cat.id
                  ? "bg-[#081621] text-white shadow-sm"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              )}
            >
              {cat.icon}
              {cat.title} ({cat.reports.length})
            </button>
          ))}
        </div>
      </div>

      {/* Quick Access Top Reports (When not actively searching) */}
      {!search && selectedCategory === "all" && (
        <div className="bg-gradient-to-r from-slate-900 to-[#081621] p-6 rounded-2xl text-white shadow-sm border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              <h3 className="font-bold text-sm text-slate-100">Most Frequently Accessed Financial Reports</h3>
            </div>
            <span className="text-[11px] text-slate-400">Quick Shortcuts</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {quickAccessReports.map((q, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTab(q.tab)}
                className="bg-white/10 hover:bg-white/20 p-3 rounded-xl text-left transition-all border border-white/10 hover:border-white/30 flex flex-col justify-between group"
              >
                <div>
                  <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white mb-2">
                    {q.icon}
                  </div>
                  <p className="font-bold text-xs text-white line-clamp-1">{q.name}</p>
                </div>
                <div className="mt-2 text-[10px] text-slate-300 font-semibold flex items-center justify-between">
                  <span>Open</span>
                  <ArrowRight size={10} className="group-hover:translate-x-1 transition-transform text-amber-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Reports Found State */}
      {filteredCategories.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center text-gray-400 shadow-sm">
          <FileText size={44} className="mx-auto mb-3 opacity-30 text-[#EF4444]" />
          <h4 className="font-bold text-base text-gray-800">
            No reports found matching "{search}"
          </h4>
          <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
            Try searching with a different term such as "Sales", "COGS", "Due", "P&L", or "Profit".
          </p>
          <button
            onClick={() => { setSearch(""); setSelectedCategory("all"); }}
            className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition"
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Report Categories Grids */}
      {filteredCategories.map((category) => (
        <div
          key={category.id}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Category Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-white shadow-xs border border-gray-200">
                {category.icon}
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 uppercase tracking-wide">
                  {category.title}
                </h3>
                <p className="text-[11px] text-gray-500">{category.description}</p>
              </div>
            </div>
            <span className="text-xs font-bold text-gray-500 bg-white px-2.5 py-1 rounded-full border border-gray-200 self-start sm:self-auto">
              {category.reports.length} Reports
            </span>
          </div>

          {/* Reports Grid */}
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {category.reports.map((report, rIdx) => (
              <button
                key={rIdx}
                onClick={() => setActiveTab(report.tab)}
                className={cn(
                  "group text-left w-full border rounded-xl p-4 transition-all duration-150 flex flex-col justify-between",
                  "hover:shadow-md hover:-translate-y-0.5",
                  report.borderColor,
                  report.bgColor,
                  "hover:border-[#EF4444]"
                )}
              >
                <div>
                  {/* Icon + Badge row */}
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className={cn(
                        "p-2.5 rounded-xl bg-white border shadow-xs transition-transform group-hover:scale-105",
                        report.borderColor,
                        report.color
                      )}
                    >
                      {report.icon}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {report.badge && (
                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider",
                            report.badgeColor || "bg-gray-100 text-gray-600"
                          )}
                        >
                          {report.badge}
                        </span>
                      )}
                      <ChevronRight
                        size={14}
                        className="text-gray-300 group-hover:text-[#EF4444] group-hover:translate-x-0.5 transition-all"
                      />
                    </div>
                  </div>

                  {/* Report Name */}
                  <h4
                    className={cn(
                      "font-bold text-sm leading-snug mb-1.5 group-hover:text-[#EF4444] transition-colors",
                      report.color
                    )}
                  >
                    {report.name}
                  </h4>

                  {/* Description */}
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                    {report.description}
                  </p>
                </div>

                {/* Footer Link */}
                <div
                  className={cn(
                    "mt-4 pt-2 border-t border-gray-200/50 flex items-center justify-between text-xs font-bold",
                    report.color
                  )}
                >
                  <span className="flex items-center gap-1 text-[11px] group-hover:underline">
                    View Report
                    <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-[10px] font-mono text-gray-400 group-hover:text-gray-600">
                    #{report.tab}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AllReports;
