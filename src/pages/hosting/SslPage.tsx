import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, CheckCircle2, Search, ShoppingCart, Server, ShieldCheck } from 'lucide-react';
import { Layout } from '../../components/Layout';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../lib/utils';
import { SEO } from '../../components/SEO';

const SSL_PRODUCTS = [
  {
    id: 'ssl_positive',
    name: 'Sectigo PositiveSSL',
    description: 'Perfect for personal websites and blogs. Fast issuance and basic encryption.',
    price: 850,
    features: ['Domain Validation (DV)', 'Issued in minutes', '$10,000 Warranty', 'Green Padlock', 'Static Site Seal'],
    icon: <Lock className="w-8 h-8 text-blue-500" />,
    popular: false
  },
  {
    id: 'ssl_essential',
    name: 'Comodo EssentialSSL',
    description: 'Great for small business websites and light e-commerce.',
    price: 1800,
    features: ['Domain Validation (DV)', 'Issued in minutes', '$10,000 Warranty', 'Dynamic Site Seal', 'High Browser Compatibility'],
    icon: <Shield className="w-8 h-8 text-emerald-500" />,
    popular: true
  },
  {
    id: 'ssl_wildcard',
    name: 'PositiveSSL Wildcard',
    description: 'Secure your main domain and unlimited subdomains with one certificate.',
    price: 8500,
    features: ['Unlimited Subdomains', 'Domain Validation (DV)', '$10,000 Warranty', 'Easy Management', 'Cost Effective'],
    icon: <Server className="w-8 h-8 text-purple-500" />,
    popular: false
  },
  {
    id: 'ssl_ev',
    name: 'Sectigo EV SSL',
    description: 'Maximum trust for e-commerce. Extended Validation for ultimate security.',
    price: 15500,
    features: ['Extended Validation (EV)', 'Company Name in Certificate', '$1,750,000 Warranty', 'Highest Trust Level', 'Dynamic Site Seal'],
    icon: <ShieldCheck className="w-8 h-8 text-orange-500" />,
    popular: false
  }
];

export const SslPage = () => {
  const navigate = useNavigate();
  const { addToCart, items } = useCart();

  const handleAddToCart = (product: typeof SSL_PRODUCTS[0]) => {
    addToCart({
      id: `${product.id}_${Date.now()}`,
      name: product.name,
      description: '1 Year SSL Certificate',
      price: product.price,
      category: 'Security & SSL',
      stock: 9999,
      images: [],
      createdAt: new Date().toISOString(),
      itemType: 'ssl',
      termYears: 1
    } as any);

    toast.success(`${product.name} added to cart!`);
  };

  return (
    <Layout>
      <SEO
        title="SSL Certificates & Website Security in Bangladesh | Click2IT"
        description="Secure your website with Sectigo & Comodo SSL certificates. Domain Validation, Wildcard, EV SSL with instant issuance, highest browser trust, and best price in BD."
        keywords="ssl certificate bd, buy ssl bangladesh, wildcard ssl price bd, sectigo ssl, comodo ssl, https padlock"
        canonical="https://click2it.bd/ssl"
      />
      {/* Hero Section */}
      <div className="bg-[#081621] text-white pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-full mb-6">
            <ShieldCheck className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Secure Your Website with Premium SSL</h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
            Protect your customers' sensitive data, boost your Google ranking, and build trust with Sectigo & Comodo SSL Certificates.
          </p>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-10 mb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SSL_PRODUCTS.map((product) => (
            <div key={product.id} className={`bg-white rounded-2xl shadow-xl p-8 border-2 relative flex flex-col ${product.popular ? 'border-emerald-500 scale-105 shadow-emerald-500/10' : 'border-gray-100'}`}>
              {product.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-sm">
                  Most Popular
                </div>
              )}
              
              <div className="mb-6 flex justify-center">{product.icon}</div>
              
              <h3 className="text-xl font-bold text-gray-800 text-center mb-2">{product.name}</h3>
              <p className="text-sm text-gray-500 text-center mb-6 h-12">{product.description}</p>
              
              <div className="text-center mb-8">
                <span className="text-4xl font-black text-gray-900">{formatCurrency(product.price)}</span>
                <span className="text-gray-500">/yr</span>
              </div>
              
              <div className="flex-grow">
                <ul className="space-y-3 mb-8">
                  {product.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button
                onClick={() => handleAddToCart(product)}
                className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                  product.popular 
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30' 
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200'
                }`}
              >
                <ShoppingCart size={18} /> Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Info Section */}
      <div className="bg-gray-50 py-20 border-t border-gray-200">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">Why Do You Need an SSL Certificate?</h2>
            <p className="text-gray-600">SSL is no longer a luxury, it's a necessity for every website.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-blue-600" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">Data Encryption</h4>
              <p className="text-sm text-gray-600">Protects sensitive data like passwords and credit card details from hackers.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">Customer Trust</h4>
              <p className="text-sm text-gray-600">Displays a padlock icon in the browser, assuring customers your site is safe.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 text-center">
              <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-orange-600" />
              </div>
              <h4 className="font-bold text-gray-800 mb-2">SEO Boost</h4>
              <p className="text-sm text-gray-600">Google strongly prefers HTTPS websites and ranks them higher in search results.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SslPage;
