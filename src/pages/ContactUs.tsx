import React, { useState } from 'react';
import { Layout } from '../components/Layout';
import { SEO } from '../components/SEO';
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useSiteContext } from '../hooks/useSiteContext';

export const ContactUs = () => {
  return <ContactUsDefault />;
};

export default function ContactUsDefault() {
  const { settings } = useSettings();
  const siteContext = useSiteContext();
  const isHosting = siteContext === 'hosting';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'General Inquiry',
    message: '',
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'inquiries'), {
        ...formData,
        siteContext,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      setSubmitted(true);
      toast.success('Your message has been sent successfully! We will contact you shortly.');
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: 'General Inquiry',
        message: '',
      });
    } catch (error) {
      console.error('Failed to submit inquiry:', error);
      toast.error('Failed to send message. Please reach us directly via phone or WhatsApp.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout fullWidth>
      <SEO 
        title={`Contact Us & Customer Support - ${settings.brandName}`} 
        description={`Get in touch with ${settings.brandName}. Contact our hardware sales, web hosting support, billing department, or visit our retail store.`} 
      />

      {/* Hero */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white py-14 md:py-20">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-4">
            <Sparkles size={14} /> 24/7 Dedicated Support
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            We'd Love to Hear From You
          </h1>
          <p className="text-gray-300 text-sm md:text-base leading-relaxed">
            'Have questions about custom PC builds, tech gadgets, or premium web hosting? Our dedicated specialists are here to assist you 24/7.'
          </p>
        </div>
      </div>

      <div className="bg-gray-50 py-12 md:py-16">
        <div className="container mx-auto px-2 sm:px-4 sm:px-6 lg:px-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Contact Info Cards (Left 1 Col) */}
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-3">
                  Direct Contact Information
                </h3>

                {/* Phone */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Customer Hotline</p>
                    <a href={`tel:${settings.contactPhone || '+8809640887777'}`} className="text-sm font-bold text-gray-900 hover:text-blue-600">
                      {settings.contactPhone || '+8809640887777'}
                    </a>
                    <p className="text-[11px] text-gray-400 mt-0.5">Sat - Thu: 9:00 AM - 9:00 PM</p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">'Support Email'</p>
                    <a href={`mailto:${settings.contactEmail}`} className="text-sm font-bold text-gray-900 hover:text-blue-600 break-all">
                      {settings.contactEmail}
                    </a>
                    <p className="text-[11px] text-gray-400 mt-0.5">Response within 2 - 4 hours</p>
                  </div>
                </div>

                {/* Address */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Store & Head Office</p>
                    <p className="text-sm font-bold text-gray-900 leading-snug">
                      {settings.address}
                    </p>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Business Hours</p>
                    <p className="text-sm font-bold text-gray-900">
                      10:00 AM – 8:30 PM
                    </p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Friday: 2:30 PM - 8:30 PM</p>
                  </div>
                </div>
              </div>

              {/* WhatsApp Quick Assistance */}
              <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <MessageSquare className="w-6 h-6 text-emerald-200" />
                  <h4 className="font-bold text-base">Instant WhatsApp Support</h4>
                </div>
                <p className="text-xs text-emerald-100 leading-relaxed mb-4">
                  Chat with our technical support team directly on WhatsApp for real-time queries and 'order assistance, or tech support.'
                </p>
                <a 
                  href={`https://wa.me/${(settings.contactPhone || '8801900000000').replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full bg-white text-emerald-700 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors"
                >
                  Message on WhatsApp
                </a>
              </div>
            </div>

            {/* Contact Form (Right 2 Cols) */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 md:p-10 rounded-3xl border border-gray-100 shadow-sm h-full flex flex-col justify-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Send us a Message</h2>
                <p className="text-sm text-gray-500 mb-8">
                  Fill out the form below and our team will get back to you as soon as possible.
                </p>

                {submitted ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-green-900 mb-2">Message Received!</h3>
                    <p className="text-sm text-green-700 max-w-md mx-auto">
                      Thank you for reaching out. A support ticket has been created, and one of our representatives will contact you shortly.
                    </p>
                    <button 
                      onClick={() => setSubmitted(false)}
                      className="mt-6 px-6 py-2 bg-white text-gray-700 font-medium border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors text-sm"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Full Name *</label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
                          placeholder="John Doe"
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Email Address *</label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
                          placeholder="john@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Phone Number (Optional)</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none"
                          placeholder="+880 1..."
                        />
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700">Subject</label>
                        <select
                          value={formData.subject}
                          onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none appearance-none"
                        >
                          <>
                              <option>General Inquiry</option>
                              <option>Order Status & Sales</option>
                              <option>PC Build Quotation</option>
                              <option>Hosting & Technical Support</option>
                              <option>Warranty Claim / RMA</option>
                            </>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-semibold text-gray-700">Message *</label>
                      <textarea
                        required
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        rows={5}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm outline-none resize-none"
                        placeholder="How can we help you today?"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-[#081621] text-white font-bold px-6 py-4 rounded-xl hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                    >
                      {loading ? 'Sending...' : 'Send Message'}
                      {!loading && <Send size={18} className="ml-1" />}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </Layout>
  );
};
