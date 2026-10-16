import { generatePDF } from "../lib/pdf";
import { logoBase64 } from "../lib/logoBase64";
import { BannersManagerTab } from "./admin/tabs/marketing/BannersManagerTab";
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  Suspense,
  lazy,
} from "react";
import Papa from "papaparse";
import {
  collection,
  getDoc, getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  query,
  orderBy,
  limit,
  writeBatch,
  where,
} from "firebase/firestore";
import { db, auth, storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { compressImage } from "../lib/imageCompressor";
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import firebaseConfig from "../../firebase-applet-config.json";
import {
  Product,
  Order,
  OrderStatus,
  Customer,
  Vendor,
  Transaction,
  TransactionCategory,
  NavigationMenu,
  SubCategory,
  UserProfile,
  SiteSettings,
  Campaign,
  ProductVariant,
  DiscountCode,
  HostingPlan,
  HostingService,
  SoldSerial,
  ServiceRecord,
  DocumentDesignSettings,
  UserPermission,
  Lead,
} from "../types";
const CRMPage = lazy(() =>
  import("./CRMPage").then((m) => ({ default: m.CRMPage })),
);
const TaskManager = lazy(() =>
  import("./admin/tabs/hr/TaskManager").then((m) => ({ default: m.default })),
);
const SupportTicketManager = lazy(() =>
  import("../components/SupportTicketManager").then((m) => ({
    default: m.SupportTicketManager,
  })),
);
const AdminOverviewDashboard = lazy(() =>
  import("../components/AdminOverviewDashboard").then((m) => ({
    default: m.AdminOverviewDashboard,
  })),
);
const ApiLogsTab = lazy(() =>
  import("../components/ApiLogsTab").then((m) => ({ default: m.ApiLogsTab })),
);
const NotificationsPage = lazy(() =>
  import("./admin/tabs/notifications/NotificationsPage").then((m) => ({
    default: m.NotificationsPage,
  })),
);
import { AdminNotifications } from "../components/AdminNotifications";
import { EcommerceDeliveries } from "./ecommerceDashboard/EcommerceDeliveries";
const AnalyticsDashboard = lazy(() =>
  import("../components/AnalyticsDashboard").then((m) => ({
    default: m.AnalyticsDashboard,
  })),
);
const CRMIntegrationsSetting = lazy(() =>
  import("../components/CRMIntegrationsSetting").then((m) => ({
    default: m.CRMIntegrationsSetting,
  })),
);
import { Layout } from "../components/Layout";
const BulkEditForm = lazy(() =>
  import("../components/BulkEditForm").then((m) => ({
    default: m.BulkEditForm,
  })),
);
const QuotationManager = lazy(() =>
  import("../components/QuotationManager").then((m) => ({
    default: m.QuotationManager,
  })),
);
const HostingApiSettings = lazy(() =>
  import("../components/admin/hosting/HostingApiSettings").then((m) => ({
    default: m.HostingApiSettings,
  })),
);
import { apiPost } from "../services/apiClient";

const InventoryTab = lazy(() =>
  import("./admin/tabs/inventory/Inventory").then((m) => ({
    default: m.default,
  })),
);
const BuildRequestsTab = lazy(() => import("./admin/tabs/sales/BuildRequests").then((m) => ({ default: m.BuildRequestsTab })));
const OrdersTab = lazy(() =>
  import("./admin/tabs/sales/Orders").then((m) => ({ default: m.default })),
);
const SettingsTab = lazy(() =>
  import("./admin/tabs/others/Settings").then((m) => ({ default: m.Settings })),
);
const MenusTab = lazy(() =>
  import("./admin/tabs/menus/Menus").then((m) => ({ default: m.default })),
);
const EmployeesTab = lazy(() => import("./admin/tabs/hr/Employees").then((m) => ({ default: m.default })));
const StaffPerformanceTab = lazy(() => import("./admin/tabs/hr/StaffPerformance").then((m) => ({ default: m.StaffPerformanceTab })));
const LeaveTab = lazy(() =>
  import("./admin/tabs/hr/Leave").then((m) => ({ default: m.default })),
);
const SalaryTab = lazy(() =>
  import("./admin/tabs/hr/Salary").then((m) => ({ default: m.default })),
);
const CampaignsTab = lazy(() =>
  import("./admin/tabs/marketing/Campaigns").then((m) => ({
    default: m.default,
  })),
);
const DiscountCodesTab = lazy(() =>
  import("./admin/tabs/marketing/DiscountCodes").then((m) => ({
    default: m.default,
  })),
);
const ReviewsTab = lazy(() =>
  import("./admin/tabs/marketing/Reviews").then((m) => ({
    default: m.default,
  })),
);
const UsersTab = lazy(() =>
  import("./admin/tabs/hr/Users").then((m) => ({ default: m.default })),
);
const HostingServicesTab = lazy(() =>
  import("./admin/tabs/hosting/HostingServices").then((m) => ({
    default: m.default,
  })),
);
const DomainOffersTab = lazy(() =>
  import("./admin/tabs/hosting/DomainOffers").then((m) => ({
    default: m.default,
  })),
);
const DomainRenewalsTab = lazy(() =>
  import("./admin/tabs/hosting/DomainRenewals").then((m) => ({
    default: m.default,
  })),
);
const DomainPricingManagerTab = lazy(() =>
  import("../components/admin/hosting/DomainPricingManager").then((m) => ({
    default: m.DomainPricingManager,
  })),
);
const HostingPlansTab = lazy(() =>
  import("./admin/tabs/hosting/HostingPlans").then((m) => ({
    default: m.default,
  })),
);
const SalesForm = lazy(() =>
  import("./admin/tabs/sales/SalesForm").then((m) => ({
    default: m.SalesForm,
  })),
);
const ServicesTab = lazy(() =>
  import("./admin/tabs/services/Services").then((m) => ({
    default: m.default,
  })),
);
const HostingOrdersTab = lazy(() =>
  import("./admin/tabs/hosting/HostingOrders").then((m) => ({
    default: m.default,
  })),
);
const ActiveHostingAccountsTab = lazy(() =>
  import("./admin/tabs/hosting/ActiveHostingAccounts").then((m) => ({
    default: m.default,
  })),
);
const SupportTicketsTab = lazy(() =>
  import("./admin/tabs/hosting/SupportTickets").then((m) => ({
    default: m.default,
  })),
);
const InternalNotesTab = lazy(() =>
  import("./admin/tabs/notes/InternalNotes").then((m) => ({
    default: m.default,
  })),
);
const AllReportsTab = lazy(() =>
  import("./admin/tabs/accounting/AllReports").then((m) => ({
    default: m.default,
  })),
);
const LedgerTab = lazy(() =>
  import("./admin/tabs/accounting/Ledger").then((m) => ({
    default: m.default,
  })),
);
const ManualExpenseTab = lazy(() =>
  import("./admin/tabs/accounting/ManualExpense").then((m) => ({
    default: m.default,
  })),
);
const ManualIncomeTab = lazy(() =>
  import("./admin/tabs/accounting/ManualIncome").then((m) => ({
    default: m.default,
  })),
);
const PaymentAccountsTab = lazy(() =>
  import("./admin/tabs/accounting/PaymentAccounts").then((m) => ({
    default: m.default,
  })),
);

const ProfitLossTab = lazy(() =>
  import("./admin/tabs/finance/ProfitLoss").then((m) => ({ default: m.default }))
);
const SalesReportTab = lazy(() =>
  import("./admin/tabs/finance/SalesReport").then((m) => ({
    default: m.default,
  })),
);
const TransactionsTab = lazy(() =>
  import("./admin/tabs/finance/Transactions").then((m) => ({
    default: m.default,
  })),
);
const TxCategoriesTab = lazy(() =>
  import("./admin/tabs/accounting/TransactionCategories").then((m) => ({
    default: m.default,
  })),
);
import ConveyanceTab from "./admin/tabs/finance/Conveyance";
const DayBookTab = lazy(() => import("./admin/tabs/finance/DayBook").then(m => ({ default: m.default })));
const PurchaseReturnTab = lazy(() =>
  import("./admin/tabs/sales/PurchaseReturn").then((m) => ({
    default: m.default,
  })),
);
const PurchasesTab = lazy(() =>
  import("./admin/tabs/purchase/Purchases").then((m) => ({
    default: m.default,
  })),
);
const SaleReturnTab = lazy(() =>
  import("./admin/tabs/sales/SaleReturn").then((m) => ({ default: m.default })),
);
const CustomersTab = lazy(() =>
  import("./admin/tabs/sales/Customers").then((m) => ({ default: m.default })),
);
const CustomerDueListTab = lazy(() =>
  import("./admin/tabs/sales/CustomerDueList").then((m) => ({
    default: m.default,
  })),
);
const VendorDueListTab = lazy(() =>
  import("./admin/tabs/purchase/VendorDueList").then((m) => ({
    default: m.default,
  })),
);
const VendorsTab = lazy(() =>
  import("./admin/tabs/purchase/Vendors").then((m) => ({ default: m.default })),
);
const CustomerReceiveReportTab = lazy(() =>
  import("./admin/tabs/accounting/CustomerReceiveReport").then((m) => ({
    default: m.default,
  })),
);
const LoyaltyPointsReportTab = lazy(() =>
  import("./admin/tabs/reports/LoyaltyPointsReport").then((m) => ({
    default: m.LoyaltyPointsReport,
  })),
);
const TransactionHistoryTab = lazy(() =>
  import("./admin/tabs/accounting/TransactionHistory").then((m) => ({
    default: m.default,
  })),
);
const AccountStatementTab = lazy(() =>
  import("./admin/tabs/accounting/AccountStatement").then((m) => ({
    default: m.default,
  })),
);
const BalanceSheetTab = lazy(() =>
  import("./admin/tabs/accounting/BalanceSheet").then((m) => ({
    default: m.default,
  })),
);
const TrialBalanceTab = lazy(() =>
  import("./admin/tabs/accounting/TrialBalance").then((m) => ({
    default: m.default,
  })),
);
const AccountBalanceTab = lazy(() =>
  import("./admin/tabs/accounting/AccountBalance").then((m) => ({
    default: m.default,
  })),
);
const DepositsWithdrawalsTab = lazy(() =>
  import("./admin/tabs/accounting/DepositsWithdrawals").then((m) => ({
    default: m.default,
  })),
);
const StockAccountingTab = lazy(() =>
  import("./admin/tabs/accounting/StockAccounting").then((m) => ({
    default: m.default,
  })),
);
const AuditLogsTab = lazy(() =>
  import("./admin/tabs/reports/AuditLogs").then((m) => ({
    default: m.AuditLogs,
  })),
);
import { useAuth } from "../context/AuthContext";
import { Trophy, 
  Plus,
  Edit2,
  Trash2,
  Package,
  Boxes,
  FileText,
  ShoppingBag,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  Download,
  Upload,
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
  List, PieChart,
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
  Wallet,
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
  MessageSquare,
  Globe,
  Terminal,
  RefreshCw,
  DollarSign,
  ExternalLink, Loader2
} from "lucide-react";
import { formatCurrency, cn, addWarranty, formatWarranty } from "../lib/utils";
import { useSettings } from "../context/SettingsContext";
import { toast } from "react-hot-toast";
import { generateDocumentNumber } from "../lib/numbering";
import { getApiUrl } from "../services/apiClient";
import { logAudit } from "../lib/audit";
import { useNavigate } from "react-router-dom";

export interface AdminDashboardProps {
  mode?: "all" | "ecommerce" | "hosting" | "accounting";
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  mode = "all",
}) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionCategories, setTransactionCategories] = useState<
    TransactionCategory[]
  >([]);
  const [isAddingTransactionCategory, setIsAddingTransactionCategory] =
    useState(false);
  const [newTransactionCategory, setNewTransactionCategory] = useState<
    Partial<TransactionCategory>
  >({ name: "", type: "expense", description: "" });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState("");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [isAddingManualTransaction, setIsAddingManualTransaction] =
    useState(false);
  const [manualTransactionType, setManualTransactionType] = useState<
    "income" | "expense"
  >("expense");
  const [newManualTransaction, setNewManualTransaction] = useState<
    Partial<Transaction>
  >({
    amount: 0,
    date: new Date().toISOString().split("T")[0],
    description: "",
    categoryId: "",
  });

  const handleSaveTransactionCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTransactionCategory.name) return;

    try {
      const category: Omit<TransactionCategory, "id"> = {
        name: newTransactionCategory.name,
        type: newTransactionCategory.type as "income" | "expense",
        description: newTransactionCategory.description || "",
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(
        collection(db, "transaction_categories"),
        category,
      );
      setTransactionCategories([
        ...transactionCategories,
        { id: docRef.id, ...category } as TransactionCategory,
      ]);
      setIsAddingTransactionCategory(false);
      setNewTransactionCategory({ name: "", type: "expense", description: "" });
      toast.success("Category added successfully");
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    }
  };

  const handleSaveConveyance = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConveyance.description || newConveyance.amount <= 0) return;
    const c = { id: Date.now().toString(), ...newConveyance };
    const updated = [...conveyances, c];
    setConveyances(updated);
    setIsAddingConveyance(false);
    toast.success("Conveyance added successfully");
  };

  const handleSaveManualTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newManualTransaction.amount ||
      newManualTransaction.amount <= 0 ||
      !newManualTransaction.description
    ) {
      toast.error("Please enter amount and description");
      return;
    }

    const selectedCategory = transactionCategories.find(
      (c) => c.id === newManualTransaction.categoryId,
    );

    try {
      const transactionData: Omit<Transaction, "id"> = {
        type: manualTransactionType,
        amount: newManualTransaction.amount,
        date:
          newManualTransaction.date || new Date().toISOString().split("T")[0],
        description: newManualTransaction.description || "",
        entityId: "manual", // indicates no specific customer/vendor
        entityName: "Manual Entry",
        categoryId: newManualTransaction.categoryId,
        categoryName: selectedCategory
          ? selectedCategory.name
          : "Uncategorized",
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(
        collection(db, "transactions"),
        transactionData,
      );
      setTransactions([
        ...transactions,
        { id: docRef.id, ...transactionData } as Transaction,
      ]);

      setIsAddingManualTransaction(false);
      setNewManualTransaction({
        amount: 0,
        date: new Date().toISOString().split("T")[0],
        description: "",
        categoryId: "",
      });
      toast.success("Transaction saved successfully");
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast.error("Failed to save transaction");
    }
  };

  const [menus, setMenus] = useState<NavigationMenu[]>([]);
  const [conveyances, setConveyances] = useState<
    {
      id: string;
      date: string;
      description: string;
      amount: number;
      employee: string;
    }[]
  >([]);
  const [isAddingConveyance, setIsAddingConveyance] = useState(false);
  const [newConveyance, setNewConveyance] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    amount: 0,
    employee: "",
  });
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [discountCodes, setDiscountCodes] = useState<DiscountCode[]>([]);
  const [hostingPlans, setHostingPlans] = useState<HostingPlan[]>([]);
  const [hostingServices, setHostingServices] = useState<HostingService[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeeLeaves, setEmployeeLeaves] = useState<any[]>([]);
  const [employeeSalaries, setEmployeeSalaries] = useState<any[]>([]);

  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [isAddingLeave, setIsAddingLeave] = useState(false);
  const [editingLeave, setEditingLeave] = useState<any>(null);
  const [isAddingSalary, setIsAddingSalary] = useState(false);
  const [editingSalary, setEditingSalary] = useState<any>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "user",
    permissions: [] as UserPermission[],
  });
  const [employeeFormData, setEmployeeFormData] = useState<any>({
    name: "",
    email: "",
    phone: "",
    role: "Staff",
    baseSalary: 0,
    status: "active",
    joinDate: "",
    confirmDate: "",
    dateOfBirth: "",
    nidNumber: "",
    certificateUrl: "",
    nidUrl: "",
    cvUrl: "",
  });
  const [leaveFormData, setLeaveFormData] = useState<any>({
    employeeName: "",
    type: "casual",
    startDate: "",
    endDate: "",
    reason: "",
    status: "pending",
  });
  const [salaryFormData, setSalaryFormData] = useState<any>({
    employeeName: "",
    month: "",
    baseAmount: 0,
    deductions: 0,
    bonus: 0,
    netPay: 0,
    status: "pending",
    paymentDate: "",
  });

  const [settingsTab, setSettingsTab] = useState<
    | "business"
    | "pos"
    | "tax"
    | "invoice"
    | "zatca"
    | "email"
    | "sms"
    | "whatsapp"
    | "whitelabel"
    | "pwa"
    | "crm_integrations"
    | "review_integrations"
    | "external_ecommerce"
  >("business");
  const [paymentAccountSort, setPaymentAccountSort] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "name", direction: "asc" });
  const [paymentAccounts, setPaymentAccounts] = useState<any[]>([]);
  const [isAddingPaymentAccount, setIsAddingPaymentAccount] = useState(false);
  const [paymentAccountFormData, setPaymentAccountFormData] = useState({
    type: "",
    name: "",
    description: "",
    openingBalance: 0,
    status: "active",
  });
  const [activeTab, setActiveTab] = useState<any>(
    () => sessionStorage.getItem("adminActiveTab") || "dashboard",
  );
  const [editingOrderForSales, setEditingOrderForSalesState] = useState<any | null>(() => {
    try {
      const saved = sessionStorage.getItem('adminEditingOrder');
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return null;
  });
  
  const setEditingOrderForSales = (order: any | null) => {
    setEditingOrderForSalesState(order);
    if (order) sessionStorage.setItem('adminEditingOrder', JSON.stringify(order));
    else sessionStorage.removeItem('adminEditingOrder');
  };
  useEffect(() => {
    sessionStorage.setItem("adminActiveTab", activeTab);
  }, [activeTab]);

  const [serialSelectionModal, setSerialSelectionModal] = useState<{
    isOpen: boolean;
    orderId: string;
    newStatus: OrderStatus;
    items: {
      productId: string;
      productName: string;
      quantity: number;
      availableSerials: string[];
      selectedSerials: string[];
      warrantyMonths: number;
    }[];
  } | null>(null);

  const [servicesData, setServicesData] = useState<{
    searchQuery: string;
    searchResult: SoldSerial | null;
    isCreatingTicket: boolean;
    ticketFormData: Partial<ServiceRecord>;
  }>({
    searchQuery: "",
    searchResult: null,
    isCreatingTicket: false,
    ticketFormData: {},
  });

  const { profile, isAdmin, isManager, isStaff, hasPermission } = useAuth();
  const OFFLINE_SHOP_TABS = [
    "dashboard",
    "analytics",
    "inventory",
    "sales",
    "sale_return",
    "orders",
    "customers",
    "deliveries",
    "customer_due_list",
    "quotations",
    "build_requests",
    "purchases",
    "purchase_return",
    "vendors",
    "vendor_due_list",
    "menus",
    "services",
    "payment_accounts",
    "ledger",
    "manual_income",
    "manual_expense",
    "tx_categories",
    "reports",
    "customer_receive_report",
    "deposits_withdrawals",
    "account_balance",
    "account_statement",
    "balance_sheet",
    "trial_balance",
    "day_book",
    "transaction_history",
    "all_reports",
    "stock_accounting",
    "crm",
    "tasks",
    "conveyance",
    "salary",
    "employees",
    "leave",
    "internal_notes",
    "notifications",
  ];

  useEffect(() => {
    if (isStaff && !isAdmin && !isManager) {
      if (!OFFLINE_SHOP_TABS.includes(activeTab)) {
        setActiveTab("sales");
      }
    }
  }, [isStaff, isAdmin, isManager, activeTab]);

  const [showLedgerReportModal, setShowLedgerReportModal] =
    useState<boolean>(false);
  const [ledgerReportModalData, setLedgerReportModalData] = useState<any[]>([]);
  const [ledgerReportType, setLedgerReportType] = useState<
    "income" | "expense" | null
  >(null);

  const { settings, updateSettings } = useSettings();
  const [settingsFormData, setSettingsFormData] =
    useState<SiteSettings>(settings);

  const [taxCalcAmount, setTaxCalcAmount] = useState<number>(0);
  useEffect(() => {
    setSettingsFormData(settings);
  }, [settings]);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isAddingVendor, setIsAddingVendor] = useState(false);
  const [isAddingMenu, setIsAddingMenu] = useState(false);
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);
  const [isAddingDiscountCode, setIsAddingDiscountCode] = useState(false);
  const [isAddingHostingPlan, setIsAddingHostingPlan] = useState(false);
  const [isAddingHostingService, setIsAddingHostingService] = useState(false);
  const [isAddingSubCategory, setIsAddingSubCategory] = useState(false);
  const [isCreatingSale, setIsCreatingSale] = useState(false);
  const [isCreatingPurchase, setIsCreatingPurchase] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [editingMenu, setEditingMenu] = useState<NavigationMenu | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editingDiscountCode, setEditingDiscountCode] =
    useState<DiscountCode | null>(null);
  const [editingHostingPlan, setEditingHostingPlan] =
    useState<HostingPlan | null>(null);
  const [editingHostingService, setEditingHostingService] =
    useState<HostingService | null>(null);
  const [selectedLedgerEntity, setSelectedLedgerEntity] = useState<{
    id: string;
    name: string;
    type: "customer" | "vendor";
  } | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentDescription, setPaymentDescription] = useState<string>("");
  const [ledgerPaymentMethod, setLedgerPaymentMethod] =
    useState<string>("cash");
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return null;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `hr/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setIsUploading(false);
      return url;
    } catch (err) {
      setIsUploading(false);
      toast.error("File upload failed");
      return null;
    }
  };

  const handleAddPortalUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (userFormData.password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }

      const secondaryApp = initializeApp(
        firebaseConfig,
        "SecondaryApp" + Date.now(),
      );
      const secondaryAuth = getAuth(secondaryApp);

      const userCred = await createUserWithEmailAndPassword(
        secondaryAuth,
        userFormData.email,
        userFormData.password,
      );

      await setDoc(doc(db, "users", userCred.user.uid), {
        uid: userCred.user.uid,
        email: userFormData.email,
        displayName: userFormData.name || userFormData.email.split("@")[0],
        role: userFormData.role,
        permissions: userFormData.permissions,
        createdAt: new Date().toISOString(),
      });

      await secondaryAuth.signOut();

      toast.success("User added successfully");
      setIsAddingUser(false);
      debouncedFetchData();
    } catch (err: any) {
      toast.error("Error adding user: " + err.message);
    }
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);

    // Set to current origin upload URL
    const CPANEL_UPLOAD_URL = typeof window !== "undefined" ? `${window.location.origin}/upload.php` : "/upload.php";

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
          const compressedFile = await compressImage(file);
          if (CPANEL_UPLOAD_URL) {
          const formDataToUpload = new FormData();
          formDataToUpload.append("image", compressedFile);
          const res = await fetch(CPANEL_UPLOAD_URL, {
            method: "POST",
            body: formDataToUpload,
          });
          const data = await res.json();
          if (data.success) return data.url;
          throw new Error(data.message || "cPanel upload failed");
        } else {
          // Fallback to Firebase
          const storageRef = ref(
            storage,
            `products/${Date.now()}_${compressedFile.name}`,
          );
          await uploadBytes(storageRef, compressedFile);
          return getDownloadURL(storageRef);
        }
      });

      const urls = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        images: [
          ...(prev.images || []).filter((img: string) => img !== ""),
          ...urls,
        ],
      }));
      toast.success(`Successfully uploaded ${urls.length} images`);
    } catch (error) {
      console.error("Error uploading images:", error);
      toast.error("Failed to upload images");
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };
  const [showPCBuilderModal, setShowPCBuilderModal] = useState(false);

  // Ledger State
  const [generalLedgerFilterType, setGeneralLedgerFilterType] = useState<
    "daily" | "monthly"
  >("daily");
  const [generalLedgerStartDate, setGeneralLedgerStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [generalLedgerEndDate, setGeneralLedgerEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  // Make sure we have a function to get ledger data
  const getLedgerData = () => {
    const data: {
      [key: string]: {
        date: string;
        income: number;
        expense: number;
        balance: number;
        details: any[];
      };
    } = {};

    transactions.forEach((tx) => {
      const txDateStr = new Date(tx.date).toISOString().split("T")[0];
      if (
        txDateStr >= generalLedgerStartDate &&
        txDateStr <= generalLedgerEndDate
      ) {
        // format key based on type
        const key =
          generalLedgerFilterType === "monthly"
            ? txDateStr.substring(0, 7)
            : txDateStr;
        const displayDate =
          generalLedgerFilterType === "monthly"
            ? new Date(tx.date).toLocaleString("default", {
                month: "long",
                year: "numeric",
              })
            : txDateStr;

        if (!data[key]) {
          data[key] = {
            date: displayDate,
            income: 0,
            expense: 0,
            balance: 0,
            details: [],
          };
        }

        const isIncome = [
          "sale",
          "payment_received",
          "money_receipt",
          "income",
        ].includes(tx.type);
        if (isIncome) {
          data[key].income += tx.amount;
        } else {
          data[key].expense += tx.amount;
        }

        data[key].balance = data[key].income - data[key].expense;
        data[key].details.push(tx);
      }
    });

    // Convert to array and sort by date desc
    return Object.keys(data)
      .sort((a, b) => b.localeCompare(a))
      .map((k) => data[k]);
  };

  // Report State
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [reportEndDate, setReportEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [reportSearch, setReportSearch] = useState("");
  const [reportSortConfig, setReportSortConfig] = useState<{
    key: string;
    direction: "asc" | "desc";
  }>({ key: "date", direction: "desc" });

  // Customer Receive Report Filter State
  const [crReportStartDate, setCrReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [crReportEndDate, setCrReportEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [crReportSearch, setCrReportSearch] = useState("");
  const [crReportMethod, setCrReportMethod] = useState("all");
  const [crReportCustomer, setCrReportCustomer] = useState("all");

  // Purchase Filter State
  const [purchaseStartDate, setPurchaseStartDate] = useState("");
  const [purchaseEndDate, setPurchaseEndDate] = useState("");
  const [purchaseSearchQuery, setPurchaseSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<
    OrderStatus | "all"
  >("all");
  const [orderSort, setOrderSort] = useState<
    "date_desc" | "date_asc" | "total_desc" | "total_asc"
  >("date_desc");
  const [orderSearchQuery, setOrderSearchQuery] = useState("");
  const [orderStartDate, setOrderStartDate] = useState("");
  const [orderEndDate, setOrderEndDate] = useState("");
  const [ledgerStartDate, setLedgerStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [ledgerEndDate, setLedgerEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [ledgerSearchQuery, setLedgerSearchQuery] = useState("");
  const [serviceSearchQuery, setServiceSearchQuery] = useState("");
  const [ledgerView, setLedgerView] = useState<"ledger" | "products">("ledger");
  const [vendorProductSearchQuery, setVendorProductSearchQuery] = useState("");
  const [vendorProductCategoryFilter, setVendorProductCategoryFilter] =
    useState<string>("all");

  const [editingUserPermissions, setEditingUserPermissions] = useState<
    any | null
  >(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);

  // Selection State for Bulk Actions
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [inventoryCategoryFilter, setInventoryCategoryFilter] =
    useState<string>("all");
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [bulkEditData, setBulkEditData] = useState({
    price: "",
    stock: "",
    category: "",
    vendorId: "",
    socketType: "",
    ramType: "",
  });

  // Sale Form State
  const [saleData, setSaleData] = useState({
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    shippingAddress: "",
    items: [] as any[],
    type: "invoice" as any,
    discountAmount: 0,
    appliedDiscountPercentage: 0,
    appliedDiscountCode: "",
  });

  const [saleDiscountCodeInput, setSaleDiscountCodeInput] = useState("");

  const handleApplySaleDiscountCode = () => {
    if (!saleDiscountCodeInput) return;
    const foundCode = discountCodes.find(
      (c) =>
        c.code.toUpperCase() === saleDiscountCodeInput.toUpperCase() &&
        c.isActive,
    );
    if (foundCode) {
      if (new Date(foundCode.expiryDate) < new Date()) {
        toast.error("Discount code expired");
        return;
      }
      setSaleData({
        ...saleData,
        appliedDiscountPercentage: foundCode.discountPercentage,
        appliedDiscountCode: foundCode.code,
        discountAmount: 0, // Reset manual
      });
      toast.success(
        `Discount code applied: ${foundCode.discountPercentage}% off`,
      );
    } else {
      toast.error("Invalid discount code");
    }
  };

  const [purchaseData, setPurchaseData] = useState({
    vendorId: "",
    vendorName: "",
    items: [] as any[],
    description: "",
  });

  const [soldSerials, setSoldSerials] = useState<SoldSerial[]>([]);
  const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
  const [isAddingService, setIsAddingService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(
    null,
  );

  // Form State
  const [formData, setFormData] = useState({
    model: "",
    name: "",
    price: 0,
    stock: 0,
    category: "Laptop",
    description: "",
    images: [] as string[],
    socketType: "",
    ramType: "",
    chipset: "",
    vendorId: "",
    variants: [] as ProductVariant[],
    specs: {} as Record<string, string>,
    hasSerialTracking: false,
    availableSerials: [] as string[],
    warrantyMonths: 0,
  });

  const [customerFormData, setCustomerFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const [vendorFormData, setVendorFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    category: "General",
  });

  const [discountCodeFormData, setDiscountCodeFormData] = useState({
    code: "",
    discountPercentage: 0,
    expiryDate: "",
    isActive: true,
  });

  const [hostingPlanFormData, setHostingPlanFormData] = useState({
    serviceId: "",
    name: "",
    price: 0,
    billingCycle: "/mo",
    features: [] as string[],
    popular: false,
    order: 0,
  });

  const [hostingServiceFormData, setHostingServiceFormData] = useState({
    title: "",
    description: "",
    iconPath: "",
    startingPrice: 0,
    billingCycle: "/mo",
    currency: "BDT",
    order: 0,
    isActive: true,
  });

  const [menuFormData, setMenuFormData] = useState({
    name: "",
    slug: "",
    order: 0,
    subCategories: [] as SubCategory[],
  });

  const [subCategoryFormData, setSubCategoryFormData] = useState({
    parentId: "",
    name: "",
    slug: "",
    brands: "",
  });

  const [campaignFormData, setCampaignFormData] = useState({
    title: "",
    channel: "email" as
      | "email"
      | "sms"
      | "whatsapp"
      | "facebook"
      | "instagram"
      | "google",
    subject: "",
    content: "",
    recipients: [] as string[],
    bulkEmails: "", // Can represent phone numbers as well depending on channel
    selectedUserIds: [] as string[],
    scheduledAt: "",
    targetAudience: "",
    budget: "",
    targetUrl: "",
    imageUrl: "",
  });

  const [serviceFormData, setServiceFormData] = useState({
    serialNumber: "",
    customerName: "",
    customerPhone: "",
    productName: "",
    equipmentType: "Laptop",
    issueDescription: "",
    isWarranty: false,
    serviceCharge: 0,
    paymentStatus: "pending" as "pending" | "paid",
    paymentMethod: "cash",
    medeaPayment: "",
    status: "received" as "received" | "in_progress" | "ready" | "delivered",
  });

  const fetchDataRef = useRef<(() => Promise<void>) | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedFetchData = useCallback(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      fetchDataRef.current?.();
    }, 300);
  }, []);

  useEffect(() => {
    fetchDataRef.current = fetchData;
    debouncedFetchData();

    const intervalId = setInterval(() => {
      fetchDataRef.current?.();
    }, 15000);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setSelectedProductIds([]);
    setSelectedOrderIds([]);
  }, [activeTab]);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    confirmColor?: string;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const ConfirmModal = () => {
      const [isConfirming, setIsConfirming] = useState(false);
      if (!confirmModal.isOpen) return null;
      const confirmText = confirmModal.confirmText || "Confirm Delete";
      const confirmColor = confirmModal.confirmColor || "bg-red-600 hover:bg-red-700";
      
      const isRed = confirmColor.includes('red') || confirmColor.includes('EF4444');
      const isBlue = confirmColor.includes('blue');

      return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 text-center pt-8">
              <div className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 ${isRed ? 'bg-red-100 text-red-600' : isBlue ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {isRed ? <AlertTriangle size={32} strokeWidth={1.5} /> : <CheckCircle size={32} strokeWidth={1.5} />}
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                {confirmModal.title}
              </h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                {confirmModal.message}
              </p>
              
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                  disabled={isConfirming}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-bold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsConfirming(true);
                    try {
                      await confirmModal.onConfirm();
                    } finally {
                      setIsConfirming(false);
                      setConfirmModal({ ...confirmModal, isOpen: false });
                    }
                  }}
                  disabled={isConfirming}
                  className={`flex-1 py-2.5 text-white rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 ${confirmColor}`}
                >
                  {isConfirming ? <Loader2 size={18} className="animate-spin" /> : confirmText}
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        productsSnap,
        ordersSnap,
        customersSnap,
        transactionsSnap,
        menusSnap,
        discountCodesSnap,
        hostingPlansSnap,
        hostingServicesSnap,
        soldSerialsSnap,
        serviceRecordsSnap,
        paymentAccountsSnap,
        transactionCategoriesSnap,
      ] = await Promise.all([
        getDocs(
          query(
            collection(db, "products"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        ),
        getDocs(
          query(
            collection(db, "orders"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        ),
        getDocs(
          query(
            collection(db, "customers"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        ),
        getDocs(
          query(
            collection(db, "transactions"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        ),
        getDocs(
          query(collection(db, "menus"), orderBy("order", "asc"), limit(100)),
        ),
        getDocs(
          query(
            collection(db, "couponCodes"),
            orderBy("createdAt", "desc"),
            limit(200),
          ),
        ),
        getDocs(
          query(
            collection(db, "hostingPlans"),
            orderBy("order", "asc"),
            limit(100),
          ),
        ),
        getDocs(
          query(
            collection(db, "hostingServices"),
            orderBy("order", "asc"),
            limit(100),
          ),
        ),
        getDocs(
          query(
            collection(db, "sold_serials"),
            orderBy("soldAt", "desc"),
            limit(500),
          ),
        ),
        getDocs(
          query(
            collection(db, "service_records"),
            orderBy("receivedAt", "desc"),
            limit(500),
          ),
        ),
        getDocs(
          query(
            collection(db, "payment_accounts"),
            orderBy("createdAt", "desc"),
            limit(100),
          ),
        ),
        getDocs(
          query(
            collection(db, "transaction_categories"),
            orderBy("createdAt", "desc"),
            limit(100),
          ),
        ),
      ]);

      let vendorsSnap = { docs: [] };
      let usersSnap = { docs: [] };
      let campaignsSnap = { docs: [] };

      try {
        vendorsSnap = await getDocs(
          query(
            collection(db, "vendors"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        );
      } catch (e) {
        
      }

      try {
        usersSnap = await getDocs(
          query(
            collection(db, "users"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        );
      } catch (e) {
        
      }

      try {
        campaignsSnap = await getDocs(
          query(
            collection(db, "campaigns"),
            orderBy("createdAt", "desc"),
            limit(200),
          ),
        );
      } catch (e) {
        
      }

      try {
        const employeesSnap = await getDocs(
          query(
            collection(db, "employees"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        );
        const employeeLeavesSnap = await getDocs(
          query(
            collection(db, "employee_leaves"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        );
        const employeeSalariesSnap = await getDocs(
          query(
            collection(db, "employee_salaries"),
            orderBy("createdAt", "desc"),
            limit(500),
          ),
        );
        setEmployees(
          employeesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setEmployeeLeaves(
          employeeLeavesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
        );
        setEmployeeSalaries(
          employeeSalariesSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })),
        );
      } catch (e) {
        
      }

      setProducts(
        productsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Product[],
      );
      setOrders(
        ordersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Order[],
      );
      setCustomers(
        customersSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Customer[],
      );
      setVendors(
        vendorsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Vendor[],
      );
      setTransactions(
        transactionsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Transaction[],
      );
      setMenus(
        menusSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NavigationMenu[],
      );
      setUsers(usersSnap.docs.map((doc) => doc.data()) as UserProfile[]);
      setCampaigns(
        campaignsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Campaign[],
      );
      setDiscountCodes(
        discountCodesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as DiscountCode[],
      );
      setHostingPlans(
        hostingPlansSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HostingPlan[],
      );
      setHostingServices(
        hostingServicesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as HostingService[],
      );
      setSoldSerials(
        soldSerialsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as SoldSerial[],
      );
      setServiceRecords(
        serviceRecordsSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as ServiceRecord[],
      );
      setPaymentAccounts(
        paymentAccountsSnap.docs.map(
          (doc) => ({ id: doc.id, ...doc.data() }) as any,
        ),
      );
      setTransactionCategories(
        transactionCategoriesSnap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as TransactionCategory[],
      );
    } catch (error) {
      console.error("Error fetching data:", error);
      if (!import.meta.env.DEV) {
        toast.error("Failed to load data");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateSettings(settingsFormData);
      toast.success("Site settings updated successfully");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save site settings");
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updates: Record<string, any> = {};
      if (bulkEditData.price) updates.price = Number(bulkEditData.price);
      if (bulkEditData.stock) updates.stock = Number(bulkEditData.stock);
      if (bulkEditData.category) updates.category = bulkEditData.category;
      if (bulkEditData.vendorId) updates.vendorId = bulkEditData.vendorId;
      if (bulkEditData.socketType) updates.socketType = bulkEditData.socketType;
      if (bulkEditData.ramType) updates.ramType = bulkEditData.ramType;

      if (Object.keys(updates).length === 0) {
        toast.error("Please specify at least one field to update");
        return;
      }

      const batch = writeBatch(db);
      for (const id of selectedProductIds) {
        batch.update(doc(db, "products", id), updates);
      }
      await batch.commit();

      if (updates.stock !== undefined) {
        for (const id of selectedProductIds) {
          const product = products.find((p) => p.id === id);
          if (product) {
            checkLowStock(product.name, updates.stock as number);
          }
        }
      }

      toast.success(
        `Successfully updated ${selectedProductIds.length} products`,
      );
      setIsBulkEditing(false);
      setSelectedProductIds([]);
      setBulkEditData({
        price: "",
        stock: "",
        category: "",
        vendorId: "",
        socketType: "",
        ramType: "",
      });
      debouncedFetchData();
    } catch (error) {
      console.error("Error bulk updating products:", error);
      toast.error("Failed to update products");
    } finally {
      setLoading(false);
    }
  };

  const checkLowStock = async (productName: string, newStock: number) => {
    if (
      settings.lowStockThreshold !== undefined &&
      settings.lowStockEmail &&
      newStock < settings.lowStockThreshold
    ) {
      try {
        await fetch(getApiUrl("/api/send-email/low-stock-warning"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productName,
            currentStock: newStock,
          }),
        });
      } catch (error) {
        console.error("Failed to send low stock alert:", error);
      }
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      let permissions: UserPermission[] = [];
      if (newRole === "admin")
        permissions = [
          "view_dashboard",
          "manage_users",
          "manage_settings",
          "manage_inventory",
          "manage_orders",
          "manage_finances",
          "manage_reports",
          "manage_hr",
          "manage_services",
          "manage_marketing",
        ];
      else if (newRole === "manager")
        permissions = [
          "view_dashboard",
          "manage_inventory",
          "manage_orders",
          "manage_finances",
          "manage_reports",
        ];
      else if (newRole === "staff")
        permissions = ["view_dashboard", "manage_inventory", "manage_orders"];

      await updateDoc(doc(db, "users", userId), {
        role: newRole,
        permissions,
      });
      toast.success("User role and permissions updated successfully");
      debouncedFetchData();
    } catch (error) {
      console.error("Error updating user role:", error);
      toast.error("Failed to update user role");
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfirmModal({
      isOpen: true,
      title: `${editingProduct ? "Update" : "Create"} Product`,
      message: `Are you sure you want to ${editingProduct ? "update" : "create"} the product "${formData.name}"?`,
      confirmText: "Confirm",
      confirmColor: "bg-blue-600 hover:bg-blue-700",
        onConfirm: async () => {
        try {
          const productData = {
            ...formData,
            createdAt: new Date().toISOString(),
          };

          if (editingProduct) {
            await updateDoc(
              doc(db, "products", editingProduct.id),
              productData,
            );
            
            // Detailed changes summary
            const changes: string[] = [];
            if (editingProduct.price !== formData.price) changes.push(`Price: ৳${editingProduct.price} ➔ ৳${formData.price}`);
            if (editingProduct.stock !== formData.stock) changes.push(`Stock: ${editingProduct.stock} ➔ ${formData.stock}`);
            if (editingProduct.name !== formData.name) changes.push(`Name: "${editingProduct.name}" ➔ "${formData.name}"`);
            if (editingProduct.costPrice !== formData.costPrice) changes.push(`Cost: ৳${editingProduct.costPrice || 0} ➔ ৳${formData.costPrice || 0}`);
            const changeSummary = changes.length > 0 ? ` (${changes.join(', ')})` : '';

            await logAudit(
              'EDIT',
              'Product',
              `Updated product: "${formData.name}"${changeSummary}`,
              profile?.displayName || profile?.email || 'Admin',
              {
                entityId: editingProduct.id,
                previousState: { name: editingProduct.name, price: editingProduct.price, stock: editingProduct.stock, costPrice: editingProduct.costPrice },
                newState: { name: formData.name, price: formData.price, stock: formData.stock, costPrice: formData.costPrice }
              }
            );

            toast.success("Product updated successfully");
            checkLowStock(productData.name, productData.stock);
          } else {
            const newProdRef = await addDoc(collection(db, "products"), productData);
            await logAudit(
              'CREATE',
              'Product',
              `Added new product: "${formData.name}" (Price: ৳${formData.price}, Stock: ${formData.stock}, Category: ${formData.category})`,
              profile?.displayName || profile?.email || 'Admin',
              {
                entityId: newProdRef.id,
                newState: { name: formData.name, price: formData.price, stock: formData.stock, category: formData.category }
              }
            );
            toast.success("Product added successfully");
            checkLowStock(productData.name, productData.stock);
          }

          setIsAddingProduct(false);
          setEditingProduct(null);
          setFormData({
            model: "",
            name: "",
            price: 0,
            stock: 0,
            category: "Laptop",
            description: "",
            images: [],
            socketType: "",
            ramType: "",
            chipset: "",
            vendorId: "",
            variants: [],
            specs: {},
            hasSerialTracking: false,
            availableSerials: [],
            warrantyMonths: 0,
          });
          debouncedFetchData();
        } catch (error) {
          console.error("Error saving product:", error);
          toast.error("Failed to save product");
        }
      },
    });
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // For email/sms/whatsapp, require recipients. For ad platforms or empty, it could simply be broad targetAudience.
      let allRecipients: string[] = [];
      const needsRecipients = ["email", "sms", "whatsapp"].includes(
        campaignFormData.channel,
      );

      if (needsRecipients) {
        // Parse bulk lists (emails or phones)
        const bulkItems = campaignFormData.bulkEmails
          .split(/[\n,;]/)
          .map((e) => e.trim())
          .filter((e) => e); // just checking truthiness for phones etc

        // Get emails/phones from selected users (assuming email for simplicity right now)
        const selectedUserItems = users
          .filter((u) => campaignFormData.selectedUserIds.includes(u.uid))
          .map((u) => u.email);

        allRecipients = Array.from(
          new Set([...bulkItems, ...selectedUserItems]),
        );

        if (allRecipients.length === 0) {
          toast.error(
            `Please add at least one recipient for ${campaignFormData.channel} campaign`,
          );
          return;
        }
      }

      const campaignData = {
        title: campaignFormData.title,
        channel: campaignFormData.channel,
        subject: campaignFormData.subject,
        content: campaignFormData.content,
        targetAudience: campaignFormData.targetAudience,
        budget: campaignFormData.budget
          ? Number(campaignFormData.budget)
          : null,
        targetUrl: campaignFormData.targetUrl,
        imageUrl: campaignFormData.imageUrl,
        recipients: allRecipients,
        status: campaignFormData.scheduledAt ? "scheduled" : "draft",
        scheduledAt: campaignFormData.scheduledAt || null,
        createdAt: new Date().toISOString(),
      };

      if (editingCampaign) {
        await updateDoc(doc(db, "campaigns", editingCampaign.id), campaignData);
        toast.success("Campaign updated successfully");
      } else {
        await addDoc(collection(db, "campaigns"), campaignData);
        toast.success("Campaign created successfully");
      }

      setIsAddingCampaign(false);
      setEditingCampaign(null);
      setCampaignFormData({
        title: "",
        channel: "email",
        subject: "",
        content: "",
        recipients: [],
        bulkEmails: "",
        selectedUserIds: [],
        scheduledAt: "",
        targetAudience: "",
        budget: "",
        targetUrl: "",
        imageUrl: "",
      });
      debouncedFetchData();
    } catch (error) {
      console.error("Error saving campaign:", error);
      toast.error("Failed to save campaign");
    }
  };

  const handleSendCampaign = async (campaign: Campaign) => {
    setLoading(true);
    try {
      // Update status to sending or launching
      const launchingStatus = ["facebook", "instagram", "google"].includes(
        campaign.channel || "",
      )
        ? "active"
        : "sending";
      await updateDoc(doc(db, "campaigns", campaign.id), {
        status: launchingStatus,
      });
      debouncedFetchData();

      // In a real app, this would call appropriate backend services/APIs (Twilio, Resend, Meta Graph API, Google Ads API)
      toast.loading(`Deploying ${campaign.channel || "email"} campaign...`, {
        id: "sending-campaign",
      });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const finalStatus = ["facebook", "instagram", "google"].includes(
        campaign.channel || "",
      )
        ? "active"
        : "sent";

      await updateDoc(doc(db, "campaigns", campaign.id), {
        status: finalStatus,
        sentAt: new Date().toISOString(),
      });

      toast.success(
        `${campaign.channel || "Email"} campaign deployed successfully!`,
        { id: "sending-campaign" },
      );
      debouncedFetchData();
    } catch (error) {
      console.error("Error sending campaign:", error);
      toast.error("Failed to deploy campaign", { id: "sending-campaign" });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDiscountCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const data = {
        ...discountCodeFormData,
        code: discountCodeFormData.code.toUpperCase(),
        createdAt: new Date().toISOString(),
      };

      if (editingDiscountCode) {
        await updateDoc(doc(db, "couponCodes", editingDiscountCode.id), data);
        toast.success("Discount code updated");
      } else {
        await addDoc(collection(db, "couponCodes"), data);
        toast.success("Discount code created");
      }

      setIsAddingDiscountCode(false);
      setEditingDiscountCode(null);
      setDiscountCodeFormData({
        code: "",
        discountPercentage: 0,
        expiryDate: "",
        isActive: true,
      });
      debouncedFetchData();
    } catch (error) {
      console.error("Error saving discount code:", error);
      toast.error("Failed to save discount code");
    }
  };

  const handleDeleteDiscountCode = async (id: string) => {
    if (!isAdmin) {
      toast.error("You do not have permission to delete this.");
      return;
    }
    if (!confirm("Are you sure you want to delete this discount code?")) return;
    try {
      await deleteDoc(doc(db, "couponCodes", id));
      toast.success("Discount code deleted");
      debouncedFetchData();
    } catch (error) {
      console.error("Error deleting discount code:", error);
      toast.error("Failed to delete discount code");
    }
  };

  const addVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        {
          id: Math.random().toString(36).substr(2, 9),
          name: "",
          sku: "",
          price: prev.price,
          stock: 0,
        },
      ],
    }));
  };

  const removeVariant = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      variants: (prev.variants || []).filter((v) => v.id !== id),
    }));
  };

  const updateVariant = (
    id: string,
    field: keyof ProductVariant,
    value: any,
  ) => {
    setFormData((prev) => ({
      ...prev,
      variants: (prev.variants || []).map((v) =>
        v.id === id ? { ...v, [field]: value } : v,
      ),
    }));
  };

  const addSpec = () => {
    const key = prompt(
      "Enter specification name (e.g. Color, Size, Material):",
    );
    if (key) {
      setFormData((prev) => ({
        ...prev,
        specs: { ...prev.specs, [key]: "" },
      }));
    }
  };

  const removeSpec = (key: string) => {
    const newSpecs = { ...formData.specs };
    delete newSpecs[key];
    setFormData({ ...formData, specs: newSpecs });
  };

  const updateSpec = (key: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      specs: { ...prev.specs, [key]: value },
    }));
  };

  
  const logAuditAction = async (action: 'CREATE' | 'EDIT' | 'DELETE', entityType: string, details: string) => {
    try {
      await addDoc(collection(db, 'audit_logs'), {
        action,
        entityType,
        details,
        performedBy: auth.currentUser?.email || 'Admin',
        timestamp: new Date().toISOString()
      });
    } catch(e) {
      console.error('Audit log failed', e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!isAdmin) {
      toast.error("You do not have permission to delete this.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete Product",
      message:
        "Are you sure you want to delete this product? This action cannot be undone.",
      onConfirm: async () => {
        try {
          const prod = products.find(p => p.id === id);
          if (prod && prod.images && prod.images.length > 0) {
            for (const imgUrl of prod.images) {
              try {
                const imgRef = ref(storage, imgUrl);
                await deleteObject(imgRef);
              } catch(e) { console.error("Failed to delete image", e); }
            }
          }
          await deleteDoc(doc(db, "products", id));
            await logAuditAction('DELETE', 'Product', `Deleted product: ${prod?.name || id}`);
          toast.success("Product deleted");
          debouncedFetchData();
        } catch (error) {
          toast.error("Failed to delete product");
        }
      },
    });
  };

  const updateOrderStatus = async (
    orderId: string,
    status: OrderStatus,
    skipSerialCheck = false,
  ) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      if (
        !skipSerialCheck &&
        (status === "shipped" ||
          status === "delivered" ||
          status === "cancelled")
      ) {
        const itemsNeedingSerials = order.items.filter((item) => {
          const prod = products.find((p) => p.id === item.id);
          return (
            prod?.hasSerialTracking &&
            (!item.selectedSerials ||
              item.selectedSerials.length < item.quantity)
          );
        });

        if (itemsNeedingSerials.length > 0) {
          setSerialSelectionModal({
            isOpen: true,
            orderId,
            newStatus: status,
            items: itemsNeedingSerials.map((i) => {
              const prod = products.find((p) => p.id === i.id);
              return {
                productId: i.id,
                productName: i.name,
                quantity: i.quantity,
                availableSerials: prod?.availableSerials || [],
                selectedSerials: i.selectedSerials || [],
                warrantyMonths: prod?.warrantyMonths || 0,
              };
            }),
          });
          return;
        }
      }

      // Handle stock and serial restorations if status is returned or cancelled
      if (
        (status === "returned" || status === "cancelled") &&
        order.status !== "returned" &&
        order.status !== "cancelled"
      ) {
        for (const item of order.items) {
          const productRef = doc(db, "products", item.id);
          const currentProduct = products.find((p) => p.id === item.id);

          if (currentProduct) {
            const updates: any = {
              stock: currentProduct.stock + item.quantity,
            };

            if (currentProduct.hasSerialTracking && item.selectedSerials) {
              updates.availableSerials = [
                ...(currentProduct.availableSerials || []),
                ...item.selectedSerials,
              ];

              // Remove sold serials from tracking
              for (const serial of item.selectedSerials) {
                const soldSerialRecord = soldSerials.find(
                  (s) => s.serial === serial && s.orderId === orderId,
                );
                if (soldSerialRecord) {
                  await deleteDoc(doc(db, "sold_serials", soldSerialRecord.id));
                }
              }
            }
            await updateDoc(productRef, updates);
          }
        }
      }

      const orderRef = doc(db, "orders", orderId);

      const updateData: any = { status };

      // If the order is being cancelled and payment was pending, mark payment as cancelled
      if (status === "cancelled" && order.paymentStatus === "pending") {
        updateData.paymentStatus = "cancelled";
      }

      await updateDoc(orderRef, updateData);

      // Send shipping update email
      try {
        if (order.customerEmail) {
          await fetch(getApiUrl("/api/send-email/order-status-update"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              orderId: order.documentNumber || order.id,
              customerName: order.customerName,
              customerEmail: order.customerEmail,
              status: status,
            }),
          });
        }
      } catch (e) {
        console.error("Failed to send status update email:", e);
      }

      toast.success("Order status updated");
      debouncedFetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleConfirmSerialSelection = async () => {
    if (!serialSelectionModal) return;

    // Validate
    const invalidItems = serialSelectionModal.items.filter(
      (i) => i.selectedSerials.length !== i.quantity,
    );
    if (invalidItems.length > 0) {
      toast.error(
        `Please select exactly ${invalidItems[0].quantity} serials for ${invalidItems[0].productName}`,
      );
      return;
    }

    try {
      const order = orders.find((o) => o.id === serialSelectionModal.orderId);
      if (!order) return;

      const updatedItems = [...order.items];

      for (const modalItem of serialSelectionModal.items) {
        const itemIndex = updatedItems.findIndex(
          (i) => i.id === modalItem.productId,
        );
        if (itemIndex >= 0) {
          updatedItems[itemIndex].selectedSerials = modalItem.selectedSerials;
        }

        const product = products.find((p) => p.id === modalItem.productId);
        if (product) {
          const remainingSerials = (product.availableSerials || []).filter(
            (s) => !modalItem.selectedSerials.includes(s),
          );
          await updateDoc(doc(db, "products", product.id), {
            availableSerials: remainingSerials,
          });

          // Add to sold_serials
          const warrantyEndDate = new Date();
          warrantyEndDate.setTime(
            addWarranty(warrantyEndDate, modalItem.warrantyMonths).getTime(),
          );

          for (const serial of modalItem.selectedSerials) {
            await addDoc(collection(db, "sold_serials"), {
              serial,
              productId: product.id,
              productName: product.name,
              orderId: order.id,
              customerName: order.customerName,
              customerPhone: order.customerPhone || "",
              soldAt: new Date().toISOString(),
              warrantyEndDate: warrantyEndDate.toISOString(),
              status: "active",
            });
          }
        }
      }

      await updateDoc(doc(db, "orders", order.id), { items: updatedItems });

      // Continue update order status but skip the check this time
      const statusToApply = serialSelectionModal.newStatus;
      setSerialSelectionModal(null); // Clear first to unblock UI
      await updateOrderStatus(order.id, statusToApply, true);
    } catch (err) {
      toast.error("Failed to save serials");
    }
  };

  const updateOrderDiscount = async (
    orderId: string,
    discountAmount: number,
  ) => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      const subtotal = order.items.reduce(
        (acc, item) => acc + item.price * item.quantity,
        0,
      );
      const newTotal = subtotal - discountAmount;

      await updateDoc(doc(db, "orders", orderId), {
        discountAmount,
        total: Math.max(0, newTotal),
      });
      toast.success("Discount updated");
      debouncedFetchData();
    } catch (error) {
      console.error("Error updating discount:", error);
      toast.error("Failed to update discount");
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (!isAdmin) {
      toast.error("You do not have permission to delete this.");
      return;
    }
    if (selectedProductIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Bulk Delete Products",
      message: `Are you sure you want to delete ${selectedProductIds.length} products? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await Promise.all(
            selectedProductIds.map((id) => deleteDoc(doc(db, "products", id))),
          );
          toast.success(`${selectedProductIds.length} products deleted`);
          setSelectedProductIds([]);
          debouncedFetchData();
        } catch (error) {
          toast.error("Failed to delete some products");
        }
      },
    });
  };

  const handleReturnOrder = async (order: any) => {
    if (!isAdmin) {
      toast.error("You do not have permission to return this.");
      return;
    }
    if (order.status === 'returned') {
      toast.error("This order is already returned.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Full Sale Return",
      message: `Are you sure you want to completely return invoice ${order.documentNumber || order.id}? This will automatically restore ALL items to stock and credit the customer's ledger.`,
      confirmText: "Process Full Return",
      confirmColor: "bg-blue-600 hover:bg-blue-700",
      onConfirm: async () => {
        try {
          // 1. Update order status
          await updateDoc(doc(db, 'orders', order.id), { status: 'returned' });
          
          // 2. Restore stock and available serials
          for (const item of order.items || []) {
            if (item.productId || item.id) {
              const prodRef = doc(db, "products", item.productId || item.id);
              const prodSnap = await getDoc(prodRef);
              if (prodSnap.exists()) {
                const currentProd = prodSnap.data();
                const updates: any = {};
                updates.stock = (currentProd.stock || 0) + (item.quantity || 0);

                if (item.selectedSerials && item.selectedSerials.length > 0) {
                  const newAvailable = [
                    ...(currentProd.availableSerials || []),
                    ...item.selectedSerials,
                  ];
                  updates.availableSerials = Array.from(new Set(newAvailable));
                }
                await updateDoc(prodRef, updates);
              }
            }
          }

          // 3. Delete sold_serials records (or mark them returned)
          const serialsSnap = await getDocs(
            query(collection(db, "sold_serials"), where("orderId", "==", order.id))
          );
          await Promise.all(serialsSnap.docs.map((d) => deleteDoc(doc(db, "sold_serials", d.id))));

          // 4. Create Sale Return Transaction
          const docNumber = await generateDocumentNumber('sale_return');
          await addDoc(collection(db, 'transactions'), {
            type: 'sale_return',
            amount: order.total || 0,
            date: new Date().toISOString().split('T')[0],
            description: `Full Return of Invoice #${order.documentNumber || order.id}`,
            entityId: order.customerId || 'general',
            entityName: order.customerName || 'Customer',
            referenceId: order.id,
            documentNumber: docNumber,
            createdAt: new Date().toISOString(),
          });
          
          await logAudit('EDIT', 'Order', `Processed full return for invoice #${order.documentNumber || order.id}`, profile?.displayName || profile?.email || 'Unknown Admin');
          toast.success('Sale returned and stock restored successfully');
          fetchData();
        } catch (error) {
          console.error("Error returning order:", error);
          toast.error("Failed to process return.");
        }
      },
    });
  };
  
  const handleDeleteOrder = async (order: any) => {
    if (!isAdmin) {
      toast.error("You do not have permission to delete this.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete Sale / Order",
      message: `Are you sure you want to permanently delete ${order.documentNumber || order.id}? This will restore stock, available serials, and remove associated transactions.`,
      confirmText: "Delete Permanently",
      confirmColor: "bg-red-600 hover:bg-red-700",
      onConfirm: async () => {
        try {
          // 1. Delete associated transactions (by referenceId AND by documentNumber)
          const txDocsToDelete = new Map<string, any>();
          const txSnap1 = await getDocs(
            query(
              collection(db, "transactions"),
              where("referenceId", "==", order.id),
            ),
          );
          txSnap1.docs.forEach((d) => txDocsToDelete.set(d.id, d.ref));

          if (order.documentNumber) {
            const txSnap2 = await getDocs(
              query(
                collection(db, "transactions"),
                where("documentNumber", "==", order.documentNumber),
              ),
            );
            txSnap2.docs.forEach((d) => txDocsToDelete.set(d.id, d.ref));
          }

          await Promise.all(
            Array.from(txDocsToDelete.values()).map((ref) => deleteDoc(ref)),
          );

          // 2. Revert stock and available serials
          if (
              order.type === "invoice" ||
              order.type === "challan" ||
              order.type === "sale" ||
              order.type === "pos_sale"
            ) {
            for (const item of order.items || []) {
              if (item.productId || item.id) {
                const prodRef = doc(db, "products", item.productId || item.id);
                const currentProd = products.find(
                  (p) => p.id === (item.productId || item.id),
                );
                if (currentProd) {
                  const updates: any = {};
                  updates.stock =
                    (currentProd.stock || 0) + (item.quantity || 0);

                  if (item.selectedSerials && item.selectedSerials.length > 0) {
                    const newAvailable = [
                      ...(currentProd.availableSerials || []),
                      ...item.selectedSerials,
                    ];
                    updates.availableSerials = newAvailable;
                  }
                  await updateDoc(prodRef, updates);
                }
              }
            }

            // 3. Delete sold_serials records
            const serialsSnap = await getDocs(
              query(
                collection(db, "sold_serials"),
                where("orderId", "==", order.id),
              ),
            );
            await Promise.all(
              serialsSnap.docs.map((d) =>
                deleteDoc(doc(db, "sold_serials", d.id)),
              ),
            );
          }

          // 4. Finally delete the order itself
          await deleteDoc(doc(db, 'orders', order.id));
          await logAudit('DELETE', 'Order', `Deleted order #${order.documentNumber || order.id}`, profile?.displayName || profile?.email || 'Unknown Admin');
          toast.success(`Order deleted and reverted successfully`);
          debouncedFetchData();
        } catch (error) {
          console.error("Error deleting order:", error);
          toast.error("Failed to fully delete the order");
        }
      },
    });
  };

  const handleBulkDeleteOrders = async () => {
    if (!isAdmin) {
      toast.error("You do not have permission to delete this.");
      return;
    }
    if (selectedOrderIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      title: "Bulk Delete Orders",
      message: `Are you sure you want to permanently delete ${selectedOrderIds.length} orders? This will restore stock, available serials, and remove associated transactions.`,
      confirmText: "Delete Permanently",
      confirmColor: "bg-red-600 hover:bg-red-700",
      onConfirm: async () => {
        try {
          let count = 0;
          for (const id of selectedOrderIds) {
             const order = orders.find(o => o.id === id);
             if (!order) continue;
             
             // 1. Delete associated transactions (by referenceId AND by documentNumber)
             const txDocsToDelete = new Map<string, any>();
             const txSnap1 = await getDocs(query(collection(db, "transactions"), where("referenceId", "==", order.id)));
             txSnap1.docs.forEach((d) => txDocsToDelete.set(d.id, d.ref));

             if (order.documentNumber) {
               const txSnap2 = await getDocs(query(collection(db, "transactions"), where("documentNumber", "==", order.documentNumber)));
               txSnap2.docs.forEach((d) => txDocsToDelete.set(d.id, d.ref));
             }

             await Promise.all(Array.from(txDocsToDelete.values()).map((ref) => deleteDoc(ref)));
             
             // 2. Revert stock and available serials
             if (order.type === "invoice" || order.type === "challan" || order.type === "sale" || order.type === "pos_sale") {
                for (const item of order.items || []) {
                   if (item.productId || item.id) {
                      const prodRef = doc(db, "products", item.productId || item.id);
                      const currentProd = products.find(p => p.id === (item.productId || item.id));
                      if (currentProd) {
                         const updates: any = {};
                         updates.stock = (currentProd.stock || 0) + (item.quantity || 0);
                         if (item.selectedSerials && item.selectedSerials.length > 0) {
                            updates.availableSerials = [...(currentProd.availableSerials || []), ...item.selectedSerials];
                         }
                         await updateDoc(prodRef, updates);
                      }
                   }
                }
                // 3. Delete sold_serials records
                const serialsSnap = await getDocs(query(collection(db, "sold_serials"), where("orderId", "==", order.id)));
                await Promise.all(serialsSnap.docs.map(d => deleteDoc(doc(db, "sold_serials", d.id))));
             }
             
             // 4. Finally delete the order itself
             await deleteDoc(doc(db, 'orders', order.id));
             count++;
          }
          await logAudit('DELETE', 'Order', `Bulk deleted ${count} orders`, profile?.displayName || profile?.email || 'Unknown Admin');
          toast.success(`${count} orders deleted and stock reverted`);
          setSelectedOrderIds([]);
          debouncedFetchData();
        } catch (error) {
          toast.error("Failed to fully delete some orders");
        }
      },
    });
  };

  

  const handleBulkUpdateOrderStatus = (status: OrderStatus) => {
    if (selectedOrderIds.length === 0) return;

    setConfirmModal({
      isOpen: true,
      title: "Bulk Update Order Status",
      message: `Are you sure you want to update the status of ${selectedOrderIds.length} selected orders to "${status.toUpperCase()}"?`,
      confirmText: "Update Status",
      confirmColor: "bg-[#081621] hover:bg-black shadow-gray-200",
      onConfirm: async () => {
        try {
          await Promise.all(
            selectedOrderIds.map(async (id) => {
              await updateDoc(doc(db, "orders", id), { status });
              const order = orders.find((o) => o.id === id);
              if (order && order.customerEmail) {
                try {
                  await fetch(
                    getApiUrl("/api/send-email/order-status-update"),
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        orderId: order.documentNumber || order.id,
                        customerName: order.customerName,
                        customerEmail: order.customerEmail,
                        status: status,
                      }),
                    },
                  );
                } catch (e) {
                  console.error("Failed to send status update email", e);
                }
              }
            }),
          );
          toast.success(
            `${selectedOrderIds.length} orders updated to ${status}`,
          );
          setSelectedOrderIds([]);
          debouncedFetchData();
        } catch (error) {
          console.error("Error bulk updating orders:", error);
          toast.error("Failed to update some orders");
        }
      },
    });
  };

  const handleBulkExportProducts = () => {
    if (selectedProductIds.length === 0) return;
    const selectedProducts = products.filter((p) =>
      selectedProductIds.includes(p.id),
    );

    const exportData = selectedProducts.map((p) => ({
      ID: p.id,
      SKU: p.sku || "",
      Name: p.name,
      Category: p.category || "",
      SubCategory: p.subCategory || "",
      Brand: p.brand || "",
      Model: p.model || "",
      CostPrice: p.costPrice || 0,
      Price: p.price || 0,
      Stock: p.stock || 0,
      Description: p.description || "",
      SocketType: p.socketType || "",
      RamType: p.ramType || "",
      Chipset: p.chipset || "",
      Images: (p.images || []).join("|"),
    }));

    const csvContent = Papa.unparse(exportData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `products_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportAllProducts = () => {
    if (products.length === 0) return;

    const exportData = products.map((p) => ({
      ID: p.id,
      SKU: p.sku || "",
      Name: p.name,
      Category: p.category || "",
      SubCategory: p.subCategory || "",
      Brand: p.brand || "",
      Model: p.model || "",
      CostPrice: p.costPrice || 0,
      Price: p.price || 0,
      Stock: p.stock || 0,
      Description: p.description || "",
      SocketType: p.socketType || "",
      RamType: p.ramType || "",
      Chipset: p.chipset || "",
      Images: (p.images || []).join("|"),
    }));

    const csvContent = Papa.unparse(exportData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `products_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadCSVTemplate = () => {
    const templateData = [
      {
        ID: "",
        SKU: "10001",
        Name: "Sample Product",
        Category: "Laptop",
        SubCategory: "Gaming",
        Brand: "Asus",
        Model: "ROG",
        CostPrice: "45000",
        Price: "50000",
        Stock: "10",
        Description: "A great laptop",
        SocketType: "",
        RamType: "",
        Chipset: "",
        Images: "https://example.com/image.jpg",
      },
    ];

    const csvContent = Papa.unparse(templateData);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "product_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportProductsCSV = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (!results.data || results.data.length === 0) {
          toast.error("CSV file is empty or missing data");
          return;
        }

        setLoading(true);
        let updatedCount = 0;
        let addedCount = 0;

        try {
          const promises = results.data.map(async (rawRow: any) => {
            const row = Object.keys(rawRow).reduce((acc: any, key) => {
              const cleanKey = key.replace(/^\uFEFF/, "").trim();
              acc[cleanKey] = rawRow[key];
              return acc;
            }, {});

            const cleanNumber = (val: any) => {
              if (typeof val === "number") return val;
              if (!val) return 0;
              return Number(String(val).replace(/,/g, "").trim()) || 0;
            };

            const rowId = row["ID"]?.trim();
            const rowSku = row["SKU"]?.trim();
            const name = row["Name"]?.trim();

            if (!name) return; // Skip if no name

            const productData: any = {
              name,
              sku: rowSku || "",
              category: row["Category"]?.trim() || "Other",
              subCategory: row["SubCategory"]?.trim() || "",
              brand: row["Brand"]?.trim() || "",
              model: row["Model"]?.trim() || "",
              costPrice: cleanNumber(row["CostPrice"]),
              price: cleanNumber(row["Price"]),
              stock: cleanNumber(row["Stock"]),
              description: row["Description"]?.trim() || "",
              socketType: row["SocketType"]?.trim() || "",
              ramType: row["RamType"]?.trim() || "",
              chipset: row["Chipset"]?.trim() || "",
            };

            if (row["Images"]) {
              productData.images = row["Images"]
                .split("|")
                .map((img: string) => img.trim())
                .filter(Boolean);
            }

            // Check if we can UPSERT based on ID first, then SKU, then Name+Category
            let existingProduct = null;

            if (rowId) {
              existingProduct = products.find((p) => p.id === rowId);
            }
            if (!existingProduct && rowSku) {
              existingProduct = products.find((p) => p.sku === rowSku);
            }
            if (!existingProduct) {
              existingProduct = products.find(
                (p) =>
                  p.name.toLowerCase() === name.toLowerCase() &&
                  (p.category || "").toLowerCase() ===
                    productData.category.toLowerCase(),
              );
            }

            if (existingProduct) {
              // Update existing
              await updateDoc(
                doc(db, "products", existingProduct.id),
                productData,
              );
              updatedCount++;
            } else {
              // Create new
              productData.createdAt = new Date().toISOString();
              await addDoc(collection(db, "products"), productData);
              await logAuditAction('CREATE', 'Product', `Created new product: ${formData.name}`);
              addedCount++;
            }
          });

          await Promise.all(promises);
          toast.success(
            `Import complete: ${addedCount} added, ${updatedCount} updated.`,
          );
          debouncedFetchData();
        } catch (error) {
          toast.error("Failed to process CSV file.");
          console.error(error);
        } finally {
          setLoading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      },
      error: (error: any) => {
        toast.error("Failed to parse CSV file: " + error.message);
        console.error(error);
      },
    });
  };

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  const [paymentFormData, setPaymentFormData] = useState({
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );

  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      orderStatusFilter === "all" || order.status === orderStatusFilter;
    const matchesSearch =
      order.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      order.customerName
        .toLowerCase()
        .includes(orderSearchQuery.toLowerCase()) ||
      order.customerPhone
        .toLowerCase()
        .includes(orderSearchQuery.toLowerCase());
    const orderDate = order.createdAt.split("T")[0];
    const matchesStartDate = !orderStartDate || orderDate >= orderStartDate;
    const matchesEndDate = !orderEndDate || orderDate <= orderEndDate;
    return matchesStatus && matchesSearch && matchesStartDate && matchesEndDate;
  });

  const handleExportFilteredOrders = () => {
    const headers = [
      "Order ID",
      "Customer Name",
      "Phone",
      "Total",
      "Status",
      "Date",
    ];
    const csvContent = [
      headers.join(","),
      ...filteredOrders.map((o) =>
        [
          o.id,
          `"${o.customerName}"`,
          `"${o.customerPhone}"`,
          o.total,
          o.status,
          o.createdAt,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `orders_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleRecordCustomerPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) return;
    try {
      const customer = customers.find((c) => c.id === selectedCustomerId);
      if (!customer) throw new Error("Customer not found");

      const receiptNumber = await generateDocumentNumber("REC");

      await addDoc(collection(db, "transactions"), {
        type: "money_receipt",
        amount: paymentFormData.amount,
        date: paymentFormData.date,
        description:
          paymentFormData.description || `Payment from ${customer.name}`,
        entityId: selectedCustomerId,
        entityName: customer.name,
        referenceId: receiptNumber,
        createdAt: new Date().toISOString(),
      });
      toast.success("Payment recorded successfully");
      setIsRecordingPayment(false);
      setPaymentFormData({
        amount: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      debouncedFetchData();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    }
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const customerData = {
        ...customerFormData,
        createdAt: new Date().toISOString(),
      };

      if (editingCustomer) {
        await updateDoc(doc(db, "customers", editingCustomer.id), customerData);
        toast.success("Customer updated successfully");
      } else {
        await addDoc(collection(db, "customers"), customerData);
        toast.success("Customer added successfully");
      }

      setIsAddingCustomer(false);
      setEditingCustomer(null);
      setCustomerFormData({ name: "", email: "", phone: "", address: "" });
      await debouncedFetchData();
    } catch (error) {
      console.error("Error saving customer:", error);
      toast.error("Failed to save customer");
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!isAdmin) {
      toast.error("You do not have permission to delete this.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete Customer",
      message:
        "Are you sure you want to delete this customer? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "customers", id));
          toast.success("Customer deleted");
          debouncedFetchData();
        } catch (error) {
          toast.error("Failed to delete customer");
        }
      },
    });
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const vendorData = {
        ...vendorFormData,
        createdAt: new Date().toISOString(),
      };

      if (editingVendor) {
        await updateDoc(doc(db, "vendors", editingVendor.id), vendorData);
        toast.success("Vendor updated successfully");
      } else {
        await addDoc(collection(db, "vendors"), vendorData);
        toast.success("Vendor added successfully");
      }

      setIsAddingVendor(false);
      setEditingVendor(null);
      setVendorFormData({
        name: "",
        email: "",
        phone: "",
        address: "",
        category: "General",
      });
      debouncedFetchData();
    } catch (error) {
      console.error("Error saving vendor:", error);
      toast.error("Failed to save vendor");
    }
  };

  const handleDeleteVendor = async (id: string) => {
    if (!isAdmin) {
      toast.error("You do not have permission to delete this.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete Vendor",
      message:
        "Are you sure you want to delete this vendor? This action cannot be undone.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "vendors", id));
          toast.success("Vendor deleted");
          debouncedFetchData();
        } catch (error) {
          toast.error("Failed to delete vendor");
        }
      },
    });
  };

  const handleFirestoreError = (
    error: unknown,
    operationType: string,
    path: string | null,
  ) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo:
          auth.currentUser?.providerData.map((provider) => ({
            providerId: provider.providerId,
            displayName: provider.displayName,
            email: provider.email,
            photoUrl: provider.photoURL,
          })) || [],
      },
      operationType,
      path,
    };
    console.error("Firestore Error: ", JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const handleDeleteHostingService = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Hosting Service",
      message: "Are you sure you want to delete this service category?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "hostingServices", id));
          toast.success("Service deleted");
          debouncedFetchData();
        } catch (error) {
          console.error("Error deleting service:", error);
          toast.error("Failed to delete service");
        }
      },
    });
  };

  const handleSaveHostingService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const serviceData = {
        ...hostingServiceFormData,
      };

      if (editingHostingService) {
        await updateDoc(
          doc(db, "hostingServices", editingHostingService.id),
          serviceData,
        );
        toast.success("Service updated successfully");
      } else {
        await addDoc(collection(db, "hostingServices"), serviceData);
        toast.success("Service added successfully");
      }

      setIsAddingHostingService(false);
      setEditingHostingService(null);
      setHostingServiceFormData({
        title: "",
        description: "",
        iconPath: "",
        startingPrice: 0,
        billingCycle: "/mo",
        currency: "BDT",
        order: 0,
        isActive: true,
      });
      debouncedFetchData();
    } catch (error) {
      console.error("Error saving service:", error);
      toast.error("Failed to save service");
    }
  };

  const handleDeleteHostingPlan = async (id: string) => {
    setConfirmModal({
      isOpen: true,
      title: "Delete Hosting Plan",
      message: "Are you sure you want to delete this plan?",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "hostingPlans", id));
          toast.success("Plan deleted");
          debouncedFetchData();
        } catch (error) {
          console.error("Error deleting plan:", error);
          toast.error("Failed to delete plan");
        }
      },
    });
  };

  const handleSaveHostingPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const planData = {
        ...hostingPlanFormData,
        createdAt: new Date().toISOString(),
      };

      if (editingHostingPlan) {
        await updateDoc(
          doc(db, "hostingPlans", editingHostingPlan.id),
          planData,
        );
        toast.success("Plan updated successfully");
      } else {
        await addDoc(collection(db, "hostingPlans"), planData);
        toast.success("Plan added successfully");
      }

      setIsAddingHostingPlan(false);
      setEditingHostingPlan(null);
      setHostingPlanFormData({
        serviceId: "",
        name: "",
        price: 0,
        billingCycle: "/mo",
        features: [],
        popular: false,
        order: 0,
      });
      debouncedFetchData();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Failed to save plan");
    }
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const menuData = {
        ...menuFormData,
        createdAt: new Date().toISOString(),
      };

      if (editingMenu) {
        await updateDoc(doc(db, "menus", editingMenu.id), menuData);
        toast.success("Menu updated successfully");
      } else {
        await addDoc(collection(db, "menus"), menuData);
        toast.success("Menu added successfully");
      }

      setIsAddingMenu(false);
      setEditingMenu(null);
      setMenuFormData({ name: "", slug: "", order: 0, subCategories: [] });
      debouncedFetchData();
    } catch (error) {
      console.error("Error saving menu:", error);
      toast.error("Failed to save menu");
      try {
        handleFirestoreError(error, editingMenu ? "update" : "create", "menus");
      } catch (e) {
        // Error already logged
      }
    }
  };

  const handleDeleteMenu = async (id: string) => {
    if (!isAdmin) {
      toast.error("You do not have permission to delete this.");
      return;
    }
    setConfirmModal({
      isOpen: true,
      title: "Delete Category",
      message:
        "Are you sure you want to delete this category? All subcategories will also be removed.",
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "menus", id));
          toast.success("Category deleted");
          debouncedFetchData();
        } catch (error) {
          console.error("Error deleting menu:", error);
          toast.error("Failed to delete category");
          try {
            handleFirestoreError(error, "delete", `menus/${id}`);
          } catch (e) {
            // Error already logged
          }
        }
      },
    });
  };

  const handleSaveSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCategoryFormData.parentId) {
      toast.error("Please select a parent category");
      return;
    }
    try {
      const parentMenu = menus.find(
        (m) => m.id === subCategoryFormData.parentId,
      );
      if (!parentMenu) return;

      const newSub = {
        id: Math.random().toString(36).substr(2, 9),
        name: subCategoryFormData.name,
        slug:
          subCategoryFormData.slug ||
          subCategoryFormData.name.toLowerCase().replace(/\s+/g, "-"),
        brands: subCategoryFormData.brands
          ? subCategoryFormData.brands
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };

      const updatedSubCategories = [
        ...(parentMenu.subCategories || []),
        newSub,
      ];
      await updateDoc(doc(db, "menus", parentMenu.id), {
        subCategories: updatedSubCategories,
      });

      toast.success("Sub category added successfully");
      setIsAddingSubCategory(false);
      setSubCategoryFormData({ parentId: "", name: "", slug: "", brands: "" });
      debouncedFetchData();
    } catch (error) {
      console.error("Error adding sub category:", error);
      toast.error("Failed to add sub category");
      try {
        handleFirestoreError(
          error,
          "update",
          `menus/${subCategoryFormData.parentId}`,
        );
      } catch (e) {
        // Error already logged
      }
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLedgerEntity || paymentAmount <= 0) return;

    try {
      const type =
        selectedLedgerEntity.type === "customer"
          ? "payment_received"
          : "payment_made";
      let receiptNumber = "";
      if (type === "payment_received") {
        receiptNumber = await generateDocumentNumber("REC");
      }

      const transactionData = {
        type,
        amount: paymentAmount,
        date: new Date().toISOString(),
        description:
          paymentDescription || `Payment from ${selectedLedgerEntity.name}`,
        entityId: selectedLedgerEntity.id,
        entityName: selectedLedgerEntity.name,
        referenceId: receiptNumber || undefined,
        createdAt: new Date().toISOString(),
        paymentMethod: ledgerPaymentMethod,
      };

      await addDoc(collection(db, "transactions"), transactionData);
      toast.success("Payment recorded successfully");
      setPaymentAmount(0);
      setPaymentDescription("");
      setLedgerPaymentMethod("cash");
      debouncedFetchData();
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    }
  };

  const getSalesReportData = () => {
    const aggregatedData: {
      [key: string]: {
        date: string;
        productName: string;
        quantity: number;
        total: number;
      };
    } = {};

    orders.forEach((order) => {
      const orderDate = order.createdAt.split("T")[0];
      if (orderDate >= reportStartDate && orderDate <= reportEndDate) {
        order.items.forEach((item) => {
          const key = `${orderDate}_${item.id}`;
          if (aggregatedData[key]) {
            aggregatedData[key].quantity += item.quantity;
            aggregatedData[key].total += item.price * item.quantity;
          } else {
            aggregatedData[key] = {
              date: orderDate,
              productName: item.name,
              quantity: item.quantity,
              total: item.price * item.quantity,
            };
          }
        });
      }
    });

    let reportArray = Object.values(aggregatedData);

    // Filter by search
    if (reportSearch) {
      reportArray = reportArray.filter(
        (item) =>
          item.productName.toLowerCase().includes(reportSearch.toLowerCase()) ||
          item.date.includes(reportSearch),
      );
    }

    // Sort
    reportArray.sort((a, b) => {
      const valA = a[reportSortConfig.key as keyof typeof a];
      const valB = b[reportSortConfig.key as keyof typeof b];
      if (valA < valB) return reportSortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return reportSortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return reportArray;
  };

  const exportToCSV = () => {
    const data = getSalesReportData();
    const headers = ["Date", "Product Name", "Quantity", "Total Amount"];
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        [row.date, `"${row.productName}"`, row.quantity, row.total].join(","),
      ),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `sales_report_${reportStartDate}_to_${reportEndDate}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCustomerReceiveReportData = () => {
    const reportData: Array<{
      id: string;
      date: string;
      customerName: string;
      description: string;
      paymentMethod: string;
      amount: number;
      referenceId: string;
    }> = [];

    transactions.forEach((tx) => {
      // We look for 'payment_received', 'money_receipt', or 'sale'
      if (!["payment_received", "money_receipt", "sale"].includes(tx.type)) {
        return;
      }

      // Check date range
      const txDate = tx.date || tx.createdAt || new Date().toISOString();
      const orderDate = txDate.split("T")[0];
      if (orderDate < crReportStartDate || orderDate > crReportEndDate) {
        return;
      }

      // Determine customer name
      const customerName = tx.entityName || "Guest Customer";

      // Filter by customer if filter selected
      if (crReportCustomer !== "all" && tx.entityId !== crReportCustomer) {
        return;
      }

      // Determine payment method
      let method = tx.paymentMethod || "cash";

      // If it's a POS/invoice order transaction, look up the order payment method
      if (tx.type === "sale" && tx.referenceId) {
        const matchingOrder = orders.find((o) => o.id === tx.referenceId);
        if (matchingOrder && matchingOrder.paymentMethod) {
          method = matchingOrder.paymentMethod;
        }
      } else {
        // Fallback checks on description if direct payment
        const descLower = (tx.description || "").toLowerCase();
        if (descLower.includes("bkash")) method = "bkash";
        else if (descLower.includes("nagad")) method = "nagad";
        else if (descLower.includes("rocket")) method = "rocket";
        else if (descLower.includes("bank")) method = "bank";
        else if (
          descLower.includes("card") ||
          descLower.includes("visa") ||
          descLower.includes("mastercard")
        )
          method = "card";
        else if (descLower.includes("cellfin")) method = "cellfin";
      }

      // Filter by payment method if filter selected
      if (crReportMethod !== "all" && method !== crReportMethod) {
        return;
      }

      const refId = tx.referenceId || "N/A";
      const description =
        tx.description || `Payment received from ${customerName}`;

      // Filter by search terms
      if (crReportSearch) {
        const s = crReportSearch.toLowerCase();
        const matchesSearch =
          customerName.toLowerCase().includes(s) ||
          description.toLowerCase().includes(s) ||
          refId.toLowerCase().includes(s) ||
          method.toLowerCase().includes(s);
        if (!matchesSearch) {
          return;
        }
      }

      reportData.push({
        id: tx.id,
        date: txDate,
        customerName,
        description,
        paymentMethod: method,
        amount: tx.amount,
        referenceId: refId,
      });
    });

    // Sort by date desc
    return reportData.sort((a, b) => b.date.localeCompare(a.date));
  };

  const exportCrToCSV = () => {
    const data = getCustomerReceiveReportData();
    const headers = [
      "Date",
      "Receipt No / Ref",
      "Customer Name",
      "Description",
      "Payment Method",
      "Amount",
    ];
    const csvRows = [
      headers.join(","),
      ...data.map((row) =>
        [
          `"${new Date(row.date).toLocaleString()}"`,
          `"${row.referenceId}"`,
          `"${row.customerName}"`,
          `"${row.description.replace(/"/g, '""')}"`,
          `"${row.paymentMethod.toUpperCase()}"`,
          row.amount,
        ].join(","),
      ),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `customer_receive_report_${crReportStartDate}_to_${crReportEndDate}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purchaseData.items.length === 0 || !purchaseData.vendorId) {
      toast.error("Please select a vendor and add products");
      return;
    }

    try {
      const totalAmount = purchaseData.items.reduce(
        (sum, item) => sum + item.purchasePrice * item.quantity,
        0,
      );

      // 1. Update Product Stock
      for (const item of purchaseData.items) {
        const productRef = doc(db, "products", item.id);
        const currentProduct = products.find((p) => p.id === item.id);
        if (currentProduct) {
          const updates: any = {
            stock: currentProduct.stock + item.quantity,
          };

          if (item.hasWarranty) {
            updates.warrantyMonths = (item.warrantyYears || 0) * 12;
          }

          if (currentProduct.hasSerialTracking && item.newSerials) {
            const addedSerials = Array.isArray(item.newSerials)
              ? item.newSerials.filter((s: string) => s.trim())
              : item.newSerials
                  .split("\n")
                  .map((s: string) => s.trim())
                  .filter((s: string) => s);
            updates.availableSerials = [
              ...(currentProduct.availableSerials || []),
              ...addedSerials,
            ];
          }

          await updateDoc(productRef, updates);
        }
      }

      // 2. Create Purchase Transaction
      const transactionData = {
        type: "purchase",
        amount: totalAmount,
        date: new Date().toISOString(),
        description:
          purchaseData.description ||
          `Purchase from ${purchaseData.vendorName}`,
        entityId: purchaseData.vendorId,
        entityName: purchaseData.vendorName,
        createdAt: new Date().toISOString(),
      };

      await addDoc(collection(db, "transactions"), transactionData);

      toast.success("Purchase recorded and inventory updated");
      setIsCreatingPurchase(false);
      setPurchaseData({
        vendorId: "",
        vendorName: "",
        items: [],
        description: "",
      });
      debouncedFetchData();
    } catch (error) {
      console.error("Error creating purchase:", error);
      toast.error("Failed to create purchase");
    }
  };

  const handleBulkExportOrders = () => {
    if (selectedOrderIds.length === 0) return;
    const selectedOrders = orders.filter((o) =>
      selectedOrderIds.includes(o.id),
    );

    const headers = [
      "Order ID",
      "Customer Name",
      "Phone",
      "Total",
      "Status",
      "Date",
    ];
    const csvContent = [
      headers.join(","),
      ...selectedOrders.map((o) =>
        [
          o.id,
          `"${(o.customerName || "").replace(/"/g, '""')}"`,
          `"${(o.customerPhone || "").replace(/"/g, '""')}"`,
          o.total,
          o.status,
          o.createdAt,
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute(
      "download",
      `selected_orders_export_${new Date().toISOString().split("T")[0]}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success(`Exported ${selectedOrderIds.length} orders`);
  };

  const handleCreateSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saleData.items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    try {
      for (const item of saleData.items) {
        if (item.hasSerialTracking) {
          if (
            !item.selectedSerials ||
            item.selectedSerials.length !== item.quantity
          ) {
            toast.error(
              `Please select exactly ${item.quantity} serial(s) for ${item.name}`,
            );
            return;
          }
        }
      }

      const docType =
        saleData.type === "quotation"
          ? "QUO"
          : saleData.type === "challan"
            ? "CHA"
            : "INV";
      const docNumber = await generateDocumentNumber(docType);

      const subtotal = saleData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      const effectiveDiscount =
        saleData.appliedDiscountPercentage > 0
          ? (subtotal * saleData.appliedDiscountPercentage) / 100
          : saleData.discountAmount || 0;
      const total = subtotal - effectiveDiscount;
      const processedItems = saleData.items.map((item) => {
        const currentProduct = products.find((p) => p.id === item.id);
        const wMonths = item.hasWarranty
          ? (item.warrantyYears || 0) * 12
          : currentProduct?.warrantyMonths || 0;
        return { ...item, warrantyMonths: wMonths };
      });

      const orderData = {
        ...saleData,
        items: processedItems,
        discountAmount: effectiveDiscount,
        documentNumber: docNumber,
        total: Math.max(0, total),
        status: "delivered",
        userId: "admin",
        createdAt: new Date().toISOString(),
      };

      const orderRef = await addDoc(collection(db, "orders"), orderData);

      // Update Stock for Invoice/Challan
      if (saleData.type === "invoice" || saleData.type === "challan") {
        for (const item of saleData.items) {
          const productRef = doc(db, "products", item.id);
          const currentProduct = products.find((p) => p.id === item.id);
          if (currentProduct) {
            const updates: any = {};
            const newStock = Math.max(0, currentProduct.stock - item.quantity);
            updates.stock = newStock;

            if (currentProduct.hasSerialTracking && item.selectedSerials) {
              const remainingSerials = (
                currentProduct.availableSerials || []
              ).filter((s) => !item.selectedSerials.includes(s));
              updates.availableSerials = remainingSerials;

              // Add to sold_serials collection
              const warrantyEndDate = new Date();
              const wMonths = item.hasWarranty
                ? (item.warrantyYears || 0) * 12
                : currentProduct.warrantyMonths || 0;
              warrantyEndDate.setTime(addWarranty(warrantyEndDate, wMonths).getTime());

              for (const serial of item.selectedSerials) {
                await addDoc(collection(db, "sold_serials"), {
                  serial,
                  productId: currentProduct.id,
                  productName: currentProduct.name,
                  orderId: orderRef.id,
                  customerName: saleData.customerName,
                  customerPhone: saleData.customerPhone,
                  soldAt: new Date().toISOString(),
                  warrantyEndDate: warrantyEndDate.toISOString(),
                  status: "active",
                });
              }
            }

            await updateDoc(productRef, updates);
            checkLowStock(currentProduct.name, newStock);
          }
        }
      }

      // Record Transaction
      const customer = customers.find((c) => c.name === saleData.customerName);
      await addDoc(collection(db, "transactions"), {
        type: "sale",
        amount: Math.max(0, total),
        date: new Date().toISOString(),
        description: `Sale to ${saleData.customerName}`,
        entityId: customer?.id || "unknown",
        entityName: saleData.customerName,
        referenceId: orderRef.id,
        createdAt: new Date().toISOString(),
      });

      toast.success("Sale recorded successfully");
      setIsCreatingSale(false);
      setSaleData({
        customerName: "",
        customerPhone: "",
        customerEmail: "",
        shippingAddress: "",
        items: [],
        type: "invoice",
        discountAmount: 0,
        appliedDiscountPercentage: 0,
        appliedDiscountCode: "",
      });
      setSaleDiscountCodeInput("");
      debouncedFetchData();
    } catch (error) {
      console.error("Error creating sale:", error);
      toast.error("Failed to record sale");
    }
  };

  const addItemToSale = (product: Product) => {
    setSaleData((prev) => {
      const existing = prev.items.find((i) => i.id === product.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return {
        ...prev,
        items: [...prev.items, { ...product, quantity: 1 }],
      };
    });
    toast.success(`Added ${product.name} to sale`);
  };

  const addItemToPurchase = (product: Product) => {
    setPurchaseData((prev) => {
      const existing = prev.items.find((i) => i.id === product.id);
      if (existing) {
        return {
          ...prev,
          items: prev.items.map((i) =>
            i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i,
          ),
        };
      }
      return {
        ...prev,
        items: [
          ...prev.items,
          { ...product, quantity: 1, purchasePrice: product.price * 0.8 },
        ], // Default purchase price 80% of selling price
      };
    });
    toast.success(`Added ${product.name} to purchase list`);
  };

  const removeItemFromPurchase = (productId: string) => {
    setPurchaseData((prev) => ({
      ...prev,
      items: prev.items.filter((i) => i.id !== productId),
    }));
  };

  const updatePurchaseItem = (productId: string, field: string, value: any) => {
    setPurchaseData((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.id === productId ? { ...i, [field]: value } : i,
      ),
    }));
  };

  const handleDownloadLedgerPDF = async () => {
    if (!selectedLedgerEntity) return;

    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF();
    const entityTransactions = transactions
      .filter((t) => {
        const matchesEntity = t.entityId === selectedLedgerEntity.id;
        const txDate = new Date(t.date).toISOString().split("T")[0];
        const matchesDate =
          txDate >= ledgerStartDate && txDate <= ledgerEndDate;
        const matchesSearch =
          t.description
            .toLowerCase()
            .includes(ledgerSearchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(ledgerSearchQuery.toLowerCase());
        return matchesEntity && matchesDate && matchesSearch;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Header
    doc.setFontSize(20);
    doc.setTextColor(30, 58, 138); // Deep Blue
    doc.text("CLICK2IT BD", 105, 20, { align: "center" });

    doc.setFontSize(14);
    doc.setTextColor(8, 22, 33); // #081621
    doc.text(`${selectedLedgerEntity.name}'s Ledger Report`, 105, 30, {
      align: "center",
    });

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Period: ${ledgerStartDate} to ${ledgerEndDate}`, 105, 38, {
      align: "center",
    });

    // Summary
    const totalDebit = entityTransactions
      .filter((t) =>
        selectedLedgerEntity.type === "customer"
          ? t.type === "sale"
          : t.type === "payment_made",
      )
      .reduce((sum, t) => sum + t.amount, 0);
    const totalCredit = entityTransactions
      .filter((t) =>
        selectedLedgerEntity.type === "customer"
          ? t.type === "payment_received"
          : t.type === "purchase",
      )
      .reduce((sum, t) => sum + t.amount, 0);
    const balance =
      selectedLedgerEntity.type === "customer"
        ? totalDebit - totalCredit
        : totalCredit - totalDebit;

    autoTable(doc, {
      startY: 45,
      head: [["Total Debit", "Total Credit", "Outstanding Balance"]],
      body: [
        [
          formatCurrency(totalDebit, settings),
          formatCurrency(totalCredit, settings),
          formatCurrency(balance, settings),
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [8, 22, 33] },
    });

    // Transactions Table
    let runningBalance = 0;
    const tableData = entityTransactions.map((t) => {
      const isDebit =
        selectedLedgerEntity.type === "customer"
          ? t.type === "sale"
          : t.type === "payment_made";
      const isCredit =
        selectedLedgerEntity.type === "customer"
          ? t.type === "payment_received"
          : t.type === "purchase";

      if (isDebit) runningBalance += t.amount;
      if (isCredit) runningBalance -= t.amount;
      const displayBalance =
        selectedLedgerEntity.type === "vendor"
          ? -runningBalance
          : runningBalance;

      return [
        new Date(t.date).toLocaleDateString(),
        t.description,
        t.type.replace("_", " ").toUpperCase(),
        isDebit ? formatCurrency(t.amount, settings) : "-",
        isCredit ? formatCurrency(t.amount, settings) : "-",
        formatCurrency(displayBalance, settings),
      ];
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 10,
      head: [["Date", "Description", "Type", "Debit", "Credit", "Balance"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [239, 68, 68] },
    });

    doc.save(
      `${selectedLedgerEntity.name}_Ledger_${ledgerStartDate}_to_${ledgerEndDate}.pdf`,
    );
  };

  const handleDownloadLedgerCSV = () => {
    if (!selectedLedgerEntity) return;

    const entityTransactions = transactions
      .filter((t) => {
        const matchesEntity = t.entityId === selectedLedgerEntity.id;
        const txDate = new Date(t.date).toISOString().split("T")[0];
        const matchesDate =
          txDate >= ledgerStartDate && txDate <= ledgerEndDate;
        const matchesSearch =
          t.description
            .toLowerCase()
            .includes(ledgerSearchQuery.toLowerCase()) ||
          t.id.toLowerCase().includes(ledgerSearchQuery.toLowerCase());
        return matchesEntity && matchesDate && matchesSearch;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    const csvRows = [
      ["Date", "Description", "Type", "Debit", "Credit", "Balance"],
      ...entityTransactions.map((t) => {
        const isDebit =
          selectedLedgerEntity.type === "customer"
            ? t.type === "sale"
            : t.type === "payment_made";
        const isCredit =
          selectedLedgerEntity.type === "customer"
            ? t.type === "payment_received"
            : t.type === "purchase";

        if (isDebit) runningBalance += t.amount;
        if (isCredit) runningBalance -= t.amount;
        const displayBalance =
          selectedLedgerEntity.type === "vendor"
            ? -runningBalance
            : runningBalance;

        return [
          new Date(t.date).toLocaleDateString(),
          `"${t.description.replace(/"/g, '""')}"`,
          t.type.replace("_", " ").toUpperCase(),
          isDebit ? t.amount : 0,
          isCredit ? t.amount : 0,
          displayBalance,
        ];
      }),
    ];

    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${selectedLedgerEntity.name}_Ledger_${ledgerStartDate}_to_${ledgerEndDate}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printServiceReceipt = async (record: ServiceRecord) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF("p", "mm", "a4");
    let currentY = 20;

    const useLetterhead = settings?.documentDesign?.printOnLetterhead;

    if (!useLetterhead) {
      try {
        doc.addImage(logoBase64, "PNG", 20, currentY, 25, 20);
        currentY += 25;
      } catch (e) {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(8, 22, 33);
        doc.text(settings?.brandName || "CLICK2IT BD", 20, currentY);
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Shop No. 1072, Level-10, Multiplan Center", 20, currentY + 2);
      doc.text(
        "69-71, New Elephant Road, Dhaka-1205, Bangladesh.",
        20,
        currentY + 6,
      );
      doc.text(
        "Phone: +8809640887777, +8801729887777 | Web: click2itbd.com",
        20,
        currentY + 10,
      );
    } else {
      currentY += 20;
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("SERVICE RECEIPT", 190, currentY, { align: "right" });

    currentY += 20;
    doc.setDrawColor(239, 68, 68);
    doc.line(20, currentY, 190, currentY);

    currentY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Ticket ID: ${record.id.toUpperCase()}`, 20, currentY);
    doc.text(
      `Date Received: ${new Date(record.receivedAt).toLocaleDateString()}`,
      20,
      currentY + 7,
    );
    doc.text(`Customer: ${record.customerName}`, 140, currentY);
    doc.text(`Phone: ${record.customerPhone}`, 140, currentY + 7);

    currentY += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Device Information", 20, currentY);
    doc.setFont("helvetica", "normal");

    currentY += 10;
    doc.text(`Product Name: ${record.productName}`, 20, currentY);
    doc.text(`Serial Number: ${record.serialNumber}`, 140, currentY);

    currentY += 10;
    doc.text(
      `Type: ${record.isWarranty ? "Warranty Claim" : "Paid Service"}`,
      20,
      currentY,
    );
    if (!record.isWarranty) {
      doc.text(
        `Estimated/Final Charge: ${formatCurrency(record.serviceCharge || 0, settings)}`,
        140,
        currentY,
      );
    }

    currentY += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Issue Description", 20, currentY);
    doc.setFont("helvetica", "normal");

    currentY += 10;
    const splitDesc = doc.splitTextToSize(record.issueDescription, 170);
    doc.text(splitDesc, 20, currentY);

    currentY += splitDesc.length * 7 + 20;
    doc.setFontSize(10);
    doc.text("Customer Signature", 40, currentY, { align: "center" });
    doc.line(20, currentY - 5, 60, currentY - 5);

    doc.text("Authorized Signature", 170, currentY, { align: "center" });
    doc.line(150, currentY - 5, 190, currentY - 5);

    doc.save(`Service_Receipt_${record.id}.pdf`);
  };

  const printServiceBill = async (record: ServiceRecord) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;
    const doc = new jsPDF("p", "mm", "a4");
    let currentY = 20;

    const useLetterhead = settings?.documentDesign?.printOnLetterhead;

    if (!useLetterhead) {
      try {
        doc.addImage(logoBase64, "PNG", 20, currentY, 25, 20);
        currentY += 25;
      } catch (e) {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(8, 22, 33);
        doc.text(settings?.brandName || "CLICK2IT BD", 20, currentY);
      }

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      doc.text("Shop No. 1072, Level-10, Multiplan Center", 20, currentY + 2);
      doc.text(
        "69-71, New Elephant Road, Dhaka-1205, Bangladesh.",
        20,
        currentY + 6,
      );
      doc.text(
        "Phone: +8809640887777, +8801729887777 | Web: click2itbd.com",
        20,
        currentY + 10,
      );
    } else {
      currentY += 20;
    }

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text("SERVICE BILL / INVOICE", 190, currentY, { align: "right" });

    currentY += 20;
    doc.setDrawColor(239, 68, 68);
    doc.line(20, currentY, 190, currentY);

    currentY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(`Ticket ID: ${record.id.toUpperCase()}`, 20, currentY);
    doc.text(
      `Date Received: ${new Date(record.receivedAt).toLocaleDateString()}`,
      20,
      currentY + 7,
    );
    doc.text(`Customer: ${record.customerName}`, 140, currentY);
    doc.text(`Phone: ${record.customerPhone}`, 140, currentY + 7);

    currentY += 20;
    doc.setFont("helvetica", "bold");
    doc.text("Service Details", 20, currentY);
    doc.setFont("helvetica", "normal");

    currentY += 10;
    const splitDesc = doc.splitTextToSize(
      `Serviced: ${record.productName} (SN: ${record.serialNumber}) - ${record.issueDescription}`,
      120,
    );
    doc.text(splitDesc, 20, currentY);

    doc.text(
      formatCurrency(record.serviceCharge || 0, settings),
      190,
      currentY,
      { align: "right" },
    );

    currentY += Math.max(splitDesc.length * 7, 20) + 10;

    doc.line(20, currentY, 190, currentY);
    currentY += 10;

    doc.setFont("helvetica", "bold");
    doc.text("Total Amount Due:", 130, currentY);
    doc.text(
      formatCurrency(record.serviceCharge || 0, settings),
      190,
      currentY,
      { align: "right" },
    );

    currentY += 10;
    doc.setFont("helvetica", "normal");
    doc.text(
      `Payment Status: ${record.paymentStatus?.toUpperCase() || "PENDING"}`,
      130,
      currentY,
    );
    if (record.paymentMethod) {
      currentY += 7;
      doc.text(
        `Payment Method: ${record.paymentMethod.toUpperCase()}`,
        130,
        currentY,
      );
    }

    currentY += 40;
    doc.setFontSize(10);
    doc.text("Authorized Signature", 170, currentY, { align: "center" });
    doc.line(140, currentY - 5, 190, currentY - 5);

    doc.save(`Service_Bill_${record.id}.pdf`);
  };

  const statusIcons = {
    pending: <Clock className="text-yellow-500" size={18} />,
    processing: <ShoppingBag className="text-blue-500" size={18} />,
    shipped: <Truck className="text-purple-500" size={18} />,
    delivered: <CheckCircle className="text-green-500" size={18} />,
    cancelled: <XCircle className="text-red-500" size={18} />,
  };

  return (
    <div className="min-h-screen bg-[#F4F7F6] flex font-sans text-gray-800">
      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          isSidebarCollapsed ? "w-[80px]" : "w-[260px]",
          "bg-white border-r border-gray-200 flex-col h-screen overflow-y-auto shrink-0 shadow-sm z-50 transition-all duration-300",
          "fixed inset-y-0 left-0 lg:sticky lg:top-0 lg:flex",
          isMobileMenuOpen ? "flex" : "hidden",
        )}
      >
        <div
          className={cn(
            "h-[60px] flex items-center border-b border-gray-100 shrink-0 justify-between relative",
            isSidebarCollapsed ? "px-2" : "px-6",
          )}
        >
          {!isSidebarCollapsed ? (
            <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-[#0f172a] truncate w-full">
              <img
                src={logoBase64}
                alt="Logo"
                className="w-8 h-8 object-contain shrink-0"
              />
              <span className="truncate">Dashboard</span>
            </div>
          ) : (
            <div className="flex items-center justify-center w-full">
              <img
                src={logoBase64}
                alt="Logo"
                className="w-8 h-8 object-contain"
              />
            </div>
          )}
          {!isSidebarCollapsed && (
            <button
              className="hidden lg:flex p-2 hover:bg-gray-100 rounded text-gray-500 shrink-0 ml-auto"
              onClick={() => setIsSidebarCollapsed(true)}
            >
              <MenuIcon size={20} />
            </button>
          )}
          {isSidebarCollapsed && (
            <button
              className="hidden lg:flex p-1.5 hover:bg-gray-100 rounded text-gray-500 absolute -right-3 top-4 bg-white border border-gray-200 shadow-sm z-50"
              onClick={() => setIsSidebarCollapsed(false)}
            >
              <ChevronRight size={14} />
            </button>
          )}
          <button
            className="lg:hidden ml-auto p-2 hover:bg-gray-100 rounded"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 py-4 overflow-y-auto">
          {/* Section 1 */}
          <div className="px-4 mb-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed
                  ? "justify-center py-2.5"
                  : "gap-3 px-3 py-2.5",
                activeTab === "dashboard"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 font-medium hover:bg-gray-50",
              )}
            >
              <Activity
                size={18}
                className={
                  activeTab === "dashboard" ? "text-blue-600" : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">Overview</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed
                  ? "justify-center py-2.5"
                  : "gap-3 px-3 py-2.5",
                activeTab === "analytics"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 font-medium hover:bg-gray-50",
              )}
            >
              <BarChart2
                size={18}
                className={
                  activeTab === "analytics" ? "text-blue-600" : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">Analytics</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("inventory")}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed
                  ? "justify-center py-2.5"
                  : "gap-3 px-3 py-2.5",
                activeTab === "inventory"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 font-medium hover:bg-gray-50",
              )}
            >
              <Package
                size={18}
                className={
                  activeTab === "inventory" ? "text-blue-600" : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && <span className="truncate">Stock</span>}
            </button>
            <button
              onClick={() => window.open("/pos", "_blank")}
              className={cn(
                "w-full flex items-center rounded-md text-sm transition-colors text-gray-600 font-medium hover:bg-gray-50",
                isSidebarCollapsed
                  ? "justify-center py-2.5"
                  : "gap-3 px-3 py-2.5",
              )}
            >
              <ShoppingCart size={18} className="text-gray-400" />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">CLICK POS</span>
              )}
            </button>
          </div>

          

          {/* Section 3: Sale & Customer */}
          <div className="px-4 mb-2">
            {!isSidebarCollapsed && (
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">
                Sale & Customer
              </div>
            )}
            {hasPermission("sales") && (
              <button
                onClick={() => setActiveTab("sales")}
                className={cn(
                  "w-full flex items-center rounded-md text-[13px] transition-colors",
                  isSidebarCollapsed
                    ? "justify-center py-2"
                    : "gap-3 px-3 py-2",
                  activeTab === "sales"
                    ? "text-blue-600 font-bold bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <ShoppingCart
                  size={16}
                  className={
                    activeTab === "sales" ? "text-blue-600" : "text-gray-400"
                  }
                />{" "}
                {!isSidebarCollapsed && <span className="truncate">Sale</span>}
              </button>
            )}
            {hasPermission("sale_return") && (
              <button
                onClick={() => setActiveTab("sale_return")}
                className={cn(
                  "w-full flex items-center rounded-md text-[13px] transition-colors",
                  isSidebarCollapsed
                    ? "justify-center py-2"
                    : "gap-3 px-3 py-2",
                  activeTab === "sale_return"
                    ? "text-blue-600 font-bold bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <ArrowLeftRight
                  size={16}
                  className={
                    activeTab === "sale_return"
                      ? "text-blue-600"
                      : "text-gray-400"
                  }
                />{" "}
                {!isSidebarCollapsed && (
                  <span className="truncate">Sale Return</span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab("orders")}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                activeTab === "orders"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50",
              )}
            >
              <Receipt
                size={16}
                className={
                  activeTab === "orders" ? "text-blue-600" : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">Orders & Docs</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("customers")}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                activeTab === "customers"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50",
              )}
            >
              <Users
                size={16}
                className={
                  activeTab === "customers" ? "text-blue-600" : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">Customer</span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("deliveries");
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                activeTab === "deliveries" ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50",
              )}
            >
              <Truck size={16} className={activeTab === "deliveries" ? "text-blue-600" : "text-gray-400"} />
              {!isSidebarCollapsed && (
                <span className="truncate">Deliveries</span>
              )}
            </button>

            <button
              onClick={() => {
                setActiveTab("customer_due_list");
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                activeTab === "customer_due_list"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50",
              )}
            >
              <CreditCard
                size={16}
                className={
                  activeTab === "customer_due_list"
                    ? "text-blue-600"
                    : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">Customer Due List</span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("quotations")}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                activeTab === "quotations"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50",
              )}
            >
              <FileText
                size={16}
                className={
                  activeTab === "quotations" ? "text-blue-600" : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">Quotation System</span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("build_requests");
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                activeTab === "build_requests"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50",
              )}
            >
              <Cpu
                size={16}
                className={
                  activeTab === "build_requests" ? "text-blue-600" : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">PC Build Requests</span>
              )}
            </button>
          </div>

          {/* Section 3: Purchase & Supplier */}
          <div className="px-4 mb-2">
            {!isSidebarCollapsed && (
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">
                Purchase & Supplier
              </div>
            )}
            {hasPermission("purchases") && (
              <button
                onClick={() => setActiveTab("purchases")}
                className={cn(
                  "w-full flex items-center rounded-md text-[13px] transition-colors",
                  isSidebarCollapsed
                    ? "justify-center py-2"
                    : "gap-3 px-3 py-2",
                  activeTab === "purchases"
                    ? "text-blue-600 font-bold bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <ShoppingBag
                  size={16}
                  className={
                    activeTab === "purchases"
                      ? "text-blue-600"
                      : "text-gray-400"
                  }
                />{" "}
                {!isSidebarCollapsed && (
                  <span className="truncate">Purchase</span>
                )}
              </button>
            )}
            {hasPermission("purchase_return") && (
              <button
                onClick={() => setActiveTab("purchase_return")}
                className={cn(
                  "w-full flex items-center rounded-md text-[13px] transition-colors",
                  isSidebarCollapsed
                    ? "justify-center py-2"
                    : "gap-3 px-3 py-2",
                  activeTab === "purchase_return"
                    ? "text-blue-600 font-bold bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <ArrowLeftRight
                  size={16}
                  className={
                    activeTab === "purchase_return"
                      ? "text-blue-600"
                      : "text-gray-400"
                  }
                />{" "}
                {!isSidebarCollapsed && (
                  <span className="truncate">Purchase Return</span>
                )}
              </button>
            )}
            <button
              onClick={() => setActiveTab("vendors")}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                activeTab === "vendors"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50",
              )}
            >
              <Briefcase
                size={16}
                className={
                  activeTab === "vendors" ? "text-blue-600" : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">Supplier</span>
              )}
            </button>
            <button
              onClick={() => {
                setActiveTab("vendor_due_list");
                setIsMobileMenuOpen(false);
              }}
              className={cn(
                "w-full flex items-center rounded-md text-[13px] transition-colors",
                isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                activeTab === "vendor_due_list"
                  ? "text-blue-600 font-bold bg-blue-50"
                  : "text-gray-600 hover:bg-gray-50",
              )}
            >
              <CreditCard
                size={16}
                className={
                  activeTab === "vendor_due_list"
                    ? "text-blue-600"
                    : "text-gray-400"
                }
              />{" "}
              {!isSidebarCollapsed && (
                <span className="truncate">Supplier Due List</span>
              )}
            </button>
          </div>

          {/* Warranty */}
          <div className="px-4 mb-2">
            {!isSidebarCollapsed && (
              <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">
                Warranty & Servicing
              </div>
            )}
            {hasPermission("manage_services") && (
              <button
                onClick={() => setActiveTab("services")}
                className={cn(
                  "w-full flex items-center rounded-md text-[13px] transition-colors",
                  isSidebarCollapsed
                    ? "justify-center py-2"
                    : "gap-3 px-3 py-2",
                  activeTab === "services"
                    ? "text-blue-600 font-bold bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <ShieldCheck
                  size={16}
                  className={
                    activeTab === "services" ? "text-blue-600" : "text-gray-400"
                  }
                />{" "}
                {!isSidebarCollapsed && (
                  <span className="truncate">Warranty & Service</span>
                )}
              </button>
            )}
          </div>

          {(mode === "all" || mode === "accounting") && (
            <>
              {/* Accounting */}
              <div className="px-4 mb-2">
                {!isSidebarCollapsed && (
                  <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">
                    Accounting
                  </div>
                )}
                {hasPermission("internal_notes") && (
                  <button
                    onClick={() => setActiveTab("internal_notes")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "internal_notes"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <MessageSquare
                      size={16}
                      className={
                        activeTab === "internal_notes"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Staff Notes</span>
                    )}
                  </button>
                )}
                {hasPermission("menus") && (
                  <button
                    onClick={() => setActiveTab("menus")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "menus"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <List
                      size={16}
                      className={
                        activeTab === "menus"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Products Category</span>
                    )}
                  </button>
                )}
                {hasPermission("payment_accounts") && (
                  <button
                    onClick={() => setActiveTab("payment_accounts")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "payment_accounts"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <CreditCard
                      size={16}
                      className={
                        activeTab === "payment_accounts"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Payment Account</span>
                    )}
                  </button>
                )}
                {hasPermission("ledger") && (
                  <button
                    onClick={() => setActiveTab("ledger")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "ledger"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Book
                      size={16}
                      className={
                        activeTab === "ledger"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Ledger</span>
                    )}
                  </button>
                )}
                {hasPermission("manual_income") && (
                  <button
                    onClick={() => setActiveTab("manual_income")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "manual_income"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Download
                      size={16}
                      className={
                        activeTab === "manual_income"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Income</span>
                    )}
                  </button>
                )}
                {hasPermission("manual_expense") && (
                  <button
                    onClick={() => setActiveTab("manual_expense")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "manual_expense"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Upload
                      size={16}
                      className={
                        activeTab === "manual_expense"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Expense</span>
                    )}
                  </button>
                )}
                {hasPermission("tx_categories") && (
                  <button
                    onClick={() => setActiveTab("tx_categories")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "tx_categories"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <List
                      size={16}
                      className={
                        activeTab === "tx_categories"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Categories</span>
                    )}
                  </button>
                )}
                {hasPermission("reports") && (
                  <button
                    onClick={() => setActiveTab("reports")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "reports"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <FileText
                      size={16}
                      className={
                        activeTab === "reports"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Sales Accounting</span>
                    )}
                  </button>
                )}
                {hasPermission("stock_accounting") && (
                  <button
                    onClick={() => setActiveTab("stock_accounting")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "stock_accounting"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Boxes
                      size={16}
                      className={
                        activeTab === "stock_accounting"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Stock Accounting</span>
                    )}
                  </button>
                )}
                {hasPermission("customer_receive_report") && (
                  <button
                    onClick={() => setActiveTab("customer_receive_report")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "customer_receive_report"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Receipt
                      size={16}
                      className={
                        activeTab === "customer_receive_report"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Receive Report</span>
                    )}
                  </button>
                )}
                {hasPermission("deposits_withdrawals") && (
                  <button
                    onClick={() => setActiveTab("deposits_withdrawals")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "deposits_withdrawals"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <ArrowLeftRight
                      size={16}
                      className={
                        activeTab === "deposits_withdrawals"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Deposit/Withdraw</span>
                    )}
                  </button>
                )}
                {hasPermission("account_balance") && (
                  <button
                    onClick={() => setActiveTab("account_balance")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "account_balance"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <CreditCard
                      size={16}
                      className={
                        activeTab === "account_balance"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Account Balance</span>
                    )}
                  </button>
                )}
                {hasPermission("account_statement") && (
                  <button
                    onClick={() => setActiveTab("account_statement")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "account_statement"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <FileText
                      size={16}
                      className={
                        activeTab === "account_statement"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Account Statement</span>
                    )}
                  </button>
                )}
                {hasPermission("balance_sheet") && (
                  <button
                    onClick={() => setActiveTab("balance_sheet")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "balance_sheet"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Book
                      size={16}
                      className={
                        activeTab === "balance_sheet"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Balance Sheet</span>
                    )}
                  </button>
                )}
                {hasPermission("trial_balance") && (
                  <button
                    onClick={() => setActiveTab("trial_balance")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "trial_balance"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <Book
                      size={16}
                      className={
                        activeTab === "trial_balance"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Trial Balance</span>
                    )}
                  </button>
                )}

                  {(hasPermission("manage_finances") || hasPermission("manage_orders")) && (
                    <button
                      onClick={() => setActiveTab("day_book")}
                      className={cn(
                        "w-full flex items-center rounded-md text-[13px] transition-colors",
                        isSidebarCollapsed
                          ? "justify-center py-2"
                          : "gap-3 px-3 py-2",
                        activeTab === "day_book"
                          ? "text-blue-600 font-bold bg-blue-50"
                          : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      <Wallet
                        size={16}
                        className={
                          activeTab === "day_book"
                            ? "text-blue-600"
                            : "text-gray-400"
                        }
                      />{" "}
                      {!isSidebarCollapsed && (
                        <span className="truncate">Day Book</span>
                      )}
                    </button>
                  )}
                {hasPermission("manage_finances") && (
                  <button
                    onClick={() => setActiveTab("transaction_history")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "transaction_history"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <List
                      size={16}
                      className={
                        activeTab === "transaction_history"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">Transaction History</span>
                    )}
                  </button>
                )}
                {hasPermission("manage_finances") && (
                  <button
                    onClick={() => setActiveTab("profit_loss")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed ? "justify-center py-2" : "gap-3 px-3 py-2",
                      activeTab === "profit_loss" ? "text-blue-600 font-bold bg-blue-50" : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <PieChart size={16} className={activeTab === "profit_loss" ? "text-blue-600" : "text-gray-400"} />
                    {!isSidebarCollapsed && <span className="truncate">Profit & Loss</span>}
                  </button>
                )}
                {hasPermission("all_reports") && (
                  <button
                    onClick={() => setActiveTab("all_reports")}
                    className={cn(
                      "w-full flex items-center rounded-md text-[13px] transition-colors",
                      isSidebarCollapsed
                        ? "justify-center py-2"
                        : "gap-3 px-3 py-2",
                      activeTab === "all_reports"
                        ? "text-blue-600 font-bold bg-blue-50"
                        : "text-gray-600 hover:bg-gray-50",
                    )}
                  >
                    <FileText
                      size={16}
                      className={
                        activeTab === "all_reports"
                          ? "text-blue-600"
                          : "text-gray-400"
                      }
                    />{" "}
                    {!isSidebarCollapsed && (
                      <span className="truncate">All Reports</span>
                    )}
                  </button>
                )}
              </div>
            </>
          )}
          {/* Marketing */}
          {(!isStaff || isAdmin || isManager) && (
            <div className="px-4 mb-2">
              {!isSidebarCollapsed && (
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">
                  Marketing & Feedback
                </div>
              )}
              {hasPermission("campaigns") && (
                <button
                  onClick={() => setActiveTab("campaigns")}
                  className={cn(
                    "w-full flex items-center rounded-md text-[13px] transition-colors",
                    isSidebarCollapsed
                      ? "justify-center py-2"
                      : "gap-3 px-3 py-2",
                    activeTab === "campaigns"
                      ? "text-blue-600 font-bold bg-blue-50"
                      : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <Tag
                    size={16}
                    className={
                      activeTab === "campaigns"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }
                  />{" "}
                  {!isSidebarCollapsed && (
                    <span className="truncate">Marketing</span>
                  )}
                </button>
              )}
              {hasPermission("discountCodes") && (
                <button
                  onClick={() => setActiveTab("discountCodes")}
                  className={cn(
                    "w-full flex items-center rounded-md text-[13px] transition-colors",
                    isSidebarCollapsed
                      ? "justify-center py-2"
                      : "gap-3 px-3 py-2",
                    activeTab === "discountCodes"
                      ? "text-blue-600 font-bold bg-blue-50"
                      : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <Percent
                    size={16}
                    className={
                      activeTab === "discountCodes"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }
                  />{" "}
                  {!isSidebarCollapsed && (
                    <span className="truncate">Discounts</span>
                  )}
                </button>
              )}
              {hasPermission("reviews") && (
                <button
                  onClick={() => setActiveTab("reviews")}
                  className={cn(
                    "w-full flex items-center rounded-md text-[13px] transition-colors",
                    isSidebarCollapsed
                      ? "justify-center py-2"
                      : "gap-3 px-3 py-2",
                    activeTab === "reviews"
                      ? "text-blue-600 font-bold bg-blue-50"
                      : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <Star
                    size={16}
                    className={
                      activeTab === "reviews"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }
                  />{" "}
                  {!isSidebarCollapsed && (
                    <span className="truncate">Reviews</span>
                  )}
                </button>
              )}
            </div>
          )}

          {mode === "all" && (
            <>
              {/* HR */}
              {(!isStaff || isAdmin || isManager) && (
                <div className="px-4 mb-2">
                  {!isSidebarCollapsed && (
                    <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">
                      Human Resource
                    </div>
                  )}
                  {hasPermission("users") && (
                    <button
                      onClick={() => setActiveTab("users")}
                      className={cn(
                        "w-full flex items-center rounded-md text-[13px] transition-colors",
                        isSidebarCollapsed
                          ? "justify-center py-2"
                          : "gap-3 px-3 py-2",
                        activeTab === "users"
                          ? "text-blue-600 font-bold bg-blue-50"
                          : "text-gray-600 hover:bg-gray-50",
                      )}
                    >
                      <Users
                        size={16}
                        className={
                          activeTab === "users"
                            ? "text-blue-600"
                            : "text-gray-400"
                        }
                      />{" "}
                      {!isSidebarCollapsed && (
                        <span className="truncate">App Access</span>
                      )}
                    </button>
                  )}
                  {hasPermission("manage_hr") && (
                    <>
                      <button
                        onClick={() => setActiveTab("employees")}
                        className={cn(
                          "w-full flex items-center rounded-md text-[13px] transition-colors",
                          isSidebarCollapsed
                            ? "justify-center py-2"
                            : "gap-3 px-3 py-2",
                          activeTab === "employees"
                            ? "text-blue-600 font-bold bg-blue-50"
                            : "text-gray-600 hover:bg-gray-50",
                        )}
                      >
                        <Briefcase
                          size={16}
                          className={
                            activeTab === "employees"
                              ? "text-blue-600"
                              : "text-gray-400"
                          }
                        />{" "}
                        {!isSidebarCollapsed && (
                          <span className="truncate">Employees</span>
                        )}
                      </button>

                      {isAdmin && (
                        <button
                          onClick={() => setActiveTab("staff_performance")}
                          className={cn(
                            "w-full flex items-center rounded-md text-[13px] transition-colors",
                            isSidebarCollapsed
                              ? "justify-center py-2"
                              : "gap-3 px-3 py-2",
                            activeTab === "staff_performance"
                              ? "text-blue-600 font-bold bg-blue-50"
                              : "text-gray-600 hover:bg-gray-50",
                          )}
                          title={isSidebarCollapsed ? "Performance" : undefined}
                        >
                          <Trophy
                            size={16}
                            className={
                              activeTab === "staff_performance"
                                ? "text-blue-600"
                                : "text-gray-400"
                            }
                          />{" "}
                          {!isSidebarCollapsed && (
                            <span className="truncate">Performance</span>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setActiveTab("leave")}
                        className={cn(
                          "w-full flex items-center rounded-md text-[13px] transition-colors",
                          isSidebarCollapsed
                            ? "justify-center py-2"
                            : "gap-3 px-3 py-2",
                          activeTab === "leave"
                            ? "text-blue-600 font-bold bg-blue-50"
                            : "text-gray-600 hover:bg-gray-50",
                        )}
                      >
                        <CheckCircle
                          size={16}
                          className={
                            activeTab === "leave"
                              ? "text-blue-600"
                              : "text-gray-400"
                          }
                        />{" "}
                        {!isSidebarCollapsed && (
                          <span className="truncate">Leave</span>
                        )}
                      </button>
                      <button
                        onClick={() => setActiveTab("salary")}
                        className={cn(
                          "w-full flex items-center rounded-md text-[13px] transition-colors",
                          isSidebarCollapsed
                            ? "justify-center py-2"
                            : "gap-3 px-3 py-2",
                          activeTab === "salary"
                            ? "text-blue-600 font-bold bg-blue-50"
                            : "text-gray-600 hover:bg-gray-50",
                        )}
                      >
                        <CreditCard
                          size={16}
                          className={
                            activeTab === "salary"
                              ? "text-blue-600"
                              : "text-gray-400"
                          }
                        />{" "}
                        {!isSidebarCollapsed && (
                          <span className="truncate">Salary Overview</span>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* System & Settings */}
          {(!isStaff || isAdmin || isManager) && (
            <div className="px-4 mb-6">
              {!isSidebarCollapsed && (
                <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 px-3">
                  System & Settings
                </div>
              )}

              <button
                onClick={() => setActiveTab("crm")}
                className={cn(
                  "w-full flex items-center rounded-md text-[13px] transition-colors",
                  isSidebarCollapsed
                    ? "justify-center py-2"
                    : "gap-3 px-3 py-2",
                  activeTab === "crm"
                    ? "text-blue-600 font-bold bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <Users
                  size={16}
                  className={
                    activeTab === "crm" ? "text-blue-600" : "text-gray-400"
                  }
                />{" "}
                {!isSidebarCollapsed && (
                  <span className="truncate">CRM System</span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("tasks")}
                className={cn(
                  "w-full flex items-center rounded-md text-[13px] transition-colors",
                  isSidebarCollapsed
                    ? "justify-center py-2"
                    : "gap-3 px-3 py-2",
                  activeTab === "tasks"
                    ? "text-blue-600 font-bold bg-blue-50"
                    : "text-gray-600 hover:bg-gray-50",
                )}
              >
                <CheckCircle
                  size={16}
                  className={
                    activeTab === "tasks" ? "text-blue-600" : "text-gray-400"
                  }
                />{" "}
                {!isSidebarCollapsed && (
                  <span className="truncate">To-Do List</span>
                )}
              </button>
              {isAdmin && (
                <button
                  onClick={() => setActiveTab("audit_logs")}
                  className={cn(
                    "w-full flex items-center rounded-md text-[13px] transition-colors",
                    isSidebarCollapsed
                      ? "justify-center py-2"
                      : "gap-3 px-3 py-2",
                    activeTab === "audit_logs"
                      ? "text-red-600 font-bold bg-red-50"
                      : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <ShieldAlert
                    size={16}
                    className={
                      activeTab === "audit_logs"
                        ? "text-red-600"
                        : "text-gray-400"
                    }
                  />{" "}
                  {!isSidebarCollapsed && (
                    <span className="truncate">Audit Logs</span>
                  )}
                </button>
              )}
              {hasPermission("settings") && (
                <button
                  onClick={() => setActiveTab("settings")}
                  className={cn(
                    "w-full flex items-center rounded-md text-[13px] transition-colors",
                    isSidebarCollapsed
                      ? "justify-center py-2"
                      : "gap-3 px-3 py-2",
                    activeTab === "settings"
                      ? "text-blue-600 font-bold bg-blue-50"
                      : "text-gray-600 hover:bg-gray-50",
                  )}
                >
                  <Settings
                    size={16}
                    className={
                      activeTab === "settings"
                        ? "text-blue-600"
                        : "text-gray-400"
                    }
                  />{" "}
                  {!isSidebarCollapsed && (
                    <span className="truncate">Settings</span>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-100 shrink-0 mt-auto flex flex-col gap-2">
          {(!isStaff || isAdmin || isManager) && (
            <>
              <button
                onClick={() => navigate("/admin/billing")}
                className={cn(
                  "w-full flex items-center justify-center rounded-lg text-sm font-bold transition-all",
                  isSidebarCollapsed ? "py-2.5" : "gap-2 px-4 py-2.5",
                  "text-purple-700 bg-purple-100 hover:bg-purple-200 border border-purple-200 transition-all shadow-sm",
                )}
              >
                <ArrowLeftRight size={18} />{" "}
                {!isSidebarCollapsed && (
                  <span className="truncate">Hosting Dashboard</span>
                )}
              </button>
              <button
                onClick={() => navigate("/admin/e-commerce")}
                className={cn(
                  "w-full flex items-center justify-center rounded-lg text-sm font-bold transition-all",
                  isSidebarCollapsed ? "py-2.5" : "gap-2 px-4 py-2.5",
                  "text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-md hover:shadow-lg",
                )}
              >
                <ShoppingCart size={18} />{" "}
                {!isSidebarCollapsed && (
                  <span className="truncate">E-Commerce Admin</span>
                )}
              </button>
            </>
          )}
          <button
            onClick={() => window.open("/", "_blank")}
            className={cn(
              "w-full flex items-center justify-center rounded-lg text-sm font-bold transition-all",
              isSidebarCollapsed ? "py-2.5" : "gap-2 px-4 py-2.5",
              "text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all shadow-sm",
            )}
          >
            <ExternalLink size={18} />{" "}
            {!isSidebarCollapsed && (
              <span className="truncate">View Shop Site</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Header */}
        <header className="h-[60px] bg-white border-b border-gray-200 flex items-center justify-between px-3 sm:px-6 shrink-0 sticky top-0 z-50">
          <div className="flex items-center gap-3 flex-1">
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded text-gray-600"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <MenuIcon size={22} />
            </button>
            <div className="flex-1 max-w-lg relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                placeholder="Search [CTRL + K]"
                onClick={() => setIsSearchModalOpen(true)}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-md text-sm focus:ring-2 focus:ring-blue-100 outline-none cursor-pointer"
                readOnly
              />
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 text-gray-500">
            <AdminNotifications setActiveTab={setActiveTab} />
            <button
              onClick={() => debouncedFetchData()}
              className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors flex items-center justify-center"
              title="Refresh Data"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin text-blue-600" : ""}
              />
            </button>
            <div className="relative">
                <button 
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors flex items-center justify-center focus:outline-none"
                  title="Profile"
                >
                  <User size={18} className={isProfileDropdownOpen ? "text-blue-600" : "text-gray-600"} />
                </button>
                
                {isProfileDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setIsProfileDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] overflow-hidden">
                      
                      {/* Dark header with avatar */}
                      <div className="bg-gradient-to-br from-[#081621] to-[#0f2744] px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-[#EF4444] flex items-center justify-center text-white font-black text-lg shadow-lg flex-shrink-0">
                            {(profile?.displayName || profile?.email || 'A').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-white truncate">{profile?.displayName || profile?.email?.split('@')[0] || 'Admin User'}</p>
                            <p className="text-xs text-blue-300 truncate mt-0.5">{profile?.email || 'admin@click2it.com.bd'}</p>
                            <span className="mt-1.5 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black bg-[#EF4444] text-white uppercase tracking-wider">
                              {profile?.role || 'Admin'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          <div className="bg-white/10 rounded-lg px-2 py-2 text-center">
                            <p className="text-white font-black text-sm">{orders?.length || 0}</p>
                            <p className="text-blue-300 text-[10px]">Orders</p>
                          </div>
                          <div className="bg-white/10 rounded-lg px-2 py-2 text-center">
                            <p className="text-white font-black text-sm">{customers?.length || 0}</p>
                            <p className="text-blue-300 text-[10px]">Customers</p>
                          </div>
                          <div className="bg-white/10 rounded-lg px-2 py-2 text-center">
                            <p className="text-white font-black text-sm">{products?.length || 0}</p>
                            <p className="text-blue-300 text-[10px]">Products</p>
                          </div>
                        </div>
                      </div>

                      {/* Quick links */}
                      <div className="p-2">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider px-3 py-1.5">Quick Access</p>
                        {[
                          { icon: '??', label: 'Dashboard', tab: 'dashboard' },
                          { icon: '??', label: 'New Sale', tab: 'sales' },
                          { icon: '??', label: 'Inventory', tab: 'inventory' },
                          { icon: '??', label: 'Customer Due List', tab: 'customer_due_list' },
                          { icon: '??', label: 'Sales Report', tab: 'reports' },
                          { icon: '??', label: 'Settings', tab: 'settings' },
                        ].map(item => (
                          <button
                            key={item.tab}
                            onClick={() => { setIsProfileDropdownOpen(false); setActiveTab(item.tab); }}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#EF4444] transition-colors flex items-center gap-3 rounded-lg"
                          >
                            <span className="text-base">{item.icon}</span>
                            <span className="font-semibold text-sm">{item.label}</span>
                          </button>
                        ))}
                      </div>

                      {/* Sign out */}
                      <div className="border-t border-gray-100 p-2">
                        <button
                          onClick={() => { setIsProfileDropdownOpen(false); navigate('/'); }}
                          className="w-full text-left px-3 py-2.5 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-3 rounded-lg"
                        >
                          <span className="text-base">??</span> Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            <LogOut
              size={18}
              className="hover:text-red-600 cursor-pointer"
              onClick={() => navigate("/")}
            />
          </div>
        </header>

        {/* Content View */}
        <main id="main-scroll-container" className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <Suspense
              fallback={
                <div className="flex items-center justify-center p-8">
                  <div className="h-8 w-8 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
                </div>
              }
            >
              {activeTab === "notifications" ? (
                <NotificationsPage setActiveTab={setActiveTab} />
              ) : activeTab === "audit_logs" ? (
                <AuditLogsTab />
              ) : isStaff &&
                !isAdmin &&
                !isManager &&
                !OFFLINE_SHOP_TABS.includes(activeTab) ? (
                <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center max-w-md mx-auto mt-12">
                  <ShieldAlert
                    size={48}
                    className="mx-auto text-red-500 mb-3"
                  />
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Access Restricted
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Staff accounts are restricted to Offline Shop POS and Retail
                    modules.
                  </p>
                  <button
                    onClick={() => setActiveTab("sales")}
                    className="px-4 py-2 bg-[#081621] text-white rounded-md text-sm font-bold hover:bg-[#EF4444] transition-colors"
                  >
                    Go to Sale Screen
                  </button>
                </div>
              ) : activeTab === "dashboard" ? (
                <AdminOverviewDashboard
                    products={products}
                    orders={orders}
                    customers={customers}
                    transactions={transactions}
                    serviceRecords={serviceRecords}
                    setActiveTab={setActiveTab}
                  />
              ) : activeTab === "analytics" ? (
                <AnalyticsDashboard
                  products={products}
                  orders={orders}
                  customers={customers}
                  transactions={transactions}
                />
              ) : activeTab === "crm" ? (
                <CRMPage />
              ) : activeTab === "internal_notes" ? (
                <InternalNotesTab />
              ) : activeTab === "tasks" ? (
                <TaskManager />
              ) : activeTab === "support_tickets" ? (
                <SupportTicketManager />
              ) : activeTab === "inventory" ? (
                <InventoryTab
                  products={products}
                  vendors={vendors}
                  menus={menus}
                  isAddingProduct={isAddingProduct}
                  setIsAddingProduct={setIsAddingProduct}
                  editingProduct={editingProduct}
                  setEditingProduct={setEditingProduct}
                  formData={formData}
                  setFormData={setFormData}
                  inventoryCategoryFilter={inventoryCategoryFilter}
                  setInventoryCategoryFilter={setInventoryCategoryFilter}
                  selectedProductIds={selectedProductIds}
                  setSelectedProductIds={setSelectedProductIds}
                  isBulkEditing={isBulkEditing}
                  setIsBulkEditing={setIsBulkEditing}
                  bulkEditData={bulkEditData}
                  setBulkEditData={setBulkEditData}
                  isUploading={isUploading}
                  dragOver={dragOver}
                  setDragOver={setDragOver}
                  loading={loading}
                  handleSaveProduct={handleSaveProduct}
                  handleDeleteProduct={handleDeleteProduct}
                  handleImportProductsCSV={handleImportProductsCSV}
                  handleDownloadCSVTemplate={handleDownloadCSVTemplate}
                  handleExportAllProducts={handleExportAllProducts}
                  handleBulkExportProducts={handleBulkExportProducts}
                  handleBulkDeleteProducts={handleBulkDeleteProducts}
                  handleBulkUpdate={handleBulkUpdate}
                  handleImageUpload={handleImageUpload}
                  removeImage={removeImage}
                  addVariant={addVariant}
                  updateVariant={updateVariant}
                  removeVariant={removeVariant}
                  addSpec={addSpec}
                  updateSpec={updateSpec}
                  removeSpec={removeSpec}
                  setActiveTab={setActiveTab}
                  fetchData={fetchData}
                />
              ) : activeTab === "quotations" ? (
                <QuotationManager users={users} />
              ) : activeTab === "build_requests" ? (
  <BuildRequestsTab />
) : activeTab === "orders" ? (
                <OrdersTab
                  orders={orders}
                  customers={customers}
                  orderSearchQuery={orderSearchQuery}
                  setOrderSearchQuery={setOrderSearchQuery}
                  orderStatusFilter={orderStatusFilter}
                  setOrderStatusFilter={setOrderStatusFilter}
                  orderStartDate={orderStartDate}
                  setOrderStartDate={setOrderStartDate}
                  orderEndDate={orderEndDate}
                  setOrderEndDate={setOrderEndDate}
                  orderSort={orderSort}
                  setOrderSort={setOrderSort}
                  selectedOrderIds={selectedOrderIds}
                  setSelectedOrderIds={setSelectedOrderIds}
                  handleExportFilteredOrders={handleExportFilteredOrders}
                  handleBulkUpdateOrderStatus={handleBulkUpdateOrderStatus}
                  
                  handleBulkExportOrders={handleBulkExportOrders}
                  handleBulkDeleteOrders={handleBulkDeleteOrders}
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                  fetchData={fetchData}
                  updateOrderDiscount={updateOrderDiscount}
                  updateOrderStatus={updateOrderStatus}
                  generatePDF={(order, type) => {
                    const enrichedOrder = { ...order };
                    if (enrichedOrder.items) {
                      enrichedOrder.items = enrichedOrder.items.map(item => {
                        const pId = item.id || item.productId;
                        const p = products.find(p => p.id === pId);
                        let w = item.warranty;
                        if (!w && !item.warrantyMonths && !item.specs?.Warranty) {
                          if (p?.specs?.Warranty) w = p.specs.Warranty;
                          else if (p?.warrantyMonths) w = formatWarranty(p.warrantyMonths, p.warrantyUnit);
                        } else if (!w && item.warrantyMonths) {
                           w = formatWarranty(item.warrantyMonths, item.warrantyUnit || p?.warrantyUnit);
                        }
                        
                        return {
                          ...item,
                          brand: item.brand || p?.brand || p?.category || p?.vendorName || "",
                          warranty: w || ""
                        };
                      });
                    }
                    generatePDF(enrichedOrder, type, settings, 'download');
                  }}
                  handleDeleteOrder={handleDeleteOrder}
handleReturnOrder={handleReturnOrder}
                    handleEditInSales={(order: any) => {
                      setEditingOrderForSales(order);
                      setActiveTab('sales');
                    }}
                />
              ) : activeTab === "purchase_return" ? (
                <PurchaseReturnTab />
              ) : activeTab === "sale_return" ? (
                <SaleReturnTab />
              ) : activeTab === "purchases" ? (
                <PurchasesTab
                  users={users}
                  vendors={vendors}
                  products={products}
                  transactions={transactions}
                  settings={settings}
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  fetchData={fetchData}
                />
              ) : activeTab === "customers" ? (
                <CustomersTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "vendors" ? (
                <VendorsTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "conveyance" && isAdmin ? (
                <ConveyanceTab />
              ) : activeTab === "account_statement" &&
                hasPermission("account_statement") ? (
                <AccountStatementTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "profit_loss" ? (
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                  <ProfitLossTab />
                </Suspense>
              ) : activeTab === "transaction_history" &&
                hasPermission("transactions") ? (
                <TransactionHistoryTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "balance_sheet" &&
                hasPermission("balance_sheet") ? (
                <BalanceSheetTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "deposits_withdrawals" &&
                hasPermission("deposits_withdrawals") ? (
                <DepositsWithdrawalsTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "day_book" ? (
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>}>
                  <DayBookTab />
                </Suspense>
              ) : activeTab === "stock_accounting" &&
                hasPermission("stock_accounting") ? (
                <StockAccountingTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "account_balance" &&
                hasPermission("account_balance") ? (
                <AccountBalanceTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "trial_balance" &&
                hasPermission("trial_balance") ? (
                <TrialBalanceTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "notifications" ? (
                <NotificationsPage setActiveTab={setActiveTab} />
              ) : activeTab === "all_reports" &&
                hasPermission("all_reports") ? (
                <AllReportsTab setActiveTab={setActiveTab} />
              ) : activeTab === "menus" && hasPermission("menus") ? (
                <MenusTab
                  menus={menus}
                  isAddingMenu={isAddingMenu}
                  setIsAddingMenu={setIsAddingMenu}
                  editingMenu={editingMenu}
                  setEditingMenu={setEditingMenu}
                  menuFormData={menuFormData}
                  setMenuFormData={setMenuFormData}
                  isAddingSubCategory={isAddingSubCategory}
                  setIsAddingSubCategory={setIsAddingSubCategory}
                  subCategoryFormData={subCategoryFormData}
                  setSubCategoryFormData={setSubCategoryFormData}
                  handleSaveMenu={handleSaveMenu}
                  handleDeleteMenu={handleDeleteMenu}
                  handleSaveSubCategory={handleSaveSubCategory}
                  fetchData={fetchData}
                />
              ) : activeTab === "activeHostingAccounts" &&
                (hasPermission("manage_services") || isAdmin) ? (
                <ActiveHostingAccountsTab />
              ) : activeTab === "domainPricing" &&
                (hasPermission("manage_settings") || isAdmin) ? (
                <DomainPricingManagerTab setActiveTab={setActiveTab} />
              ) : activeTab === "banners" ? (
                <BannersManagerTab />
              ) : activeTab === "domainOffers" ? (
                <DomainOffersTab />
              ) : activeTab === "domainRenewals" ? (
                <DomainRenewalsTab />
              ) : activeTab === "hostingServices" && isAdmin ? (
                <HostingServicesTab />
              ) : activeTab === "settings" && hasPermission("settings") ? (
                <SettingsTab />
              ) : activeTab === "hosting_api_settings" &&
                hasPermission("manage_settings") ? (
                <HostingApiSettings />
              ) : activeTab === "services" ? (
                <ServicesTab setActiveTab={setActiveTab} />
              ) : activeTab === "employees" ? (
                <EmployeesTab />
              ) : activeTab === "staff_performance" && isAdmin ? (
                <StaffPerformanceTab orders={orders} />
              ) : activeTab === "leave" ? (
                <LeaveTab />
              ) : activeTab === "salary" ? (
                <SalaryTab />
              ) : activeTab === "payment_accounts" &&
                hasPermission("payment_accounts") ? (
                <PaymentAccountsTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "ledger" && hasPermission("ledger") ? (
                <LedgerTab
                  selectedLedgerEntity={selectedLedgerEntity}
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                />
              ) : activeTab === "manual_income" &&
                hasPermission("manual_income") ? (
                <ManualIncomeTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "manual_expense" &&
                hasPermission("manual_expense") ? (
                <ManualExpenseTab
                  setSelectedLedgerEntity={setSelectedLedgerEntity}
                  setActiveTab={setActiveTab}
                />
              ) : activeTab === "tx_categories" &&
                hasPermission("tx_categories") ? (
                <TxCategoriesTab />
              ) : activeTab === "reports" && hasPermission("reports") ? (
                <SalesReportTab />
              ) : activeTab === "hostingOrders" && isAdmin ? (
                <HostingOrdersTab />
              ) : activeTab === "hostingPlans" && isAdmin ? (
                <HostingPlansTab />
              ) : activeTab === "campaigns" && hasPermission("campaigns") ? (
                <CampaignsTab />
              ) : activeTab === "discountCodes" &&
                hasPermission("discountCodes") ? (
                <DiscountCodesTab />
              ) : activeTab === "reviews" && hasPermission("reviews") ? (
                <ReviewsTab />
              ) : activeTab === "users" && isAdmin ? (
                <UsersTab />
              ) : activeTab === "customer_receive_report" &&
                hasPermission("customer_receive_report") ? (
                <CustomerReceiveReportTab
                  orders={orders}
                  transactions={transactions}
                  customers={customers}
                  paymentAccounts={paymentAccounts}
                  settings={settings}
                  hasPermission={hasPermission}
                />
              ) : activeTab === "loyalty_points" ? (
                <LoyaltyPointsReportTab />
              ) : activeTab === "customer_due_list" ? (
                <CustomerDueListTab />
              ) : activeTab === "vendor_due_list" ? (
                <VendorDueListTab />

              ) : activeTab === "deliveries" ? (
                <EcommerceDeliveries />

              ) : activeTab === "sales" ? (
                <SalesForm
                    users={users}
                    products={products}
                    customers={customers}
                    transactions={transactions}
                    discountCodes={discountCodes}
                    settings={settings}
                    editingOrder={editingOrderForSales}
                    onCancelEdit={() => { setEditingOrderForSales(null); setActiveTab('orders'); }}
                  formatCurrency={formatCurrency}
                  cn={cn}
                  toast={toast}
                  fetchData={fetchData}
                  checkLowStock={checkLowStock}
                  setActiveTab={setActiveTab}
                  setIsAddingCustomer={setIsAddingCustomer}
                />
              ) : null}
            </Suspense>
          </div>
          {/* Confirm Modal */}
          <ConfirmModal />
          {/* Global Search Modal */}
          {isSearchModalOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-[100] flex items-start justify-center pt-[10vh] px-4"
              onClick={() => setIsSearchModalOpen(false)}
            >
              <div
                className="bg-white w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center px-4 py-3 border-b border-gray-100">
                  <Search className="text-gray-400 mr-3" size={20} />
                  <input
                    type="text"
                    placeholder="Search menus, orders, customers, or products..."
                    className="flex-1 bg-transparent border-none outline-none text-gray-800 text-lg placeholder:text-gray-400"
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    autoFocus
                  />
                  <button
                    className="text-xs bg-gray-100 text-gray-500 font-bold px-2 py-1 rounded hover:bg-gray-200"
                    onClick={() => setIsSearchModalOpen(false)}
                  >
                    ESC
                  </button>
                </div>

                <div className="max-h-[65vh] overflow-y-auto p-2 bg-gray-50/50">
                  {(() => {
                    const q = globalSearchQuery.toLowerCase();
                    const allModules = [
                      {
                        label: "Overview Dashboard",
                        tab: "dashboard",
                        icon: Activity,
                      },
                      { label: "Analytics", tab: "analytics", icon: BarChart2 },
                      {
                        label: "Stock / Inventory",
                        tab: "inventory",
                        icon: Package,
                      },
                      { label: "CLICK POS", tab: "pos", icon: ShoppingCart },
                      {
                        label: "Hosting Orders",
                        tab: "hostingOrders",
                        icon: Server,
                      },
                      {
                        label: "Active Hosting Accounts",
                        tab: "activeHostingAccounts",
                        icon: Users,
                      },
                      {
                        label: "Domain Pricing",
                        tab: "domainPricing",
                        icon: DollarSign,
                      },
                      {
                        label: "Hosting Packages",
                        tab: "hostingPlans",
                        icon: HardDrive,
                      },
                      {
                        label: "Domain Offers",
                        tab: "domainOffers",
                        icon: Tag,
                      },
                      {
                        label: "Support Tickets",
                        tab: "support_tickets",
                        icon: LifeBuoy,
                      },
                      {
                        label: "Sale (POS Screen)",
                        tab: "sales",
                        icon: ShoppingCart,
                      },
                      {
                        label: "Orders & Documents",
                        tab: "orders",
                        icon: Receipt,
                      },
                      { label: "Customers", tab: "customers", icon: Users },
                      {
                        label: "Quotation System",
                        tab: "quotations",
                        icon: FileText,
                      },
                      {
                        label: "Purchase (Supplier)",
                        tab: "purchases",
                        icon: ShoppingBag,
                      },
                      {
                        label: "Suppliers / Vendors",
                        tab: "vendors",
                        icon: Briefcase,
                      },
                      {
                        label: "Warranty & Service",
                        tab: "services",
                        icon: ShieldCheck,
                      },
                      {
                        label: "Payment Accounts",
                        tab: "payment_accounts",
                        icon: CreditCard,
                      },
                      { label: "Ledger", tab: "ledger", icon: Book },
                      { label: "CRM System", tab: "crm", icon: Users },
                      { label: "To-Do Tasks", tab: "tasks", icon: CheckCircle },
                      { label: "Settings", tab: "settings", icon: Settings },
                    ];

                    const filteredModules = q
                      ? allModules.filter((m) =>
                          m.label.toLowerCase().includes(q),
                        )
                      : allModules;

                    const filteredOrders = q
                      ? orders
                          .filter(
                            (o) =>
                              o.documentNumber?.toLowerCase().includes(q) ||
                              o.id.toLowerCase().includes(q) ||
                              o.customerName?.toLowerCase().includes(q) ||
                              o.customerPhone?.includes(q) ||
                              o.items.some((i) =>
                                i.name.toLowerCase().includes(q),
                              ),
                          )
                          .slice(0, 5)
                      : [];

                    const filteredProducts = q
                      ? products
                          .filter(
                            (p) =>
                              p.name.toLowerCase().includes(q) ||
                              p.sku.toLowerCase().includes(q) ||
                              p.category.toLowerCase().includes(q),
                          )
                          .slice(0, 5)
                      : [];

                    const filteredCustomers = q
                      ? customers
                          .filter(
                            (c) =>
                              c.name?.toLowerCase().includes(q) ||
                              c.phone?.includes(q) ||
                              c.email?.toLowerCase().includes(q),
                          )
                          .slice(0, 5)
                      : [];

                    if (
                      q &&
                      filteredModules.length === 0 &&
                      filteredOrders.length === 0 &&
                      filteredProducts.length === 0 &&
                      filteredCustomers.length === 0
                    ) {
                      return (
                        <div className="py-12 text-center text-gray-500">
                          <Search
                            size={32}
                            className="mx-auto text-gray-300 mb-3"
                          />
                          <p>No results found for "{globalSearchQuery}"</p>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-4">
                        {/* MODULES */}
                        {filteredModules.length > 0 &&
                          (!q || filteredModules.length > 0) && (
                            <div>
                              {q && (
                                <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                                  Menus & Modules
                                </div>
                              )}
                              <div
                                className={
                                  q
                                    ? "bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm"
                                    : ""
                                }
                              >
                                {filteredModules.map((item) => {
                                  const Icon = item.icon;
                                  return (
                                    <div
                                      key={item.tab}
                                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer group transition-colors ${q ? "border-b border-gray-50 last:border-0 hover:bg-blue-50" : "hover:bg-gray-100/50 rounded-lg"}`}
                                      onClick={() => {
                                        if (item.tab === "pos") {
                                          window.open("/pos", "_blank");
                                        } else {
                                          setActiveTab(item.tab);
                                          setIsMobileMenuOpen(false);
                                        }
                                        setIsSearchModalOpen(false);
                                        setGlobalSearchQuery("");
                                      }}
                                    >
                                      <div className="w-8 h-8 rounded-lg bg-gray-100/80 flex items-center justify-center text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600">
                                        <Icon size={16} />
                                      </div>
                                      <span className="text-gray-700 font-medium group-hover:text-blue-700">
                                        {item.label}
                                      </span>
                                      {q && (
                                        <ChevronRight
                                          size={14}
                                          className="ml-auto text-gray-300 group-hover:text-blue-400"
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                        {/* ORDERS */}
                        {filteredOrders.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                              Orders & Invoices
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                              {filteredOrders.map((o) => (
                                <div
                                  key={o.id}
                                  className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50 cursor-pointer group"
                                  onClick={() => {
                                    setActiveTab("orders");
                                    if (
                                      typeof setOrderSearchQuery === "function"
                                    ) {
                                      setOrderSearchQuery(
                                        o.documentNumber || o.id,
                                      );
                                    }
                                    setIsSearchModalOpen(false);
                                    setGlobalSearchQuery("");
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                                      <Receipt size={16} />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-gray-800 group-hover:text-blue-700">
                                        {o.documentNumber || o.id}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {o.customerName} � {o.customerPhone}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-gray-900">
                                      ৳{Number(o.total || 0).toLocaleString()}
                                    </div>
                                    <div className="text-[10px] font-semibold uppercase text-gray-400">
                                      {o.status}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* PRODUCTS */}
                        {filteredProducts.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                              Products
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                              {filteredProducts.map((p) => (
                                <div
                                  key={p.id}
                                  className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50 cursor-pointer group"
                                  onClick={() => {
                                    setActiveTab("inventory");
                                    setIsSearchModalOpen(false);
                                    setGlobalSearchQuery("");
                                  }}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                      <Package size={16} />
                                    </div>
                                    <div>
                                      <div className="font-semibold text-gray-800 group-hover:text-blue-700 max-w-[250px] truncate">
                                        {p.name}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        SKU: {p.sku || "N/A"} � {p.category}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-bold text-gray-900">
                                      ৳{Number(p.price || 0).toLocaleString()}
                                    </div>
                                    <div
                                      className={`text-[10px] font-semibold uppercase ${p.stock > 0 ? "text-green-500" : "text-red-500"}`}
                                    >
                                      {p.stock > 0
                                        ? `${p.stock} In Stock`
                                        : "Out of Stock"}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* CUSTOMERS */}
                        {filteredCustomers.length > 0 && (
                          <div>
                            <div className="px-3 py-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider">
                              Customers
                            </div>
                            <div className="bg-white border border-gray-100 rounded-lg overflow-hidden shadow-sm">
                              {filteredCustomers.map((c) => (
                                <div
                                  key={c.id}
                                  className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-blue-50 cursor-pointer group"
                                  onClick={() => {
                                    setActiveTab("customers");
                                    setIsSearchModalOpen(false);
                                    setGlobalSearchQuery("");
                                  }}
                                >
                                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Users size={16} />
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-800 group-hover:text-blue-700">
                                      {c.name || "Unknown"}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {c.phone} {c.email ? `� ${c.email}` : ""}
                                    </div>
                                  </div>
                                  <ChevronRight
                                    size={14}
                                    className="ml-auto text-gray-300 group-hover:text-blue-400"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
