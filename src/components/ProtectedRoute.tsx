import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Admin2FAChallenge } from './Admin2FAChallenge';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

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

  // Enforce 2FA TOTP Verification for Admin Routes
  if (adminOnly && canAccessAdmin && !is2faVerified) {
    return (
      <Admin2FAChallenge
        onSuccess={() => set2faVerified(true)}
      />
    );
  }

  return <>{children}</>;
};
