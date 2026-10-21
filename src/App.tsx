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
import { Login } from './pages/Login';
import { ResetPassword } from './pages/ResetPassword';

function lazyWithRetry<T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    const pageHasBeenReloaded = sessionStorage.getItem('chunk_retry_reload');
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const module = await factory();
        sessionStorage.removeItem('chunk_retry_reload');
        return module;
      } catch (err) {
        lastError = err;
        await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      }
    }
    if (!pageHasBeenReloaded) {
      sessionStorage.setItem('chunk_retry_reload', 'true');
      window.location.reload();
      return new Promise<{ default: T }>(() => {});
    }
    throw lastError;
  });
}

const Hosting = lazyWithRetry(() => import('./pages/Hosting'));
const HostingDetails = lazyWithRetry(() => import('./pages/HostingDetails').then(m => ({ default: m.HostingDetails })));
const HostingBillingDashboard = lazyWithRetry(() => import('./pages/hosting-dashboard/HostingBillingDashboard').then(m => ({ default: m.HostingBillingDashboard })));
const MyServices = lazyWithRetry(() => import('./pages/MyServices').then(m => ({ default: m.MyServices })));
const Profile = lazyWithRetry(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

const ServicesPage = lazyWithRetry(() => import('./pages/hosting/ServicesPage'));
const PricingPage = lazyWithRetry(() => import('./pages/hosting/PricingPage'));
const VpsPage = lazyWithRetry(() => import('./pages/hosting/VpsPage'));
const DomainPage = lazyWithRetry(() => import('./pages/hosting/DomainPage'));
const DomainSecurityPage = lazyWithRetry(() => import('./pages/domain/DomainSecurityPage'));
const DomainSearchResults = lazyWithRetry(() => import('./pages/hosting/DomainSearchResults'));
const BulkDomainSearch = lazyWithRetry(() => import('./pages/hosting/BulkDomainSearch'));
const SslPage = lazyWithRetry(() => import('./pages/hosting/SslPage'));
const BdDomainPage = lazyWithRetry(() => import('./pages/hosting/BdDomainPage'));
const SupportPage = lazyWithRetry(() => import('./pages/hosting/SupportPage'));
const TermsOfService = lazyWithRetry(() => import('./pages/policies/TermsOfService'));
const PrivacyPolicy = lazyWithRetry(() => import('./pages/policies/PrivacyPolicy'));
const NotFound = lazyWithRetry(() => import('./pages/NotFound'));
const RefundPolicy = lazyWithRetry(() => import('./pages/policies/RefundPolicy'));
const AboutUs = lazyWithRetry(() => import('./pages/AboutUs'));
const ContactUs = lazyWithRetry(() => import('./pages/ContactUs'));
const DomainTransferPage = lazyWithRetry(() => import('./pages/hosting/DomainTransferPage'));
const PaymentSimulation = lazyWithRetry(() => import('./pages/PaymentSimulation'));
const PaymentCallback = lazyWithRetry(() => import('./pages/PaymentCallback'));
const PaymentReturn = lazyWithRetry(() => import('./pages/PaymentReturn').then(m => ({ default: m.default || m.PaymentReturn })));

const HostingCart = lazyWithRetry(() => import('./pages/hosting/HostingCart').then(m => ({ default: m.HostingCart })));
const HostingCheckout = lazyWithRetry(() => import('./pages/hosting/HostingCheckout').then(m => ({ default: m.HostingCheckout })));
const DomainRenewal = lazyWithRetry(() => import('./pages/hosting/DomainRenewal'));
const StatusPage = lazyWithRetry(() => import('./pages/StatusPage').then(m => ({ default: m.StatusPage })));

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
                  <Route path="/register" element={<LazyWrapper><Login /></LazyWrapper>} />
                  <Route path="/signup" element={<LazyWrapper><Login /></LazyWrapper>} />
                  <Route path="/forgot-password" element={<LazyWrapper><Login /></LazyWrapper>} />
                  <Route path="/reset-password" element={<LazyWrapper><ResetPassword /></LazyWrapper>} />
                  <Route path="/account/services" element={<ProtectedRoute><LazyWrapper><MyServices /></LazyWrapper></ProtectedRoute>} />
                  <Route path="/my-services" element={<Navigate to="/account/services" replace />} />
                  <Route path="/client-area" element={<Navigate to="/profile" replace />} />
                  <Route path="/clientarea" element={<Navigate to="/profile" replace />} />
                  <Route path="/profile" element={<ProtectedRoute><LazyWrapper><Profile /></LazyWrapper></ProtectedRoute>} />

                  {/* --- ADMIN DASHBOARD & CRM --- */}
                  <Route path="/admin" element={<ProtectedRoute adminOnly><LazyWrapper><HostingBillingDashboard /></LazyWrapper></ProtectedRoute>} />
                  <Route path="/admin/billing" element={<ProtectedRoute adminOnly><LazyWrapper><HostingBillingDashboard /></LazyWrapper></ProtectedRoute>} />
                  <Route path="/admin/*" element={<ProtectedRoute adminOnly><LazyWrapper><HostingBillingDashboard /></LazyWrapper></ProtectedRoute>} />
                  <Route path="/whatsapp-crm" element={<Navigate to="/admin?tab=whatsapp-crm" replace />} />
                  <Route path="/meta-campaigns" element={<Navigate to="/admin?tab=meta-campaigns" replace />} />
                  <Route path="/campaigns" element={<Navigate to="/admin?tab=meta-campaigns" replace />} />

                  {/* --- ROOT & HOSTING PAGES --- */}
                  <Route path="/" element={<LazyWrapper><Hosting /></LazyWrapper>} />
                  <Route path="/hosting" element={<LazyWrapper><Hosting /></LazyWrapper>} />
                  <Route path="/hosting/:serviceId" element={<LazyWrapper><HostingDetails /></LazyWrapper>} />
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
                  <Route path="/status" element={<LazyWrapper><StatusPage /></LazyWrapper>} />
                  <Route path="/service-status" element={<Navigate to="/status" replace />} />
                  <Route path="/server-status" element={<Navigate to="/status" replace />} />
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
