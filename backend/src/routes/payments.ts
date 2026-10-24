import { Router, Response } from 'express';
import crypto from 'crypto';
import { getAdminDb, isUserAdmin } from '../firebase/admin.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { extractClientIp } from '../services/securityAudit.js';
import { queueEmail, notifyAdmins } from '../services/email.js';
import { confirmPaymentAndFulfill } from '../services/paymentConfirmation.js';
import { processAffiliateCommissionForOrder } from '../services/affiliateFraud.js';
import {
  getEpsConfig,
  saveEpsConfig,
  maskEpsConfig,
  isEpsConfigured,
  testEpsConnection,
  initializeEpsPayment,
  verifyEpsPayment,
} from '../services/epsGateway.js';

const paymentsRouter = Router();

const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || 'https://click2it.bd';

async function requireAdmin(req: any, res: Response): Promise<boolean> {
  const ok = await isUserAdmin(req.user?.uid, req.user?.email, req.user).catch(() => false);
  if (!ok) res.status(403).json({ success: false, error: 'Admin access required' });
  return ok;
}

/** Public: which online payment methods are available at checkout. */
paymentsRouter.get('/methods', async (_req, res: Response) => {
  try {
    const cfg = await getEpsConfig();
    return res.json({
      success: true,
      data: { eps: { enabled: cfg.enabled && isEpsConfigured(cfg), mode: cfg.mode } },
    });
  } catch {
    return res.json({ success: true, data: { eps: { enabled: false } } });
  }
});

/** Admin: read EPS config (secrets are never returned). */
paymentsRouter.get('/admin/eps-config', requireFirebaseAuth, async (req: any, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    return res.json({ success: true, data: maskEpsConfig(await getEpsConfig()) });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: 'Failed to load EPS configuration' });
  }
});

/** Admin: save EPS config. */
paymentsRouter.post('/admin/eps-config', requireFirebaseAuth, async (req: any, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  try {
    await saveEpsConfig(req.body || {});
    return res.json({ success: true, message: 'EPS configuration saved successfully', data: maskEpsConfig(await getEpsConfig()) });
  } catch (e: any) {
    console.error('[EPS] save config failed:', e);
    return res.status(500).json({ success: false, error: 'Failed to save EPS configuration' });
  }
});

/** Admin: test EPS credentials (GetToken). */
paymentsRouter.post('/admin/eps-test', requireFirebaseAuth, async (req: any, res: Response) => {
  if (!(await requireAdmin(req, res))) return;
  const cfg = await getEpsConfig();
  const result = await testEpsConnection(cfg);
  return res.status(result.success ? 200 : 400).json(result);
});

/** Customer: start an EPS payment for their own unpaid order. */
paymentsRouter.post('/eps/initiate', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { orderId } = req.body || {};
    if (!uid || !orderId || typeof orderId !== 'string') {
      return res.status(400).json({ success: false, error: 'orderId is required' });
    }

    const cfg = await getEpsConfig();
    if (!cfg.enabled || !isEpsConfigured(cfg)) {
      return res.status(400).json({ success: false, error: 'Online payment (EPS) is not available right now.' });
    }

    const db = getAdminDb();
    const orderRef = db.collection('orders').doc(orderId);
    const snap: any = await orderRef.get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    const order = snap.data() || {};

    if (order.userId !== uid) return res.status(403).json({ success: false, error: 'Not your order' });
    if (order.paymentStatus === 'verified') {
      return res.status(400).json({ success: false, error: 'This order is already paid.' });
    }
    const amount = Number(order.total) || 0;
    if (amount <= 0) return res.status(400).json({ success: false, error: 'Invalid order amount' });

    const merchantTransactionId = `C2I${Date.now().toString(36).toUpperCase()}${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const items = Array.isArray(order.items) ? order.items : [];
    const frontendUrl = cfg.frontendUrl || DEFAULT_FRONTEND_URL;

    const init = await initializeEpsPayment(cfg, {
      merchantTransactionId,
      orderId,
      amount,
      customerName: order.customerName || 'Customer',
      customerEmail: order.customerEmail || req.user?.email || '',
      customerPhone: order.customerPhone || '01700000000',
      customerAddress: order.shippingAddress,
      productName: items.map((i: any) => i.name || i.domain).filter(Boolean).join(', ') || `Order ${order.documentNumber || orderId}`,
      itemCount: items.length || 1,
      ipAddress: extractClientIp(req),
      frontendUrl,
    });

    const now = new Date().toISOString();
    const prev: string[] = Array.isArray(order.epsTxnIds) ? order.epsTxnIds : [];
    await orderRef.update({
      paymentMethod: 'eps',
      paymentStatus: order.paymentStatus === 'submitted' ? 'submitted' : 'pending',
      epsTxnIds: [...prev, merchantTransactionId].slice(-10),
      epsInitiatedAt: now,
      updatedAt: now,
    });

    return res.json({ success: true, redirectUrl: init.redirectUrl });
  } catch (e: any) {
    console.error('[EPS] initiate failed:', e);
    return res.status(502).json({ success: false, error: e?.message || 'Failed to start EPS payment' });
  }
});

/**
 * Verify an order's EPS payment server-side and, if paid, confirm + fulfill it.
 * Used by the customer return page and by the admin "Verify with EPS" action.
 */
async function verifyOrderWithEps(orderId: string, actor: string) {
  const db = getAdminDb();
  const orderRef = db.collection('orders').doc(orderId);
  const snap: any = await orderRef.get();
  if (!snap.exists) return { status: 404, body: { success: false, error: 'Order not found' } };
  const order = snap.data() || {};

  if (order.paymentStatus === 'verified') {
    return { status: 200, body: { success: true, paid: true, alreadyVerified: true } };
  }

  const ids: string[] = Array.isArray(order.epsTxnIds) ? [...order.epsTxnIds].reverse() : [];
  if (!ids.length) return { status: 400, body: { success: false, error: 'No EPS payment attempt found for this order' } };

  const cfg = await getEpsConfig();
  if (!isEpsConfigured(cfg)) return { status: 400, body: { success: false, error: 'EPS is not configured' } };

  let lastStatus = 'Unknown';
  for (const mtxn of ids) {
    const v = await verifyEpsPayment(cfg, mtxn);
    lastStatus = v.status;
    if (!v.paid) continue;

    const result = await confirmPaymentAndFulfill({
      orderId,
      source: 'eps',
      actor,
      transactionId: v.epsTransactionId || mtxn,
      paidAmount: v.amount, // must match order.total, otherwise rejected
    });

    if (!result.success) {
      console.error(`[EPS] Paid but confirmation rejected for ${orderId}:`, result.error);
      notifyAdmins({
        subject: `⚠️ EPS payment needs review - Order ${order.documentNumber || orderId}`,
        html: `<p>EPS reports a successful payment for order <strong>${orderId}</strong> (txn ${mtxn}) but it could not be auto-confirmed: <strong>${result.error}</strong>. Please review manually.</p>`,
        orderId,
        category: 'payment',
      });
      return { status: 409, body: { success: false, paid: true, error: 'Payment received but needs manual review. Our team has been notified.' } };
    }

    if (!result.alreadyVerified) {
      processAffiliateCommissionForOrder({ id: orderId, ...order, total: Number(order.total) || 0 }, order.clientIp || '').catch((err: any) =>
        console.warn('[EPS] Affiliate commission error:', err)
      );
      notifyAdmins({
        subject: `✅ EPS Payment Received - ${order.documentNumber || orderId} (৳${order.total})`,
        html: `<p>EPS payment confirmed for <strong>${order.documentNumber || orderId}</strong> from ${order.customerName || ''} (${order.customerEmail || ''}). Amount: ৳${order.total}. EPS Txn: ${v.epsTransactionId || mtxn}. Fulfillment: ${result.fulfillment?.status || 'n/a'}.</p>`,
        orderId,
        category: 'payment',
      });
      if (order.customerEmail) {
        queueEmail({
          to: order.customerEmail,
          subject: `Payment Confirmed - ${order.documentNumber || '#' + orderId.slice(0, 8)}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;"><h2 style="color:#16a34a;">Payment Confirmed</h2><p>Dear ${order.customerName || 'Customer'},</p><p>We received your payment of <strong>৳${order.total}</strong> for order <strong>${order.documentNumber || '#' + orderId.slice(0, 8)}</strong>. Your services are now being activated.</p><p>Thank you for choosing Click2IT!</p></div>`,
          orderId,
          customerEmail: order.customerEmail,
          category: 'payment',
        });
      }
    }

    return {
      status: 200,
      body: { success: true, paid: true, alreadyVerified: result.alreadyVerified, fulfillmentStatus: result.fulfillment?.status },
    };
  }

  return { status: 200, body: { success: true, paid: false, status: lastStatus } };
}

/** Customer return page calls this after redirect from EPS. */
paymentsRouter.post('/eps/verify', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { orderId } = req.body || {};
    if (!orderId || typeof orderId !== 'string') return res.status(400).json({ success: false, error: 'orderId is required' });

    const snap: any = await getAdminDb().collection('orders').doc(orderId).get();
    if (!snap.exists) return res.status(404).json({ success: false, error: 'Order not found' });
    const isOwner = snap.data()?.userId === uid;
    if (!isOwner && !(await isUserAdmin(uid, req.user?.email, req.user).catch(() => false))) {
      return res.status(403).json({ success: false, error: 'Not authorized' });
    }

    const r = await verifyOrderWithEps(orderId, isOwner ? `system:eps:${uid}` : `admin:${uid}`);
    return res.status(r.status).json(r.body);
  } catch (e: any) {
    console.error('[EPS] verify failed:', e);
    return res.status(502).json({ success: false, error: e?.message || 'Could not verify payment with EPS' });
  }
});

export default paymentsRouter;
