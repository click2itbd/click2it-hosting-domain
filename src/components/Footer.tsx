import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Instagram, Youtube, MapPin, Phone, Mail, Send } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { apiPost } from '../services/apiClient';

export const Footer: React.FC = () => {
  const { settings } = useSettings();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'subscribers'), {
        email,
        createdAt: new Date().toISOString(),
      });

      await apiPost('/api/send-email', {
        to: email,
        subject: `Welcome to ${settings.brandName} Newsletter!`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
              <h1 style="color: ${settings.primaryColor};">${settings.brandName}</h1>
              <p>Hello!</p>
              <p>Thank you for subscribing to our newsletter. We're excited to have you with us!</p>
              <p>You'll be the first to know about our latest products, special offers, and tech news.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
              <p style="font-size: 12px; color: #666;">${settings.footerText}</p>
            </div>
          `,
      });

      toast.success('Subscribed successfully!');
      setEmail('');
    } catch (error) {
      console.error('Subscription error:', error);
      toast.error('Failed to subscribe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="text-white pt-12 pb-6 bg-black">
      <div className="w-full max-w-[1440px] mx-auto px-2 sm:px-4 md:px-[50px]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Support</h3>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <div className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div>
                  <p className="text-xs">Contact Us</p>
                  <p className="font-bold" style={{ color: settings.accentColor }}>+8809640887777</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <div className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center">
                  <Mail size={18} />
                </div>
                <div>
                  <p className="text-xs">Email Support</p>
                  <p className="font-bold">{settings.contactEmail}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
                <div className="h-10 w-10 rounded-full border border-gray-700 flex items-center justify-center">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-xs">Store Locator</p>
                  <p className="font-bold">{settings.address}</p>
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
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Customer Service</h3>
            <ul className="flex flex-col gap-2 text-gray-400 text-sm">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/online-delivery" className="hover:text-white transition-colors">Online Delivery</Link></li>
              <li><Link to="/refund-policy" className="hover:text-white transition-colors">Refund and Return Policy</Link></li>
              <li><Link to="/warranty-policy" className="hover:text-white transition-colors">Warranty Policy</Link></li>
            </ul>
          </div>

          {/* Social & Newsletter */}
          <div>
            <h3 className="text-lg font-bold mb-4 uppercase tracking-wider">Stay Connected</h3>
            <p className="text-sm text-gray-400 mb-4">{settings.brandName}</p>
            
            <form onSubmit={handleSubscribe} className="mb-6">
              <p className="text-xs font-bold text-gray-300 uppercase mb-2">Newsletter Signup</p>
              <div className="flex flex-col sm:flex-row">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-gray-800 border-none text-white text-sm px-4 py-2 rounded-t-md sm:rounded-l-md sm:rounded-tr-none focus:ring-1 focus:ring-white outline-none w-full"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-white text-black px-4 py-2 rounded-b-md sm:rounded-r-md sm:rounded-bl-none hover:bg-gray-200 transition-colors disabled:opacity-50"
                >
                  <Send size={18} />
                </button>
              </div>
            </form>

            <div className="flex gap-4">
              <a href="https://web.facebook.com/CLICK2ITBD" className="h-10 w-10 rounded-full flex items-center justify-center hover:opacity-80 transition-all" style={{ backgroundColor: settings.secondaryColor }}>
                <Facebook size={20} />
              </a>
              <a href="#" className="h-10 w-10 rounded-full flex items-center justify-center hover:opacity-80 transition-all" style={{ backgroundColor: settings.secondaryColor }}>
                <Instagram size={20} />
              </a>
              <a href="#" className="h-10 w-10 rounded-full flex items-center justify-center hover:opacity-80 transition-all" style={{ backgroundColor: settings.secondaryColor }}>
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


