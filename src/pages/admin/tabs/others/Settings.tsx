import React, { useState, useEffect } from "react";
import {
  Briefcase,
  ShoppingCart,
  Percent,
  FileText,
  Mail,
  Settings as SettingsIcon,
  MessageCircle,
  ShoppingBag,
  Star,
  CheckSquare,
  Eye,
  EyeOff,
  BarChart2,
  Activity,
  CheckCircle,
  AlertCircle, Cpu, Truck, ExternalLink,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { cn, formatCurrency } from "../../../../lib/utils";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { useSettings } from "../../../../context/SettingsContext";
import { SiteSettings } from "../../../../types";
import { useAuth } from "../../../../context/AuthContext";
import { getApiUrl, apiPost } from "../../../../services/apiClient";
import { logAudit } from "../../../../lib/audit";
import EmailTemplatesManager from "./EmailTemplatesManager";
import { PagesManager } from "./PagesManager";
import { PCBuilderCategoriesManager } from "../inventory/PCBuilderCategoriesManager";

export const Settings = () => {
  const { settings, updateSettings } = useSettings();
  const { user } = useAuth();
  const [settingsFormData, setSettingsFormData] =
    useState<SiteSettings>(settings);
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
    | "domain_reseller"
    | "courier"
    | "analytics"
      | "pages"
      | "pc_builder"
      | "pc_builder_fake"
  >("business");
  const [taxCalcAmount, setTaxCalcAmount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState<Record<string, any>>({});
  const [apiKeysLoading, setApiKeysLoading] = useState(true);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);

  const handleTestSmtpConnection = async () => {
    setIsTestingSmtp(true);
    const toastId = toast.loading('Testing SMTP connection...');
    try {
      await updateSettings(settingsFormData);
      const res = await apiPost<{ success: boolean; code?: string; message?: string }>('/api/verify-smtp', {});
      if (res?.success) {
        toast.success(res.message || 'SMTP Connection Successful! Emails are ready to send.', { id: toastId });
      } else {
        toast.error(res?.message || 'SMTP Connection Failed. Please check host, port, user and password.', { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to verify SMTP connection', { id: toastId });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  useEffect(() => {
    const loadKeys = async () => {
      try {
        if (!user) return;
        const token = await user.getIdToken();
        const res = await fetch(getApiUrl('/api/admin/api-config'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const json = await res.json();
        if (json.success && json.data) {
          setApiKeys(json.data as any);
        }
      } catch (e) {
        console.error("Error fetching api keys", e);
      } finally {
        setApiKeysLoading(false);
      }
    };
    loadKeys();
  }, [user]);

  useEffect(() => {
    setSettingsFormData(settings);
  }, [settings]);

  const buildApiKeysPayload = () => {
    const secretFields = [
      'domainApiKey',
      'resendApiKey',
      'bkashAppKey',
      'bkashAppSecret',
      'bkashUsername',
      'bkashPassword',
      'sandbox_bkashAppKey',
      'sandbox_bkashAppSecret',
      'sandbox_bkashUsername',
      'sandbox_bkashPassword',
      'production_bkashAppKey',
      'production_bkashAppSecret',
      'production_bkashUsername',
      'production_bkashPassword',
      'smtpPassword',
      'smsApiKey',
      'whatsappAccessToken',
    ];

    const payload: Record<string, any> = {};
    for (const [key, value] of Object.entries(apiKeys)) {
      if (secretFields.includes(key)) {
        if (typeof value === 'string' && value.trim().length > 0 && !value.startsWith('••••') && !value.startsWith('****')) {
          payload[key] = value.trim();
        }
      } else {
        payload[key] = value;
      }
    }
    return payload;
  };

  const isSecretConfigured = (fieldName: string) => {
    const value = apiKeys[fieldName];
    return typeof value === 'string' && (value.startsWith('••••') || value.startsWith('****'));
  };

  const handleResetCounters = async () => {
    if (!confirm('Are you sure you want to reset all document counters (Invoices, Challans, etc) back to 1? This cannot be undone.')) return;
    try {
      await setDoc(doc(db, 'counters', 'INV'), { lastNumber: 0 });
      await setDoc(doc(db, 'counters', 'CHA'), { lastNumber: 0 });
      await setDoc(doc(db, 'counters', 'QUO'), { lastNumber: 0 });
      await setDoc(doc(db, 'counters', 'REC'), { lastNumber: 0 });
      await setDoc(doc(db, 'counters', 'SR'), { lastNumber: 0 });
      await setDoc(doc(db, 'counters', 'PR'), { lastNumber: 0 });
      const currentOperator = user?.displayName || user?.email || 'Admin';
      await logAudit('SETTINGS', 'Counters', 'Reset all document counters (INV, CHA, QUO, REC, SR, PR) back to 1', currentOperator);
      toast.success('All document counters reset to 1!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to reset counters');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const currentOperator = user?.displayName || user?.email || 'Admin';
    try {
      if (settingsTab === "domain_reseller") {
        const payload = buildApiKeysPayload();
        const token = await user?.getIdToken();
        const res = await fetch(getApiUrl('/api/admin/api-config'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error || 'Failed to save API configuration');
        }

        const freshRes = await fetch(getApiUrl('/api/admin/api-config'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const freshJson = await freshRes.json();
        if (freshJson.success && freshJson.data) {
          setApiKeys(freshJson.data as any);
        }

        await logAudit('SETTINGS', 'ApiConfig', 'Updated domain reseller and API configurations', currentOperator);
        toast.success("API configuration saved successfully");
      } else {
        await updateSettings(settingsFormData);
        await logAudit(
          'SETTINGS',
          'Settings',
          `Updated site settings under tab "${settingsTab}"`,
          currentOperator,
          {
            previousState: settings,
            newState: settingsFormData,
          }
        );
        toast.success("Site settings updated successfully");
      }
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error?.message || "Failed to save site settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* Setting List Sidebar */}
      <div className="w-full md:w-64 flex-shrink-0">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-[#7B61FF] text-white">
            <h3 className="font-bold">Setting List</h3>
          </div>
          <div className="p-2 space-y-1">
            {[
              { id: "business", icon: Briefcase, label: "Business Setting" },
              { id: "pos", icon: ShoppingCart, label: "POS Setting" },
              { id: "tax", icon: Percent, label: "Tax Setting" },
              { id: "invoice", icon: FileText, label: "Invoice Setting" },
              { id: "zatca", icon: FileText, label: "Zatca Setting" },
              { id: "email", icon: Mail, label: "Email Setting" },
              { id: "sms", icon: Mail, label: "SMS Setting" },
              { id: "whatsapp", icon: Mail, label: "Whatsapp Setting" },
              {
                id: "whitelabel",
                icon: SettingsIcon,
                label: "Whitelabel Setting",
              },
              { id: "pwa", icon: SettingsIcon, label: "PWA Setting" },
                { id: "pages", icon: FileText, label: "Pages & Policies" },
                { id: "pc_builder", icon: Cpu, label: "PC Builder Categories" },
              {
                id: "crm_integrations",
                icon: SettingsIcon,
                label: "CRM Integrations",
              },
              {
                id: "review_integrations",
                icon: MessageCircle,
                label: "Review Integrations",
              },
              {
                id: "external_ecommerce",
                icon: ShoppingBag,
                label: "External E-commerce",
              },
              {
                id: "domain_reseller",
                icon: SettingsIcon,
                label: "Domain Reseller API",
              },
              {
                id: "analytics",
                icon: BarChart2,
                label: "Analytics & Tracking",
              },
              {
                id: "courier",
                icon: Truck,
                label: "Courier (Steadfast)",
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSettingsTab(tab.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${settingsTab === tab.id ? "bg-[#7B61FF] text-white font-bold" : "text-gray-600 hover:bg-gray-50"}`}
              >
                <tab.icon size={16} /> {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Setting Content */}
      <div className="flex-1 space-y-6">
        <form onSubmit={handleSaveSettings}>
          {settingsTab === "business" ? (
            <>
              {/* Business Setting Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700">
                    Business Setting
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.businessName || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          businessName: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                      placeholder="Computer Zone"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Address <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      rows={1}
                      value={settingsFormData.address || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          address: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                      placeholder="1100 Edinger Ave, Tustin, CA 92780"
                    ></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Website
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={settingsFormData.website || ""}
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            website: e.target.value,
                          })
                        }
                        className="flex-1 text-sm border-gray-200 rounded-l-md focus:ring-[#7B61FF]"
                        placeholder="Enter Website"
                      />
                      <span className="bg-[#7B61FF] text-white px-3 flex items-center justify-center rounded-r-md">
                        <SettingsIcon size={16} />
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={settingsFormData.contactEmail || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          contactEmail: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                      placeholder="info@computerzone.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.contactPhone || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          contactPhone: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                      placeholder="(210) 224-13135"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Default Shipping Cost
                    </label>
                    <input
                      type="number"
                      value={settingsFormData.shippingCost || 0}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          shippingCost: Number(e.target.value),
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Date Format <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={settingsFormData.dateFormat || "m/d/Y"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          dateFormat: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="m/d/Y">m/d/Y</option>
                      <option value="d/m/Y">d/m/Y</option>
                      <option value="Y-m-d">Y-m-d</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Zone Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={settingsFormData.zoneName || "Asia/Dhaka"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          zoneName: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="Asia/Dhaka">Asia/Dhaka</option>
                      <option value="America/Los_Angeles">
                        America/Los_Angeles
                      </option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Currency <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.currency || "Tk."}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          currency: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Currency Position <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={
                        settingsFormData.currencyPosition || "Before Amount"
                      }
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          currencyPosition: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="Before Amount">Before Amount</option>
                      <option value="After Amount">After Amount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Precision
                    </label>
                    <select
                      value={settingsFormData.precision || "2 Digit"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          precision: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="2 Digit">2 Digit</option>
                      <option value="0 Digit">0 Digit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Thousand Separator
                    </label>
                    <select
                      value={
                        settingsFormData.thousandSeparator ||
                        "Select Thousand Separator"
                      }
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          thousandSeparator: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="Select Thousand Separator">
                        Select Thousand Separator
                      </option>
                      <option value="Comma (,)">Comma (,)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Decimal Separator <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={settingsFormData.decimalSeparator || "Dot (.)"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          decimalSeparator: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="Dot (.)">Dot (.)</option>
                      <option value="Comma (,)">Comma (,)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Installment Days <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={settingsFormData.installmentDays || "3 Days"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          installmentDays: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="3 Days">3 Days</option>
                      <option value="7 Days">7 Days</option>
                      <option value="30 Days">30 Days</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      E-Commerce Checker <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={settingsFormData.ecommerceChecker || "No"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          ecommerceChecker: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="No">No</option>
                      <option value="Yes">Yes</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Item Setting Card */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-bold text-gray-700">
                    Item Setting
                  </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Is Loyalty Enable <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={settingsFormData.isLoyaltyEnable || "Enable"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          isLoyaltyEnable: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    >
                      <option value="Enable">Enable</option>
                      <option value="Disable">Disable</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Minimum Point To Redeem{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={settingsFormData.minimumPointToRedeem || 40}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          minimumPointToRedeem: Number(e.target.value),
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Loyalty Rate <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={settingsFormData.loyaltyRate || 0.1}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          loyaltyRate: Number(e.target.value),
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Product Code Start From{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.productCodeStartFrom || "000001"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          productCodeStartFrom: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    />
                  </div>
                </div>
              </div>
            </>
          ) : settingsTab === "pos" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">POS Setting</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    POS Fast Mode Enable
                  </label>
                  <select
                    value={settingsFormData.posFastMode || "No"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        posFastMode: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Receipt Printer Type
                  </label>
                  <select
                    value={settingsFormData.receiptPrinterType || "Thermal"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        receiptPrinterType: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  >
                    <option value="Thermal">Thermal Printer</option>
                    <option value="A4">A4 Printer</option>
                  </select>
                </div>
              </div>
            </div>
          ) : settingsTab === "tax" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">Tax Setting</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Default Tax Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={settingsFormData.defaultTaxRate || 0}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        defaultTaxRate: Number(e.target.value),
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Tax Name
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.taxName || "VAT"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        taxName: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    placeholder="e.g. VAT"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    VAT Number
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.vatNumber || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        vatNumber: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
              </div>
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-4">
                <h4 className="text-sm font-bold text-gray-700">
                  Tax Calculator
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={taxCalcAmount}
                      onChange={(e) => setTaxCalcAmount(Number(e.target.value))}
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                      placeholder="Enter amount"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      Calculated Tax ({settingsFormData.taxName || "VAT"} @{" "}
                      {settingsFormData.defaultTaxRate || 0}%)
                    </label>
                    <div className="w-full text-sm border-gray-200 rounded-md bg-white p-2 font-bold text-gray-700">
                      {formatCurrency(
                        (taxCalcAmount *
                          (settingsFormData.defaultTaxRate || 0)) /
                          100,
                        settingsFormData,
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : settingsTab === "invoice" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">
                  Invoice Setting
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Invoice Prefix
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.invoicePrefix || "INV-"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        invoicePrefix: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Invoice Terms & Conditions
                  </label>
                  <textarea
                    rows={4}
                    value={settingsFormData.invoiceTerms || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        invoiceTerms: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  ></textarea>
                </div>
              </div>
            </div>
          ) : settingsTab === "zatca" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">
                  Zatca Setting
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    ZATCA e-Invoicing Enable
                  </label>
                  <select
                    value={settingsFormData.zatcaEnable || "No"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        zatcaEnable: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    ZATCA Phase
                  </label>
                  <select
                    value={settingsFormData.zatcaPhase || "1"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        zatcaPhase: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  >
                    <option value="1">Phase 1</option>
                    <option value="2">Phase 2</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Commercial Registration Number (CRN)
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.zatcaCrn || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        zatcaCrn: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
              </div>
            </div>
          ) : settingsTab === "email" ? (
            <>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <Mail size={16} className="text-[#EF4444]" /> Email & SMTP Configuration
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Configure SMTP credentials for automated order confirmations, password resets, and marketing campaigns.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleTestSmtpConnection}
                  disabled={isTestingSmtp}
                  className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg text-xs border border-indigo-200 flex items-center gap-1.5 transition-all shadow-2xs self-start sm:self-auto cursor-pointer"
                >
                  <CheckCircle size={14} />
                  {isTestingSmtp ? 'Testing...' : 'Test SMTP Connection'}
                </button>
              </div>

              {/* Quick Provider Presets */}
              <div className="px-6 py-4 bg-gray-50/80 border-b border-gray-100 flex flex-wrap items-center gap-3">
                <span className="text-xs font-bold text-gray-600">Quick Setup Presets:</span>
                <button
                  type="button"
                  onClick={() => {
                    const isCurrentGmail = settingsFormData.mailUsername?.toLowerCase().endsWith("@gmail.com");
                    setSettingsFormData({
                      ...settingsFormData,
                      mailDriver: "smtp",
                      mailHost: "smtp.gmail.com",
                      mailPort: "465",
                      mailEncryption: "ssl",
                      mailFromAddress: isCurrentGmail ? settingsFormData.mailUsername : (settingsFormData.mailFromAddress || ""),
                    });
                    toast.success("Gmail preset loaded! Enter your Gmail & App Password below.");
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer shadow-2xs",
                    (settingsFormData.mailHost === "smtp.gmail.com" || (settingsFormData.mailUsername && settingsFormData.mailUsername.toLowerCase().endsWith("@gmail.com")))
                      ? "bg-red-50 text-red-700 border-red-300 ring-2 ring-red-100"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0"></span>
                  Simple Gmail (Google Account)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSettingsFormData({
                      ...settingsFormData,
                      mailDriver: "smtp",
                      mailHost: "mail.click2itbd.com",
                      mailPort: "465",
                      mailEncryption: "ssl",
                      mailUsername: settingsFormData.mailUsername && settingsFormData.mailUsername.endsWith("@gmail.com") ? "info@click2itbd.com" : settingsFormData.mailUsername,
                    });
                    toast.success("cPanel preset loaded! Enter your Webmail password.");
                  }}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition-all cursor-pointer shadow-2xs",
                    (settingsFormData.mailHost && settingsFormData.mailHost.includes("click2itbd"))
                      ? "bg-blue-50 text-blue-700 border-blue-300 ring-2 ring-blue-100"
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
                  cPanel / Webmail (mail.click2itbd.com)
                </button>
              </div>

              {/* Gmail Specific App Password Guide Box */}
              {(settingsFormData.mailHost === "smtp.gmail.com" || (settingsFormData.mailUsername && settingsFormData.mailUsername.toLowerCase().endsWith("@gmail.com"))) && (
                <div className="mx-6 mt-6 p-4 bg-amber-50/80 border border-amber-200 rounded-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-xs">!</div>
                      <h4 className="text-xs font-bold text-amber-900">Gmail Setup Guide (১৬ অক্ষরের App Password প্রয়োজন)</h4>
                    </div>
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-amber-100/50 text-amber-900 border border-amber-300 rounded-md font-bold text-xs transition-colors shadow-2xs self-start sm:self-auto"
                    >
                      <ExternalLink size={12} />
                      Generate Google App Password
                    </a>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Google সিকিউরিটির কারণে সাধারণ জিমেইল পাসওয়ার্ড দিয়ে SMTP কাজ করে না। উপরের লিংকে গিয়ে আপনার Google Account-এ <strong>2-Step Verification</strong> অন করে একটি <strong>App Password</strong> তৈরি করুন (নাম দিন e.g. <em>Click2IT</em>), তারপর পাওয়া ১৬ অক্ষরের পাসওয়ার্ডটি নিচে <strong>SMTP Password</strong> বক্সে পেস্ট করুন।
                  </p>
                </div>
              )}

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Mail Driver
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.mailDriver || "smtp"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        mailDriver: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Mail Host *
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.mailHost || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        mailHost: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    placeholder="e.g. smtp.gmail.com or mail.click2itbd.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Mail Port *
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.mailPort || "465"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        mailPort: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    placeholder="465 (SSL) or 587 (TLS)"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Mail Encryption
                  </label>
                  <select
                    value={settingsFormData.mailEncryption || "ssl"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        mailEncryption: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  >
                    <option value="ssl">SSL (Port 465 - Recommended for Gmail/cPanel)</option>
                    <option value="tls">TLS (Port 587)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Mail Username / Account Email *
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.mailUsername || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const update: any = { mailUsername: val };
                      if (val.toLowerCase().endsWith("@gmail.com")) {
                        if (!settingsFormData.mailHost) update.mailHost = "smtp.gmail.com";
                        if (!settingsFormData.mailPort) update.mailPort = "465";
                        if (!settingsFormData.mailEncryption) update.mailEncryption = "ssl";
                        if (!settingsFormData.mailFromAddress) update.mailFromAddress = val;
                      }
                      setSettingsFormData({
                        ...settingsFormData,
                        ...update,
                      });
                    }}
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    placeholder="e.g. your-email@gmail.com or info@click2itbd.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    SMTP Password / Google App Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showSmtpPassword ? "text" : "password"}
                      value={settingsFormData.mailPassword || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          mailPassword: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md pr-10 focus:ring-[#7B61FF] font-mono"
                      placeholder="Enter 16-character App Password or Webmail Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showSmtpPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    value={settingsFormData.mailFromAddress || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        mailFromAddress: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    placeholder="e.g. your-email@gmail.com or info@click2itbd.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    From Display Name
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.mailFromName || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        mailFromName: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    placeholder="e.g. Click2IT BD"
                  />
                </div>

                <div className="md:col-span-2 bg-blue-50/70 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 space-y-1.5">
                  <p className="font-bold">💡 Quick Reference:</p>
                  <p>• <strong>Gmail:</strong> Click the "Simple Gmail" preset above, enter your Gmail ID, and paste the 16-character App Password.</p>
                  <p>• <strong>cPanel / Webmail:</strong> Click the "cPanel / Webmail" preset above, enter your webmail address and password.</p>
                </div>
              </div>
            </div>

            {/* Email & Welcome Templates Manager */}
            <EmailTemplatesManager />
            </>
          ) : settingsTab === "sms" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">SMS Setting</h3>
              </div>
              <div className="p-6 grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    SMS API URL
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.smsApiUrl || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        smsApiUrl: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
                <div className="md:col-span-2 bg-gray-50 border border-dashed border-gray-200 rounded-md p-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-bold">SMS API Key:</span> Managed securely on server.
                    Contact your administrator to update SMS credentials.
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Sender ID
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.smsSenderId || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        smsSenderId: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
              </div>
            </div>
          ) : settingsTab === "whatsapp" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">
                  Whatsapp Setting
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Whatsapp API URL
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.whatsappApiUrl || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        whatsappApiUrl: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
                <div className="md:col-span-2 bg-gray-50 border border-dashed border-gray-200 rounded-md p-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-bold">WhatsApp Access Token:</span> Managed securely on server.
                    Contact your administrator to update WhatsApp credentials.
                  </p>
                </div>
              </div>
            </div>
          ) : settingsTab === "whitelabel" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">
                  Whitelabel Setting
                </h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Application Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.brandName || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        brandName: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    placeholder="My Business App"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Logo URL
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.logoUrl || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        logoUrl: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsFormData.primaryColor || "#7B61FF"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          primaryColor: e.target.value,
                        })
                      }
                      className="h-9 p-1 w-12 border-gray-200 rounded-md"
                    />
                    <input
                      type="text"
                      value={settingsFormData.primaryColor || "#7B61FF"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          primaryColor: e.target.value,
                        })
                      }
                      className="flex-1 text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : settingsTab === "pages" ? (
              <PagesManager />
            ) : settingsTab === "pc_builder" ? (
              <PCBuilderCategoriesManager />
            ) : settingsTab === "pc_builder_fake" ? (
              <PagesManager />
            ) : settingsTab === "pwa" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700">PWA Setting</h3>
              </div>
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Enable PWA
                  </label>
                  <select
                    value={settingsFormData.pwaEnable || "No"}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        pwaEnable: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.pwaAppName || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        pwaAppName: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Short Name
                  </label>
                  <input
                    type="text"
                    value={settingsFormData.pwaShortName || ""}
                    onChange={(e) =>
                      setSettingsFormData({
                        ...settingsFormData,
                        pwaShortName: e.target.value,
                      })
                    }
                    className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Theme Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsFormData.pwaThemeColor || "#ffffff"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          pwaThemeColor: e.target.value,
                        })
                      }
                      className="h-9 p-1 w-12 border-gray-200 rounded-md"
                    />
                    <input
                      type="text"
                      value={settingsFormData.pwaThemeColor || "#ffffff"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          pwaThemeColor: e.target.value,
                        })
                      }
                      className="flex-1 text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">
                    Background Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={settingsFormData.pwaBackgroundColor || "#ffffff"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          pwaBackgroundColor: e.target.value,
                        })
                      }
                      className="h-9 p-1 w-12 border-gray-200 rounded-md"
                    />
                    <input
                      type="text"
                      value={settingsFormData.pwaBackgroundColor || "#ffffff"}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          pwaBackgroundColor: e.target.value,
                        })
                      }
                      className="flex-1 text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : settingsTab === "crm_integrations" ? (
            <div className="p-6 text-center text-gray-500 font-bold">Coming Soon: CRM Integrations</div>
          ) : settingsTab === "review_integrations" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-700">
                  Review Widget Integration
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4">
                  <Star className="text-blue-500 shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">
                      Aggregate Amazon & Google Reviews
                    </p>
                    <p>
                      Use this section to embed third-party review widgets (like
                      Elfsight, Trustpilot, or Reviews.io) that aggregate
                      verified customer feedback from across the web. This is
                      the recommended way to bridge your Amazon reputation into
                      your standalone portal.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Enable Review Widget
                      </label>
                      <p className="text-xs text-gray-500">
                        Show aggregated reviews on product detail pages
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsFormData({
                          ...settingsFormData,
                          reviewWidgetEnabled:
                            !settingsFormData.reviewWidgetEnabled,
                        })
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settingsFormData.reviewWidgetEnabled
                          ? "bg-[#7B61FF]"
                          : "bg-gray-200",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settingsFormData.reviewWidgetEnabled
                            ? "translate-x-6"
                            : "translate-x-1",
                        )}
                      />
                    </button>
                  </div>

                  {settingsFormData.reviewWidgetEnabled && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                          Integrator Provider
                        </label>
                        <select
                          value={
                            settingsFormData.reviewWidgetProvider || "generic"
                          }
                          onChange={(e) =>
                            setSettingsFormData({
                              ...settingsFormData,
                              reviewWidgetProvider: e.target.value,
                            })
                          }
                          className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                        >
                          <option value="generic">Generic Embed Script</option>
                          <option value="elfsight">Elfsight Widget</option>
                          <option value="trustpilot">Trustpilot</option>
                          <option value="reviews_io">Reviews.io</option>
                          <option value="amazon_api">
                            Amazon API (Custom)
                          </option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                          Widget Script / Embed Code
                        </label>
                        <textarea
                          rows={6}
                          value={settingsFormData.reviewWidgetConfig || ""}
                          onChange={(e) =>
                            setSettingsFormData({
                              ...settingsFormData,
                              reviewWidgetConfig: e.target.value,
                            })
                          }
                          placeholder='Paste your widget code here, e.g.: <script src="https://static.elfsight.com/platform/platform.js" data-use-service-core defer></script><div class="elfsight-app-YOUR-WIDGET-ID"></div>'
                          className="w-full text-sm font-mono border-gray-200 rounded-md focus:ring-[#7B61FF]"
                        ></textarea>
                        <p className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-dashed">
                          <strong>Tip:</strong> You can typically find this code
                          in your review provider's dashboard under "Install" or
                          "Embed Code".
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="p-4 border-b border-gray-100 bg-gray-50 mt-6 border-t border-gray-200">
                <h3 className="text-sm font-bold text-gray-700">
                  Internal Review Rewards
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex gap-4">
                  <CheckSquare className="text-green-500 shrink-0" />
                  <div className="text-sm text-green-800">
                    <p className="font-bold mb-1">
                      Reward First-Time Reviewers
                    </p>
                    <p>
                      Automatically issue a one-time discount code when a
                      logged-in user submits their first review on the site.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Enable Review Rewards
                      </label>
                      <p className="text-xs text-gray-500">
                        Generate a discount code upon first review
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsFormData({
                          ...settingsFormData,
                          reviewRewardEnabled: !(settingsFormData as any)
                            .reviewRewardEnabled,
                        })
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        (settingsFormData as any).reviewRewardEnabled
                          ? "bg-[#7B61FF]"
                          : "bg-gray-200",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          (settingsFormData as any).reviewRewardEnabled
                            ? "translate-x-6"
                            : "translate-x-1",
                        )}
                      />
                    </button>
                  </div>

                  {(settingsFormData as any).reviewRewardEnabled && (
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                        Reward Discount Percentage (%)
                      </label>
                      <input
                        type="number"
                        value={
                          (settingsFormData as any).reviewRewardPercentage || 10
                        }
                        onChange={(e) =>
                          setSettingsFormData({
                            ...settingsFormData,
                            reviewRewardPercentage: Number(e.target.value),
                          })
                        }
                        className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                        min={1}
                        max={100}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : settingsTab === "external_ecommerce" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-bold text-gray-700">
                  External E-commerce Integration
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-4">
                  <ShoppingBag className="text-blue-500 shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-bold mb-1">
                      Cross-Post Products to Other Sites
                    </p>
                    <p>
                      Enable this feature to synchronize your products with
                      other e-commerce platforms like Shopify, WooCommerce, or
                      via a custom webhook. You'll be able to "Push" individual
                      products with their price and stock status directly from
                      the inventory list.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Enable External Sync
                      </label>
                      <p className="text-xs text-gray-500">
                        Allow pushing products to external platforms
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setSettingsFormData({
                          ...settingsFormData,
                          externalStoreEnabled:
                            !settingsFormData.externalStoreEnabled,
                        })
                      }
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settingsFormData.externalStoreEnabled
                          ? "bg-[#7B61FF]"
                          : "bg-gray-200",
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settingsFormData.externalStoreEnabled
                            ? "translate-x-6"
                            : "translate-x-1",
                        )}
                      />
                    </button>
                  </div>

                  {settingsFormData.externalStoreEnabled && (
                    <div className="space-y-4 pt-4 border-t border-gray-100">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                          External Store Type
                        </label>
                        <select
                          value={
                            settingsFormData.externalStoreType || "webhook"
                          }
                          onChange={(e) =>
                            setSettingsFormData({
                              ...settingsFormData,
                              externalStoreType: e.target.value as any,
                            })
                          }
                          className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                        >
                          <option value="webhook">Custom Webhook (JSON)</option>
                          <option value="shopify">Shopify API</option>
                          <option value="woocommerce">
                            WooCommerce REST API
                          </option>
                          <option value="custom">Custom Integration</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                          External Store API URL
                        </label>
                        <input
                          type="url"
                          value={settingsFormData.externalStoreUrl || ""}
                          onChange={(e) =>
                            setSettingsFormData({
                              ...settingsFormData,
                              externalStoreUrl: e.target.value,
                            })
                          }
                          placeholder="https://external-site.com/api/products"
                          className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                          API Key / Secret
                        </label>
                        <input
                          type="password"
                          value={settingsFormData.externalStoreKey || ""}
                          onChange={(e) =>
                            setSettingsFormData({
                              ...settingsFormData,
                              externalStoreKey: e.target.value,
                            })
                          }
                          placeholder="Enter your API Key or Auth Token"
                          className="w-full text-sm border-gray-200 rounded-md focus:ring-[#7B61FF]"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : settingsTab === "domain_reseller" ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-700">
                  Domain Reseller API
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-4">
                  <div className="text-sm text-yellow-800">
                    <p className="font-bold mb-1">
                      Domain & Hosting Reseller Configuration
                    </p>
                    <p>
                      API credentials (OPENPROVIDER_API_KEY, WHM_URL, WHM_API_TOKEN, WHM_USERNAME) are managed securely via backend environment variables.
                      Configure commercial pricing, currency exchange rates, and profit markups below.
                    </p>
                  </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Openprovider API Key
                     </label>
                     <div className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-600 text-sm">
                       Managed securely on server
                     </div>
                     <p className="text-xs text-green-600 mt-1">
                       API key is configured and stored in backend environment variables.
                     </p>
                   </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      USD to BDT Exchange Rate
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-500">
                        ৳
                      </span>
                      <input
                        type="number"
                        step="0.01"
                        value={apiKeys.usdToBdtRate ?? ''}
                        onChange={(e) =>
                          setApiKeys({
                            ...apiKeys,
                            usdToBdtRate: parseFloat(e.target.value),
                          })
                        }
                        className="w-full pl-8 pr-3 py-2 border rounded-md focus:ring-2 focus:ring-[#7B61FF]"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Used to convert Openprovider USD prices to BDT
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain Profit Margin %
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={apiKeys.domainMarkupPercent ?? ''}
                        onChange={(e) =>
                          setApiKeys({
                            ...apiKeys,
                            domainMarkupPercent: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#7B61FF]"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Markup added to Openprovider wholesale price
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Domain Renewal Year-Based Discount %
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={apiKeys.domainRenewalDiscountPercent ?? 0}
                        onChange={(e) =>
                          setApiKeys({
                            ...apiKeys,
                            domainRenewalDiscountPercent: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#7B61FF]"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Discount applied per year for multi-year domain renewals
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hosting Profit Margin %
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={apiKeys.hostingMarkupPercent ?? 35}
                        onChange={(e) =>
                          setApiKeys({
                            ...apiKeys,
                            hostingMarkupPercent: parseFloat(e.target.value),
                          })
                        }
                        className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-[#7B61FF]"
                      />
                      <span className="absolute right-3 top-2.5 text-gray-500 text-sm">
                        %
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Markup added to CloudLinux license cost for hosting plans
                    </p>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                    <h4 className="text-sm font-bold text-blue-900 mb-2">Pricing Preview</h4>
                    <div className="text-xs text-blue-800 space-y-1 font-mono">
                      <p className="font-bold text-blue-700">Domain Pricing</p>
                      <p>Supplier prices are fetched live from Openprovider.</p>
                      <p>USD to BDT rate: {apiKeys.usdToBdtRate || 'Not configured'}</p>
                      <p>Markup: {apiKeys.domainMarkupPercent ?? 'Not configured'}%</p>
                    </div>
                    <div className="text-xs text-blue-800 space-y-1 font-mono mt-3 pt-3 border-t border-blue-200">
                      <p className="font-bold text-blue-700">Hosting Pricing (margin: {apiKeys.hostingMarkupPercent ?? 35}%)</p>
                      <p>License Cost: $10.00 USD</p>
                      <p>Exchange Rate: {apiKeys.usdToBdtRate || 120} BDT/USD</p>
                      <p>Retail USD: ${((10 * (1 + (apiKeys.hostingMarkupPercent ?? 35) / 100)).toFixed(2))}</p>
                      <p className="font-bold">Final BDT: ৳{Math.round(10 * (apiKeys.usdToBdtRate || 120) * (1 + (apiKeys.hostingMarkupPercent ?? 35) / 100)).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
                    <div>
                      <label className="block text-sm font-bold text-gray-700">
                        Sandbox Mode
                      </label>
                      <p className="text-xs text-gray-500">
                        Use Openprovider Sandbox API for testing without spending
                        money
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setApiKeys({
                          ...apiKeys,
                          isSandboxMode: !apiKeys.isSandboxMode,
                        })
                      }
                      className={
                        apiKeys.isSandboxMode
                          ? "relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-[#7B61FF]"
                          : "relative inline-flex h-6 w-11 items-center rounded-full transition-colors bg-gray-200"
                      }
                    >
                      <span
                        className={
                          apiKeys.isSandboxMode
                            ? "inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"
                            : "inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"
                        }
                      />
                    </button>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t">
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-4 mb-6">
                    <div className="text-sm text-emerald-800">
                      <p className="font-bold mb-1">
                        bKash Payment Gateway Integration
                      </p>
                      <p>
                        bKash credentials are stored securely on the server and
                        cannot be edited from this panel.
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-gray-50 border border-dashed border-gray-200 rounded-md p-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-bold">bKash Credentials:</span> Managed securely on server.
                    Contact your administrator to update bKash sandbox/production credentials.
                  </p>
                </div>
                </div>
                <div className="mt-8 pt-6 border-t">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-4 mb-6">
                    <div className="text-sm text-blue-800">
                      <p className="font-bold mb-1">
                        CloudLinux Partner API Integration
                      </p>
                      <p>
                        CloudLinux credentials are stored securely on the server
                        and cannot be edited from this panel.
                      </p>
                    </div>
                  </div>

                  <div className="md:col-span-2 bg-gray-50 border border-dashed border-gray-200 rounded-md p-3">
                  <p className="text-xs text-gray-600">
                    <span className="font-bold">CloudLinux CLN Credentials:</span> Managed securely on server.
                    Contact your administrator to update CloudLinux credentials.
                  </p>
                </div>
                </div>
              </div>
            </div>
          ) : settingsTab === "analytics" ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Activity size={24} className="text-blue-100" />
                  <h3 className="text-xl font-bold">Analytics & Tracking</h3>
                </div>
                <p className="text-blue-100 text-sm max-w-2xl">
                  Connect your store to powerful analytics platforms to track visitors, sales, and ad performance. Scripts are injected dynamically without slowing down your site.
                </p>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50">
                {/* GA4 Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative">
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                    {settingsFormData.googleAnalyticsId ? <><CheckCircle size={12} className="text-green-500" /> Active</> : <><AlertCircle size={12} /> Disabled</>}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <BarChart2 className="text-orange-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Google Analytics 4</h4>
                      <p className="text-[11px] text-gray-500">Track user behavior and traffic</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Measurement ID
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.googleAnalyticsId || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          googleAnalyticsId: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all font-mono"
                      placeholder="G-XXXXXXXXXX"
                    />
                  </div>
                </div>

                {/* FB Pixel Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative">
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                    {settingsFormData.facebookPixelId ? <><CheckCircle size={12} className="text-green-500" /> Active</> : <><AlertCircle size={12} /> Disabled</>}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Activity className="text-blue-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Meta (Facebook) Pixel</h4>
                      <p className="text-[11px] text-gray-500">Track ad conversions and events</p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Pixel ID
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.facebookPixelId || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          facebookPixelId: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all font-mono"
                      placeholder="123456789012345"
                    />
                  </div>
                </div>

                {/* GTM Card */}
                <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow relative md:col-span-2">
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                    {settingsFormData.googleTagManagerId ? <><CheckCircle size={12} className="text-green-500" /> Active</> : <><AlertCircle size={12} /> Disabled</>}
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <SettingsIcon className="text-indigo-600" size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">Google Tag Manager</h4>
                      <p className="text-[11px] text-gray-500">Advanced tag management container</p>
                    </div>
                  </div>
                  <div className="mt-2 max-w-md">
                    <label className="block text-[11px] font-bold text-gray-500 mb-1 uppercase tracking-wider">
                      Container ID
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.googleTagManagerId || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          googleTagManagerId: e.target.value,
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 transition-all font-mono"
                      placeholder="GTM-XXXXXXX"
                    />
                  </div>
                </div>

              </div>
            </div>
          ) : settingsTab === "courier" ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white">
                <div className="flex items-center gap-3 mb-2">
                  <Truck size={24} className="text-emerald-100" />
                  <h3 className="text-xl font-bold">Courier & Fraud Prevention (Steadfast)</h3>
                </div>
                <p className="text-emerald-100 text-sm max-w-2xl">
                  Connect your Steadfast Courier account API keys to enable real-time consignment tracking and automatic customer fraud / return ratio checks before dispatching parcels.
                </p>
              </div>

              <div className="p-6 space-y-6 bg-gray-50/50">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex gap-3 text-sm text-emerald-800">
                  <CheckCircle size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">কোথা থেকে API Key পাবেন?</p>
                    <p className="text-xs text-emerald-700 mt-1">
                      Steadfast Courier পোর্টালে লগইন করে Settings &gt; API তে যান। সেখান থেকে আপনার <strong>Api-Key</strong> এবং <strong>Secret-Key</strong> কপি করে নিচের বক্সে পেস্ট করুন।
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      Steadfast Api-Key
                    </label>
                    <input
                      type="text"
                      value={settingsFormData.steadfastApiKey || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          steadfastApiKey: e.target.value.trim(),
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 transition-all font-mono py-2.5 px-3 border"
                      placeholder="e.g. 7f8a9b2c3d4e..."
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Steadfast API Key</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">
                      Steadfast Secret-Key
                    </label>
                    <input
                      type="password"
                      value={settingsFormData.steadfastSecretKey || ""}
                      onChange={(e) =>
                        setSettingsFormData({
                          ...settingsFormData,
                          steadfastSecretKey: e.target.value.trim(),
                        })
                      }
                      className="w-full text-sm border-gray-200 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-gray-50 transition-all font-mono py-2.5 px-3 border"
                      placeholder="••••••••••••••••"
                    />
                    <p className="text-[11px] text-gray-500 mt-1">Steadfast Secret Key</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-700 capitalize">
                  {String(settingsTab).replace(/([A-Z])/g, " $1").trim()} Setting
                </h3>
              </div>
              <div className="p-6 text-center py-12 text-gray-400">
                <SettingsIcon size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold text-lg capitalize">
                  {String(settingsTab).replace(/([A-Z])/g, " $1").trim()} Module
                </p>
                <p className="text-sm">
                  Configuring options for {settingsTab} are under development.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4 pb-12">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-[#7B61FF] text-white rounded-md font-bold hover:bg-opacity-90 disabled:opacity-50 flex items-center gap-2 text-sm"
            >
              {loading ? (
                "Saving..."
              ) : (
                <>
                  <CheckSquare size={16} /> Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
