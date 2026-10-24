import { getAdminDb } from '../firebase/admin.js';
import { fulfillOrder, FulfillmentResult } from './fulfillment.js';

export type PaymentSource = 'manual' | 'bkash' | 'sslcommerz' | 'stripe' | string;

export interface ConfirmPaymentInput {
  orderId: string;
  source: PaymentSource;
  /** Admin uid for manual verification, or 'system:<gateway>' for webhooks */
  actor: string;
  transactionId?: string;
  /** Amount actually paid according to the gateway (verified against order total) */
  paidAmount?: number;
}

export interface ConfirmPaymentResult {
  success: boolean;
  alreadyVerified?: boolean;
  error?: string;
  fulfillment?: FulfillmentResult;
}

/**
 * Single entry point for "payment is confirmed".
 * Manual admin approval and future payment-gateway webhooks must BOTH call this,
 * so that registrar (Openprovider) / cPanel fulfillment behaves identically.
 * Idempotent: safe to call repeatedly (webhook retries, double clicks).
 */
export async function confirmPaymentAndFulfill(input: ConfirmPaymentInput): Promise<ConfirmPaymentResult> {
  const db = getAdminDb();
  const orderRef = db.collection('orders').doc(input.orderId);
  const now = new Date().toISOString();

  const tx = await db.runTransaction(async (t: FirebaseFirestore.Transaction) => {
    const snap: any = await t.get(orderRef as any);
    if (!snap.exists) return { ok: false as const, error: 'Order not found' };
    const o = snap.data() || {};

    if (input.paidAmount !== undefined && Math.abs(Number(input.paidAmount) - Number(o.total || 0)) > 0.01) {
      return { ok: false as const, error: 'Paid amount does not match order total' };
    }
    if (o.paymentStatus === 'verified') return { ok: true as const, already: true };

    t.update(orderRef, {
      paymentStatus: 'verified',
      paymentVerificationStatus: 'verified',
      providerStatus: 'processing',
      paymentSource: input.source,
      paymentVerifiedBy: input.actor,
      paymentVerifiedAt: now,
      ...(input.transactionId ? { transactionId: input.transactionId } : {}),
      updatedAt: now,
    });
    return { ok: true as const, already: false };
  });

  if (!tx.ok) return { success: false, error: tx.error };

  await db.collection('paymentAuditLog').add({
    orderId: input.orderId,
    action: tx.already ? 'payment_confirm_replayed' : 'payment_verified',
    source: input.source,
    actor: input.actor,
    transactionId: input.transactionId || null,
    timestamp: now,
  }).catch(() => {});

  // fulfillOrder has its own atomic lock, so replays cannot double-register a domain.
  const fulfillment = await fulfillOrder(input.orderId, input.actor);
  return { success: true, alreadyVerified: tx.already, fulfillment };
}
