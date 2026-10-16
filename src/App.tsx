import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SettingsProvider } from './context/SettingsContext';
import { ConfirmProvider } from './context/ConfirmContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { WebsitePopup } from './components/WebsitePopup';
import { ChatWidget } from './components/ChatWidget';
import { TrackingScripts } from './components/TrackingScripts';
import { ReferralTracker } from './components/ReferralTracker';

import Hosting from './pages/Hosting';

const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const HostingDetails = lazy(() => import('./pages/HostingDetails').then(m => ({ default: m.HostingDetails })));
const HostingBillingDashboard = lazy(() => import('./pages/hosting-dashboard/HostingBillingDashboard').then(m => ({ default: m.HostingBillingDashboard })));
const MyServices = lazy(() => import('./pages/MyServices').then(m => ({ default: m.MyServices })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

const ServicesPage = lazy(() => import('./pages/hosting/ServicesPage'));
const PricingPage = lazy(() => import('./pages/hosting/PricingPage'));
const VpsPage = lazy(() => import('./pages/hosting/VpsPage'));
const DomainPage = lazy(() => import('./pages/hosting/DomainPage'));
const DomainSecurityPage = lazy(() => import('./pages/domain/DomainSecurityPage'));
const DomainSearchResults = lazy(() => import('./pages/hosting/DomainSearchResults'));
const BulkDomainSearch = lazy(() => import('./pages/hosting/BulkDomainSearch'));
const SslPage = lazy(() => import('./pages/hosting/SslPage'));
const BdDomainPage = lazy(() => import('./pages/hosting/BdDomainPage'));
const SupportPage = lazy(() => import('./pages/hosting/SupportPage'));
const TermsOfService = lazy(() => import('./pages/policies/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/policies/PrivacyPolicy'));
const NotFound = lazy(() => import('./pages/NotFound'));
const RefundPolicy = lazy(() => import('./pages/policies/RefundPolicy'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const ContactUs = lazy(() => import('./pages/ContactUs'));
const DomainTransferPage = lazy(() => import('./pages/hosting/DomainTransferPage'));
const PaymentSimulation = lazy(() => import('./pages/PaymentSimulation'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback'));
const PaymentReturn = lazy(() => import('./pages/PaymentReturn').then(m => ({ default: m.default || m.PaymentReturn })));

const HostingCart = lazy(() => import('./pages/hosting/HostingCart').then(m => ({ default: m.HostingCart })));
const HostingCheckout = lazy(() => import('./pages/hosting/HostingCheckout').then(m => ({ default: m.HostingCheckout })));
const DomainRenewal = lazy(() => import('./pages/hosting/DomainRenewal'));

import { PageLoader } from './components/Loading';

function LazyWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export default function App() {
  return (
    <HelmetProvider>
      <ConfirmProvider>
        <SettingsProvider>
          <AuthProvider>
            <CartProvider>
              <Router>
                <TrackingScripts />
                <ReferralTracker />
                <WebsitePopup />
                <ChatWidget />
                <Routes>
                  {/* --- AUTH & ACCOUNT --- */}
                  <Route path="/login" element={<LazyWrapper><Login /></LazyWrapper>} />
                  <Route path="/account/services" element={<ProtectedRoute><LazyWrapper><MyServices /></LazyWrapper></ProtectedRoute>} />
                  <Route path="/my-services" element={<Navigate to="/account/services" replace />} />
                  <Route path="/client-area" element={<Navigate to="/profile" replace />} />
                  <Route path="/clientarea" element={<Navigate to="/profile" replace />} />
                  <Route path="/profile" element={<ProtectedRoute><LazyWrapper><Profile /></LazyWrapper></ProtectedRoute>} />

                  {/* --- ADMIN DASHBOARD --- */}
                  <Route path="/admin" element={<ProtectedRoute adminOnly><LazyWrapper><HostingBillingDashboard /></LazyWrapper></ProtectedRoute>} />
                  <Route path="/admin/billing" element={<ProtectedRoute adminOnly><LazyWrapper><HostingBillingDashboard /></LazyWrapper></ProtectedRoute>} />
                  <Route path="/admin/*" element={<ProtectedRoute adminOnly><LazyWrapper><HostingBillingDashboard /></LazyWrapper></ProtectedRoute>} />

                  {/* --- ROOT & HOSTING PAGES --- */}
                  <Route path="/" element={<Hosting />} />
                  <Route path="/hosting" element={<Hosting />} />
                  <Route path="/hosting/:serviceId" element={<HostingDetails />} />
                  <Route path="/services" element={<LazyWrapper><ServicesPage /></LazyWrapper>} />
                  <Route path="/pricing" element={<LazyWrapper><PricingPage /></LazyWrapper>} />
                  <Route path="/vps" element={<LazyWrapper><VpsPage /></LazyWrapper>} />
                  <Route path="/cloud-vps" element={<Navigate to="/vps" replace />} />

                  {/* --- DOMAIN PAGES --- */}
                  <Route path="/domain" element={<LazyWrapper><DomainPage /></LazyWrapper>} />
                  <Route path="/domain/search" element={<LazyWrapper><DomainSearchResults /></LazyWrapper>} />
                  <Route path="/domain/bulk" element={<LazyWrapper><BulkDomainSearch /></LazyWrapper>} />
                  <Route path="/domain/bd" element={<LazyWrapper><BdDomainPage /></LazyWrapper>} />
                  <Route path="/domain/transfer" element={<LazyWrapper><DomainTransferPage /></LazyWrapper>} />
                  <Route path="/domain/security" element={<ProtectedRoute><LazyWrapper><DomainSecurityPage /></LazyWrapper></ProtectedRoute>} />
                  <Route path="/domain/lock" element={<Navigate to="/domain/security" replace />} />
                  <Route path="/domain-renewal" element={<LazyWrapper><DomainRenewal /></LazyWrapper>} />
                  <Route path="/ssl" element={<LazyWrapper><SslPage /></LazyWrapper>} />

                  {/* --- CART & CHECKOUT --- */}
                  <Route path="/cart" element={<Navigate to="/hosting/cart" replace />} />
                  <Route path="/checkout" element={<Navigate to="/hosting/checkout" replace />} />
                  <Route path="/hosting/cart" element={<LazyWrapper><HostingCart /></LazyWrapper>} />
                  <Route path="/hosting/checkout" element={<LazyWrapper><HostingCheckout /></LazyWrapper>} />

                  {/* --- PAYMENTS --- */}
                  <Route path="/payment/simulate" element={<LazyWrapper><PaymentSimulation /></LazyWrapper>} />
                  <Route path="/payment/callback" element={<LazyWrapper><PaymentCallback /></LazyWrapper>} />
                  <Route path="/payment/return" element={<LazyWrapper><PaymentReturn /></LazyWrapper>} />

                  {/* --- SUPPORT & INFO --- */}
                  <Route path="/support" element={<LazyWrapper><SupportPage /></LazyWrapper>} />
                  <Route path="/about" element={<LazyWrapper><AboutUs /></LazyWrapper>} />
                  <Route path="/about-us" element={<Navigate to="/about" replace />} />
                  <Route path="/contact" element={<LazyWrapper><ContactUs /></LazyWrapper>} />
                  <Route path="/contact-us" element={<Navigate to="/contact" replace />} />
                  <Route path="/terms" element={<LazyWrapper><TermsOfService /></LazyWrapper>} />
                  <Route path="/privacy" element={<LazyWrapper><PrivacyPolicy /></LazyWrapper>} />
                  <Route path="/refund-policy" element={<LazyWrapper><RefundPolicy /></LazyWrapper>} />

                  {/* --- 404 NOT FOUND --- */}
                  <Route path="*" element={<LazyWrapper><NotFound /></LazyWrapper>} />
                </Routes>
              </Router>
            </CartProvider>
          </AuthProvider>
        </SettingsProvider>
      </ConfirmProvider>
    </HelmetProvider>
  );
}
