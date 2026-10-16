import React, { useState, useEffect } from 'react';
import { Mail, Save, RefreshCw, Send, Sparkles, Eye } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../../../firebase';
import toast from 'react-hot-toast';
import DOMPurify from 'dompurify';
import { sendEmail } from '../../../../services/emailService';
import { useAuth } from '../../../../context/AuthContext';

export interface EmailTemplateData {
  id: string;
  name: string;
  category: 'hosting' | 'payment' | 'domain' | 'order' | 'support' | 'system';
  subject: string;
  heading: string;
  badgeText: string;
  bodyHtml: string;
  footerNote: string;
  updatedAt?: string;
}

const DEFAULT_TEMPLATES: Record<string, EmailTemplateData> = {
  welcome_account: {
    id: 'welcome_account',
    name: 'General: Account Welcome',
    category: 'system',
    subject: 'Welcome to Click2IT BD - {{customerName}}',
    heading: 'Welcome to Click2IT BD!',
    badgeText: '✓ Account Created',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>Thank you for signing up with Click2IT BD! We are absolutely thrilled to have you on board.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <p style="margin:4px 0;">With your new account, you can now:</p>
  <ul style="margin:8px 0; padding-left:20px;">
    <li>Register and manage domain names</li>
    <li>Deploy lightning-fast cloud hosting</li>
    <li>Purchase authentic PC components</li>
    <li>Build custom PCs with expert support</li>
  </ul>
</div>
<p>If you ever have any questions, our support team is available 24/7. Just reply to this email or open a support ticket from your dashboard.</p>
<p>Welcome to the Click2IT family!</p>`,
    footerNote: 'Need help getting started? Check out our knowledge base.',
  },
  welcome_hosting: {
    id: 'welcome_hosting',
    name: 'Hosting: Account Activation',
    category: 'hosting',
    subject: '🎉 Your Hosting Account is Ready - {{domain}}',
    heading: 'Welcome to Click2IT Cloud Hosting!',
    badgeText: '✓ Hosting Account Active',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>Congratulations! Your cPanel cloud hosting account for <strong>{{domain}}</strong> is now active and ready for your website.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 18px 0;">
  <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; text-transform: uppercase;">cPanel Login Details</div>
  <div style="font-size: 14px; margin-bottom: 6px;"><strong>Domain:</strong> {{domain}}</div>
  <div style="font-size: 14px; margin-bottom: 6px;"><strong>cPanel Username:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">{{username}}</code></div>
  <div style="font-size: 14px; margin-bottom: 6px;"><strong>Control Panel:</strong> <a href="{{cPanelUrl}}" style="color: #2563eb; font-weight: 600;">{{cPanelUrl}}</a></div>
  <div style="font-size: 14px; margin-top: 10px;"><strong>Nameservers:</strong><br>• ns1.click2itbd.com<br>• ns2.click2itbd.com</div>
</div>
<p>You can also log in to your account directly from your client portal at <a href="https://click2itbd.com" style="color: #2563eb;">click2itbd.com</a> anytime.</p>`,
    footerNote: 'Need help moving your site? Contact our 24/7 technical support team.',
  },
  domain_registered: {
    id: 'domain_registered',
    name: 'Domain: Registration Confirmation',
    category: 'domain',
    subject: '🌐 Domain Registered Successfully - {{domain}}',
    heading: 'Your Domain is Registered!',
    badgeText: '✓ Domain Active',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>Great news! Your domain <strong>{{domain}}</strong> has been successfully registered and is now yours.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px 0;">
  <div style="margin-bottom:6px;"><strong>Domain:</strong> {{domain}}</div>
  <div style="margin-bottom:6px;"><strong>Expiry Date:</strong> {{expiryDate}}</div>
  <div><strong>Status:</strong> Active</div>
</div>
<p>You can manage your DNS, nameservers, and renewals from your Click2IT dashboard.</p>`,
    footerNote: 'Keep your domain secure and renew on time to prevent service disruption.',
  },
  domain_renewed: {
    id: 'domain_renewed',
    name: 'Domain: Renewal Success',
    category: 'domain',
    subject: '✅ Domain Renewed Successfully - {{domain}}',
    heading: 'Domain Renewal Confirmed',
    badgeText: '✓ Domain Renewed',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>Your domain <strong>{{domain}}</strong> has been successfully renewed! Thank you for continuing to trust Click2IT BD.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px 0;">
  <div style="margin-bottom:6px;"><strong>Domain:</strong> {{domain}}</div>
  <div style="margin-bottom:6px;"><strong>New Expiry Date:</strong> {{expiryDate}}</div>
  <div><strong>Amount Paid:</strong> ৳ {{total}}</div>
</div>
<p>Your online presence remains secure and uninterrupted.</p>`,
    footerNote: 'Keep your domain secure and renew on time to prevent service disruption.',
  },
  payment_verified: {
    id: 'payment_verified',
    name: 'E-commerce: Payment Verification',
    category: 'payment',
    subject: 'Payment Confirmed & Receipt - #{{orderId}}',
    heading: 'Payment Successfully Verified',
    badgeText: '✓ Payment Verified & Paid',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>We are writing to officially confirm that your recent payment for order <strong>#{{orderId}}</strong> has been securely processed and verified.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px 0;">
  <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Order Reference:</span> <strong>#{{orderId}}</strong></div>
  <div style="display:flex; justify-content:space-between; margin-bottom:6px;"><span>Amount Paid:</span> <strong style="color:#16a34a;">৳ {{total}}</strong></div>
  <div style="display:flex; justify-content:space-between;"><span>Payment Method:</span> <strong>{{paymentMethod}}</strong></div>
</div>
<p>Your order is now fully confirmed and is moving to the next stage of fulfillment. If applicable, you will find a detailed invoice attached to this email.</p>
<p>We deeply appreciate your business!</p>`,
    footerNote: 'Thank you for choosing Click2IT BD.',
  },
  payment_rejected: {
    id: 'payment_rejected',
    name: 'E-commerce: Payment Rejected',
    category: 'payment',
    subject: 'Action Required: Payment Failed - #{{orderId}}',
    heading: 'Payment Verification Failed',
    badgeText: '❌ Payment Failed',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>Unfortunately, we were unable to verify the payment for your order <strong>#{{orderId}}</strong>.</p>
<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; margin: 16px 0;">
  <p style="margin:0; color:#b91c1c;"><strong>Reason:</strong> Invalid transaction ID, insufficient amount, or gateway error.</p>
</div>
<p>Please log in to your dashboard to review your order and try submitting the payment again. If you believe this is an error, please reply to this email or contact our support team with your proof of payment.</p>`,
    footerNote: 'Contact support if you need assistance with your payment.',
  },
  order_confirmation: {
    id: 'order_confirmation',
    name: 'E-commerce: Order Confirmation',
    category: 'order',
    subject: 'Order Confirmed - #{{orderId}}',
    heading: 'Thank you for your order!',
    badgeText: '✓ Order Received',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>Thank you for choosing Click2ItBD! We are thrilled to confirm that we have received your order <strong>#{{orderId}}</strong> and our team is already working on processing it.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <h3 style="margin-top:0; color:#1e3a8a; font-size: 15px;">Order Details Summary</h3>
  <div style="margin-bottom:6px;"><strong>Order ID:</strong> #{{orderId}}</div>
  <div><strong>Status:</strong> Processing</div>
</div>
<p>We will send you another update as soon as your order has been shipped or your service is activated. You can track your order status anytime from your client dashboard.</p>
<p>If you need to make any changes to this order, please contact our support team immediately.</p>`,
    footerNote: 'Thank you for shopping with Click2ItBD.',
  },
  order_status_update: {
    id: 'order_status_update',
    name: 'E-commerce: Order Status Update',
    category: 'order',
    subject: 'Order Status Update: {{status}} - #{{orderId}}',
    heading: 'Your Order Status Has Changed',
    badgeText: '✓ Status Updated',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>We are reaching out to let you know that the status of your order <strong>#{{orderId}}</strong> has been updated by our team.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <p style="margin:0;">Current Status: <span style="display: inline-block; padding: 4px 10px; background: #e0e7ff; color: #3730a3; border-radius: 4px; font-weight: bold; margin-left: 8px;">{{status}}</span></p>
</div>
<p>Please log in to your client dashboard for detailed tracking information and next steps.</p>`,
    footerNote: 'Thank you for shopping with Click2ItBD.',
  },
  pc_build_summary: {
    id: 'pc_build_summary',
    name: 'PC Builder: Build Summary',
    category: 'order',
    subject: 'Your Custom PC Build Summary',
    heading: 'Your Custom PC Build',
    badgeText: '✓ Quote Ready',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>Thank you for using the Click2ItBD PC Builder! Your custom build summary is attached to this email as an official quotation.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <p style="margin:0; font-size: 16px;"><strong>Estimated Total:</strong> <span style="color:#16a34a;">৳ {{total}}</span></p>
</div>
<p>Our expert technicians are ready to assemble this machine for you with premium cable management and rigorous stress testing.</p>
<p>If you're ready to place your order or need expert advice on part compatibility, simply reply to this email or call our hotline.</p>`,
    footerNote: 'Thank you for choosing Click2ItBD for your custom rig.',
  },
  support_ticket_created: {
    id: 'support_ticket_created',
    name: 'Support: Ticket Received',
    category: 'support',
    subject: 'Support Ticket Received - [#{{ticketId}}]',
    heading: 'We have received your request',
    badgeText: '✓ Ticket Open',
    bodyHtml: `<p>Dear <strong>{{customerName}}</strong>,</p>
<p>This is an automated response to confirm that we have received your support request.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <div style="margin-bottom:6px;"><strong>Ticket ID:</strong> #{{ticketId}}</div>
  <div><strong>Subject:</strong> {{ticketSubject}}</div>
</div>
<p>Our technical support team will review your issue and respond as soon as possible. Standard response times are between 1-4 hours.</p>
<p>You can view and reply to this ticket directly from your client portal.</p>`,
    footerNote: 'We are committed to resolving your issue quickly.',
  },
  admin_new_order: {
    id: 'admin_new_order',
    name: 'Admin Alert: New Order Received',
    category: 'order',
    subject: 'New Order Received - #{{orderId}}',
    heading: 'New Order Received',
    badgeText: '✓ New Order',
    bodyHtml: `<p>A new order has just been placed on Click2ItBD!</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
  <div style="margin-bottom:6px;"><strong>Order ID:</strong> {{orderId}}</div>
  <div style="margin-bottom:6px;"><strong>Customer:</strong> {{customerName}}</div>
  <div style="margin-bottom:6px;"><strong>Total Amount:</strong> ৳ {{total}}</div>
  <div><strong>Payment Method:</strong> {{paymentMethod}}</div>
</div>
<p>Please log in to the admin panel to review the order, verify the payment, and begin fulfillment.</p>`,
    footerNote: 'Action required in the admin dashboard.',
  },
  low_stock_warning: {
    id: 'low_stock_warning',
    name: 'Admin Alert: Low Stock Warning',
    category: 'order',
    subject: '[ALERT] Low Stock Warning - {{productName}}',
    heading: 'Low Stock Alert',
    badgeText: '⚠️ Low Stock',
    bodyHtml: `<p><strong>Attention Admin,</strong></p>
<p>The following product has dropped to critical stock levels:</p>
<div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 10px; padding: 16px; margin: 16px 0;">
  <div style="margin-bottom:6px; color:#b91c1c;"><strong>Product:</strong> {{productName}}</div>
  <div style="color:#b91c1c;"><strong>Current Stock:</strong> {{currentStock}} units remaining</div>
</div>
<p>Action is required to ensure uninterrupted sales. Please contact vendors to restock this product and update the inventory in the system.</p>`,
    footerNote: 'Immediate action recommended.',
  },
};

const TEMPLATE_VARIABLES = [
  { tag: '{{customerName}}', desc: 'Customer Full Name' },
  { tag: '{{domain}}', desc: 'Domain Name (e.g. example.com)' },
  { tag: '{{expiryDate}}', desc: 'Domain/Hosting Expiry Date' },
  { tag: '{{cPanelUrl}}', desc: 'cPanel Login Link (:2083)' },
  { tag: '{{username}}', desc: 'cPanel Account Username' },
  { tag: '{{invoiceNumber}}', desc: 'Invoice Number (e.g. INV-00047)' },
  { tag: '{{orderId}}', desc: 'Order ID' },
  { tag: '{{status}}', desc: 'Order Status (e.g. Shipped)' },
  { tag: '{{total}}', desc: 'Total Amount (BDT)' },
  { tag: '{{transactionId}}', desc: 'Payment Transaction ID' },
  { tag: '{{paymentMethod}}', desc: 'Payment Method' },
  { tag: '{{productName}}', desc: 'Product Name' },
  { tag: '{{currentStock}}', desc: 'Current Stock Amount' },
  { tag: '{{ticketId}}', desc: 'Support Ticket ID' },
  { tag: '{{ticketSubject}}', desc: 'Support Ticket Subject' },
];
export const EmailTemplatesManager: React.FC = () => {
  const { user } = useAuth();
  const [selectedKey, setSelectedKey] = useState<string>('welcome_hosting');
  const [templates, setTemplates] = useState<Record<string, EmailTemplateData>>(DEFAULT_TEMPLATES);
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplateData>(DEFAULT_TEMPLATES.welcome_hosting);
  const [saving, setSaving] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState(user?.email || 'info@click2itbd.com');

  useEffect(() => {
    async function loadTemplates() {
      try {
        const loaded: Record<string, EmailTemplateData> = { ...DEFAULT_TEMPLATES };
        for (const key of Object.keys(DEFAULT_TEMPLATES)) {
          const docRef = doc(db, 'emailTemplates', key);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            loaded[key] = { ...DEFAULT_TEMPLATES[key], ...snap.data() } as EmailTemplateData;
          }
        }
        setTemplates(loaded);
        setCurrentTemplate(loaded[selectedKey] || DEFAULT_TEMPLATES[selectedKey]);
      } catch (err) {
        console.warn('Failed to fetch custom email templates:', err);
      }
    }
    loadTemplates();
  }, [selectedKey]);

  const handleSelectTemplate = (key: string) => {
    setSelectedKey(key);
    setCurrentTemplate(templates[key] || DEFAULT_TEMPLATES[key]);
  };

  const handleInsertTag = (tag: string) => {
    setCurrentTemplate(prev => ({
      ...prev,
      bodyHtml: prev.bodyHtml + tag
    }));
    toast.success(`Inserted ${tag}`);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const docRef = doc(db, 'emailTemplates', currentTemplate.id);
      await setDoc(docRef, {
        ...currentTemplate,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setTemplates(prev => ({
        ...prev,
        [currentTemplate.id]: currentTemplate,
      }));

      toast.success('Email template saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const defaultData = DEFAULT_TEMPLATES[selectedKey];
    setCurrentTemplate(defaultData);
    toast('Template reset to default values');
  };

  const handleSendTest = async () => {
    if (!testEmailAddress) {
      toast.error('Please provide a recipient email address');
      return;
    }
    try {
      setTestSending(true);
      const renderedHtml = renderPreviewHtml(currentTemplate);
      const renderedSubject = `[TEST] ` + currentTemplate.subject
        .replace(/\{\{domain\}\}/g, 'example.com')
        .replace(/\{\{customerName\}\}/g, 'John Doe')
        .replace(/\{\{invoiceNumber\}\}/g, 'INV-TEST-01')
        .replace(/\{\{orderId\}\}/g, 'ORD-00921')
        .replace(/\{\{status\}\}/g, 'SHIPPED')
        .replace(/\{\{productName\}\}/g, 'AMD Ryzen 5 5600X')
        .replace(/\{\{currentStock\}\}/g, '2')
        .replace(/\{\{expiryDate\}\}/g, '2028-09-20')
        .replace(/\{\{ticketId\}\}/g, 'TKT-12948')
        .replace(/\{\{ticketSubject\}\}/g, 'Cannot access cPanel');

      const res = await sendEmail({
        to: testEmailAddress,
        subject: renderedSubject,
        html: renderedHtml,
        category: 'system',
      });

      if (res) {
        toast.success(`Test email sent to ${testEmailAddress}!`);
      } else {
        toast.error('Could not send test email. Check SMTP settings.');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send test email');
    } finally {
      setTestSending(false);
    }
  };

  const renderPreviewHtml = (tmpl: EmailTemplateData) => {
    let body = tmpl.bodyHtml
      .replace(/\{\{customerName\}\}/g, 'MD Muntasir Resti')
      .replace(/\{\{domain\}\}/g, 'mytestsite.com')
      .replace(/\{\{username\}\}/g, 'resti629')
      .replace(/\{\{cPanelUrl\}\}/g, 'https://server2025.click2it.bd:2083')
      .replace(/\{\{invoiceNumber\}\}/g, 'INV-00054')
      .replace(/\{\{total\}\}/g, '551')
      .replace(/\{\{transactionId\}\}/g, '2sf5e4fsde')
      .replace(/\{\{paymentMethod\}\}/g, 'bKash')
      .replace(/\{\{orderId\}\}/g, 'ORD-00921')
      .replace(/\{\{status\}\}/g, 'SHIPPED')
      .replace(/\{\{productName\}\}/g, 'AMD Ryzen 5 5600X')
      .replace(/\{\{currentStock\}\}/g, '2')
      .replace(/\{\{expiryDate\}\}/g, '2028-09-20')
      .replace(/\{\{ticketId\}\}/g, 'TKT-12948')
      .replace(/\{\{ticketSubject\}\}/g, 'Cannot access cPanel');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 25px 10px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
                <tr>
                  <td style="background: linear-gradient(135deg, #0a1628 0%, #1e3a8a 100%); padding: 30px 24px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">CLICK2IT BD</h1>
                    <p style="margin: 4px 0 0; color: #93c5fd; font-size: 13px;">${tmpl.heading}</p>
                    <div style="margin-top: 14px; display: inline-block; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; border-radius: 30px; padding: 4px 14px;">
                      <span style="color: #4ade80; font-size: 12px; font-weight: 700; text-transform: uppercase;">${tmpl.badgeText}</span>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 28px; color: #1f2937; line-height: 1.6; font-size: 14px;">
                    ${body}
                  </td>
                </tr>
                ${tmpl.footerNote ? `
                <tr>
                  <td style="padding: 0 28px 20px;">
                    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #1e40af;">
                      ${tmpl.footerNote}
                    </div>
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="background-color: #f8fafc; border-top: 1px solid #e5e7eb; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0; font-weight: 700; color: #0f172a;">Click2IT BD</p>
                    <p style="margin: 4px 0 0;">Email: info@click2itbd.com | Web: click2itbd.com</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50">
        <div>
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600" />
            Automated Email & Welcome Templates
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Edit, customize, and test automated welcome emails, invoice receipts, and domain notifications.
          </p>
        </div>

        {/* Template Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedKey}
            onChange={(e) => handleSelectTemplate(e.target.value)}
            className="text-xs font-bold bg-white border border-gray-300 rounded-lg px-3 py-2 text-gray-700 focus:ring-indigo-500 shadow-sm"
          >
            {Object.values(templates).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleReset}
            className="p-2 border border-gray-300 text-gray-600 hover:bg-gray-100 rounded-lg text-xs font-semibold flex items-center gap-1"
            title="Reset to default"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Editor Form - 7 cols */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email Subject Line
            </label>
            <input
              type="text"
              value={currentTemplate.subject}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, subject: e.target.value })}
              className="w-full text-sm font-semibold border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2.5 border"
              placeholder="e.g. 🎉 Your Hosting Account is Ready - {{domain}}"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Header Subtitle / Banner Text
              </label>
              <input
                type="text"
                value={currentTemplate.heading}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, heading: e.target.value })}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Status Badge Text
              </label>
              <input
                type="text"
                value={currentTemplate.badgeText}
                onChange={(e) => setCurrentTemplate({ ...currentTemplate, badgeText: e.target.value })}
                className="w-full text-sm border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
              />
            </div>
          </div>

          {/* Variables Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Click to Insert Dynamic Placeholders:
              </label>
            </div>
            <div className="flex flex-wrap gap-1.5 p-2.5 bg-gray-50 rounded-lg border border-gray-200">
              {TEMPLATE_VARIABLES.map((v) => (
                <button
                  key={v.tag}
                  type="button"
                  onClick={() => handleInsertTag(v.tag)}
                  className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:border-indigo-300 border border-gray-200 rounded text-xs font-mono font-medium text-gray-700 transition-all flex items-center gap-1"
                  title={v.desc}
                >
                  <span>{v.tag}</span>
                  <span className="text-[10px] text-gray-400">({v.desc})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Email Body Content */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email HTML Body Content
            </label>
            <textarea
              rows={8}
              value={currentTemplate.bodyHtml}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, bodyHtml: e.target.value })}
              className="w-full font-mono text-xs border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-3 border leading-relaxed"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Footer Help Note / Support Callout
            </label>
            <input
              type="text"
              value={currentTemplate.footerNote}
              onChange={(e) => setCurrentTemplate({ ...currentTemplate, footerNote: e.target.value })}
              className="w-full text-xs border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 p-2 border"
            />
          </div>

          {/* Save Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-lg text-sm transition-all shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Email Template'}
            </button>
          </div>
        </div>

        {/* Live Preview & Test Send - 5 cols */}
        <div className="lg:col-span-5 bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-indigo-600" />
                Live Preview
              </span>
              <span className="text-[11px] text-gray-500">Auto-updates as you edit</span>
            </div>

            {/* Subject Preview */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3 text-xs">
              <span className="font-bold text-gray-500">Subject: </span>
              <span className="font-semibold text-gray-900">
                {currentTemplate.subject
                  .replace(/\{\{domain\}\}/g, 'mytestsite.com')
                  .replace(/\{\{customerName\}\}/g, 'MD Muntasir Resti')
                  .replace(/\{\{invoiceNumber\}\}/g, 'INV-00054')}
              </span>
            </div>

            {/* HTML Preview Box */}
            <div 
              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-inner max-h-[380px] overflow-y-auto"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(renderPreviewHtml(currentTemplate)) }}
            />
          </div>

          {/* Test Send Box */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Send Live Test Email to:
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmailAddress}
                onChange={(e) => setTestEmailAddress(e.target.value)}
                placeholder="your-email@gmail.com"
                className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-indigo-500"
              />
              <button
                type="button"
                onClick={handleSendTest}
                disabled={testSending}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-lg text-xs transition-all shadow flex items-center gap-1.5 whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                {testSending ? 'Sending...' : 'Send Test'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatesManager;
