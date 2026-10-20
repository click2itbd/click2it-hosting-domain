import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '../../components/Layout';
import { SEO } from '../../components/SEO';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Search, RefreshCw, CheckCircle, XCircle, Loader2, Shield, Clock, ArrowRight, Mail, Phone, User, CreditCard, Landmark, Wallet, HelpCircle } from 'lucide-react';
import { getDomainRenewalPrice, DomainRenewalPriceResponse } from '../../services/domainApi';
import { getDomainPricing } from '../../services/hostingApi';

const DomainRenewal = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [domain, setDomain] = useState('');
  const [domainError, setDomainError] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [renewalData, setRenewalData] = useState<DomainRenewalPriceResponse | null>(null);
  const [renewalPeriod, setRenewalPeriod] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<any>(null);
  const [supportedTlds, setSupportedTlds] = useState<string[]>([]);

  useEffect(() => {
    getDomainPricing().then(pricing => {
      if (pricing && pricing.length > 0) {
        setSupportedTlds(pricing.map(p => {
          const ptld = p.tld.toLowerCase();
          return ptld.startsWith('.') ? ptld : `.${ptld}`;
        }));
      }
    });
  }, []);

  const [formData, setFormData] = useState({
    customerName: user?.displayName || '',
    email: user?.email || '',
    phone: '',
    paymentMethod: 'manual_bkash',
    transactionId: '',
    termsAccepted: false,
  });

  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;

  const validateDomain = (value: string) => {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
      setDomainError('Please enter a domain name');
      return false;
    }
    if (!domainRegex.test(trimmed)) {
      setDomainError('Please enter a valid domain (e.g., example.com)');
      return false;
    }
    if (supportedTlds.length > 0) {
      const isSupported = supportedTlds.some(tld => trimmed.endsWith(tld));
      if (!isSupported) {
        setDomainError(`This domain extension is currently not supported for renewal.`);
        return false;
      }
    }
    setDomainError('');
    return true;
  };

  const handleCheckRenewal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDomain(domain)) return;

    setIsChecking(true);
    setRenewalData(null);
    setSubmittedOrder(null);

    try {
      const data = await getDomainRenewalPrice(domain.trim());
      setRenewalData(data);
      setRenewalPeriod(1);
      toast.success('Renewal price loaded');
    } catch (error: any) {
      console.error('Renewal price error:', error);
      const isDevOrNetwork = !error?.message || error?.message?.includes('fetch') || error?.message?.includes('Network') || error?.message?.includes('500') || error?.message?.includes('503');
      const userMessage = isDevOrNetwork
        ? 'Unable to retrieve renewal pricing at this moment. Please try again shortly or contact our 24/7 support.'
        : (error.message || 'We could not determine the renewal price for this domain. Please verify your domain extension.');
      toast.error(userMessage);
    } finally {
      setIsChecking(false);
    }
  };

  const discountPercent = renewalData?.discountPercent || 0;
  const discountMultiplier = renewalPeriod > 1 ? (1 - (discountPercent / 100)) : 1;
  const totalBdt = renewalData ? Math.round(renewalData.renewalPriceBdt * renewalPeriod * discountMultiplier) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewalData) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const cleanPhone = formData.phone.replace(/\D/g, '').replace(/^(?:880|88)?0?/, '');
    const phoneRegex = /^1[3-9]\d{8}$/;
    if (!phoneRegex.test(cleanPhone)) {
      toast.error('Please enter a valid 10-digit Bangladeshi phone number starting with 1 (e.g. 17XXXXXXXX)');
      return;
    }
    const fullPhone = `+880${cleanPhone}`;

    if (!formData.termsAccepted) {
      toast.error('You must agree to the Terms and Conditions');
      return;
    }

    if (formData.paymentMethod === 'manual_bkash' && !formData.transactionId.trim()) {
      toast.error('Please enter the Transaction ID for bKash payment');
      return;
    }

    setIsSubmitting(true);

    try {
      const { createDomainRenewalOrder } = await import('../../services/domainApi');
      
      const result = await createDomainRenewalOrder({
        domain: renewalData.domain,
        renewalPeriod,
        customerName: formData.customerName,
        customerEmail: formData.email,
        customerPhone: fullPhone,
        paymentMethod: formData.paymentMethod,
        transactionId: formData.paymentMethod === 'manual_bkash' ? formData.transactionId : null,
      });

      const orderData = result.order;
      setSubmittedOrder({ id: result.orderId, ...orderData });

      if (formData.paymentMethod === 'bkash') {
        const { initiateBkashPayment } = await import('../../services/paymentApi');
        const res = await initiateBkashPayment(
          result.orderId,
          orderData.totalBdt,
          formData.email,
          formData.customerName,
          fullPhone
        );
        if (res.success && res.paymentUrl) {
          await updateDoc(doc(db, 'domain_renewals', result.orderId), { paymentStatus: 'processing' });
          window.location.href = res.paymentUrl;
          return;
        } else {
          throw new Error(res.errorMessage || 'Failed to initiate bKash payment');
        }
      } else if (formData.paymentMethod === 'card') {
        const { initiateSSLCommerzPayment } = await import('../../services/paymentApi');
        const res = await initiateSSLCommerzPayment(
          result.orderId,
          orderData.totalBdt,
          formData.email,
          formData.customerName,
          fullPhone
        );
        if (res.success && res.paymentUrl) {
          await updateDoc(doc(db, 'domain_renewals', result.orderId), { paymentStatus: 'processing' });
          window.location.href = res.paymentUrl;
          return;
        } else {
          throw new Error(res.errorMessage || 'Failed to initiate Card payment');
        }
      } else if (formData.paymentMethod === 'manual_bkash') {
        await updateDoc(doc(db, 'domain_renewals', result.orderId), {
          paymentStatus: 'pending_verification',
          status: 'pending',
        });
        toast.success('Renewal request submitted! We will verify your bKash payment and process the renewal.');
      }
    } catch (error: any) {
      console.error('Renewal submission error:', error);
      const isDevOrNetwork = !error?.message || error?.message?.includes('fetch') || error?.message?.includes('Network') || error?.message?.includes('500');
      const userMessage = isDevOrNetwork
        ? 'Unable to process your renewal order at this moment. Please check your connection or contact our billing team.'
        : (error.message || 'Could not complete renewal order. Please try again or contact support.');
      toast.error(userMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
    if (e.target.name === 'phone') {
      let val = String(value).replace(/\D/g, '');
      if (val.startsWith('880')) val = val.slice(3);
      else if (val.startsWith('88')) val = val.slice(2);
      val = val.replace(/^0+/, '');
      val = val.slice(0, 10);
      setFormData(prev => ({ ...prev, phone: val }));
      return;
    }
    setFormData(prev => ({ ...prev, [e.target.name]: value }));
  };

  return (
    <Layout fullWidth>
      <SEO
        title="Domain Renewal"
        description="Renew your domain name easily. Fast and secure domain renewal service with competitive pricing."
        keywords="domain renewal, renew domain, domain registration renewal"
      />
      
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest mb-4 border border-blue-100">
              <RefreshCw size={14} /> Domain Renewal
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 mb-4">
              Renew Your Domain
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Keep your domain name active. Enter your domain below to check renewal pricing and extend your registration.
            </p>
          </div>

          {/* Step 1: Domain Input */}
          {!renewalData && !submittedOrder && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
              <form onSubmit={handleCheckRenewal}>
                <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wide">
                  Enter Your Domain
                </label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="example.com"
                      className={`w-full px-4 py-3.5 text-lg rounded-xl border outline-none transition-all ${
                        domainError ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200' : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                      }`}
                    />
                    {domainError && (
                      <p className="text-red-500 text-sm mt-1.5 flex items-center gap-1">
                        <XCircle size={14} /> {domainError}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={isChecking}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
                  >
                    {isChecking ? (
                      <>
                        <Loader2 className="animate-spin" size={20} /> Checking...
                      </>
                    ) : (
                      <>
                        <Search size={20} /> Check Renewal
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 2 & 3: Renewal Pricing Card */}
          {renewalData && !submittedOrder && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="p-6 md:p-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Renewal Details</h2>
                    <p className="text-gray-500 text-sm">Review your renewal pricing before proceeding</p>
                  </div>
                  <div className="bg-green-50 text-green-600 p-2 rounded-lg">
                    <CheckCircle size={24} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gray-50 rounded-xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Domain</p>
                    <p className="text-lg font-bold text-gray-900">{renewalData.domain}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-5">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Renewal Price</p>
                    <p className="text-lg font-bold text-gray-900">৳{renewalData.renewalPriceBdt.toLocaleString()} <span className="text-sm font-normal text-gray-500">/ year</span></p>
                  </div>
                </div>

                {/* Renewal Period */}
                <div className="mb-8">
                  <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">
                    Select Renewal Period
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {Array.from({ length: Math.min(renewalData.maxDuration, 5) }, (_, i) => i + 1).map(year => (
                      <button
                        key={year}
                        onClick={() => setRenewalPeriod(year)}
                        className={`py-3 px-4 rounded-xl font-bold text-sm transition-all border ${
                          renewalPeriod === year
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        {year} Year{year > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Summary */}
                <div className="bg-blue-50 rounded-xl p-6 mb-8 border border-blue-100">
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Price Summary</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Renewal Period</span>
                      <span className="font-medium text-gray-900">{renewalPeriod} Year{renewalPeriod > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Price per Year</span>
                      <span className="font-medium text-gray-900">৳{renewalData.renewalPriceBdt.toLocaleString()}</span>
                    </div>
                    <div className="border-t border-blue-200 pt-3 flex justify-between">
                      <span className="font-bold text-gray-900">Total Amount</span>
                      <p className="font-bold text-xl text-blue-600">৳{totalBdt.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Customer Form */}
                <form onSubmit={handleSubmit}>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="john@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                      <div className="flex">
                        <span className="inline-flex items-center px-4 py-2.5 rounded-l-lg border border-r-0 border-gray-200 bg-gray-50 text-gray-500 font-medium select-none text-sm">
                          +880
                        </span>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          className="flex-1 w-full px-4 py-2.5 border border-gray-200 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                          placeholder="1XXXXXXXXX"
                          maxLength={10}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Enter 10 digits starting with 1 (e.g. 17XXXXXXXX)</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                      <select
                        name="paymentMethod"
                        value={formData.paymentMethod}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      >
                        <option value="manual_bkash">bKash (Manual Send Money)</option>
                        <option value="bkash" disabled>bKash Gateway (Coming Soon)</option>
                        <option value="card" disabled>Card (Coming Soon)</option>
                        <option value="bank" disabled>Bank Transfer (Coming Soon)</option>
                      </select>
                    </div>
                    {formData.paymentMethod === 'manual_bkash' && (
                      <div className="md:col-span-2">
                        <div className="mb-4 p-4 bg-pink-50 border border-pink-200 rounded-lg text-pink-800 text-sm">
                          <p className="font-bold mb-1">bKash Payment Instructions:</p>
                          <p>1. Go to your bKash app and select <strong>Send Money</strong>.</p>
                          <p>2. Send exactly <strong>৳{totalBdt.toLocaleString()}</strong> to <strong>01727666677</strong> (Personal).</p>
                          <p>3. Enter the Transaction ID (TrxID) below.</p>
                        </div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Transaction ID (TrxID)</label>
                        <input
                          type="text"
                          name="transactionId"
                          value={formData.transactionId}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                          placeholder="e.g. 9F3G5H7J"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-start gap-2 mb-6">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={handleChange}
                      className="mt-1"
                    />
                    <label htmlFor="termsAccepted" className="text-sm text-gray-600">
                      I agree to the <Link to="/terms" className="text-blue-600 hover:underline">Terms and Conditions</Link> and understand that domain renewal is subject to registrar approval.
                    </label>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      type="button"
                      onClick={() => { setRenewalData(null); setDomain(''); }}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="animate-spin" size={20} /> Processing...
                        </>
                      ) : (
                        <>
                          <CreditCard size={20} /> Proceed to Payment — ৳{totalBdt.toLocaleString()}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Success / Status View */}
          {submittedOrder && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle size={32} />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Renewal Request Submitted</h2>
                <p className="text-gray-600 mb-6">
                  Your domain renewal request has been received. We will process it shortly.
                </p>

                <div className="bg-gray-50 rounded-xl p-6 text-left max-w-md mx-auto mb-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Order ID</span>
                      <span className="font-mono font-bold text-gray-900">{submittedOrder.documentNumber || submittedOrder.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Domain</span>
                      <span className="font-bold text-gray-900">{submittedOrder.domain}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Period</span>
                      <span className="font-bold text-gray-900">{submittedOrder.renewalPeriod} Year{submittedOrder.renewalPeriod > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Amount</span>
                      <span className="font-bold text-gray-900">৳{submittedOrder.totalBdt?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status</span>
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        submittedOrder.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        submittedOrder.paymentStatus === 'processing' ? 'bg-blue-100 text-blue-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {submittedOrder.paymentStatus === 'pending' ? 'Pending Payment' :
                         submittedOrder.paymentStatus === 'processing' ? 'Payment Processing' :
                         submittedOrder.paymentStatus === 'pending_verification' ? 'Awaiting Verification' :
                         submittedOrder.paymentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={() => navigate('/hosting/cart')}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                  >
                    Back to Home
                  </button>
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                  >
                    Renew Another Domain
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FAQ Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <HelpCircle size={24} className="text-blue-600" /> Frequently Asked Questions
            </h2>
            <div className="space-y-6">
              <div>
                <h3 className="font-bold text-gray-900 mb-2">How long does domain renewal take?</h3>
                <p className="text-gray-600 text-sm">Most renewals are processed within 24-48 hours after payment confirmation. You will receive an email confirmation once the renewal is complete.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Can I renew my domain for multiple years?</h3>
                <p className="text-gray-600 text-sm">Yes, you can renew for up to the maximum duration allowed by the registry. The maximum period varies by TLD.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">What if my domain is not managed by you?</h3>
                <p className="text-gray-600 text-sm">We accept renewal requests for domains registered with us. For domains registered elsewhere, you will need to contact your current registrar.</p>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Is there a grace period after expiration?</h3>
                <p className="text-gray-600 text-sm">Most registries have a grace period, but it varies. We recommend renewing at least 7 days before expiration to avoid any service interruption.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DomainRenewal;
