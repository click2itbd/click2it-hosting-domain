import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Admin2FAChallenge } from './Admin2FAChallenge';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

// TOGGLE 2FA FOR ADMIN PANEL:
// Set to true to re-enable Two-Factor Authentication (TOTP) for Admin Panel
// Set to false to temporarily disable 2FA challenge
export const ENABLE_ADMIN_2FA = false;

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user, canAccessAdmin, is2faVerified, set2faVerified, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F2F4F8]">
        <div className="h-12 w-12 border-4 border-[#EF4444] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && !canAccessAdmin) {
    return <Navigate to="/" replace />;
  }

  // Enforce 2FA TOTP Verification for Admin Routes (Temporarily disabled via ENABLE_ADMIN_2FA toggle)
  if (ENABLE_ADMIN_2FA && adminOnly && canAccessAdmin && !is2faVerified) {
    return (
      <Admin2FAChallenge
        onSuccess={() => set2faVerified(true)}
      />
    );
  }

  return <>{children}</>;
};
