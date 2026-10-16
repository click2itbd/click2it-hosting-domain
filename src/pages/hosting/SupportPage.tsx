import React, { useState, useRef, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { toast } from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Search, 
  Phone, 
  Mail, 
  MessageCircle, 
  Send, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  Server,
  Globe,
  CreditCard,
  Lock,
  Zap,
  RefreshCw,
  Copy,
  Check,
  LifeBuoy,
  FileQuestion,
  HelpCircle,
  ShieldCheck,
  Terminal,
  ExternalLink
} from 'lucide-react';
import { Layout } from '../../components/Layout';
import { PageHeader } from '../../components/hosting/PageHeader';
import { useSettings } from '../../context/SettingsContext';
import { SEO } from '../../components/SEO';

interface FAQItem {
  id: string;
  category: 'cPanel & Email' | 'Domain & DNS' | 'Hosting & Server' | 'Billing & bKash' | 'SSL & Security' | 'Migration';
  categoryKey: string;
  question: string;
  answer: string;
  tags: string[];
}

const knowledgeBaseArticles: FAQItem[] = [
  {
    id: 'cpanel-login',
    category: 'cPanel & Email',
    categoryKey: 'cpanel',
    question: 'How do I log in to my cPanel and Webmail control panel?',
    answer: 'You can access your cPanel by visiting https://yourdomain.com:2083 or https://yourdomain.com/cpanel. To access webmail directly, go to https://yourdomain.com/webmail. Your initial cPanel credentials were emailed upon order activation.',
    tags: ['cpanel', 'login', 'webmail', 'control panel', 'email']
  },
  {
    id: 'nameservers-dns',
    category: 'Domain & DNS',
    categoryKey: 'domain',
    question: 'What are the default Click2IT nameservers to point my domain?',
    answer: 'To point any domain registered elsewhere to your Click2IT hosting account, update your domain nameservers to: ns1.click2itbd.com and ns2.click2itbd.com. DNS propagation takes 15 minutes to 24 hours globally.',
    tags: ['nameservers', 'dns', 'point domain', 'ns1', 'ns2', 'propagation']
  },
  {
    id: 'free-ssl-install',
    category: 'SSL & Security',
    categoryKey: 'ssl',
    question: 'How do I activate Free AutoSSL on my domain and subdomains?',
    answer: 'All Click2IT hosting plans include lifetime free automated SSL. Once your domain points to our server IP, AutoSSL will automatically issue and install a certificate within 1 hour. You can also manually trigger it in cPanel under "SSL/TLS Status" > "Run AutoSSL".',
    tags: ['ssl', 'https', 'autossl', 'security', 'certificate', 'free ssl']
  },
  {
    id: 'bkash-payment-verification',
    category: 'Billing & bKash',
    categoryKey: 'billing',
    question: 'How do I complete manual bKash payment verification for my order?',
    answer: 'Send the exact bill amount to our bKash merchant/personal number displayed during checkout. Copy the 10-character Transaction ID (TrxID) from your bKash SMS and enter it at checkout or in your order tracking screen for instant provisioning.',
    tags: ['bkash', 'payment', 'trxid', 'transaction', 'verification', 'billing']
  },
  {
    id: 'free-website-migration',
    category: 'Migration',
    categoryKey: 'migration',
    question: 'How do I request free cPanel website migration from my previous host?',
    answer: 'We provide 100% free migration with zero downtime! Simply open a support ticket or WhatsApp message with your previous host cPanel login URL, username, and password. Our server engineers will transfer all files, MySQL databases, and email accounts seamlessly.',
    tags: ['migration', 'transfer', 'cpanel backup', 'move site', 'free migration']
  },
  {
    id: 'php-version-change',
    category: 'Hosting & Server',
    categoryKey: 'hosting',
    question: 'How do I change PHP version (7.4, 8.1, 8.2, 8.3) and extensions in cPanel?',
    answer: 'Log in to cPanel and click "Select PHP Version" under Software. Choose your desired PHP runtime (from 7.4 up to 8.3) and click "Set as current". You can also toggle PHP extensions (mysqli, zip, imagick) and adjust memory limits under "Options".',
    tags: ['php', 'php version', 'extensions', 'memory limit', 'cpanel software']
  },
  {
    id: 'wordpress-one-click',
    category: 'Hosting & Server',
    categoryKey: 'hosting',
    question: 'How do I install WordPress using Softaculous in 1 click?',
    answer: 'In cPanel, open "Softaculous Apps Installer" and click WordPress. Click "Install Now", select your domain (choose https://), enter your website name, and create your Admin Username and Password. Click "Install" and your WordPress site will be live in 30 seconds.',
    tags: ['wordpress', 'install', 'softaculous', 'blog', 'cms']
  },
  {
    id: 'domain-auth-code',
    category: 'Domain & DNS',
    categoryKey: 'domain',
    question: 'How do I get my Domain EPP / Auth Transfer Code to transfer a domain?',
    answer: 'To transfer a domain to Click2IT or obtain your auth code, go to your Domain Management portal in your profile, click on the domain, unlock the registrar lock, and click "Send EPP/Auth Code". The code is emailed directly to the administrative email.',
    tags: ['domain', 'transfer', 'epp', 'auth code', 'unlock']
  },
  {
    id: 'email-smtp-setup',
    category: 'cPanel & Email',
    categoryKey: 'cpanel',
    question: 'What are the SMTP and IMAP settings to connect Outlook or Gmail?',
    answer: 'Incoming Server (IMAP): mail.yourdomain.com (Port 993, SSL/TLS). Outgoing Server (SMTP): mail.yourdomain.com (Port 465, SSL/TLS). Username: your full email address (e.g. info@yourdomain.com) and email password.',
    tags: ['smtp', 'imap', 'outlook', 'gmail', 'email client', 'mail settings']
  },
  {
    id: 'server-uptime-sla',
    category: 'Hosting & Server',
    categoryKey: 'hosting',
    question: 'What is your 99.9% uptime SLA policy and emergency protocol?',
    answer: 'Our CloudLinux and LiteSpeed infrastructure is monitored 24/7/365 with automated multi-carrier failover. If an unexpected hardware or network incident occurs, our emergency server response team intervenes within 5 minutes.',
    tags: ['sla', 'uptime', 'outage', 'emergency', 'server down', 'support']
  }
];

const categoryCards = [
  {
    key: 'cpanel',
    title: 'cPanel & Webmail',
    desc: 'Login credentials, Webmail, FTP, and MySQL database setup.',
    icon: Server,
    color: 'from-blue-500/10 to-blue-500/5 text-blue-600 border-blue-100 hover:border-blue-300'
  },
  {
    key: 'domain',
    title: 'Domain & DNS Management',
    desc: 'Nameserver pointing, DNS records, EPP transfer, and WHOIS.',
    icon: Globe,
    color: 'from-cyan-500/10 to-cyan-500/5 text-cyan-600 border-cyan-100 hover:border-cyan-300'
  },
  {
    key: 'ssl',
    title: 'SSL & Security',
    desc: 'Free AutoSSL activation, HTTPS redirection, and WAF rules.',
    icon: Lock,
    color: 'from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-100 hover:border-emerald-300'
  },
  {
    key: 'hosting',
    title: 'Hosting & WordPress',
    desc: '1-click WordPress install, PHP version selector, and backups.',
    icon: Zap,
    color: 'from-purple-500/10 to-purple-500/5 text-purple-600 border-purple-100 hover:border-purple-300'
  },
  {
    key: 'billing',
    title: 'Billing & bKash Payments',
    desc: 'TrxID submission, invoice downloads, and manual verification.',
    icon: CreditCard,
    color: 'from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-100 hover:border-amber-300'
  },
  {
    key: 'migration',
    title: 'Free Site Migration',
    desc: 'Seamless zero-downtime transfer from your previous hosting.',
    icon: RefreshCw,
    color: 'from-rose-500/10 to-rose-500/5 text-rose-600 border-rose-100 hover:border-rose-300'
  },
];

export default function SupportPage() {
  const { settings } = useSettings();
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('cpanel-login');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const contactPhone = settings?.contactPhone || settings?.phone || '+8809640887777';
  const contactEmail = settings?.contactEmail || settings?.email || 'info@click2itbd.com';
  const cleanPhone = contactPhone.replace(/[^0-9]/g, '');

  // Real-time dynamic search filter
  const filteredArticles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return knowledgeBaseArticles.filter(item => {
      const matchesCategory = selectedCategoryKey === 'all' || item.categoryKey === selectedCategoryKey;
      if (!query) return matchesCategory;

      const matchesText = item.question.toLowerCase().includes(query) ||
                          item.answer.toLowerCase().includes(query) ||
                          item.category.toLowerCase().includes(query) ||
                          item.tags.some(tag => tag.toLowerCase().includes(query));
      return matchesCategory && matchesText;
    });
  }, [searchQuery, selectedCategoryKey]);

  const handleCardClick = (key: string) => {
    if (selectedCategoryKey === key) {
      setSelectedCategoryKey('all');
    } else {
      setSelectedCategoryKey(key);
      setSearchQuery('');
      // auto expand first match in category
      const first = knowledgeBaseArticles.find(item => item.categoryKey === key);
      if (first) setExpandedFaqId(first.id);
    }
  };

  const handleCopyAnswer = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success('Solution copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTicketSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    const formData = new FormData(e.currentTarget);
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const email = formData.get('email') as string;
    const subject = formData.get('subject') as string;
    const priority = formData.get('priority') as string;
    const message = formData.get('message') as string;
    
    if (!subject || !message || !email) {
      toast.error('Please fill in all required fields.');
      return;
    }

    try {
      setIsSubmitting(true);
      const now = new Date().toISOString();
      const customerName = (firstName + ' ' + lastName).trim() || user?.displayName || 'Valued Customer';
      
      const ticketData = {
        userId: user?.uid || 'guest',
        customerName,
        customerEmail: email,
        subject,
        status: 'open',
        priority: priority.split(' ')[0].toLowerCase(),
        department: 'Technical Support',
        createdAt: now,
        updatedAt: now
      };

      const docRef = await addDoc(collection(db, 'tickets'), ticketData);
      
      await addDoc(collection(db, 'tickets', docRef.id, 'messages'), {
        sender: 'customer',
        senderName: customerName,
        message,
        createdAt: now
      });

      setTicketSuccess(docRef.id);
      toast.success('Support ticket created successfully!');
      formRef.current?.reset();
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Failed to submit ticket. Please contact us via phone or WhatsApp.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout fullWidth>
      <SEO 
        title={`24/7 Support Hub & Knowledgebase - ${settings?.brandName || 'Click2IT BD'}`} 
        description={`Modern helpdesk and instant technical solutions for web hosting, cPanel, domain DNS, and bKash payment verification.`} 
      />

      {/* Modern Sleek Hero */}
      <div className="relative bg-white pt-12 pb-16 border-b border-gray-100 overflow-hidden">
        {/* Subtle background mesh */}
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />
        
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-4xl relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100/80 shadow-sm">
            <Sparkles size={13} className="text-blue-500" /> Help Center & Knowledgebase
          </div>
          
          <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
            How can we assist you today?
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Search our instant troubleshooting articles or connect with our server engineering team.
          </p>

          {/* Search Bar - Modern Floating Style */}
          <div className="relative max-w-2xl mx-auto">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-blue-500/5 border border-gray-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all">
              <Search className="w-5 h-5 text-gray-400 ml-5 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value.trim().length > 1) {
                    const match = knowledgeBaseArticles.find(item => 
                      item.question.toLowerCase().includes(e.target.value.toLowerCase()) ||
                      item.tags.some(t => t.toLowerCase().includes(e.target.value.toLowerCase()))
                    );
                    if (match) setExpandedFaqId(match.id);
                  }
                }}
                placeholder="Search solutions (e.g. cPanel, Nameservers, SSL, bKash, Migration, PHP)..."
                className="w-full py-4 pl-3 pr-12 text-sm sm:text-base text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mr-3 px-2.5 py-1 text-xs font-semibold text-gray-500 hover:text-gray-900 bg-gray-100 rounded-lg"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Keyword Suggestions */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 mt-3 text-xs text-gray-500">
              <span className="text-gray-400">Popular:</span>
              {['cPanel Login', 'Nameservers', 'Free AutoSSL', 'bKash TrxID', 'Migration'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    const q = tag.split(' ')[0].toLowerCase();
                    setSearchQuery(q);
                    setSelectedCategoryKey('all');
                  }}
                  className="px-2.5 py-0.5 rounded-md bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 border border-gray-200/60 font-medium transition-colors"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white py-14">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-6xl space-y-16">
          
          {/* ========================================================================= */}
          {/* 1. VISUAL TOPIC CARDS (Modern 6-Card Grid) */}
          {/* ========================================================================= */}
          <section>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900">Explore by Category</h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-0.5">Click any category to filter guides and solutions</p>
              </div>
              {selectedCategoryKey !== 'all' && (
                <button
                  onClick={() => setSelectedCategoryKey('all')}
                  className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                >
                  Show All Categories ({knowledgeBaseArticles.length})
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {categoryCards.map((card) => {
                const Icon = card.icon;
                const isSelected = selectedCategoryKey === card.key;
                return (
                  <div
                    key={card.key}
                    onClick={() => handleCardClick(card.key)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer group flex flex-col justify-between ${
                      isSelected
                        ? 'bg-blue-50/70 border-blue-500 ring-2 ring-blue-500/20 shadow-sm'
                        : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center bg-gradient-to-br ${card.color} border`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        {isSelected && (
                          <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                            Active Filter
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                        {card.title}
                      </h3>
                      <p className="text-xs text-gray-500 leading-relaxed">
                        {card.desc}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-100/80 flex items-center justify-between text-xs font-semibold text-blue-600">
                      <span>View Solutions</span>
                      <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 2. DYNAMIC SOLUTIONS ACCORDION (Clean Minimalist Design) */}
          {/* ========================================================================= */}
          <section className="pt-4 border-t border-gray-100">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedCategoryKey === 'all' ? 'All Knowledgebase Guides' : `${categoryCards.find(c => c.key === selectedCategoryKey)?.title} Guides`}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Showing {filteredArticles.length} direct troubleshooting answer{filteredArticles.length === 1 ? '' : 's'}
                </p>
              </div>

              {searchQuery && (
                <span className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full font-medium">
                  Search query: "{searchQuery}"
                </span>
              )}
            </div>

            <div className="space-y-3">
              {filteredArticles.map((article) => {
                const isExpanded = expandedFaqId === article.id;
                return (
                  <div
                    key={article.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isExpanded
                        ? 'border-blue-400 bg-white shadow-md shadow-blue-500/5'
                        : 'border-gray-100 bg-white hover:border-gray-200'
                    }`}
                  >
                    <button
                      onClick={() => setExpandedFaqId(isExpanded ? null : article.id)}
                      className="w-full p-5 text-left flex items-start justify-between gap-4 focus:outline-none group"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className={`mt-0.5 p-1.5 rounded-lg ${isExpanded ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600'} transition-colors shrink-0`}>
                          <HelpCircle size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                              {article.category}
                            </span>
                          </div>
                          <h4 className={`font-bold text-sm sm:text-base ${isExpanded ? 'text-blue-600' : 'text-gray-900 group-hover:text-blue-600'} transition-colors`}>
                            {article.question}
                          </h4>
                        </div>
                      </div>

                      <div className="shrink-0 p-1 rounded-lg text-gray-400 group-hover:text-blue-600">
                        {isExpanded ? <ChevronDown size={18} className="rotate-180 transition-transform" /> : <ChevronDown size={18} className="transition-transform" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0 border-t border-gray-50">
                        <div className="bg-gray-50/70 p-4 rounded-xl text-gray-700 text-xs sm:text-sm leading-relaxed border border-gray-100">
                          {article.answer}
                        </div>

                        <div className="mt-3 flex flex-wrap justify-between items-center gap-2 text-xs">
                          <div className="flex items-center gap-1.5 text-gray-400">
                            {article.tags.map(t => (
                              <span key={t} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[11px]">
                                #{t}
                              </span>
                            ))}
                          </div>
                          <button
                            onClick={() => handleCopyAnswer(article.id, article.answer)}
                            className="inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-xs"
                          >
                            {copiedId === article.id ? (
                              <>
                                <Check size={13} className="text-green-600" /> Copied to Clipboard
                              </>
                            ) : (
                              <>
                                <Copy size={13} /> Copy Solution
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredArticles.length === 0 && (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-200">
                  <FileQuestion className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-gray-700">No guides matching "{searchQuery}"</p>
                  <p className="text-xs text-gray-500 mt-1">Try another keyword or submit a direct ticket below.</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategoryKey('all'); }}
                    className="mt-3 text-xs font-bold text-blue-600 hover:underline"
                  >
                    Reset Filter
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. FAST CONTACT CHANNELS (Clean Modern Cards) */}
          {/* ========================================================================= */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100">
            {/* Phone Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-900 mb-1">Customer Helpline</h4>
                <p className="text-xs text-gray-500 mb-2">Immediate support for sales and server status.</p>
                <a href={`tel:${contactPhone}`} className="text-xs font-bold text-blue-600 hover:underline">
                  {contactPhone} →
                </a>
              </div>
            </div>

            {/* Email Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-900 mb-1">Email Support</h4>
                <p className="text-xs text-gray-500 mb-2">Send migration logs or general inquiries.</p>
                <a href={`mailto:${contactEmail}`} className="text-xs font-bold text-purple-600 hover:underline break-all">
                  {contactEmail} →
                </a>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base text-gray-900 mb-1">WhatsApp Live Chat</h4>
                <p className="text-xs text-gray-500 mb-2">Real-time troubleshooting with our team.</p>
                <a 
                  href={`https://wa.me/${cleanPhone}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs font-bold text-emerald-600 hover:underline"
                >
                  Open WhatsApp Chat →
                </a>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 4. SUPPORT TICKET SUBMISSION FORM (Clean Modern Grid) */}
          {/* ========================================================================= */}
          <section className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5">
              
              {/* Left Info Panel */}
              <div className="lg:col-span-2 bg-gradient-to-br from-gray-950 via-slate-900 to-gray-900 p-8 sm:p-10 text-white flex flex-col justify-between">
                <div>
                  <span className="inline-block px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-4">
                    Direct Engineering Helpdesk
                  </span>
                  <h3 className="text-2xl font-black mb-3">Open a Support Ticket</h3>
                  <p className="text-gray-300 text-xs sm:text-sm leading-relaxed mb-6">
                    Our technical support team actively resolves hosting, domain DNS, and server setup requests 24/7/365.
                  </p>

                  <div className="space-y-3 text-xs text-gray-300">
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Dedicated technical staff response</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Direct ticket tracking in customer dashboard</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Free cPanel website migration assistance</span>
                    </div>
                  </div>
                </div>

                {user && (
                  <div className="mt-8 pt-4 border-t border-gray-800 text-xs text-gray-400">
                    Account: <strong className="text-white">{user.email}</strong>
                  </div>
                )}
              </div>

              {/* Right Form */}
              <div className="lg:col-span-3 p-8 sm:p-10 bg-white">
                {ticketSuccess ? (
                  <div className="text-center py-6 space-y-3">
                    <div className="w-14 h-14 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={32} />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900">Support Ticket Created!</h4>
                    <p className="text-gray-500 text-xs sm:text-sm max-w-md mx-auto">
                      Your ticket reference is <strong className="text-blue-600">#{ticketSuccess.slice(0, 8).toUpperCase()}</strong>. Our team has been notified.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3 pt-3">
                      {user ? (
                        <Link 
                          to="/profile" 
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors"
                        >
                          View in Dashboard
                        </Link>
                      ) : (
                        <Link 
                          to="/login" 
                          className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 transition-colors"
                        >
                          Login to Track
                        </Link>
                      )}
                      <button
                        onClick={() => setTicketSuccess(null)}
                        className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-xs hover:bg-gray-200 transition-colors"
                      >
                        Submit Another
                      </button>
                    </div>
                  </div>
                ) : (
                  <form ref={formRef} className="space-y-4" onSubmit={handleTicketSubmit}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">First Name</label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-gray-50/50" 
                          name="firstName" 
                          placeholder="Your First Name" 
                          defaultValue={user?.displayName?.split(" ")[0] || ""} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Last Name</label>
                        <input 
                          type="text" 
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-gray-50/50" 
                          name="lastName" 
                          placeholder="Your Last Name" 
                          defaultValue={user?.displayName?.split(" ")[1] || ""} 
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">
                          Email Address <span className="text-red-500">*</span>
                        </label>
                        <input 
                          type="email" 
                          required
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-gray-50/50" 
                          name="email" 
                          placeholder="name@domain.com" 
                          defaultValue={user?.email || ""} 
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Priority</label>
                        <select 
                          name="priority" 
                          className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-gray-50/50"
                        >
                          <option>Low - General Query</option>
                          <option>Medium - Standard Assistance</option>
                          <option>High - Service Degradation</option>
                          <option>Critical - Server Downtime</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Subject <span className="text-red-500">*</span>
                      </label>
                      <input 
                        type="text" 
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-gray-50/50" 
                        name="subject" 
                        placeholder="e.g. cPanel SSL installation or domain DNS record setup" 
                        required 
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Detailed Description <span className="text-red-500">*</span>
                      </label>
                      <textarea 
                        rows={4} 
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm bg-gray-50/50 resize-none" 
                        name="message" 
                        placeholder="Provide details or error messages..." 
                        required
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs sm:text-sm transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        <span>{isSubmitting ? "Submitting..." : "Submit Support Ticket"}</span>
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </section>

        </div>
      </div>
    </Layout>
  );
}
