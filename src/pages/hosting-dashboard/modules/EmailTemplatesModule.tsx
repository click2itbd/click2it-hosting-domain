import React, { useState, useEffect } from 'react';
import {
  Mail, Server, Send, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle,
  ToggleLeft, ToggleRight, Braces, Sparkles, RefreshCw, Key, ShieldCheck,
  Search, ExternalLink, Inbox, Check, Copy, ArrowRight, FileText, Clock
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { toast } from 'react-hot-toast';
import {
  collection, getDocs, setDoc, doc, getDoc, query, orderBy, limit, onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../../../firebase';
import { Modal } from '../components/SharedUI';
import { apiPost } from '../../../services/apiClient';

interface EmailTemplateDef {
  id: string;
  type: string;
  category: 'orders' | 'domains' | 'hosting' | 'billing' | 'system';
  name: string;
  nameBn: string;
  triggerDesc: string;
  subject: string;
  heading: string;
  badgeText: string;
  body: string;
  footerNote: string;
  variables: string[];
  isActive?: boolean;
}

const TEMPLATE_DEFINITIONS: Record<string, EmailTemplateDef> = {
  order_completed: {
    id: 'order_completed',
    type: 'order_completed',
    category: 'orders',
    name: 'Order Completed & Activated',
    nameBn: 'অর্ডার কমপ্লিট ও সার্ভিস অ্যাক্টিভেশন',
    triggerDesc: 'Triggered when an admin approves/completes an order or services finish provisioning.',
    subject: 'Order Completed & Active - #{{order_id}} [Click2IT]',
    heading: 'Your Order Has Been Activated!',
    badgeText: 'Completed & Active',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Great news! Your order <strong>#{{order_id}}</strong> ({{invoice_no}}) has been fully processed and all your services are now <strong>ACTIVE</strong> and ready for use.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0;">
  <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">Order Summary:</p>
  <p style="margin: 0 0 4px 0; color: #475569;"><strong>Invoice No:</strong> {{invoice_no}}</p>
  <p style="margin: 0 0 4px 0; color: #475569;"><strong>Total Paid:</strong> {{total_amount}} via {{payment_method}}</p>
  <p style="margin: 0; color: #475569;"><strong>Default Nameservers:</strong> {{nameservers}}</p>
</div>
<p>You can manage your active domains, hosting accounts, and DNS records anytime from your client dashboard.</p>
<div style="text-align: center; margin: 24px 0 16px 0;">
  <a href="{{client_portal_url}}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Access Client Portal</a>
</div>`,
    footerNote: 'Need technical assistance? Our 24/7 engineer support desk is ready to help at info@click2it.bd.',
    variables: ['{{customer_name}}', '{{order_id}}', '{{invoice_no}}', '{{total_amount}}', '{{payment_method}}', '{{nameservers}}', '{{client_portal_url}}', '{{company_name}}']
  },

  order_placed: {
    id: 'order_placed',
    type: 'order_placed',
    category: 'orders',
    name: 'Order Placed & Confirmation',
    nameBn: 'নতুন অর্ডার প্লেস ও ইনভয়েস তৈরি',
    triggerDesc: 'Triggered automatically when a customer submits a new order for domain or hosting.',
    subject: 'Order Received & Invoice Created - #{{order_id}} [Click2IT]',
    heading: 'Thank You for Your Order!',
    badgeText: 'Order Placed',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Thank you for choosing Click2IT! We have received your order <strong>#{{order_id}}</strong> ({{invoice_no}}). Our automated provisioning queue is preparing your setup.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0;">
  <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">Order Details:</p>
  <p style="margin: 0 0 4px 0; color: #475569;"><strong>Invoice No:</strong> {{invoice_no}}</p>
  <p style="margin: 0 0 4px 0; color: #475569;"><strong>Amount:</strong> {{total_amount}}</p>
  <p style="margin: 0; color: #475569;"><strong>Payment Method:</strong> {{payment_method}}</p>
</div>
<p>If you have already completed payment via bKash/Nagad/Card, your services will be verified and activated shortly.</p>`,
    footerNote: 'Please keep your Order ID handy if you contact support.',
    variables: ['{{customer_name}}', '{{order_id}}', '{{invoice_no}}', '{{total_amount}}', '{{payment_method}}', '{{client_portal_url}}', '{{company_name}}']
  },

  domain_transfer: {
    id: 'domain_transfer',
    type: 'domain_transfer',
    category: 'domains',
    name: 'Domain Transfer Initiated',
    nameBn: 'ডোমেইন ট্রান্সফার শুরু ও প্রসেসিং',
    triggerDesc: 'Triggered when a domain transfer request is accepted by Openprovider registry with nameservers.',
    subject: '🔄 Domain Transfer Initiated - {{domain}} [Click2IT]',
    heading: 'Domain Transfer Submitted to Registry',
    badgeText: 'Transfer In Progress',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Your domain transfer for <strong>{{domain}}</strong> has been verified and submitted to Openprovider registry. Below are your transfer details:</p>
<table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px;">
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; width: 40%; border-bottom: 1px solid #e2e8f0;">Domain Name</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0;">{{domain}}</td></tr>
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Transfer Status</td><td style="padding: 10px 14px; color: #d97706; font-weight: 800; border-bottom: 1px solid #e2e8f0;">Pending Registry Approval (REQ)</td></tr>
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Reference ID</td><td style="padding: 10px 14px; color: #0f172a; font-family: monospace; border-bottom: 1px solid #e2e8f0;">{{transfer_id}}</td></tr>
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Primary NS (NS1)</td><td style="padding: 10px 14px; color: #2563eb; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">{{ns1}}</td></tr>
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Secondary NS (NS2)</td><td style="padding: 10px 14px; color: #2563eb; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">{{ns2}}</td></tr>
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569;">Free Extension</td><td style="padding: 10px 14px; color: #16a34a; font-weight: 700;">+1 Year Renewal Included</td></tr>
</table>
<p style="font-size: 13px; color: #64748b;">
  Please check your previous registrar email if an approval confirmation link was dispatched. Typical transfer duration is 5-7 calendar days.
</p>`,
    footerNote: 'You will receive another notification once the transfer completes automatically.',
    variables: ['{{customer_name}}', '{{domain}}', '{{transfer_id}}', '{{nameservers}}', '{{ns1}}', '{{ns2}}', '{{portal_url}}', '{{company_name}}']
  },

  domain_registration: {
    id: 'domain_registration',
    type: 'domain_registration',
    category: 'domains',
    name: 'Domain Active / Registration Success',
    nameBn: 'ডোমেইন রেজিস্টার / রিনিউ সফল',
    triggerDesc: 'Triggered when domain registration or transfer completes and status becomes active.',
    subject: '✅ Domain Active - {{domain}} [Click2IT]',
    heading: 'Your Domain is Live & Active!',
    badgeText: 'Domain Active',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Congratulations! Your domain <strong>{{domain}}</strong> has been successfully registered and is now active worldwide.</p>
<table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px;">
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; width: 40%; border-bottom: 1px solid #e2e8f0;">Domain</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0;">{{domain}}</td></tr>
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Status</td><td style="padding: 10px 14px; color: #16a34a; font-weight: 800; border-bottom: 1px solid #e2e8f0;">ACTIVE</td></tr>
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Expiry Date</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 700; border-bottom: 1px solid #e2e8f0;">{{expiry_date}}</td></tr>
  <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569;">Active Nameservers</td><td style="padding: 10px 14px; color: #2563eb; font-family: monospace;">{{nameservers}}</td></tr>
</table>
<p>You can manage DNS records (A, CNAME, MX, TXT) and registrar lock anytime from your client portal.</p>`,
    footerNote: 'DNS changes typically propagate globally within 1 to 24 hours.',
    variables: ['{{customer_name}}', '{{domain}}', '{{registration_id}}', '{{expiry_date}}', '{{nameservers}}', '{{portal_url}}', '{{company_name}}']
  },

  welcome_hosting: {
    id: 'welcome_hosting',
    type: 'welcome_hosting',
    category: 'hosting',
    name: 'Hosting Account & cPanel Access',
    nameBn: 'হোস্টিং অ্যাকাউন্ট ও cPanel লগইন তথ্য',
    triggerDesc: 'Triggered when a cloud hosting account is provisioned with cPanel credentials.',
    subject: '🎉 Your Hosting Account is Ready - {{domain}}',
    heading: 'Welcome to Cloud Hosting!',
    badgeText: 'Hosting Active',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Congratulations! Your cPanel cloud hosting account for <strong>{{domain}}</strong> is now active and ready for your website.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 18px 0; font-size: 13px;">
  <p style="margin: 0 0 10px 0; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">cPanel Login Credentials</p>
  <p style="margin: 0 0 6px 0; color: #475569;"><strong>Domain:</strong> {{domain}}</p>
  <p style="margin: 0 0 6px 0; color: #475569;"><strong>Control Panel URL:</strong> <a href="{{cpanel_url}}" style="color: #2563eb; font-weight: 700;">{{cpanel_url}}</a></p>
  <p style="margin: 0 0 6px 0; color: #475569;"><strong>Username:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">{{username}}</code></p>
  <p style="margin: 0 0 6px 0; color: #475569;"><strong>Password:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0f172a;">{{password}}</code></p>
  <p style="margin: 0; color: #475569;"><strong>Nameservers:</strong> {{nameservers}}</p>
</div>
<p>Please point your domain's nameservers to connect your website with this hosting account.</p>`,
    footerNote: 'For security reasons, we recommend changing your cPanel password upon first login.',
    variables: ['{{customer_name}}', '{{domain}}', '{{package_name}}', '{{cpanel_url}}', '{{username}}', '{{password}}', '{{nameservers}}', '{{server_ip}}', '{{company_name}}']
  },

  payment_verification: {
    id: 'payment_verification',
    type: 'payment_verification',
    category: 'billing',
    name: 'Payment Verified & Receipt',
    nameBn: 'পেমেন্ট সফল ও ভেরিফিকেশন',
    triggerDesc: 'Triggered when customer payment is verified by accounting staff or instant gateway.',
    subject: 'Payment Received - Order #{{order_id}} [Click2IT]',
    heading: 'Payment Successfully Received',
    badgeText: 'Payment Verified',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>We have successfully received and verified your payment for order <strong>#{{order_id}}</strong>.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0;">
  <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">Payment Details:</p>
  <p style="margin: 0 0 4px 0; color: #475569;"><strong>Amount Paid:</strong> {{amount}}</p>
  <p style="margin: 0 0 4px 0; color: #475569;"><strong>Payment Method:</strong> {{payment_method}}</p>
  <p style="margin: 0; color: #475569;"><strong>Status:</strong> Paid & Verified</p>
</div>
<p>Thank you for your prompt payment! A copy of your official invoice has been archived in your client account.</p>`,
    footerNote: 'Click2IT Billing & Finance Team',
    variables: ['{{customer_name}}', '{{order_id}}', '{{amount}}', '{{payment_method}}', '{{company_name}}']
  },

  renewal_reminder: {
    id: 'renewal_reminder',
    type: 'renewal_reminder',
    category: 'billing',
    name: 'Service Renewal Reminder',
    nameBn: 'সার্ভিস রিনিউয়াল রিমাইন্ডার',
    triggerDesc: 'Triggered before domain or hosting expiration to prevent downtime.',
    subject: 'Service Renewal Notice for {{domain}}',
    heading: 'Upcoming Service Renewal',
    badgeText: 'Renewal Reminder',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>This is a courtesy reminder that your service for <strong>{{domain}}</strong> is approaching its expiration date.</p>
<div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin: 18px 0;">
  <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">Renewal Details:</p>
  <p style="margin: 0 0 4px 0; color: #475569;"><strong>Domain / Service:</strong> {{domain}}</p>
  <p style="margin: 0 0 4px 0; color: #475569;"><strong>Due Date:</strong> {{due_date}}</p>
  <p style="margin: 0; color: #475569;"><strong>Renewal Fee:</strong> {{amount}}</p>
</div>
<p>Please renew before the due date to ensure continuous website uptime and protect your domain ownership.</p>`,
    footerNote: 'You can pay instantly using bKash, Nagad, Rocket, or Visa/Mastercard.',
    variables: ['{{customer_name}}', '{{domain}}', '{{amount}}', '{{due_date}}', '{{company_name}}']
  },

  service_suspension: {
    id: 'service_suspension',
    type: 'service_suspension',
    category: 'system',
    name: 'Service Suspension Notice',
    nameBn: 'সার্ভিস সাসপেনশন নোটিশ',
    triggerDesc: 'Triggered when an overdue account is suspended.',
    subject: 'Service Suspended – Immediate Action Required for {{domain}}',
    heading: 'Service Temporarily Suspended',
    badgeText: 'Suspended',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Your service for <strong>{{domain}}</strong> has been temporarily suspended due to an outstanding invoice of <strong>{{amount}}</strong>.</p>
<p>To reactivate your service immediately, please clear the unpaid balance from your Client Portal or contact our billing desk.</p>`,
    footerNote: 'Data is safely preserved for a grace period before permanent release.',
    variables: ['{{customer_name}}', '{{domain}}', '{{amount}}', '{{company_name}}']
  },

  ticket_reply: {
    id: 'ticket_reply',
    type: 'ticket_reply',
    category: 'system',
    name: 'Support Ticket Staff Reply',
    nameBn: 'সাপোর্ট টিকিট উত্তর',
    triggerDesc: 'Triggered when support staff replies to a customer ticket.',
    subject: 'Support Ticket Update: {{ticket_id}} - {{ticket_subject}}',
    heading: 'New Response on Your Ticket',
    badgeText: 'Staff Reply',
    body: `<p>Dear <strong>{{customer_name}}</strong>,</p>
<p>Our support team has replied to your ticket <strong>{{ticket_id}}</strong> ({{ticket_subject}}):</p>
<div style="background-color: #f1f5f9; border-left: 4px solid #2563eb; padding: 14px 16px; border-radius: 4px; margin: 16px 0; font-size: 13px; color: #1e293b;">
  <p style="margin: 0 0 4px 0; font-weight: 700; color: #2563eb;">{{staff_name}}:</p>
  <p style="margin: 0; line-height: 1.5;">{{reply_message}}</p>
</div>
<p>You can view the full discussion history or respond directly by clicking below:</p>
<div style="text-align: center; margin: 20px 0;">
  <a href="{{ticket_url}}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 10px 24px; border-radius: 8px; font-weight: 700; font-size: 13px; display: inline-block;">View Ticket Conversation</a>
</div>`,
    footerNote: 'Please do not reply directly to this automated email; use the ticket link above.',
    variables: ['{{customer_name}}', '{{ticket_id}}', '{{ticket_subject}}', '{{staff_name}}', '{{reply_message}}', '{{ticket_url}}', '{{company_name}}']
  },

  password_reset: {
    id: 'password_reset',
    type: 'password_reset',
    category: 'system',
    name: 'Password Reset Notification',
    nameBn: 'পাসওয়ার্ড রিসেট লিংক',
    triggerDesc: 'Triggered when customer requests a password reset link.',
    subject: 'Reset Your Password - Click2IT',
    heading: 'Reset Your Password',
    badgeText: 'Security Notice',
    body: `<p>Hello,</p>
<p>We received a request to reset your password for your Click2IT account (<strong>{{email}}</strong>).</p>
<div style="text-align: center; margin: 24px 0;">
  <a href="{{resetUrl}}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Reset Password</a>
</div>
<p style="font-size: 13px; color: #64748b;">
  This link will expire in {{expiresInMinutes}} minutes. If you did not request a password reset, please ignore this email.
</p>`,
    footerNote: 'Your account security is our top priority.',
    variables: ['{{email}}', '{{resetUrl}}', '{{expiresInMinutes}}', '{{company_name}}']
  }
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  orders:  { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  domains: { bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  hosting: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
  billing: { bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  system:  { bg: 'bg-slate-50',   text: 'text-slate-700',   border: 'border-slate-200' },
};

export function EmailTemplatesModule() {
  const [activeSection, setActiveSection] = useState<'smtp' | 'templates' | 'logs'>('smtp');

  // --- SMTP Configuration State ---
  const [smtpForm, setSmtpForm] = useState({
    mailDriver: 'smtp',
    mailHost: '',
    mailPort: '587',
    mailUsername: '',
    mailPassword: '',
    mailEncryption: 'tls',
    mailFromName: 'Click2IT',
    mailFromAddress: '',
    resendApiKey: '',
  });
  const [loadingSmtp, setLoadingSmtp] = useState(true);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [sendingTestEmail, setSendingTestEmail] = useState(false);
  const [testEmailResult, setTestEmailResult] = useState<{ success: boolean; message: string } | null>(null);

  // --- Email Templates State ---
  const [templates, setTemplates] = useState<EmailTemplateDef[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplateDef | null>(null);
  const [modalForm, setModalForm] = useState({
    subject: '',
    heading: '',
    badgeText: '',
    body: '',
    footerNote: '',
    isActive: true,
  });
  const [modalTab, setModalTab] = useState<'editor' | 'preview'>('editor');
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [modalTestRecipient, setModalTestRecipient] = useState('');
  const [sendingModalTest, setSendingModalTest] = useState(false);

  // --- Email Logs State ---
  const [emailLogs, setEmailLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [logFilter, setLogFilter] = useState<'all' | 'sent' | 'failed'>('all');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  // 1. Fetch SMTP settings
  useEffect(() => {
    const fetchSmtpSettings = async () => {
      try {
        setLoadingSmtp(true);
        const snap = await getDoc(doc(db, 'settings', 'site'));
        if (snap.exists()) {
          const d = snap.data() || {};
          setSmtpForm({
            mailDriver: d.mailDriver || 'smtp',
            mailHost: d.mailHost || '',
            mailPort: d.mailPort ? String(d.mailPort) : '587',
            mailUsername: d.mailUsername || '',
            mailPassword: d.mailPassword || '',
            mailEncryption: d.mailEncryption || 'tls',
            mailFromName: d.mailFromName || 'Click2IT',
            mailFromAddress: d.mailFromAddress || '',
            resendApiKey: d.resendApiKey || '',
          });
          if (d.mailFromAddress) {
            setTestEmailRecipient(d.mailFromAddress);
            setModalTestRecipient(d.mailFromAddress);
          }
        }
      } catch (err) {
        console.warn('Failed to load SMTP settings:', err);
      } finally {
        setLoadingSmtp(false);
      }
    };
    fetchSmtpSettings();
  }, []);

  // 2. Fetch Templates
  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const snap = await getDocs(collection(db, 'emailTemplates'));
      const dbTemplates: Record<string, any> = {};
      snap.docs.forEach(d => {
        dbTemplates[d.id] = d.data();
      });

      const mergedList: EmailTemplateDef[] = Object.keys(TEMPLATE_DEFINITIONS).map(id => {
        const def = TEMPLATE_DEFINITIONS[id];
        const dbData = dbTemplates[id] || {};
        return {
          ...def,
          subject: dbData.subject !== undefined ? dbData.subject : def.subject,
          heading: dbData.heading !== undefined ? dbData.heading : def.heading,
          badgeText: dbData.badgeText !== undefined ? dbData.badgeText : def.badgeText,
          body: dbData.bodyHtml !== undefined ? dbData.bodyHtml : (dbData.body !== undefined ? dbData.body : def.body),
          footerNote: dbData.footerNote !== undefined ? dbData.footerNote : def.footerNote,
          isActive: dbData.isActive !== undefined ? dbData.isActive : true,
        };
      });

      setTemplates(mergedList);
    } catch (err) {
      toast.error('Failed to load email templates');
    } finally {
      setLoadingTemplates(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // 3. Listen to Email Logs
  useEffect(() => {
    setLoadingLogs(true);
    const q = query(collection(db, 'emailLogs'), orderBy('createdAt', 'desc'), limit(40));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmailLogs(logs);
      setLoadingLogs(false);
    }, (error) => {
      console.warn('Error reading emailLogs:', error);
      setLoadingLogs(false);
    });

    return () => unsubscribe();
  }, []);

  // Preset Handlers
  const applyPreset = (preset: 'cpanel' | 'gmail' | 'office365' | 'resend') => {
    if (preset === 'cpanel') {
      const hostGuess = typeof window !== 'undefined' ? `mail.${window.location.hostname.replace(/^www\./, '')}` : 'mail.click2it.com.bd';
      setSmtpForm(f => ({
        ...f,
        mailDriver: 'smtp',
        mailHost: hostGuess,
        mailPort: '465',
        mailEncryption: 'ssl',
      }));
      toast.success('Applied cPanel Webmail Preset (Port 465 SSL)');
    } else if (preset === 'gmail') {
      setSmtpForm(f => ({
        ...f,
        mailDriver: 'smtp',
        mailHost: 'smtp.gmail.com',
        mailPort: '465',
        mailEncryption: 'ssl',
      }));
      toast.success('Applied Gmail Preset (Use Google 16-char App Password)');
    } else if (preset === 'office365') {
      setSmtpForm(f => ({
        ...f,
        mailDriver: 'smtp',
        mailHost: 'smtp.office365.com',
        mailPort: '587',
        mailEncryption: 'tls',
      }));
      toast.success('Applied Microsoft 365 Preset (Port 587 STARTTLS)');
    } else if (preset === 'resend') {
      setSmtpForm(f => ({
        ...f,
        mailDriver: 'resend',
      }));
      toast.success('Selected Resend API Provider');
    }
  };

  // Save SMTP Settings
  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);
    try {
      const payload = {
        mailDriver: smtpForm.mailDriver,
        mailHost: smtpForm.mailHost.trim(),
        mailPort: smtpForm.mailPort.trim(),
        mailUsername: smtpForm.mailUsername.trim(),
        mailPassword: smtpForm.mailPassword.trim(),
        mailEncryption: smtpForm.mailEncryption,
        mailFromName: smtpForm.mailFromName.trim(),
        mailFromAddress: smtpForm.mailFromAddress.trim(),
        resendApiKey: smtpForm.resendApiKey.trim(),
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'settings', 'site'), payload, { merge: true });

      // Notify backend to clear cache
      try {
        await apiPost('/api/email/settings', payload);
      } catch (err) {
        // Backend persistence fallback
      }

      toast.success('SMTP Settings saved successfully!');
    } catch (err: any) {
      toast.error('Failed to save settings: ' + (err.message || 'Error'));
    } finally {
      setSavingSmtp(false);
    }
  };

  // Test Handshake Connection
  const handleVerifySmtp = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const customConfig = {
        host: smtpForm.mailHost.trim(),
        port: smtpForm.mailPort.trim(),
        user: smtpForm.mailUsername.trim(),
        password: smtpForm.mailPassword.trim(),
        secure: smtpForm.mailEncryption === 'ssl' || smtpForm.mailPort === '465',
        fromName: smtpForm.mailFromName.trim(),
        fromEmail: smtpForm.mailFromAddress.trim() || smtpForm.mailUsername.trim(),
      };

      const res: any = await apiPost('/api/email/verify-smtp', { customConfig });

      if (res.success) {
        setConnectionStatus({ success: true, message: res.message || 'SMTP Handshake Verified Successfully!' });
        toast.success('SMTP Connection Verified!');
      } else {
        setConnectionStatus({ success: false, message: res.message || 'SMTP Handshake Failed' });
        toast.error(res.message || 'Handshake failed');
      }
    } catch (err: any) {
      setConnectionStatus({ success: false, message: err.message || 'Connection test failed' });
      toast.error(err.message || 'Verification error');
    } finally {
      setTestingConnection(false);
    }
  };

  // Send Test Real Email
  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      toast.error('Please enter a valid recipient email address');
      return;
    }

    setSendingTestEmail(true);
    setTestEmailResult(null);
    try {
      const customConfig = {
        host: smtpForm.mailHost.trim(),
        port: smtpForm.mailPort.trim(),
        user: smtpForm.mailUsername.trim(),
        password: smtpForm.mailPassword.trim(),
        secure: smtpForm.mailEncryption === 'ssl' || smtpForm.mailPort === '465',
        fromName: smtpForm.mailFromName.trim(),
        fromEmail: smtpForm.mailFromAddress.trim() || smtpForm.mailUsername.trim(),
      };

      const res: any = await apiPost('/api/email/send-test-email', {
        to: testEmailRecipient.trim(),
        customConfig
      });

      if (res.success) {
        setTestEmailResult({ success: true, message: `Test email dispatched to ${testEmailRecipient}!` });
        toast.success(`Test email sent to ${testEmailRecipient}`);
      } else {
        setTestEmailResult({ success: false, message: res.message || 'Failed to dispatch test email' });
        toast.error(res.message || 'Dispatch failed');
      }
    } catch (err: any) {
      setTestEmailResult({ success: false, message: err.message || 'Failed to send test email' });
      toast.error(err.message || 'Error sending test email');
    } finally {
      setSendingTestEmail(false);
    }
  };

  // Toggle Template Status
  const handleToggleTemplate = async (tpl: EmailTemplateDef) => {
    try {
      const nextActive = !tpl.isActive;
      await setDoc(doc(db, 'emailTemplates', tpl.id), {
        isActive: nextActive,
        updatedAt: new Date().toISOString(),
      }, { merge: true });

      setTemplates(list => list.map(t => t.id === tpl.id ? { ...t, isActive: nextActive } : t));
      toast.success(nextActive ? `Enabled "${tpl.name}"` : `Disabled "${tpl.name}"`);
    } catch (err: any) {
      toast.error('Failed to update status');
    }
  };

  // Open Edit Modal
  const openEditModal = (tpl: EmailTemplateDef) => {
    setEditingTemplate(tpl);
    setModalForm({
      subject: tpl.subject || '',
      heading: tpl.heading || '',
      badgeText: tpl.badgeText || '',
      body: tpl.body || '',
      footerNote: tpl.footerNote || '',
      isActive: tpl.isActive !== false,
    });
    setModalTab('editor');
    setEditModalOpen(true);
  };

  // Insert Variable into body
  const insertVariable = (varName: string) => {
    setModalForm(f => ({ ...f, body: (f.body ? f.body + ' ' : '') + varName }));
    toast.success(`Inserted ${varName}`);
  };

  // Save Template Modal
  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTemplate) return;
    if (!modalForm.subject.trim()) {
      toast.error('Subject line is required');
      return;
    }

    setSavingTemplate(true);
    try {
      const data = {
        id: editingTemplate.id,
        type: editingTemplate.type,
        name: editingTemplate.name,
        subject: modalForm.subject.trim(),
        heading: modalForm.heading.trim(),
        badgeText: modalForm.badgeText.trim(),
        bodyHtml: modalForm.body.trim(),
        body: modalForm.body.trim(),
        footerNote: modalForm.footerNote.trim(),
        isActive: modalForm.isActive,
        updatedAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'emailTemplates', editingTemplate.id), data, { merge: true });
      toast.success('Email template saved successfully!');
      setEditModalOpen(false);
      fetchTemplates();
    } catch (err: any) {
      toast.error('Failed to save template: ' + err.message);
    } finally {
      setSavingTemplate(false);
    }
  };

  // Send Test Preview from Modal
  const handleSendModalTest = async () => {
    if (!editingTemplate) return;
    const recipient = modalTestRecipient.trim() || smtpForm.mailFromAddress.trim() || auth.currentUser?.email || '';
    if (!recipient || !recipient.includes('@')) {
      toast.error('Please enter a recipient email address to send the preview');
      return;
    }

    setSendingModalTest(true);
    try {
      const res: any = await apiPost('/api/email/send-test-email', {
        to: recipient,
        templateId: editingTemplate.id,
        subject: modalForm.subject,
      });

      if (res.success) {
        toast.success(`Test preview dispatched to ${recipient}!`);
      } else {
        toast.error(res.message || 'Failed to send preview');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to dispatch preview');
    } finally {
      setSendingModalTest(false);
    }
  };

  // Render mock HTML preview with realistic dummy values
  const getRenderedPreviewHtml = () => {
    if (!editingTemplate) return '';
    let previewBody = modalForm.body || '';

    const mockReplacements: Record<string, string> = {
      '{{customer_name}}': 'Tanvir Hossain',
      '{{order_id}}': 'ORD-98214',
      '{{invoice_no}}': 'INV-2026-0042',
      '{{domain}}': 'example-company.com',
      '{{total_amount}}': '৳1,450',
      '{{amount}}': '৳1,450',
      '{{payment_method}}': 'bKash Online',
      '{{nameservers}}': 'ns1.click2itbd.com, ns2.click2itbd.com',
      '{{ns1}}': 'ns1.click2itbd.com',
      '{{ns2}}': 'ns2.click2itbd.com',
      '{{transfer_id}}': '#OP-92841',
      '{{registration_id}}': '#REG-88219',
      '{{package_name}}': 'Turbo Cloud Hosting - 10GB SSD',
      '{{cpanel_url}}': 'https://cpanel.example-company.com:2083',
      '{{username}}': 'tanvir_host',
      '{{password}}': 'Click2IT#Secure2026!',
      '{{server_ip}}': '103.145.118.25',
      '{{due_date}}': '28 Oct 2026',
      '{{expiry_date}}': '22 Oct 2027',
      '{{client_portal_url}}': 'https://click2it.bd/account/services',
      '{{ticket_id}}': '#TCK-552',
      '{{ticket_subject}}': 'SSL Certificate Renewal Inquiry',
      '{{staff_name}}': 'Click2IT Technical Support',
      '{{reply_message}}': 'Your SSL certificate has been auto-renewed and installed successfully.',
      '{{email}}': 'tanvir@example.com',
      '{{resetUrl}}': 'https://click2it.bd/reset-password?token=example_hash',
      '{{expiresInMinutes}}': '60',
      '{{company_name}}': smtpForm.mailFromName || 'Click2IT BD',
    };

    for (const [k, v] of Object.entries(mockReplacements)) {
      previewBody = previewBody.split(k).join(v);
    }

    if (!previewBody.includes('<p>') && !previewBody.includes('<div>') && !previewBody.includes('<table>')) {
      previewBody = previewBody
        .split(/\n\s*\n/)
        .map(p => `<p style="margin: 0 0 14px 0; line-height: 1.6; color: #334155; font-size: 14px;">${p.replace(/\n/g, '<br/>')}</p>`)
        .join('');
    }

    return previewBody;
  };

  // Filter templates
  const filteredTemplates = templates.filter(tpl => {
    const matchesCategory = selectedCategory === 'all' || tpl.category === selectedCategory;
    const matchesSearch = searchQuery === '' ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.nameBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tpl.triggerDesc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#0B1121] via-[#111C35] to-[#1e293b] rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-white/10">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-cyan-400 rounded-2xl shadow-lg shadow-blue-500/30">
                <Mail className="text-white" size={24} />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
                Email &amp; SMTP Settings
              </h1>
            </div>
            <p className="text-slate-400 text-sm max-w-2xl">
              এসএমটিপি সার্ভার কনফিগারেশন, অর্ডার সম্পন্ন হওয়া ও ডোমেইন সংক্রান্ত অটোমেটেড ইমেইল টেমপ্লেট কাস্টমাইজেশন
            </p>
          </div>

          {/* Tab Navigation Pill */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shrink-0">
            <button
              onClick={() => setActiveSection('smtp')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all",
                activeSection === 'smtp'
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
            >
              <Server size={15} /> SMTP Server
            </button>
            <button
              onClick={() => setActiveSection('templates')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all",
                activeSection === 'templates'
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
            >
              <Mail size={15} /> Event Templates
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-white/20">
                {templates.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSection('logs')}
              className={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all",
                activeSection === 'logs'
                  ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/30"
                  : "text-slate-300 hover:text-white hover:bg-white/5"
              )}
            >
              <Clock size={15} /> Delivery Logs
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: SMTP SERVER CONFIGURATION */}
      {/* ========================================================================= */}
      {activeSection === 'smtp' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main SMTP Form (Left 2 Columns) */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Server className="text-blue-600" size={20} /> Mail Delivery Credentials
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Configure your cPanel Webmail, Gmail, or transactional SMTP server to handle all automated customer notifications.
              </p>
            </div>

            {/* Quick Provider Presets */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2.5">
                ⚡ Quick Auto-Fill Presets:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('cpanel')}
                  className="p-2.5 bg-white border border-slate-200 hover:border-blue-500 hover:bg-blue-50/50 rounded-xl text-left transition-all group"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">🌐 cPanel Mail</p>
                  <p className="text-[10px] text-slate-400">Port 465 SSL</p>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('gmail')}
                  className="p-2.5 bg-white border border-slate-200 hover:border-red-500 hover:bg-red-50/50 rounded-xl text-left transition-all group"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-red-600">📧 Gmail / Google</p>
                  <p className="text-[10px] text-slate-400">smtp.gmail.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('office365')}
                  className="p-2.5 bg-white border border-slate-200 hover:border-blue-600 hover:bg-blue-50/50 rounded-xl text-left transition-all group"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600">🏢 Office 365</p>
                  <p className="text-[10px] text-slate-400">Port 587 TLS</p>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('resend')}
                  className="p-2.5 bg-white border border-slate-200 hover:border-violet-600 hover:bg-violet-50/50 rounded-xl text-left transition-all group"
                >
                  <p className="text-xs font-bold text-slate-800 group-hover:text-violet-600">⚡ Resend API</p>
                  <p className="text-[10px] text-slate-400">API Key driver</p>
                </button>
              </div>
            </div>

            <form onSubmit={handleSaveSmtp} className="space-y-5">
              {/* Mail Driver Radio */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Mail Driver
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={cn(
                    "flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all",
                    smtpForm.mailDriver === 'smtp'
                      ? "border-blue-500 bg-blue-50/40 text-blue-900 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}>
                    <input
                      type="radio"
                      name="mailDriver"
                      value="smtp"
                      checked={smtpForm.mailDriver === 'smtp'}
                      onChange={() => setSmtpForm(f => ({ ...f, mailDriver: 'smtp' }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <p className="text-sm font-bold">Standard SMTP</p>
                      <p className="text-[11px] text-slate-500">cPanel Webmail, Gmail, Custom Server</p>
                    </div>
                  </label>

                  <label className={cn(
                    "flex items-center gap-3 p-3.5 border rounded-2xl cursor-pointer transition-all",
                    smtpForm.mailDriver === 'resend'
                      ? "border-violet-500 bg-violet-50/40 text-violet-900 shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  )}>
                    <input
                      type="radio"
                      name="mailDriver"
                      value="resend"
                      checked={smtpForm.mailDriver === 'resend'}
                      onChange={() => setSmtpForm(f => ({ ...f, mailDriver: 'resend' }))}
                      className="text-violet-600 focus:ring-violet-500"
                    />
                    <div>
                      <p className="text-sm font-bold">Resend API Direct</p>
                      <p className="text-[11px] text-slate-500">Fast cloud transactional delivery</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Host & Port */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    SMTP Host <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={smtpForm.mailHost}
                    onChange={e => setSmtpForm(f => ({ ...f, mailHost: e.target.value }))}
                    placeholder="mail.click2it.com.bd or smtp.gmail.com"
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    SMTP Port <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={smtpForm.mailPort}
                    onChange={e => setSmtpForm(f => ({ ...f, mailPort: e.target.value }))}
                    placeholder="465 / 587"
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Encryption & From Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Encryption Protocol
                  </label>
                  <select
                    value={smtpForm.mailEncryption}
                    onChange={e => setSmtpForm(f => ({ ...f, mailEncryption: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="ssl">SSL / TLS (Recommended for Port 465)</option>
                    <option value="tls">STARTTLS (Recommended for Port 587)</option>
                    <option value="none">None (Insecure / Port 25)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Sender Name (From Name)
                  </label>
                  <input
                    type="text"
                    value={smtpForm.mailFromName}
                    onChange={e => setSmtpForm(f => ({ ...f, mailFromName: e.target.value }))}
                    placeholder="Click2IT - Domains & Cloud Hosting"
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Username & From Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    SMTP Username / Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={smtpForm.mailUsername}
                    onChange={e => setSmtpForm(f => ({ ...f, mailUsername: e.target.value }))}
                    placeholder="info@click2it.com.bd"
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    From Email Address
                  </label>
                  <input
                    type="email"
                    value={smtpForm.mailFromAddress}
                    onChange={e => setSmtpForm(f => ({ ...f, mailFromAddress: e.target.value }))}
                    placeholder="info@click2it.com.bd or noreply@click2it.bd"
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  SMTP Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={smtpForm.mailPassword}
                    onChange={e => setSmtpForm(f => ({ ...f, mailPassword: e.target.value }))}
                    placeholder="Enter email password or Google 16-char App Password"
                    className="w-full pl-4 pr-12 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {smtpForm.mailHost.toLowerCase().includes('gmail') && (
                  <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1 font-medium">
                    <AlertCircle size={14} /> For Gmail, create a 16-character App Password at myaccount.google.com/apppasswords. Regular passwords will be rejected with error 535.
                  </p>
                )}
              </div>

              {/* Resend API Key (Optional) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Resend API Key (Optional Fallback)
                </label>
                <input
                  type="password"
                  value={smtpForm.resendApiKey}
                  onChange={e => setSmtpForm(f => ({ ...f, resendApiKey: e.target.value }))}
                  placeholder="re_xxxxxxxxxxxxxx"
                  className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSmtp}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-7 py-3 rounded-xl shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:-translate-y-0.5 transition-all flex items-center gap-2 text-sm disabled:opacity-60"
                >
                  {savingSmtp ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <ShieldCheck size={18} />
                  )}
                  {savingSmtp ? 'Saving...' : 'Save SMTP Settings'}
                </button>
              </div>
            </form>
          </div>

          {/* Test & Verification Panel (Right 1 Column) */}
          <div className="space-y-6">
            {/* Handshake Verification Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShieldCheck size={20} />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">Connection Handshake</h3>
              </div>
              <p className="text-xs text-slate-500">
                Tests authentication and socket connection to the mail server using your current inputs.
              </p>

              <button
                type="button"
                onClick={handleVerifySmtp}
                disabled={testingConnection}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Connecting to {smtpForm.mailHost || 'Server'}...
                  </>
                ) : (
                  <>
                    <Server size={15} />
                    Test Handshake Connection
                  </>
                )}
              </button>

              {connectionStatus && (
                <div className={cn(
                  "p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2.5",
                  connectionStatus.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                )}>
                  {connectionStatus.success ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold">{connectionStatus.success ? 'Connected Successfully' : 'Connection Failed'}</p>
                    <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">{connectionStatus.message}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Send Real Test Email Card */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Send size={20} />
                </div>
                <h3 className="font-extrabold text-base text-slate-800">Send Live Test Email</h3>
              </div>
              <p className="text-xs text-slate-500">
                Sends an actual formatted email to verify inbox deliverability.
              </p>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Recipient Email
                </label>
                <input
                  type="email"
                  value={testEmailRecipient}
                  onChange={e => setTestEmailRecipient(e.target.value)}
                  placeholder="admin@example.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <button
                type="button"
                onClick={handleSendTestEmail}
                disabled={sendingTestEmail || !testEmailRecipient}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-60"
              >
                {sendingTestEmail ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    Send Test Email Now
                  </>
                )}
              </button>

              {testEmailResult && (
                <div className={cn(
                  "p-3.5 rounded-xl text-xs font-medium border flex items-start gap-2.5",
                  testEmailResult.success
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-rose-50 border-rose-200 text-rose-800"
                )}>
                  {testEmailResult.success ? (
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-bold">{testEmailResult.success ? 'Email Dispatched!' : 'Send Failed'}</p>
                    <p className="text-[11px] mt-0.5 opacity-90 leading-relaxed">{testEmailResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: EVENT EMAIL TEMPLATES */}
      {/* ========================================================================= */}
      {activeSection === 'templates' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Category Pills */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              {[
                { id: 'all', label: 'All Events' },
                { id: 'orders', label: 'Orders & Sales' },
                { id: 'domains', label: 'Domain Registry' },
                { id: 'hosting', label: 'Cloud Hosting' },
                { id: 'billing', label: 'Billing & Payments' },
                { id: 'system', label: 'System & Support' },
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                    selectedCategory === cat.id
                      ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search templates or events..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Templates Grid */}
          {loadingTemplates ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-56 bg-slate-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTemplates.map(tpl => {
                const colorMeta = CATEGORY_COLORS[tpl.category] || CATEGORY_COLORS.system;
                return (
                  <div
                    key={tpl.id}
                    className={cn(
                      "relative flex flex-col rounded-3xl border overflow-hidden transition-all duration-300 bg-white hover:-translate-y-1 hover:shadow-xl",
                      tpl.isActive ? "border-slate-200/90 shadow-sm" : "border-slate-100 opacity-60 shadow-none bg-slate-50/50"
                    )}
                  >
                    {/* Top Accent Strip */}
                    <div className={cn("h-1.5 w-full", {
                      "bg-emerald-500": tpl.category === 'orders',
                      "bg-blue-500": tpl.category === 'domains',
                      "bg-indigo-500": tpl.category === 'hosting',
                      "bg-amber-500": tpl.category === 'billing',
                      "bg-slate-500": tpl.category === 'system',
                    })} />

                    <div className="p-6 flex flex-col gap-3 flex-1">
                      {/* Header row: Category Badge & Active Toggle */}
                      <div className="flex items-start justify-between gap-2">
                        <span className={cn("text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border", colorMeta.bg, colorMeta.text, colorMeta.border)}>
                          {tpl.category}
                        </span>

                        <button
                          onClick={() => handleToggleTemplate(tpl)}
                          title={tpl.isActive ? 'Deactivate this notification' : 'Activate this notification'}
                          className="text-slate-400 hover:text-blue-600 transition-colors"
                        >
                          {tpl.isActive ? (
                            <ToggleRight size={28} className="text-emerald-500" />
                          ) : (
                            <ToggleLeft size={28} />
                          )}
                        </button>
                      </div>

                      {/* Title & Bengali Desc */}
                      <div>
                        <h4 className="font-extrabold text-slate-800 text-sm">{tpl.name}</h4>
                        <p className="text-xs text-blue-600 font-medium mt-0.5">{tpl.nameBn}</p>
                      </div>

                      {/* Trigger Explanation */}
                      <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 rounded-xl p-2.5 leading-relaxed">
                        <strong>Trigger:</strong> {tpl.triggerDesc}
                      </p>

                      {/* Subject Preview */}
                      <div className="mt-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Subject Line:</span>
                        <p className="text-xs text-slate-700 font-mono line-clamp-1 mt-0.5">{tpl.subject}</p>
                      </div>

                      {/* Bottom Actions */}
                      <div className="mt-auto pt-4 border-t border-slate-100 flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(tpl)}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          <Eye size={14} /> Customize Email
                        </button>
                        <button
                          onClick={() => {
                            setEditingTemplate(tpl);
                            setModalForm({
                              subject: tpl.subject,
                              heading: tpl.heading,
                              badgeText: tpl.badgeText,
                              body: tpl.body,
                              footerNote: tpl.footerNote,
                              isActive: tpl.isActive !== false,
                            });
                            handleSendModalTest();
                          }}
                          title="Quick Send Sample to Admin Email"
                          className="p-2.5 rounded-xl text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3: DELIVERY LOGS */}
      {/* ========================================================================= */}
      {activeSection === 'logs' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-200/80 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Clock className="text-blue-600" size={20} /> Real-Time Delivery History
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Live audit trail of dispatched notifications and error logs.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={logFilter}
                onChange={e => setLogFilter(e.target.value as any)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none"
              >
                <option value="all">All Deliveries</option>
                <option value="sent">Successful Deliveries</option>
                <option value="failed">Failed Deliveries</option>
              </select>
            </div>
          </div>

          {loadingLogs ? (
            <div className="py-16 text-center text-slate-400">Loading delivery logs...</div>
          ) : emailLogs.length === 0 ? (
            <div className="py-16 text-center text-slate-400">No email logs found yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-3 pl-2">Timestamp</th>
                    <th className="pb-3">Recipient</th>
                    <th className="pb-3">Event / Type</th>
                    <th className="pb-3">Subject</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right pr-2">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {emailLogs
                    .filter(log => logFilter === 'all' || log.status === logFilter)
                    .map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 pl-2 text-slate-500 whitespace-nowrap">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </td>
                        <td className="py-3 font-semibold text-slate-800">
                          {log.recipient || log.to || log.customerEmail || 'N/A'}
                        </td>
                        <td className="py-3 font-mono text-[11px] text-blue-600">
                          {log.type || log.category || 'system'}
                        </td>
                        <td className="py-3 text-slate-600 max-w-xs truncate">
                          {log.subject || 'No subject'}
                        </td>
                        <td className="py-3">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1",
                            log.status === 'sent'
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          )}>
                            {log.status === 'sent' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                            {log.status}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-2">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="text-blue-600 hover:text-blue-700 font-bold hover:underline"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CUSTOMIZE EMAIL TEMPLATE */}
      {/* ========================================================================= */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={editingTemplate ? `Customize: ${editingTemplate.name}` : 'Edit Template'}
        maxWidth="max-w-4xl"
      >
        {editingTemplate && (
          <form onSubmit={handleSaveTemplate} className="space-y-6">
            {/* Header info & Tab Switcher (Editor vs Live Preview) */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <p className="text-xs text-slate-500">{editingTemplate.triggerDesc}</p>
              </div>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalTab('editor')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
                    modalTab === 'editor' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  Editor
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab('preview')}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5",
                    modalTab === 'preview' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  )}
                >
                  <Eye size={13} /> Live Inbox Preview
                </button>
              </div>
            </div>

            {/* TAB 1: EDITOR */}
            {modalTab === 'editor' && (
              <div className="space-y-5">
                {/* Dynamic Variables Pill Bar */}
                <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Braces size={16} className="text-blue-600" />
                    <span className="text-xs font-black text-blue-950 uppercase tracking-wider">
                      Available Dynamic Variables (Click to Insert)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {editingTemplate.variables.map(v => (
                      <button
                        type="button"
                        key={v}
                        onClick={() => insertVariable(v)}
                        className="font-mono text-xs bg-white border border-blue-200 text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
                        title="Click to insert at end of body"
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500 mt-2">
                    Variables are dynamically populated with live customer and order details when emails are dispatched.
                  </p>
                </div>

                {/* Subject Line */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Subject Line <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={modalForm.subject}
                    onChange={e => setModalForm(f => ({ ...f, subject: e.target.value }))}
                    placeholder="Subject line..."
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium"
                  />
                </div>

                {/* Heading & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Heading / Banner Title
                    </label>
                    <input
                      type="text"
                      value={modalForm.heading}
                      onChange={e => setModalForm(f => ({ ...f, heading: e.target.value }))}
                      placeholder="Welcome to Click2IT!"
                      className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={modalForm.badgeText}
                      onChange={e => setModalForm(f => ({ ...f, badgeText: e.target.value }))}
                      placeholder="ACTIVE / COMPLETED"
                      className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Body Content */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Email Body Content (HTML / Text)
                    </label>
                    <span className="text-[11px] text-slate-400">Supports standard HTML and plain text with paragraphs</span>
                  </div>
                  <textarea
                    rows={12}
                    value={modalForm.body}
                    onChange={e => setModalForm(f => ({ ...f, body: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono resize-y"
                    placeholder="Enter email message..."
                  />
                </div>

                {/* Footer Note */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Footer Note / Helpful Callout
                  </label>
                  <input
                    type="text"
                    value={modalForm.footerNote}
                    onChange={e => setModalForm(f => ({ ...f, footerNote: e.target.value }))}
                    placeholder="Need help? Contact support 24/7."
                    className="w-full px-4 py-2.5 bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                  <div>
                    <p className="font-bold text-slate-800 text-sm">Send This Notification</p>
                    <p className="text-xs text-slate-500">Deactivate to pause sending this notification to customers</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={modalForm.isActive}
                      onChange={e => setModalForm(f => ({ ...f, isActive: e.target.checked }))}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
                  </label>
                </div>
              </div>
            )}

            {/* TAB 2: LIVE PREVIEW */}
            {modalTab === 'preview' && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between">
                  <span><strong>Subject:</strong> {modalForm.subject}</span>
                  <span className="text-[10px] uppercase font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                    Live Mockup
                  </span>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-inner bg-slate-100 p-4 md:p-6 flex justify-center">
                  <div className="w-full max-w-xl bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden text-slate-800">
                    {/* Header */}
                    <div className="bg-gradient-to-br from-[#0a1628] to-[#1e3a8a] p-6 text-center text-white">
                      <h2 className="text-xl font-extrabold m-0">{smtpForm.mailFromName || 'Click2IT BD'}</h2>
                      <p className="text-xs text-blue-200 mt-1">{modalForm.heading || 'Notification'}</p>
                      {modalForm.badgeText && (
                        <div className="mt-3 inline-block bg-emerald-500/20 border border-emerald-400 rounded-full px-3 py-1">
                          <span className="text-xs font-bold text-emerald-300 uppercase">{modalForm.badgeText}</span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div
                      className="p-6 text-sm text-slate-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: getRenderedPreviewHtml() }}
                    />

                    {/* Footer Note */}
                    {modalForm.footerNote && (
                      <div className="px-6 pb-4">
                        <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg text-xs text-blue-900">
                          {modalForm.footerNote}
                        </div>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="bg-slate-50 border-t border-slate-100 p-4 text-center text-xs text-slate-400">
                      <p className="font-bold text-slate-600">{smtpForm.mailFromName || 'Click2IT'} BD</p>
                      <p className="mt-0.5">Automated System Email &bull; click2it.bd</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom Action Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              {/* Send Test Preview Action */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  value={modalTestRecipient}
                  onChange={e => setModalTestRecipient(e.target.value)}
                  placeholder="test@example.com"
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs w-48 outline-none focus:ring-1 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={handleSendModalTest}
                  disabled={sendingModalTest}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded-xl hover:bg-blue-100 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Send size={13} />
                  {sendingModalTest ? 'Sending...' : 'Send Test Preview'}
                </button>
              </div>

              {/* Cancel / Save */}
              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setEditModalOpen(false)}
                  className="px-5 py-2.5 text-slate-600 hover:bg-slate-100 rounded-xl font-bold text-xs transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all flex items-center gap-2 disabled:opacity-60"
                >
                  {savingTemplate ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  {savingTemplate ? 'Saving...' : 'Save Template'}
                </button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: VIEW LOG DETAILS */}
      {/* ========================================================================= */}
      <Modal
        open={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Delivery Log Details"
        maxWidth="max-w-xl"
      >
        {selectedLog && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <span className={cn(
                  "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  selectedLog.status === 'sent'
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                )}>
                  {selectedLog.status}
                </span>
                <span className="text-xs text-slate-400 ml-2">
                  {selectedLog.createdAt ? new Date(selectedLog.createdAt).toLocaleString('en-GB') : 'N/A'}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <p><strong>To:</strong> <span className="font-mono">{selectedLog.recipient || selectedLog.to}</span></p>
              <p><strong>Subject:</strong> {selectedLog.subject}</p>
              <p><strong>Category / Type:</strong> <span className="font-mono text-blue-600">{selectedLog.type || selectedLog.category}</span></p>
              {selectedLog.orderId && <p><strong>Order ID:</strong> #{selectedLog.orderId}</p>}
            </div>

            {selectedLog.error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <strong>Error Trace:</strong>
                <pre className="mt-1 font-mono text-[11px] whitespace-pre-wrap">{selectedLog.error}</pre>
              </div>
            )}

            {selectedLog.content && (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Delivered Snippet</label>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-mono max-h-40 overflow-y-auto">
                  {selectedLog.content}
                </div>
              </div>
            )}

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
