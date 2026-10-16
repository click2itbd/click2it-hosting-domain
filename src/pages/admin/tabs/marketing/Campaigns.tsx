import React, { useState, useEffect, useMemo } from 'react';
import { db, storage } from '../../../../firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import { formatCurrency, cn } from '../../../../lib/utils';
import { useAuth } from '../../../../context/AuthContext';
import { 
  Mail, 
  Edit2, 
  Trash2, 
  Send, 
  Plus, 
  X, 
  BarChart, 
  Copy, 
  Search, 
  Calendar, 
  Users, 
  Eye, 
  MousePointer, 
  CheckCircle, 
  Clock, 
  ExternalLink, 
  Upload, 
  MessageCircle, 
  MessageSquare, 
  Globe, 
  Sparkles, 
  Download,
  CheckCircle2,
  TrendingUp,
  Share2
} from 'lucide-react';
import { sendEmail } from '../../../../services/emailService';

// Campaign Templates for instant creation
const CAMPAIGN_TEMPLATES = [
  {
    name: '🏷️ Flash Sale / Weekend Deal',
    title: 'Weekend Flash Sale - Up to 20% OFF!',
    channel: 'email',
    subject: '🔥 Limited Time: Mega Weekend Discounts on Top Tech!',
    content: `Hello valued customer,\n\nDon't miss our exclusive Weekend Flash Sale! Enjoy discounts of up to 20% on selected GPUs, Laptops, Keyboards, and Monitors.\n\nUse promo code FLASH20 at checkout.\nOffer valid until Sunday midnight or while supplies last!`,
    targetUrl: 'https://click2itbd.com/shop',
  },
  {
    name: '🆕 New Product Arrival',
    title: 'New Hardware Arrival: Latest Components',
    channel: 'email',
    subject: '🚀 Just Landed: Next-Gen PC Hardware & Accessories!',
    content: `Exciting news!\n\nWe have just stocked the latest high-performance processors, graphics cards, and gaming accessories.\n\nUpgrade your setup today with full official warranty and express delivery nationwide.`,
    targetUrl: 'https://click2itbd.com/shop',
  },
  {
    name: '🛠️ Service & Warranty Checkup',
    title: 'Free PC Health & Maintenance Diagnostic',
    channel: 'whatsapp',
    subject: 'Free Service Diagnostic for Your Hardware',
    content: `Dear Customer, ensure your PC & Laptop run at peak performance! Visit our service center this week for a FREE hardware health inspection and thermal paste cleaning. Reply here or call us to book your slot.`,
    targetUrl: 'https://click2itbd.com/services',
  },
  {
    name: '🎉 Festival / Eid Celebration',
    title: 'Festival Special Discount & Gifts',
    channel: 'email',
    subject: '🌙 Celebrate with Exclusive Festival Savings & Gifts!',
    content: `Warm greetings from Click2IT!\n\nCelebrate this festive season with special bundles, instant cashback, and guaranteed surprise gift items on every desktop build or laptop purchase.\n\nWishing you and your family happiness and prosperity!`,
    targetUrl: 'https://click2itbd.com/shop',
  },
  {
    name: '⚡ Stock Clearance Sale',
    title: 'Clearance Sale - Flat Price Reductions',
    channel: 'facebook',
    subject: 'Clearance Mega Sale - Unbeatable Prices',
    content: `Huge Price Drop Alert! We are clearing out excess inventory on select monitors, SSDs, and peripherals. Premium tech at rock-bottom prices. Limited quantities available!`,
    targetUrl: 'https://click2itbd.com/shop',
  }
];

const CampaignsTab: React.FC = () => {
  const { isAdmin } = useAuth();

  // State
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannelFilter, setSelectedChannelFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modals
  const [isAddingCampaign, setIsAddingCampaign] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [metricsCampaign, setMetricsCampaign] = useState<any>(null);
  const [metricsFormData, setMetricsFormData] = useState<any>({});
  const [selectedCampaignForPreview, setSelectedCampaignForPreview] = useState<any>(null);

  // Form State
  const [audienceType, setAudienceType] = useState('all'); // 'all', 'recent_buyers', 'due_customers', 'custom'
  const [customerSearch, setCustomerSearch] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isSendingTestEmail, setIsSendingTestEmail] = useState(false);

  const [campaignFormData, setCampaignFormData] = useState<any>({
    title: '',
    channel: 'email',
    subject: '',
    content: '',
    recipients: [],
    bulkEmails: '',
    selectedUserIds: [],
    scheduledAt: '',
    targetAudience: 'All Customers',
    budget: '',
    targetUrl: '',
    imageUrl: '',
  });

  // Real-time Listeners
  useEffect(() => {
    setLoading(true);
    
    // Listen to campaigns collection
    const campaignsQuery = query(collection(db, 'campaigns'), orderBy('createdAt', 'desc'));
    const unsubCampaigns = onSnapshot(campaignsQuery, (snapshot) => {
      setCampaigns(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, (err) => {
      console.error('Error fetching campaigns:', err);
      toast.error('Failed to sync campaigns');
      setLoading(false);
    });

    // Listen to customers
    const custQuery = query(collection(db, 'customers'), orderBy('name', 'asc'));
    const unsubCustomers = onSnapshot(custQuery, (snapshot) => {
      setCustomers(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Listen to orders
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => {
      unsubCampaigns();
      unsubCustomers();
      unsubOrders();
    };
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const total = campaigns.length;
    const emailCampaigns = campaigns.filter(c => c.channel === 'email' || !c.channel);
    const whatsappSmsCampaigns = campaigns.filter(c => c.channel === 'whatsapp' || c.channel === 'sms');
    const adCampaigns = campaigns.filter(c => ['facebook', 'instagram', 'google'].includes(c.channel));

    const totalEmailsSent = emailCampaigns.reduce((acc, c) => acc + (Number(c.sent) || 0), 0);
    const totalEmailsDelivered = emailCampaigns.reduce((acc, c) => acc + (Number(c.delivered) || 0), 0);
    const totalEmailsOpened = emailCampaigns.reduce((acc, c) => acc + (Number(c.opened) || 0), 0);
    const totalEmailsClicked = emailCampaigns.reduce((acc, c) => acc + (Number(c.clicked) || 0), 0);

    const totalAdImpressions = adCampaigns.reduce((acc, c) => acc + (Number(c.impressions) || 0), 0);
    const totalAdClicks = adCampaigns.reduce((acc, c) => acc + (Number(c.clicked) || 0), 0);

    const scheduledCount = campaigns.filter(c => c.status === 'scheduled').length;
    const sentCount = campaigns.filter(c => c.status === 'sent' || c.status === 'completed' || c.status === 'active').length;
    const draftCount = campaigns.filter(c => c.status === 'draft').length;

    return {
      total,
      scheduledCount,
      sentCount,
      draftCount,
      totalEmailsSent,
      totalEmailsDelivered,
      totalEmailsOpened,
      totalEmailsClicked,
      openRate: totalEmailsDelivered > 0 ? ((totalEmailsOpened / totalEmailsDelivered) * 100).toFixed(1) : '0.0',
      totalAdImpressions,
      totalAdClicks,
      adCtr: totalAdImpressions > 0 ? ((totalAdClicks / totalAdImpressions) * 100).toFixed(1) : '0.0'
    };
  }, [campaigns]);

  // Filtered campaigns
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = 
        (c.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.subject || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.targetAudience || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.channel || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesChannel = 
        selectedChannelFilter === 'all' || 
        (selectedChannelFilter === 'email' && (c.channel === 'email' || !c.channel)) ||
        c.channel === selectedChannelFilter;

      const matchesStatus = 
        selectedStatusFilter === 'all' || 
        c.status === selectedStatusFilter;

      return matchesSearch && matchesChannel && matchesStatus;
    });
  }, [campaigns, searchQuery, selectedChannelFilter, selectedStatusFilter]);

  // Load a preset template
  const applyTemplate = (tpl: any) => {
    setCampaignFormData((prev: any) => ({
      ...prev,
      title: tpl.title,
      channel: tpl.channel,
      subject: tpl.subject,
      content: tpl.content,
      targetUrl: tpl.targetUrl,
    }));
    toast.success(`Template "${tpl.name}" loaded!`);
  };

  // Image Upload to Firebase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WebP)');
      return;
    }

    setIsUploadingImage(true);
    try {
      const storageRef = ref(storage, `campaigns/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setCampaignFormData((prev: any) => ({ ...prev, imageUrl: url }));
      toast.success('Banner image uploaded!');
    } catch (err) {
      console.error('Error uploading image:', err);
      toast.error('Failed to upload image');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Process audience targets based on selection
  const computeRecipients = (channel: string, targetType: string, selectedIds: string[], manualText: string) => {
    const isEmail = channel === 'email';
    let targetAudienceLabel = 'All Customers';
    let recipientsList: string[] = [];

    if (targetType === 'all') {
      targetAudienceLabel = `All Customers (${customers.length})`;
      recipientsList = customers
        .map(c => isEmail ? c.email : c.phone)
        .filter(Boolean);
    } else if (targetType === 'recent_buyers') {
      targetAudienceLabel = 'Recent Buyers (30 Days)';
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCustomerIds = new Set(
        orders
          .filter(o => new Date(o.createdAt || o.date) >= thirtyDaysAgo)
          .map(o => o.customerId)
          .filter(Boolean)
      );
      recipientsList = customers
        .filter(c => recentCustomerIds.has(c.id))
        .map(c => isEmail ? c.email : c.phone)
        .filter(Boolean);
    } else if (targetType === 'due_customers') {
      targetAudienceLabel = 'Customers with Due Balance';
      recipientsList = customers
        .filter(c => Number(c.balance || c.due || 0) > 0)
        .map(c => isEmail ? c.email : c.phone)
        .filter(Boolean);
    } else if (targetType === 'custom') {
      targetAudienceLabel = `Custom Selection (${selectedIds.length})`;
      const crmRecipients = customers
        .filter(c => (selectedIds || []).includes(c.id))
        .map(c => isEmail ? c.email : c.phone)
        .filter(Boolean);
      const manualEntries = (manualText || '')
        .split(/[\n,]+/)
        .map(s => s.trim())
        .filter(Boolean);
      recipientsList = Array.from(new Set([...crmRecipients, ...manualEntries]));
    }

    return { targetAudienceLabel, recipientsList };
  };

  // Save or Update Campaign
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { ...campaignFormData };
      if (!payload.createdAt) {
        payload.createdAt = new Date().toISOString();
      }

      // Calculate audience
      if (['email', 'sms', 'whatsapp'].includes(payload.channel)) {
        const { targetAudienceLabel, recipientsList } = computeRecipients(
          payload.channel,
          audienceType,
          payload.selectedUserIds || [],
          payload.bulkEmails || ''
        );
        payload.targetAudience = targetAudienceLabel;
        payload.recipients = recipientsList;
      }

      // Handle Scheduling Status
      if (payload.scheduledAt && new Date(payload.scheduledAt) > new Date()) {
        payload.status = 'scheduled';
      } else if (!payload.status) {
        payload.status = 'draft';
      }

      if (editingCampaign) {
        await updateDoc(doc(db, 'campaigns', editingCampaign.id), payload);
        toast.success('Campaign updated successfully');
      } else {
        await addDoc(collection(db, 'campaigns'), payload);
        toast.success('Campaign created successfully');
      }

      setIsAddingCampaign(false);
      setEditingCampaign(null);
      resetForm();
    } catch (error) {
      console.error('Error saving campaign:', error);
      toast.error('Failed to save campaign');
    }
  };

  const resetForm = () => {
    setCampaignFormData({
      title: '',
      channel: 'email',
      subject: '',
      content: '',
      recipients: [],
      bulkEmails: '',
      selectedUserIds: [],
      scheduledAt: '',
      targetAudience: 'All Customers',
      budget: '',
      targetUrl: '',
      imageUrl: '',
    });
    setAudienceType('all');
  };

  // Duplicate / Clone Campaign
  const handleDuplicateCampaign = async (campaign: any) => {
    try {
      const cloneData = {
        ...campaign,
        title: `${campaign.title} (Copy)`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        scheduledAt: '',
        sentAt: '',
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        impressions: 0,
      };
      delete cloneData.id;
      await addDoc(collection(db, 'campaigns'), cloneData);
      toast.success('Campaign cloned as Draft!');
    } catch (err) {
      console.error('Error duplicating:', err);
      toast.error('Failed to duplicate campaign');
    }
  };

  // Send Test Email
  const handleSendTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error('Please enter an email address for the test send.');
      return;
    }

    setIsSendingTestEmail(true);
    try {
      let htmlContent = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">`;
      if (campaignFormData.imageUrl) {
        htmlContent += `<img src="${campaignFormData.imageUrl}" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" alt="Campaign Banner" />`;
      }
      if (campaignFormData.subject) {
        htmlContent += `<h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">${campaignFormData.subject}</h2>`;
      }
      htmlContent += `<div style="font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #334155; margin-bottom: 24px;">${campaignFormData.content}</div>`;
      if (campaignFormData.targetUrl) {
        htmlContent += `<div><a href="${campaignFormData.targetUrl}" style="background-color: #ef4444; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">View Offer / Learn More &rarr;</a></div>`;
      }
      htmlContent += `<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">This is a test preview sent from Click2IT Marketing Engine.</div></div>`;

      const emailRes = await sendEmail({
        to: testEmailAddress,
        subject: `[TEST] ${campaignFormData.subject || campaignFormData.title}`,
        html: htmlContent,
        category: 'marketing_test'
      });

      if (emailRes.success) {
        toast.success(`Test email sent to ${testEmailAddress}`);
      } else {
        toast.error(emailRes.error || 'Test email failed. Please configure SMTP in Settings > Email Setting.');
      }
    } catch (err: any) {
      console.error('Error sending test email:', err);
      toast.error(err.message || 'Failed to send test email');
    } finally {
      setIsSendingTestEmail(false);
    }
  };

  // Send / Deploy Campaign
  const handleSendCampaign = async (campaign: any) => {
    const channelName = (campaign.channel || 'email').toUpperCase();
    const recipientCount = campaign.recipients?.length || 0;

    if (!confirm(`Are you sure you want to deploy "${campaign.title}" to ${recipientCount > 0 ? recipientCount + ' recipients' : 'audience'} via ${channelName}?`)) {
      return;
    }

    try {
      let sentCount = 0;
      let deliveredCount = 0;

      // EMAIL CHANNEL
      if (campaign.channel === 'email' || !campaign.channel) {
        if (!campaign.recipients || campaign.recipients.length === 0) {
          toast.error('No email recipients found for this campaign. Please edit and specify an audience.');
          return;
        }

        const toastId = toast.loading(`Sending emails to ${campaign.recipients.length} recipients...`);

        let htmlContent = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; background: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px;">`;
        if (campaign.imageUrl) {
          htmlContent += `<img src="${campaign.imageUrl}" style="width: 100%; max-height: 280px; object-fit: cover; border-radius: 8px; margin-bottom: 20px;" alt="Campaign Banner" />`;
        }
        if (campaign.subject) {
          htmlContent += `<h2 style="font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 16px;">${campaign.subject}</h2>`;
        }
        htmlContent += `<div style="font-size: 15px; line-height: 1.6; white-space: pre-wrap; color: #334155; margin-bottom: 24px;">${campaign.content}</div>`;
        if (campaign.targetUrl) {
          htmlContent += `<div><a href="${campaign.targetUrl}" style="background-color: #ef4444; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">View Offer / Learn More &rarr;</a></div>`;
        }
        htmlContent += `<div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 12px; color: #94a3b8;">Click2IT • Exclusive Customer Announcement</div></div>`;

        let lastError = '';
        for (const email of campaign.recipients) {
          const res = await sendEmail({
            to: email,
            subject: campaign.subject || campaign.title || 'Special Update from Click2IT',
            html: htmlContent,
            category: 'marketing_campaign'
          });
          sentCount++;
          if (res.success) {
            deliveredCount++;
          } else {
            lastError = res.error || '';
          }
        }

        toast.dismiss(toastId);
        if (deliveredCount > 0) {
          toast.success(`Successfully sent ${deliveredCount} of ${sentCount} emails!`);
        } else {
          toast.error(lastError || 'Failed to deliver emails. Please configure SMTP in Settings > Email Setting.');
          return;
        }

      } else if (campaign.channel === 'whatsapp' || campaign.channel === 'sms') {
        // WhatsApp / SMS
        sentCount = campaign.recipients?.length || 0;
        deliveredCount = sentCount;
        toast.success(`Campaign marked as active for ${sentCount} ${campaign.channel.toUpperCase()} recipients!`);

      } else {
        // Social Ads (Facebook, Google)
        sentCount = 1;
        deliveredCount = 1;
        toast.success(`${campaign.channel.toUpperCase()} Ad campaign marked as Active!`);
      }

      await updateDoc(doc(db, 'campaigns', campaign.id), {
        status: 'sent',
        sentAt: new Date().toISOString(),
        sent: sentCount,
        delivered: deliveredCount,
        opened: campaign.opened || 0,
        clicked: campaign.clicked || 0,
      });

    } catch (error) {
      console.error('Error sending campaign:', error);
      toast.error('Failed to send campaign');
    }
  };

  // Update Metrics
  const handleUpdateMetrics = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, 'campaigns', metricsCampaign.id), {
        impressions: Number(metricsFormData.impressions || 0),
        clicked: Number(metricsFormData.clicked || 0),
        sent: Number(metricsFormData.sent || 0),
        delivered: Number(metricsFormData.delivered || 0),
        opened: Number(metricsFormData.opened || 0),
      });
      toast.success('Metrics updated successfully');
      setMetricsCampaign(null);
    } catch (error) {
      console.error('Error updating metrics:', error);
      toast.error('Failed to update metrics');
    }
  };

  // Channel badge helper
  const getChannelBadge = (channel: string) => {
    const ch = (channel || 'email').toLowerCase();
    switch (ch) {
      case 'email':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Mail size={13} /> Email
          </span>
        );
      case 'whatsapp':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <MessageCircle size={13} /> WhatsApp
          </span>
        );
      case 'sms':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <MessageSquare size={13} /> SMS
          </span>
        );
      case 'facebook':
      case 'instagram':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <Share2 size={13} /> Facebook Ads
          </span>
        );
      case 'google':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Globe size={13} /> Google Ads
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-50 text-slate-700 border border-slate-200">
            <Send size={13} /> {channel?.toUpperCase()}
          </span>
        );
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    const st = (status || 'draft').toLowerCase();
    switch (st) {
      case 'sent':
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            <CheckCircle2 size={12} /> SENT
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" /> ACTIVE
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            <Calendar size={12} /> SCHEDULED
          </span>
        );
      case 'sending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
            <Clock size={12} /> SENDING...
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            <Clock size={12} /> DRAFT
          </span>
        );
    }
  };

  // Copy recipients to clipboard
  const copyRecipients = (recipients: string[]) => {
    if (!recipients || recipients.length === 0) {
      toast.error('No recipients to copy');
      return;
    }
    navigator.clipboard.writeText(recipients.join('\n'));
    toast.success(`Copied ${recipients.length} recipients to clipboard!`);
  };

  // Export recipients as CSV
  const exportRecipientsCSV = (campaign: any) => {
    if (!campaign.recipients || campaign.recipients.length === 0) {
      toast.error('No recipients to export');
      return;
    }
    const isPhone = campaign.channel === 'whatsapp' || campaign.channel === 'sms';
    const header = isPhone ? 'Phone Number\n' : 'Email Address\n';
    const csvContent = 'data:text/csv;charset=utf-8,' + header + campaign.recipients.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${campaign.title.replace(/\s+/g, '_')}_recipients.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2.5">
              <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                <Mail size={24} />
              </span>
              Marketing & Campaigns Engine
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Create, schedule, broadcast, and track multi-channel Email, WhatsApp, SMS, and Ad campaigns.
            </p>
          </div>

          <button
            onClick={() => {
              resetForm();
              setEditingCampaign(null);
              setIsAddingCampaign(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all text-sm shrink-0"
          >
            <Plus size={18} />
            Create Campaign
          </button>
        </div>

        {/* Top Analytics Metrics Dashboard */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
              <span>Total Campaigns</span>
              <span className="p-1.5 bg-white rounded-lg shadow-2xs">
                <TrendingUp size={15} className="text-slate-600" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{stats.total}</span>
              <span className="text-xs text-slate-500 font-medium">
                ({stats.sentCount} sent, {stats.scheduledCount} scheduled)
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200/80">
            <div className="flex items-center justify-between text-rose-700 text-xs font-bold uppercase tracking-wider">
              <span>Email Delivery</span>
              <span className="p-1.5 bg-white rounded-lg shadow-2xs">
                <Mail size={15} className="text-rose-600" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-rose-900">{stats.totalEmailsSent}</span>
              <span className="text-xs text-rose-700 font-bold">
                {stats.openRate}% Open Rate
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80">
            <div className="flex items-center justify-between text-emerald-700 text-xs font-bold uppercase tracking-wider">
              <span>Audience Reach</span>
              <span className="p-1.5 bg-white rounded-lg shadow-2xs">
                <Users size={15} className="text-emerald-600" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-900">{customers.length}</span>
              <span className="text-xs text-emerald-700 font-medium">CRM Customers</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-sky-50/60 border border-sky-200/80">
            <div className="flex items-center justify-between text-sky-700 text-xs font-bold uppercase tracking-wider">
              <span>Ad Impressions & Clicks</span>
              <span className="p-1.5 bg-white rounded-lg shadow-2xs">
                <MousePointer size={15} className="text-sky-600" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-sky-900">{stats.totalAdClicks}</span>
              <span className="text-xs text-sky-700 font-bold">
                ({stats.adCtr}% CTR / {stats.totalAdImpressions} views)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Channel Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: 'All Channels' },
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
              { id: 'sms', label: 'SMS', icon: MessageSquare },
              { id: 'facebook', label: 'Facebook Ads', icon: Share2 },
              { id: 'google', label: 'Google Ads', icon: Globe },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = selectedChannelFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedChannelFilter(tab.id)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                    isActive 
                      ? "bg-slate-900 text-white shadow-xs" 
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
                  )}
                >
                  {Icon && <Icon size={13} />}
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Search & Status filter */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
              />
            </div>

            <select
              value={selectedStatusFilter}
              onChange={e => setSelectedStatusFilter(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="sent">Sent / Active</option>
            </select>
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3.5">Title & Channel</th>
                <th className="px-6 py-3.5">Audience & Subject</th>
                <th className="px-6 py-3.5">Metrics / Performance</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5">Date / Schedule</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Mail size={36} className="mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-600">No campaigns found</p>
                    <p className="text-xs mt-1">Create a new campaign or adjust your search filters.</p>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map(campaign => {
                  const isAd = ['facebook', 'instagram', 'google'].includes(campaign.channel || '');
                  const hasRecipients = campaign.recipients && campaign.recipients.length > 0;

                  return (
                    <tr key={campaign.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Title & Channel */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {campaign.imageUrl && (
                            <img 
                              src={campaign.imageUrl} 
                              alt="Banner" 
                              className="w-10 h-10 object-cover rounded-lg border border-slate-200 shrink-0" 
                              onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                          )}
                          <div>
                            <div className="font-bold text-slate-900 hover:text-rose-600 cursor-pointer flex items-center gap-1.5"
                                 onClick={() => setSelectedCampaignForPreview(campaign)}>
                              {campaign.title}
                              {campaign.targetUrl && <ExternalLink size={12} className="text-slate-400" />}
                            </div>
                            <div className="mt-1">
                              {getChannelBadge(campaign.channel)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Audience & Subject */}
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          {campaign.subject && (
                            <div className="font-medium text-slate-800 text-xs truncate">
                              "{campaign.subject}"
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                            <Users size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{campaign.targetAudience || 'Custom Audience'}</span>
                            {hasRecipients && (
                              <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                {campaign.recipients.length}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Metrics */}
                      <td className="px-6 py-4">
                        {isAd ? (
                          <div className="flex flex-col gap-0.5 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-medium">Impressions:</span>
                              <span className="font-bold text-slate-800">{campaign.impressions || 0}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 font-medium">Clicks:</span>
                              <span className="font-bold text-rose-600">{campaign.clicked || 0}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
                            <div>
                              <span className="text-slate-400">Sent: </span>
                              <span className="font-bold text-slate-700">{campaign.sent || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Del: </span>
                              <span className="font-bold text-emerald-600">{campaign.delivered || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Open: </span>
                              <span className="font-bold text-blue-600">{campaign.opened || 0}</span>
                            </div>
                            <div>
                              <span className="text-slate-400">Click: </span>
                              <span className="font-bold text-purple-600">{campaign.clicked || 0}</span>
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(campaign.status)}
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                        {campaign.status === 'scheduled' && campaign.scheduledAt ? (
                          <div>
                            <div className="font-bold text-purple-700 flex items-center gap-1">
                              <Calendar size={12} /> Scheduled:
                            </div>
                            <div className="text-slate-600 mt-0.5">
                              {new Date(campaign.scheduledAt).toLocaleString()}
                            </div>
                          </div>
                        ) : campaign.sentAt ? (
                          <div>
                            <div className="font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle size={12} /> Sent:
                            </div>
                            <div className="text-slate-600 mt-0.5">
                              {new Date(campaign.sentAt).toLocaleString()}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="text-slate-400">Created:</div>
                            <div className="text-slate-600 mt-0.5">
                              {new Date(campaign.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {/* Send / Deploy Button (Available for Draft and Scheduled!) */}
                          {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                            <button
                              onClick={() => handleSendCampaign(campaign)}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                              title="Send / Deploy Now"
                            >
                              <Send size={16} />
                            </button>
                          )}

                          {/* Analytics / Metrics Update Button */}
                          <button
                            onClick={() => {
                              setMetricsCampaign(campaign);
                              setMetricsFormData({
                                impressions: campaign.impressions || '',
                                clicked: campaign.clicked || '',
                                sent: campaign.sent || '',
                                delivered: campaign.delivered || '',
                                opened: campaign.opened || '',
                              });
                            }}
                            className="p-1.5 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all"
                            title="View Analytics & Update Metrics"
                          >
                            <BarChart size={16} />
                          </button>

                          {/* Duplicate Campaign Button */}
                          <button
                            onClick={() => handleDuplicateCampaign(campaign)}
                            className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="Duplicate Campaign"
                          >
                            <Copy size={16} />
                          </button>

                          {/* Edit Campaign */}
                          <button
                            onClick={() => {
                              setEditingCampaign(campaign);
                              setCampaignFormData({
                                title: campaign.title,
                                channel: campaign.channel || 'email',
                                subject: campaign.subject || '',
                                content: campaign.content,
                                recipients: campaign.recipients || [],
                                bulkEmails: campaign.recipients ? campaign.recipients.join('\n') : '',
                                selectedUserIds: [],
                                scheduledAt: campaign.scheduledAt || '',
                                targetAudience: campaign.targetAudience || '',
                                budget: campaign.budget ? String(campaign.budget) : '',
                                targetUrl: campaign.targetUrl || '',
                                imageUrl: campaign.imageUrl || '',
                              });
                              setAudienceType('all');
                              setIsAddingCampaign(true);
                            }}
                            className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                            title="Edit Campaign"
                          >
                            <Edit2 size={16} />
                          </button>

                          {/* Delete Campaign */}
                          <button
                            onClick={async () => {
                              if (confirm(`Delete campaign "${campaign.title}"?`)) {
                                if (!isAdmin) {
                                  toast.error('You do not have permission to delete this.');
                                  return;
                                }
                                await deleteDoc(doc(db, 'campaigns', campaign.id));
                                toast.success('Campaign deleted');
                              }
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete Campaign"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      {isAddingCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <Sparkles size={18} className="text-rose-600" />
                  {editingCampaign ? 'Edit Marketing Campaign' : 'Create New Campaign'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Design promotional broadcasts, scheduled email drops, or targeted social ad campaigns.
                </p>
              </div>
              <button 
                onClick={() => { setIsAddingCampaign(false); setEditingCampaign(null); }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveCampaign} className="p-6 overflow-y-auto space-y-5 text-sm flex-1">
              {/* Preset Template Selector */}
              {!editingCampaign && (
                <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3.5">
                  <div className="text-xs font-bold text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Sparkles size={13} className="text-rose-600" /> Quick-Start From Templates:
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {CAMPAIGN_TEMPLATES.map((tpl, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => applyTemplate(tpl)}
                        className="px-2.5 py-1 bg-white hover:bg-rose-100/70 border border-rose-200 rounded-lg text-xs font-bold text-rose-800 transition-all shadow-2xs"
                      >
                        {tpl.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Title & Channel */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Campaign Title *</label>
                  <input
                    required
                    type="text"
                    value={campaignFormData.title}
                    onChange={e => setCampaignFormData({ ...campaignFormData, title: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                    placeholder="e.g. Summer Mega Sale 2026"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Channel *</label>
                  <select
                    value={campaignFormData.channel}
                    onChange={e => setCampaignFormData({ ...campaignFormData, channel: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm font-medium focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                  >
                    <option value="email">📧 Email Broadcast</option>
                    <option value="whatsapp">💬 WhatsApp Blast</option>
                    <option value="sms">📱 SMS Campaign</option>
                    <option value="facebook">📢 Facebook Ads</option>
                    <option value="google">🌐 Google Ads</option>
                  </select>
                </div>
              </div>

              {/* Subject / Headline */}
              {(campaignFormData.channel === 'email' || campaignFormData.channel === 'facebook') && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    {campaignFormData.channel === 'email' ? 'Email Subject Line *' : 'Ad Headline'}
                  </label>
                  <input
                    type="text"
                    required={campaignFormData.channel === 'email'}
                    value={campaignFormData.subject}
                    onChange={e => setCampaignFormData({ ...campaignFormData, subject: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                    placeholder="e.g. 🔥 Exclusive 20% OFF on Gaming Rigs This Weekend!"
                  />
                </div>
              )}

              {/* Message Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Message Content / Promotional Copy *
                </label>
                <textarea
                  required
                  rows={4}
                  value={campaignFormData.content}
                  onChange={e => setCampaignFormData({ ...campaignFormData, content: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-sans"
                  placeholder="Type your compelling marketing offer or message here..."
                />
              </div>

              {/* Target URL and Budget */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Target URL / Call-to-Action Link
                  </label>
                  <input
                    type="url"
                    value={campaignFormData.targetUrl}
                    onChange={e => setCampaignFormData({ ...campaignFormData, targetUrl: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                    placeholder="https://click2itbd.com/shop"
                  />
                </div>

                {['facebook', 'instagram', 'google'].includes(campaignFormData.channel) ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Ad Budget (BDT)</label>
                    <input
                      type="number"
                      value={campaignFormData.budget}
                      onChange={e => setCampaignFormData({ ...campaignFormData, budget: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                      placeholder="e.g. 5000"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">Schedule Send (Optional)</label>
                    <input
                      type="datetime-local"
                      value={campaignFormData.scheduledAt}
                      onChange={e => setCampaignFormData({ ...campaignFormData, scheduledAt: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Banner Image Upload & Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                  Banner Image (Optional)
                </label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="url"
                    value={campaignFormData.imageUrl}
                    onChange={e => setCampaignFormData({ ...campaignFormData, imageUrl: e.target.value })}
                    className="w-full sm:flex-1 border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none"
                    placeholder="Enter image URL or upload directly &rarr;"
                  />
                  <label className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer text-xs border border-slate-300 transition-all shrink-0">
                    <Upload size={14} />
                    {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="hidden"
                    />
                  </label>
                </div>
                {campaignFormData.imageUrl && (
                  <div className="mt-3 relative inline-block border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                    <img
                      src={campaignFormData.imageUrl}
                      alt="Banner Preview"
                      className="max-h-36 max-w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setCampaignFormData({ ...campaignFormData, imageUrl: '' })}
                      className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black text-white rounded-full transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Target Audience Segmentation (For Direct Channels) */}
              {['email', 'sms', 'whatsapp'].includes(campaignFormData.channel) && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Users size={14} className="text-slate-600" /> Target Audience Segment
                    </label>
                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      {audienceType === 'all' && `All Registered (${customers.length})`}
                      {audienceType === 'recent_buyers' && `Active Buyers`}
                      {audienceType === 'due_customers' && `Due Customers`}
                      {audienceType === 'custom' && `Custom Selection`}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'all', label: `All (${customers.length})` },
                      { id: 'recent_buyers', label: 'Recent Buyers' },
                      { id: 'due_customers', label: 'Due Balances' },
                      { id: 'custom', label: 'Custom List' },
                    ].map(type => (
                      <button
                        type="button"
                        key={type.id}
                        onClick={() => setAudienceType(type.id)}
                        className={cn(
                          "py-2 px-3 text-xs font-bold rounded-lg border transition-all text-center",
                          audienceType === type.id
                            ? "bg-slate-900 text-white border-slate-900 shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        )}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  {audienceType === 'custom' && (
                    <div className="space-y-3 pt-2">
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-700">Select Customers from CRM:</span>
                          <span className="text-xs text-slate-500">
                            {campaignFormData.selectedUserIds?.length || 0} selected
                          </span>
                        </div>
                        <input
                          type="text"
                          placeholder="Search CRM customers..."
                          value={customerSearch}
                          onChange={e => setCustomerSearch(e.target.value)}
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs mb-2 bg-white"
                        />
                        <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white p-2 divide-y divide-slate-100">
                          {customers
                            .filter(c => (c.name || '').toLowerCase().includes(customerSearch.toLowerCase()) || (c.phone || '').includes(customerSearch) || (c.email || '').includes(customerSearch))
                            .slice(0, 50)
                            .map(c => (
                              <label key={c.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 cursor-pointer text-xs">
                                <input
                                  type="checkbox"
                                  checked={campaignFormData.selectedUserIds?.includes(c.id)}
                                  onChange={e => {
                                    const ids = campaignFormData.selectedUserIds || [];
                                    if (e.target.checked) {
                                      setCampaignFormData({ ...campaignFormData, selectedUserIds: [...ids, c.id] });
                                    } else {
                                      setCampaignFormData({ ...campaignFormData, selectedUserIds: ids.filter((id: string) => id !== c.id) });
                                    }
                                  }}
                                  className="rounded text-rose-600 focus:ring-rose-500"
                                />
                                <span className="font-bold text-slate-800">{c.name}</span>
                                <span className="text-slate-400">
                                  ({campaignFormData.channel === 'email' ? c.email || 'No email' : c.phone || 'No phone'})
                                </span>
                              </label>
                            ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Or Paste Manual {campaignFormData.channel === 'email' ? 'Emails' : 'Phone Numbers'} (comma or newline separated):
                        </label>
                        <textarea
                          rows={2}
                          value={campaignFormData.bulkEmails}
                          onChange={e => setCampaignFormData({ ...campaignFormData, bulkEmails: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-xs bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none font-mono"
                          placeholder={campaignFormData.channel === 'email' ? "client1@example.com, client2@example.com" : "01712345678, 01812345678"}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Test Email Section */}
              {campaignFormData.channel === 'email' && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="w-full sm:w-auto">
                    <span className="text-xs font-bold text-slate-800 block">Send Test Email First:</span>
                    <span className="text-[11px] text-slate-500">Verify design in your inbox before broadcasting.</span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="email"
                      placeholder="admin@example.com"
                      value={testEmailAddress}
                      onChange={e => setTestEmailAddress(e.target.value)}
                      className="px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white flex-1 sm:w-48 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleSendTestEmail}
                      disabled={isSendingTestEmail}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shrink-0 transition-colors"
                    >
                      {isSendingTestEmail ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>
              )}

              {/* Live Preview Box */}
              {campaignFormData.content && (
                <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4">
                  <div className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Eye size={13} className="text-blue-600" /> Live Message Preview
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100 shadow-2xs space-y-3">
                    {campaignFormData.imageUrl && (
                      <img src={campaignFormData.imageUrl} alt="Preview" className="w-full max-h-48 object-cover rounded-lg" />
                    )}
                    {campaignFormData.subject && (
                      <div className="font-black text-slate-900 text-base">{campaignFormData.subject}</div>
                    )}
                    <div className="text-sm text-slate-700 whitespace-pre-wrap">{campaignFormData.content}</div>
                    {campaignFormData.targetUrl && (
                      <a href={campaignFormData.targetUrl} target="_blank" rel="noreferrer" className="inline-block mt-2 px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-lg">
                        View Offer &rarr;
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsAddingCampaign(false); setEditingCampaign(null); }}
                  className="px-5 py-2.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shadow-sm hover:shadow transition-all text-sm"
                >
                  {editingCampaign ? 'Save Changes' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* METRICS & PERFORMANCE MODAL */}
      {metricsCampaign && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                  <BarChart size={18} className="text-indigo-600" />
                  Campaign Analytics & Metrics
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">
                  {metricsCampaign.title}
                </p>
              </div>
              <button 
                onClick={() => setMetricsCampaign(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Visual Performance Bars */}
              {['facebook', 'instagram', 'google'].includes(metricsCampaign.channel || '') ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-sky-50 rounded-xl border border-sky-200">
                      <div className="text-xs text-sky-700 font-bold uppercase">Impressions</div>
                      <div className="text-2xl font-black text-sky-900 mt-1">{metricsCampaign.impressions || 0}</div>
                    </div>
                    <div className="p-3 bg-rose-50 rounded-xl border border-rose-200">
                      <div className="text-xs text-rose-700 font-bold uppercase">Clicks</div>
                      <div className="text-2xl font-black text-rose-900 mt-1">{metricsCampaign.clicked || 0}</div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                      <span>Click-Through Rate (CTR)</span>
                      <span>
                        {metricsCampaign.impressions > 0 
                          ? ((metricsCampaign.clicked / metricsCampaign.impressions) * 100).toFixed(1) 
                          : '0'}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div 
                        className="bg-rose-500 h-2.5 rounded-full" 
                        style={{ width: `${Math.min(100, metricsCampaign.impressions > 0 ? (metricsCampaign.clicked / metricsCampaign.impressions) * 100 : 0)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Metric Summary Cards */}
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Sent</div>
                      <div className="text-lg font-black text-slate-800 mt-0.5">{metricsCampaign.sent || 0}</div>
                    </div>
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase">Delivered</div>
                      <div className="text-lg font-black text-emerald-800 mt-0.5">{metricsCampaign.delivered || 0}</div>
                    </div>
                    <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                      <div className="text-[10px] text-blue-700 font-bold uppercase">Opened</div>
                      <div className="text-lg font-black text-blue-800 mt-0.5">{metricsCampaign.opened || 0}</div>
                    </div>
                    <div className="p-2.5 bg-purple-50 rounded-xl border border-purple-200">
                      <div className="text-[10px] text-purple-700 font-bold uppercase">Clicked</div>
                      <div className="text-lg font-black text-purple-800 mt-0.5">{metricsCampaign.clicked || 0}</div>
                    </div>
                  </div>

                  {/* Progress Bars */}
                  <div className="space-y-3 pt-2">
                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                        <span>Delivery Rate</span>
                        <span>
                          {metricsCampaign.sent > 0 
                            ? ((metricsCampaign.delivered / metricsCampaign.sent) * 100).toFixed(1) 
                            : '0'}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, metricsCampaign.sent > 0 ? (metricsCampaign.delivered / metricsCampaign.sent) * 100 : 0)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                        <span>Open Rate</span>
                        <span>
                          {metricsCampaign.delivered > 0 
                            ? ((metricsCampaign.opened / metricsCampaign.delivered) * 100).toFixed(1) 
                            : '0'}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, metricsCampaign.delivered > 0 ? (metricsCampaign.opened / metricsCampaign.delivered) * 100 : 0)}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                        <span>Click-Through Rate (CTR)</span>
                        <span>
                          {metricsCampaign.delivered > 0 
                            ? ((metricsCampaign.clicked / metricsCampaign.delivered) * 100).toFixed(1) 
                            : '0'}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div 
                          className="bg-purple-500 h-2 rounded-full" 
                          style={{ width: `${Math.min(100, metricsCampaign.delivered > 0 ? (metricsCampaign.clicked / metricsCampaign.delivered) * 100 : 0)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipients list & Export Tools */}
              {metricsCampaign.recipients && metricsCampaign.recipients.length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/70">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Recipients ({metricsCampaign.recipients.length})
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => copyRecipients(metricsCampaign.recipients)}
                        className="p-1 px-2 text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1"
                        title="Copy All"
                      >
                        <Copy size={12} /> Copy
                      </button>
                      <button
                        onClick={() => exportRecipientsCSV(metricsCampaign)}
                        className="p-1 px-2 text-[11px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg flex items-center gap-1"
                        title="Export CSV"
                      >
                        <Download size={12} /> CSV
                      </button>
                    </div>
                  </div>
                  <div className="max-h-28 overflow-y-auto text-xs font-mono bg-white border border-slate-200 rounded-lg p-2 text-slate-600">
                    {metricsCampaign.recipients.slice(0, 100).map((r: string, idx: number) => (
                      <div key={idx} className="py-0.5 border-b border-slate-50 last:border-0 truncate">
                        {r}
                      </div>
                    ))}
                    {metricsCampaign.recipients.length > 100 && (
                      <div className="text-[11px] text-slate-400 pt-1">
                        ...and {metricsCampaign.recipients.length - 100} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Editable manual metrics update form */}
              <form onSubmit={handleUpdateMetrics} className="border-t border-slate-100 pt-4 space-y-3">
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Manually Adjust Counts:
                </div>
                {['facebook', 'instagram', 'google'].includes(metricsCampaign.channel || '') ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Impressions</label>
                      <input
                        type="number"
                        value={metricsFormData.impressions}
                        onChange={e => setMetricsFormData({ ...metricsFormData, impressions: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Clicks</label>
                      <input
                        type="number"
                        value={metricsFormData.clicked}
                        onChange={e => setMetricsFormData({ ...metricsFormData, clicked: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Sent</label>
                      <input
                        type="number"
                        value={metricsFormData.sent}
                        onChange={e => setMetricsFormData({ ...metricsFormData, sent: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Delivered</label>
                      <input
                        type="number"
                        value={metricsFormData.delivered}
                        onChange={e => setMetricsFormData({ ...metricsFormData, delivered: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Opened</label>
                      <input
                        type="number"
                        value={metricsFormData.opened}
                        onChange={e => setMetricsFormData({ ...metricsFormData, opened: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Clicked</label>
                      <input
                        type="number"
                        value={metricsFormData.clicked}
                        onChange={e => setMetricsFormData({ ...metricsFormData, clicked: e.target.value })}
                        className="w-full border border-slate-300 rounded-lg px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setMetricsCampaign(null)}
                    className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-slate-600 font-bold text-xs hover:bg-slate-50"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-2xs"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* QUICK PREVIEW MODAL */}
      {selectedCampaignForPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-900 flex items-center gap-2 text-sm">
                {getChannelBadge(selectedCampaignForPreview.channel)}
                <span>Campaign Preview</span>
              </h3>
              <button 
                onClick={() => setSelectedCampaignForPreview(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {selectedCampaignForPreview.imageUrl && (
                <img
                  src={selectedCampaignForPreview.imageUrl}
                  alt="Banner"
                  className="w-full max-h-56 object-cover rounded-xl border border-slate-200"
                />
              )}
              <div>
                <h2 className="text-xl font-black text-slate-900">{selectedCampaignForPreview.title}</h2>
                {selectedCampaignForPreview.subject && (
                  <p className="text-sm font-bold text-slate-600 mt-1">"{selectedCampaignForPreview.subject}"</p>
                )}
              </div>
              <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200 font-sans">
                {selectedCampaignForPreview.content}
              </div>
              {selectedCampaignForPreview.targetUrl && (
                <div>
                  <a
                    href={selectedCampaignForPreview.targetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl hover:bg-rose-700 transition-colors"
                  >
                    Open Target URL <ExternalLink size={13} />
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsTab;
