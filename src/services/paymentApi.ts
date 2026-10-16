/**
 * Payment Service
 * 
 * This file handles manual payment submission for the release.
 * Automatic bKash/SSLCommerz/Nagad initiation is NOT required for this release.
 * Customers submit payment information manually via the backend API.
 */

import { auth } from '../firebase';
import { resolveApiBaseUrl } from './apiClient';

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const cleanBase = resolveApiBaseUrl();
  let cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (cleanBase.endsWith('/api') && cleanPath.startsWith('/api/')) {
    cleanPath = cleanPath.slice(4);
  }

  const url = `${cleanBase}${cleanPath}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (!headers['Authorization'] && typeof window !== 'undefined' && auth.currentUser) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    } catch {
      // ignore
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface PaymentInitiationResult {
  success: boolean;
  paymentUrl?: string;
  paymentId?: string;
  errorMessage?: string;
}

export const submitManualPayment = async (
  orderId: string,
  transactionId: string,
  token: string
): Promise<PaymentInitiationResult> => {
  try {
    const response = await apiRequest<{ success: boolean; message: string; emailSent: boolean }>(
      `/api/orders/${orderId}/payment/manual-bkash`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ transactionId }),
      }
    );
    
    if (response.success) {
      return {
        success: true,
        paymentId: orderId,
      };
    } else {
      return {
        success: false,
        errorMessage: response.message || 'Failed to submit payment.',
      };
    }
  } catch (error: any) {
    console.error('Manual Payment Error:', error);
    return { success: false, errorMessage: error.message || 'Failed to submit payment.' };
  }
};

export const initiateBkashPayment = async (...args: any[]): Promise<PaymentInitiationResult> => {
  return {
    success: false,
    errorMessage: 'Automatic bKash payment is not configured. Please use manual payment.',
  };
};

export const initiateSSLCommerzPayment = async (...args: any[]): Promise<PaymentInitiationResult> => {
  return {
    success: false,
    errorMessage: 'SSLCommerz payment is not configured. Please use manual payment.',
  };
};

export const initiateNagadPayment = async (...args: any[]): Promise<PaymentInitiationResult> => {
  return {
    success: false,
    errorMessage: 'Nagad payment is not configured. Please use manual payment.',
  };
};
