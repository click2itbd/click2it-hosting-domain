import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { apiPost } from '../services/apiClient';

export const Footer: React.FC = () => {
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      toast.error('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    let saved = false;
    let message = 'Subscribed to newsletter successfully!';

    // 1. Try public backend endpoint first (reliable deduplication + welcome email)
    try {
      const res: any = await apiPost('/api/public/newsletter-subscribe', {
        email: cleanEmail,
        brandName: settings.brandName || 'CLICK2IT BD',
        footerText: settings.footerText || `© ${new Date().getFullYear()} CLICK2IT BD. All rights reserved.`,
      });
      if (res?.success) {
        saved = true;
        if (res.message) message = res.message;
      }
    } catch (apiErr) {
      console.warn('Primary public newsletter endpoint notice, trying alias:', apiErr);
      try {
        const res2: any = await apiPost('/api/newsletter-subscribe', {
          email: cleanEmail,
          brandName: settings.brandName || 'CLICK2IT BD',
          footerText: settings.footerText || `© ${new Date().getFullYear()} CLICK2IT BD. All rights reserved.`,
        });
        if (res2?.success) {
          saved = true;
          if (res2.message) message = res2.message;
        }
      } catch (aliasErr) {
        console.warn('Alias newsletter endpoint notice:', aliasErr);
      }
    }

    // 2. Client Firestore write fallback (guarantees subscription even if backend proxy is temporarily unreachable)
    try {
      await addDoc(collection(db, 'subscribers'), {
        email: cleanEmail,
        createdAt: new Date().toISOString(),
      });
      saved = true;
    } catch (firestoreErr) {
      console.warn('Client Firestore subscriber write notice:', firestoreErr);
    }

    setLoading(false);

    if (saved) {
      setSubscribed(true);
      toast.success(message);
      setEmail('');
      setTimeout(() => setSubscribed(false), 6000);
    } else {
      toast.error('Failed to subscribe. Please try again.');
    }
  };

    const facebookHref = settings.facebookUrl || 'https://web.facebook.com/CLICK2ITBD';
  const instagramHref = settings.instagramUrl || 'https://www.instagram.com/click2itbd';
  const youtubeHref = settings.youtubeUrl || 'https://www.youtube.com/@click2itbd';

  return (
    <footer className="text-white pt-12 pb-6 bg-black">
      <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Support</h3>
            <div className="flex flex-col gap-4">
              <a href={`tel:${(settings.contactPhone || '+8809640887777').replace(/\s+/g, '')}`} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <div className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs">Contact Us</p>
                  <p className="font-bold" style={{ color: settings.accentColor }}>{settings.contactPhone || '+8809640887777'}</p>
                </div>
              </a>
              <a href={`mailto:${settings.contactEmail || 'support@click2it.bd'}`} className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <div className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs">Email Support</p>
                  <p className="font-bold">{settings.contactEmail || 'support@click2it.bd'}</p>
                </div>
              </a>
              <div className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <div className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs">Head Office</p>
                  <p className="font-bold">{settings.address || 'Dhaka, Bangladesh'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* About Us */}
          <div>
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">About Us</h3>
            <ul className="flex flex-col gap-2 text-gray-400 text-sm">
              <li><Link to="/emi-terms" className="hover:text-white transition-colors">EMI Terms</Link></li>
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/star-points" className="hover:text-white transition-colors">Star Point Policy</Link></li>
              <li><Link to="/brands" className="hover:text-white transition-colors">Brands</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>

          {/* Customer Service & Quick Links */}
          <div>
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Customer Service</h3>
            <ul className="flex flex-col gap-2 text-gray-400 text-sm">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/online-delivery" className="hover:text-white transition-colors">Online Delivery</Link></li>
              <li><Link to="/refund-policy" className="hover:text-white transition-colors">Refund and Return Policy</Link></li>
              <li><Link to="/warranty-policy" className="hover:text-white transition-colors">Warranty Policy</Link></li>
              <li><Link to="/status" className="hover:text-white transition-colors">Server Status &amp; Uptime</Link></li>
              <li><Link to="/support" className="hover:text-white transition-colors">Help &amp; Support</Link></li>
            </ul>
          </div>

          {/* Social & Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Stay Connected</h3>
            <Link to="/" className="inline-block text-sm text-gray-400 hover:text-white transition-colors mb-4">
              {settings.brandName || 'CLICK2IT BD'}
            </Link>
            
            <form onSubmit={handleSubscribe} className="mb-6">
              <p className="text-xs font-bold text-gray-300 uppercase mb-2">Newsletter Signup</p>
              <div className="flex flex-row">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  aria-label="Newsletter email address"
                  className="bg-[#182232] border border-transparent focus:border-slate-600 text-white placeholder-gray-400 text-sm px-4 py-2.5 rounded-l-md outline-none w-full transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading}
                  aria-label="Subscribe to newsletter"
                  className="bg-white text-black px-4 py-2.5 rounded-r-md hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                </button>
              </div>
              {subscribed && (
                <p className="text-xs text-emerald-400 font-medium mt-2 flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Subscribed! Thank you for joining us.
                </p>
              )}
            </form>

            <div className="flex gap-3">
              <a 
                href={facebookHref} 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Facebook"
                className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-blue-600 hover:scale-105 transition-all bg-[#182232] text-white" 
                title="Facebook"
              >
                <Facebook size={20} />
              </a>
              <a 
                href={instagramHref} 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="Instagram"
                className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-pink-600 hover:scale-105 transition-all bg-[#182232] text-white" 
                title="Instagram"
              >
                <Instagram size={20} />
              </a>
              <a 
                href={youtubeHref} 
                target="_blank" 
                rel="noopener noreferrer" 
                aria-label="YouTube"
                className="h-10 w-10 rounded-full flex items-center justify-center hover:bg-red-600 hover:scale-105 transition-all bg-[#182232] text-white" 
                title="YouTube"
              >
                <Youtube size={20} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-500">
          <p>{settings.footerText}</p>
          <p>Powered By: AI Studio</p>
        </div>
      </div>
    </footer>
  );
};
