export type UserRole = 'admin' | 'manager' | 'staff' | 'user';

export type UserPermission = string; // Changed to string to support granular tab-level permissions while preserving legacy categories

export interface UserProfile {
  uid: string;
  name?: string;
  email: string;
  displayName: string;
  role: UserRole;
  permissions?: UserPermission[];
  createdAt: string;
  totpSecret?: string;
  twoFactorEnabled?: boolean;
  twoFactorSetupAt?: string;
  backupCodes?: string[];
}

export interface SpecificationField {
  id: string;
  name: string;
  label: string;
  type: 'text' | 'select' | 'boolean';
  required?: boolean;
  options?: string[]; // for 'select' type
}

export interface SpecificationTemplate {
  id: string;
  name: string;
  category: string;
  subCategory?: string;
  fields: SpecificationField[];
  createdAt?: string;
}

export interface ProductVariant {
  id: string;
  name: string; // e.g., "Red", "Large"
  sku: string;
  price: number;
  stock: number;
}

export interface Product {
  costPrice?: number;
  unit?: string;
  sku?: string;
  lowStockThreshold?: number;
  isFreeShipping?: boolean;
  model?: string;
  imageUrl?: string;
  vendorName?: string;
  formFactor?: string;
  length?: number;
  height?: number;
  tdp?: number;
  condition?: string;
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  subCategory?: string;
  subSubCategory?: string;
  brand?: string;
  stock: number;
  isOutOfStock?: boolean;
  isCustomService?: boolean;
  isDigital?: boolean;
  isBundle?: boolean;
  bundleItems?: { productId: string; quantity: number }[];
  fbtProducts?: string[];
  fbtDiscount?: number;
  images: string[];
  variants?: ProductVariant[];
  specs?: Record<string, string>;
  socketType?: string; // For CPU/Motherboard compatibility
  ramType?: string;    // For RAM/Motherboard compatibility
  chipset?: string;    // For Motherboard
  vendorId?: string;   // Linked vendor
  hasSerialTracking?: boolean;
  availableSerials?: string[];
  warrantyMonths?: number;
  warrantyUnit?: 'days' | 'months' | 'years';
  isAccessory?: boolean;
  showInStore?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  isFlashSale?: boolean;
  isExclusiveDeal?: boolean;
  discountPrice?: number;
  shortDescription?: string;
  tags?: string[];
  createdAt: string;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;
  requireAdvanceDeliveryCharge?: boolean;
  advancePaymentNumber?: string;
  category: string; // e.g., "Mainboard", "CPU", "General"
  createdAt: string;
}

export interface Brand {
  id: string;
  name: string;
  logoUrl?: string;
}

export interface PaymentAccount {
  id: string;
  type: string;
  name: string;
  description: string;
  openingBalance: number;
  status: 'active' | 'inactive';
  createdAt: string;
}

export type TransactionType = 'sale' | 'purchase' | 'expense' | 'income' | 'payment_received' | 'payment_made' | 'money_receipt' | 'return' | 'opening_balance' | 'purchase_return' | 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out' | 'salary' | 'sale_return';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  entityId: string; // Customer ID or Vendor ID
  entityName: string;
  entityType?: 'customer' | 'vendor';
  documentNumber?: string;
  referenceId?: string; // Order ID or Invoice ID
  categoryId?: string;
  category?: string;
  categoryName?: string;
  reference?: string;
  createdAt: string;
  paymentMethod?: string;
  paymentAccountId?: string;
  previousDue?: number;
  currentBalance?: number;
}

export interface TransactionCategory {
  id: string;
  name: string;
  type: 'income' | 'expense';
  description?: string;
  createdAt: string;
}

export interface CartItem extends Product {
  quantity: number;
  productId?: string;
  product?: Product;
  details?: Record<string, unknown>;
  domain?: string;
  originalPrice?: number | null;
  isCustomService?: boolean;
  planId?: string;
  planSlug?: string;
  eppCode?: string;
  authCode?: string;
  discount?: number;
  selectedSerials?: string[];
  itemType?: 'product' | 'domain' | 'hosting' | 'domain_transfer' | 'domain_renewal' | 'ssl' | 'service';
  domainTld?: string;
  billingCycle?: 'monthly' | 'yearly';
  termYears?: number;
  baseAnnualPrice?: number;
  baseMonthlyPrice?: number;
}

export type OrderStatus = 'pending' | 'processing' | 'accepted' | 'completed' | 'shipped' | 'delivered' | 'cancelled' | 'returned' | 'active';
export type OrderType = 'invoice' | 'quotation' | 'challan' | 'sale' | 'pos_sale' | 'domain' | 'hosting' | 'pc_build' | 'pc_builder';

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  loyaltyPoints?: number;
  createdAt: string;
}

export interface Order {
  createdBy?: string;
  preparedBy?: string;
  saleSource?: 'in_store' | 'online';
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: OrderStatus | 'converted';
  type: OrderType;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentStatus?: string;
  paidAmount?: number;
  previousDue?: number;
  shippingInfo?: Record<string, unknown>;
  domain?: string;
  hostingServiceId?: string;
  isPCBuild?: boolean;
  documentNumber?: string;
  workOrderNumber?: string;
  invoiceNumber?: string;
  discountAmount?: number;
  discountCode?: string;
  notes?: string;
  termsAndConditions?: string;
  createdAt: string;
  validUntil?: string;
  convertedToInvoiceId?: string;
  trackingNumber?: string;
  courier?: string;
  trackingTimeline?: { status: string; location?: string; description?: string; timestamp: string; updatedBy?: string; deliveryMan?: { name: string; phone: string } }[];
}

export interface SubSubCategory {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  isFeatured?: boolean;
}

export interface SubCategory {
  id: string;
  name: string;
  slug: string;
  brands?: string[];
  imageUrl?: string;
  isFeatured?: boolean;
  subCategories?: SubSubCategory[];
}

export interface NavigationMenu {
  isFeatured?: boolean;
  imageUrl?: string;
  title?: string;
  id: string;
  name: string;
  slug: string;
  subCategories: SubCategory[];
  order: number;
  createdAt: string;
}

export interface Review {
  status: 'pending' | 'approved' | 'rejected';
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface DocumentDesignSettings {
  invoiceHeader: string;
  invoiceFooter: string;
  quotationHeader: string;
  quotationFooter: string;
  challanHeader: string;
  challanFooter: string;
  showCompanyLogo: boolean;
  showBankDetails: boolean;
  bankDetails: string;
  printOnLetterhead?: boolean;
}

export interface SoldSerial {
  id: string;
  serial: string;
  productId: string;
  productName: string;
  orderId: string;
  customerName: string;
  customerPhone?: string;
  soldAt: string;
  warrantyEndDate: string;
  status: 'active' | 'in_repair' | 'void' | 'returned';
}

export interface ServiceRecord {
  id: string;
  createdAt?: string;
  serialNumber: string;
  customerName: string;
  customerPhone: string;
  productName: string;
  equipmentType?: string; // Laptop, Desktop, Printer, etc.
  issueDescription: string;
  isWarranty: boolean;
  serviceCharge: number;
  status: 'received' | 'in_progress' | 'sent_to_rma' | 'repaired' | 'ready' | 'delivered';
  paymentStatus?: 'pending' | 'paid';
  paymentMethod?: string;
  medeaPayment?: string; // Additional field for Medea Payment track
  receivedAt: string;
  deliveredAt?: string;
  supplierName?: string;
  supplierRmaDate?: string;
  supplierReturnDate?: string;
  supplierRmaStatus?: 'not_sent' | 'sent_to_supplier' | 'received_from_supplier';
}

export interface ApiSettings {
  domainApiType: 'manual' | 'resellerclub' | 'namecheap' | 'openprovider';
  domainApiKey: string;
  openproviderApiKey?: string;
  usdToBdtRate?: number;
  cloudLinuxApiType: 'manual' | 'cpanel';
  cloudLinuxApiKey: string;
  vpsApiType: 'manual' | 'solusvm' | 'virtualizor';
  vpsApiKey: string;
  hostingMarkupPercent?: number;
}

export interface SiteSettings {
  id: string;
  brandName: string;
  brandShortName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  footerText: string;
  popupEnabled: boolean;
  popupTitle: string;
  popupMessage: string;
  popupImageUrl?: string;
  popupLink?: string;
  popupDelay: number;
  lowStockThreshold?: number;
  lowStockEmail?: string;
  apiSettings?: ApiSettings;
  documentDesign?: DocumentDesignSettings;
  
  // Hosting & Primary Domain Settings
  primaryDomain?: string;
  hostingDomain?: string;
  nameserver1?: string;
  nameserver2?: string;
  nameserver3?: string;
  nameserver4?: string;
  cpanelUrl?: string;
  webmailUrl?: string;
  clientAreaUrl?: string;

  // New Business Settings from UI
  businessName?: string;
  website?: string;
  dateFormat?: string;
  zoneName?: string;
  currency?: string;
  currencyPosition?: string;
  precision?: string;
  thousandSeparator?: string;
  decimalSeparator?: string;
  installmentDays?: string;
  ecommerceChecker?: string;
  shippingCost?: number;
  shippingCostOutsideDhaka?: number;
  freeShippingThreshold?: number;

  // Social Links
  facebookUrl?: string;
  youtubeUrl?: string;
  instagramUrl?: string;

  // Store Policies
  refundPolicy?: string;
  termsConditions?: string;

  // Review Widget Settings
  reviewWidgetEnabled?: boolean;
  reviewWidgetProvider?: string;
  reviewWidgetConfig?: string;

  // External Store Integration
  externalStoreEnabled?: boolean;
  externalStoreType?: 'webhook' | 'shopify' | 'woocommerce' | 'custom';
  externalStoreUrl?: string;
  externalStoreKey?: string;

  // Analytics & Tracking
  googleAnalyticsId?: string;
  facebookPixelId?: string;
  googleTagManagerId?: string;
  trendingSearches?: string[] | string;

  // Item Setting
  isLoyaltyEnable?: string;
  minimumPointToRedeem?: number;
  loyaltyRate?: number;
  productCodeStartFrom?: string;

  // Admin Auth
  adminPin?: string;

  // POS Setting
  posFastMode?: string;
  receiptPrinterType?: string;

  // Tax Setting
  defaultTaxRate?: number;
  taxName?: string;
  vatNumber?: string;

  // Invoice Setting
  invoicePrefix?: string;
  invoiceTerms?: string;

  // Zatca Setting
  zatcaEnable?: string;
  zatcaPhase?: string;
  zatcaCrn?: string;

  // Email Setting
  mailDriver?: string;
  mailHost?: string;
  mailPort?: string;
  mailUsername?: string;
  mailPassword?: string;
  mailEncryption?: string;
  mailFromAddress?: string;
  mailFromName?: string;
  resendApiKey?: string;

  // SMS Setting
  smsApiUrl?: string;
  smsSenderId?: string;

  // Whatsapp Setting
  whatsappApiUrl?: string;

  // PWA Setting
  pwaEnable?: string;
  pwaAppName?: string;
  pwaShortName?: string;
  pwaThemeColor?: string;
  pwaBackgroundColor?: string;

  // Review Widget Settings
  reviewRewardEnabled?: boolean;
  reviewRewardPercentage?: number;
  steadfastApiKey?: string;
  steadfastSecretKey?: string;

  updatedAt: string;
  [key: string]: any;
}

export interface HostingService {
  id: string;
  title: string;
  description: string;
  iconPath: string;
  startingPrice: number;
  billingCycle: string;
  order: number;
  currency?: string;
  isActive: boolean;
}

export interface HostingPlan {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  billingCycle: string;
  features: string[];
  popular?: boolean;
  order: number;
}

export interface Campaign {
  id: string;
  title: string;
  channel?: 'email' | 'sms' | 'whatsapp' | 'facebook' | 'instagram' | 'google';
  subject?: string;
  content: string;
  recipients?: string[]; // List of emails or phone numbers
  targetAudience?: string; // e.g., "Men 18-35", "Retargeting Cart Abandoners"
  budget?: number;
  targetUrl?: string;
  imageUrl?: string;
  status: 'draft' | 'sent' | 'scheduled' | 'sending' | 'active' | 'paused' | 'completed';
  scheduledAt?: string;
  sentAt?: string;
  createdAt: string;
  // Tracking Metrics
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  impressions?: number;
}

export interface Subscriber {
  id: string;
  email: string;
  createdAt: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  joinDate: string;
  baseSalary: number;
  status: 'active' | 'on_leave' | 'terminated';
  createdAt: string;
}

export interface EmployeeLeave {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string;
  endDate: string;
  type: 'sick' | 'casual' | 'annual' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  createdAt: string;
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  employeeName: string;
  month: string; // e.g., "YYYY-MM"
  baseAmount: number;
  bonus: number;
  deductions: number;
  netPay: number;
  paymentDate: string;
  paymentMethod: string;
  status: 'pending' | 'paid';
  createdAt: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  discountPercentage: number;
  type?: 'percentage' | 'fixed' | 'free_shipping';
  fixedAmount?: number;
  expiryDate: string;
  isActive: boolean;
  createdAt: string;
}

export interface Audience {
  id: string;
  name: string;
  description: string;
  filterCriteria: {
    source?: string;
    status?: string;
    keyword?: string;
  };
  userId: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  leadOwner: string;
  title: string;
  firstName: string;
  lastName: string;
  company: string;
  email: string;
  secondaryEmail?: string;
  phone: string;
  mobile: string;
  fax?: string;
  website?: string;
  industry: string;
  noOfEmployees?: string;
  rating?: string;
  skypeId?: string;
  twitter?: string;
  annualRevenue?: number;
  emailOptOut: boolean;
  
  address: {
    country?: string;
    flatNo?: string;
    street?: string;
    city?: string;
    thana?: string;
    union?: string;
    state?: string;
    zip?: string;
  };
  
  dob?: string;
  anniversary?: string;

  source: 'web_form' | 'whatsapp' | 'social' | 'google_ads' | 'manual' | 'web_chat';
  status: 'new' | 'contacted' | 'qualified' | 'lost';
  aiSummary?: string;
  description?: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  createdAt: string;
  userId?: string;
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high';
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  type: 'maintenance' | 'technical' | 'bill' | 'sales' | 'complaints' | 'other';
  status: 'open' | 'in_progress' | 'resolved';
  createdAt: string;
  userId?: string;
  customerName?: string;
  customerEmail?: string;
}

export interface DomainOrder {
  id: string;
  domain: string;
  tld: string;
  userId: string;
  orderId: string;
  status: 'pending' | 'active' | 'suspended' | 'cancelled' | 'failed' | 'registered' | 'manual_review';
  type?: 'register' | 'renewal' | 'transfer';
  action?: 'register' | 'renewal' | 'transfer';
  authCode?: string;
  eppCode?: string;
  years: number;
  autoRenew: boolean;
  nameservers: string[];
  price: number;
  registrationId?: string;
  providerStatus?: string;
  providerCode?: string;
  providerHttpStatus?: number;
  providerRequestStartedAt?: string;
  providerResponseReceivedAt?: string;
  fulfillmentError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VpsConfigurationDetails {
  hostname: string;
  os: string;
  serverLocation: string;
  rootPassword?: string;
  sshKey?: string;
  specs?: any;
}

export interface HostingAccount {
  id: string;
  userId: string;
  orderId: string;
  planId: string;
  domain: string;
  provider?: string;
  type?: 'shared' | 'vps' | string;
  vpsDetails?: VpsConfigurationDetails;
  status: string;
  billingCycle?: string;
  autoRenew: boolean;
  serverIp?: string;
  controlPanelUrl?: string;
  providerAccountId?: string;
  expiresAt?: string;
  diskUsageGb?: number;
  bandwidthUsageGb?: number;
  createdAt: string;
  updatedAt: string;
}

export interface HostingOrder {
  id: string;
  userId: string;
  items: any[];
  total: number;
  shippingCost: number;
  status: 'pending' | 'processing' | 'provisioning' | 'fulfillment_pending' | 'completed' | 'cancelled' | 'failed' | 'manual_review';
  type: 'invoice';
  documentNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: string;
  company: string;
  paymentMethod: string;
  transactionId?: string;
  paymentStatus?: string;
  paymentVerificationStatus?: string;
  providerStatus?: string;
  createdAt: string;
}


export interface InternalNote {
  id: string;
  content: string;
  createdBy: string;
  authorName: string;
  createdAt: string;
  status: 'pending' | 'resolved';
}





export interface CashRegister {
  id?: string;
  openedAt: string;
  openedBy: string; // user displayName
  openingBalance: number;
  status: 'open' | 'closed';
  closedAt?: string;
  closedBy?: string;
  closingBalance?: number; // actual counted cash
  expectedBalance?: number; // calculated cash
  discrepancy?: number; // closingBalance - expectedBalance
  notes?: string;
}
