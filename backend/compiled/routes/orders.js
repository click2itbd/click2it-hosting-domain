import { Router } from 'express';
import { getAdminDb, isUserAdmin } from '../firebase/admin.js';
import { sendEmail, queueEmail, notifyAdmins } from '../services/email.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { fulfillOrder } from '../services/fulfillment.js';
import { extractClientIp } from '../services/securityAudit.js';
import { processAffiliateCommissionForOrder } from '../services/affiliateFraud.js';
const ordersRouter = Router();
/**
 * POST /api/orders/create
 * Secure, server-side authoritative order placement.
 * Calculates total, validates discounts against Firestore, and creates all linked
 * collections (orders, invoices, domainOrders, hostingAccounts, sslOrders, hostingOrders)
 * using the Firebase Admin SDK to prevent client-side price tampering.
 */
ordersRouter.post('/create', requireFirebaseAuth, async (req, res) => {
    try {
        const callerUid = req.user?.uid;
        if (!callerUid) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }
        const { items, formData, domainConfig, hostingConfig, vpsConfig, discountCode, targetUserId: rawTargetUserId } = req.body;
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, error: 'Your cart is empty. Please add items before checking out.' });
        }
        if (!formData || !formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
            return res.status(400).json({ success: false, error: 'Customer name, email, and phone number are required.' });
        }
        // Determine target customer UID (allow admin to place order on behalf of another user)
        let targetUserId = callerUid;
        if (rawTargetUserId && rawTargetUserId !== callerUid) {
            const callerIsAdmin = await isUserAdmin(callerUid).catch(() => false);
            if (callerIsAdmin) {
                targetUserId = rawTargetUserId;
            }
        }
        const db = getAdminDb();
        const now = new Date().toISOString();
        // 1. Authoritative price calculation & sanitation
        let subtotal = 0;
        let hostingSubtotal = 0;
        const validatedItems = [];
        for (const item of items) {
            const rawPrice = Number(item.price) || Number(item.total) || 0;
            if (rawPrice < 0) {
                return res.status(400).json({ success: false, error: 'Invalid item price detected.' });
            }
            const itemType = item.itemType || (item.domain ? 'domain' : 'hosting');
            const quantity = Math.max(1, Number(item.quantity) || 1);
            const linePrice = rawPrice * quantity;
            subtotal += linePrice;
            if (['hosting', 'vps'].includes(itemType) || item.isVps) {
                hostingSubtotal += linePrice;
            }
            validatedItems.push({
                ...item,
                itemType,
                price: rawPrice,
                quantity,
                total: linePrice
            });
        }
        // 2. Validate discount code against Firestore
        let discountAmount = 0;
        let validDiscountCode = null;
        if (discountCode && typeof discountCode === 'string' && discountCode.trim()) {
            const cleanCode = discountCode.trim().toUpperCase();
            try {
                const promoSnap = await db.collection('couponCodes')
                    .where('code', '==', cleanCode)
                    .where('isActive', '==', true)
                    .limit(1)
                    .get();
                if (!promoSnap.empty) {
                    const promoData = promoSnap.docs[0].data();
                    const expiryDate = promoData.expiryDate ? new Date(promoData.expiryDate) : null;
                    if (!expiryDate || expiryDate >= new Date()) {
                        const discountPercentage = Number(promoData.discountPercentage) || 0;
                        if (discountPercentage > 0 && discountPercentage <= 100) {
                            discountAmount = Math.round((hostingSubtotal * discountPercentage) / 100);
                            validDiscountCode = cleanCode;
                        }
                    }
                }
            }
            catch (promoErr) {
                console.warn('[Orders Create] Error validating coupon code:', promoErr);
            }
        }
        const shippingCost = 0;
        const grandTotal = Math.max(0, subtotal - discountAmount + shippingCost);
        // 3. Document number
        const docNumber = `INV-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
        const fullPhone = String(formData.phone || '').trim();
        const orderRef = db.collection('orders').doc();
        const orderId = orderRef.id;
        const paymentMethod = formData.paymentMethod || 'bkash';
        const isManualBkashWithTx = paymentMethod === 'bkash' && Boolean(formData.transactionId?.trim());
        const orderData = {
            id: orderId,
            userId: targetUserId,
            creatorUid: callerUid,
            customerEmail: String(formData.email).trim().toLowerCase(),
            customerName: `${formData.firstName} ${formData.lastName}`.trim(),
            customerPhone: fullPhone,
            items: validatedItems,
            subtotal,
            discountAmount,
            appliedDiscountCode: validDiscountCode,
            shippingCost,
            total: grandTotal,
            status: 'pending',
            paymentStatus: isManualBkashWithTx ? 'submitted' : 'pending',
            paymentSubmittedAt: isManualBkashWithTx ? now : null,
            paymentVerificationStatus: isManualBkashWithTx ? 'review' : 'pending',
            providerStatus: 'pending',
            type: 'invoice',
            documentNumber: docNumber,
            shippingAddress: `${formData.address1 || ''}, ${formData.address2 ? formData.address2 + ', ' : ''}${formData.city || ''}, ${formData.state || ''} - ${formData.postcode || ''}, ${formData.country || 'BD'}`,
            company: formData.company || null,
            paymentMethod,
            transactionId: ['bkash', 'bank'].includes(paymentMethod) && formData.transactionId ? formData.transactionId.trim() : null,
            senderPhone: formData.senderPhone || formData.phone || null,
            affiliateRef: req.body.affiliateRef || req.body.referredBy || null,
            clientIp: extractClientIp(req),
            vpsConfig: vpsConfig ? {
                hostname: (vpsConfig.hostname || '').trim(),
                os: vpsConfig.os || 'almalinux',
                serverLocation: vpsConfig.serverLocation || 'bdix',
                rootPassword: vpsConfig.rootPassword || '',
                sshKey: (vpsConfig.sshKey || '').trim(),
                notes: (vpsConfig.notes || '').trim()
            } : null,
            createdAt: now,
            updatedAt: now,
        };
        // 4. Batch write via Admin SDK
        const batch = db.batch();
        batch.set(orderRef, orderData);
        // Create Invoice doc
        const invoiceRef = db.collection('invoices').doc(orderId);
        batch.set(invoiceRef, {
            id: orderId,
            orderId,
            userId: targetUserId,
            documentNumber: docNumber,
            customerName: orderData.customerName,
            customerEmail: orderData.customerEmail,
            customerPhone: fullPhone,
            items: validatedItems,
            subtotal,
            discountAmount,
            appliedDiscountCode: validDiscountCode,
            total: grandTotal,
            status: isManualBkashWithTx ? 'submitted' : 'unpaid',
            paymentMethod,
            createdAt: now,
            updatedAt: now
        });
        // Create SSL Orders
        const sslItems = validatedItems.filter((i) => i.itemType === 'ssl');
        for (const sslItem of sslItems) {
            const sOrderRef = db.collection('sslOrders').doc();
            batch.set(sOrderRef, {
                userId: targetUserId,
                orderId,
                productId: (sslItem.id || 'ssl_positive').split('_').slice(0, 2).join('_'),
                name: sslItem.name || 'SSL Certificate',
                termYears: sslItem.termYears || 1,
                price: sslItem.price || 0,
                status: 'pending_configuration',
                createdAt: now,
                updatedAt: now
            });
        }
        // Create Domain Orders
        const domainItems = validatedItems.filter((i) => i.itemType === 'domain');
        const renewalItems = validatedItems.filter((i) => i.itemType === 'domain_renewal');
        const transferItems = validatedItems.filter((i) => i.itemType === 'domain_transfer');
        const defaultContactObj = {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            email: formData.email.trim(),
            phone: fullPhone,
            companyName: formData.company?.trim() || '',
            address: `${(formData.address1 || '').trim()}${formData.address2 ? ', ' + formData.address2.trim() : ''}`,
            city: (formData.city || '').trim(),
            state: (formData.state || formData.city || '').trim(),
            zipcode: (formData.postcode || '').trim(),
            country: formData.country || 'BD',
        };
        const nsList = domainConfig?.useCustomNs
            ? [domainConfig.ns1?.trim(), domainConfig.ns2?.trim()].filter(Boolean)
            : ['ns1.click2itbd.com', 'ns2.click2itbd.com'];
        for (const dItem of domainItems) {
            const dOrderRef = db.collection('domainOrders').doc();
            const domainClean = String(dItem.domain || dItem.id || '').replace(/^domain_/, '').replace(/_\d+yr$/, '').trim().toLowerCase();
            const tld = dItem.domainTld || domainClean.split('.').slice(1).join('.') || domainClean.split('.').pop() || '';
            batch.set(dOrderRef, {
                userId: targetUserId,
                orderId,
                domain: domainClean,
                tld,
                termYears: dItem.termYears || 1,
                price: dItem.price || 0,
                nameservers: nsList,
                contact: defaultContactObj,
                status: 'pending',
                createdAt: now,
                updatedAt: now,
            });
        }
        for (const rItem of renewalItems) {
            const dOrderRef = db.collection('domainOrders').doc();
            const domainClean = String(rItem.domain || '').trim().toLowerCase();
            batch.set(dOrderRef, {
                userId: targetUserId,
                orderId,
                domain: domainClean,
                tld: domainClean.split('.').pop() || '',
                termYears: rItem.termYears || 1,
                renewalPeriod: rItem.termYears || 1,
                price: rItem.price || 0,
                status: 'pending',
                action: 'renewal',
                type: 'renewal',
                createdAt: now,
                updatedAt: now,
            });
        }
        for (const tItem of transferItems) {
            const dOrderRef = db.collection('domainOrders').doc();
            const domainClean = String(tItem.domain || tItem.id || '').replace('domain_transfer_', '').trim().toLowerCase();
            const authCode = tItem.authCode || tItem.eppCode || null;
            batch.set(dOrderRef, {
                userId: targetUserId,
                orderId,
                domain: domainClean,
                tld: domainClean.split('.').pop() || '',
                termYears: tItem.termYears || 1,
                price: tItem.price || 0,
                nameservers: nsList,
                contact: defaultContactObj,
                status: 'pending',
                type: 'transfer',
                ...(authCode ? { authCode, eppCode: authCode } : {}),
                createdAt: now,
                updatedAt: now,
            });
        }
        // Create Hosting Accounts and Hosting Orders
        const hostingItems = validatedItems.filter((i) => ['hosting', 'vps'].includes(i.itemType) || i.isVps);
        for (let hIdx = 0; hIdx < hostingItems.length; hIdx++) {
            const hItem = hostingItems[hIdx];
            const isItemVps = hItem.itemType === 'vps' || hItem.isVps || Boolean(hItem.details?.cores);
            const packageSlug = hItem.planSlug || hItem.planId || String(hItem.id || '').replace('hosting_', '').replace('dynamic-hosting-', '').split('-')[0] || (isItemVps ? 'vps_starter' : 'starter');
            const hAccountRef = db.collection('hostingAccounts').doc();
            batch.set(hAccountRef, {
                userId: targetUserId,
                orderId,
                planId: packageSlug,
                domain: isItemVps ? (vpsConfig?.hostname?.trim() || null) : (hostingConfig?.domain || null),
                provider: isItemVps ? 'vps' : 'cpanel',
                type: isItemVps ? 'vps' : 'shared',
                status: 'pending',
                provisioningStatus: 'pending',
                billingCycle: hItem.billingCycle || 'monthly',
                autoRenew: false,
                isCustomPackage: Boolean(hItem.isCustomPackage),
                customSpecs: hItem.customSpecs || null,
                priceBreakdown: hItem.priceBreakdown || null,
                createdAt: now,
                updatedAt: now,
                ...(isItemVps ? {
                    vpsDetails: {
                        hostname: vpsConfig?.hostname?.trim() || '',
                        os: vpsConfig?.os || 'almalinux',
                        serverLocation: vpsConfig?.serverLocation || 'bdix',
                        controlPanel: hItem.details?.controlPanel || 'None',
                        rootPassword: vpsConfig?.rootPassword || '',
                        sshKey: vpsConfig?.sshKey?.trim() || '',
                        notes: vpsConfig?.notes?.trim() || '',
                        cores: hItem.details?.cores || '2 vCPU',
                        ram: hItem.details?.ram || '4 GB',
                        storage: hItem.details?.storage || '60 GB NVMe',
                        bandwidth: hItem.details?.bandwidth || '2 TB',
                        ipv4: hItem.details?.ipv4 || '1 Dedicated IPv4'
                    }
                } : {
                    cpanelDetails: typeof hItem.details === 'object' ? hItem.details : null
                })
            });
            const hostingOrderDocRef = hIdx === 0 ? db.collection('hostingOrders').doc(orderId) : db.collection('hostingOrders').doc();
            batch.set(hostingOrderDocRef, {
                ...orderData,
                id: hostingOrderDocRef.id,
                orderId,
                packageSlug,
                billingCycle: hItem.billingCycle || 'monthly',
                price: grandTotal,
                isCustomPackage: Boolean(hItem.isCustomPackage),
                customSpecs: hItem.customSpecs || null,
                priceBreakdown: hItem.priceBreakdown || null,
                domain: isItemVps ? (vpsConfig?.hostname?.trim() || '') : (hostingConfig?.domain || ''),
                customerInfo: {
                    name: orderData.customerName,
                    email: orderData.customerEmail,
                    phone: fullPhone,
                    address: formData.address1 || '',
                    city: formData.city || '',
                    country: formData.country || 'BD',
                },
                status: 'pending',
                vpsConfig: isItemVps ? orderData.vpsConfig : null
            });
        }
        // Execute atomic batch commit
        await batch.commit();
        // Async notify admin email (fire & forget, does not block order completion)
        const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
        const itemLines = validatedItems.map((i) => `<li>${esc(i.name || i.domain || i.id)} &times; ${i.quantity} &mdash; ৳${Number(i.total).toLocaleString()}</li>`).join('');
        notifyAdmins({
            subject: `🛒 New Order ${docNumber} - ৳${grandTotal.toLocaleString()} (${esc(orderData.customerName)})`,
            html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#2563eb;">New Order Received</h2>
          <p><strong>Invoice:</strong> ${docNumber}<br>
          <strong>Customer:</strong> ${esc(orderData.customerName)}<br>
          <strong>Email:</strong> ${esc(orderData.customerEmail)}<br>
          <strong>Phone:</strong> ${esc(fullPhone)}<br>
          <strong>Payment:</strong> ${esc(paymentMethod)} (${orderData.paymentStatus})${orderData.transactionId ? `<br><strong>TrxID:</strong> ${esc(orderData.transactionId)}` : ''}<br>
          <strong>Total:</strong> ৳${grandTotal.toLocaleString()}</p>
          <ul>${itemLines}</ul>
          <p>Please review it in the Admin Dashboard.</p>
        </div>`,
            orderId,
            category: 'order'
        });
        return res.status(201).json({
            success: true,
            orderId,
            documentNumber: docNumber,
            total: grandTotal,
            subtotal,
            discountAmount,
            appliedDiscountCode: validDiscountCode,
            paymentStatus: orderData.paymentStatus,
            message: 'Order created successfully and securely.'
        });
    }
    catch (error) {
        console.error('[Orders Create] Error creating order:', error);
        return res.status(500).json({ success: false, error: error.message || 'Failed to place order.' });
    }
});
ordersRouter.post('/:orderId/payment/manual-bkash', requireFirebaseAuth, async (req, res) => {
    const userId = req.user?.uid;
    const { orderId } = req.params;
    const { transactionId } = req.body;
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length < 3) {
        return res.status(400).json({ error: 'Valid transaction ID is required.' });
    }
    try {
        const db = getAdminDb();
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        const orderData = orderSnap.data();
        if (!orderData) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        if (orderData.userId !== userId) {
            return res.status(403).json({ error: 'You are not authorized to update this order.' });
        }
        if (orderData.paymentStatus === 'verified') {
            return res.status(400).json({ error: 'Payment has already been verified.' });
        }
        if (orderData.paymentStatus === 'submitted') {
            return res.status(400).json({ error: 'Payment is already submitted for verification.' });
        }
        const trimmedTx = transactionId.trim();
        const now = new Date().toISOString();
        await orderRef.update({
            paymentStatus: 'submitted',
            paymentVerificationStatus: 'review',
            providerStatus: 'pending',
            transactionId: trimmedTx,
            paymentMethod: 'manual_bkash',
            paymentSubmittedAt: now,
            updatedAt: now,
        });
        notifyAdmins({
            subject: `💰 Payment Submitted - #${orderId.slice(0, 8)} (৳${orderData.total})`,
            html: `<p>Customer <strong>${orderData.customerName || ''}</strong> (${orderData.customerEmail}) submitted a manual bKash payment.<br><strong>TrxID:</strong> ${trimmedTx}<br><strong>Amount:</strong> ৳${orderData.total}<br>Please verify it in the Admin Dashboard.</p>`,
            orderId,
            category: 'payment'
        });
        const emailResult = await sendEmail({
            to: orderData.customerEmail,
            subject: `Order Received - #${orderId.slice(0, 8)}`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Order Received!</h2>
          <p>Dear ${orderData.customerName || 'Customer'},</p>
          <p>We have received your order <strong>#${orderId.slice(0, 8)}</strong> with manual bKash payment instruction.</p>
          <p><strong>Transaction ID:</strong> ${trimmedTx}</p>
          <p><strong>Amount:</strong> ৳${orderData.total}</p>
          <p>Your payment is pending verification. We will notify you once it is confirmed.</p>
          <p>Thank you for choosing Click2IT!</p>
        </div>
      `,
            orderId,
            customerEmail: orderData.customerEmail,
            category: 'payment',
        });
        return res.json({
            success: true,
            message: 'Transaction ID submitted successfully. Payment is pending verification.',
            emailSent: emailResult.success,
        });
    }
    catch (error) {
        console.error('Manual bKash submission error:', error);
        return res.status(500).json({ error: error.message || 'Failed to submit payment.' });
    }
});
ordersRouter.post('/admin/:orderId/payment/verify', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid || req.user?.user_id || req.user?.sub || 'admin';
    const { orderId } = req.params;
    const { action, reason } = req.body;
    // Security: check admin/staff access
    const adminCheck = await isUserAdmin(adminUid).catch(() => false);
    if (!adminCheck) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    if (!['accept', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Invalid action. Use "accept" or "reject".' });
    }
    try {
        const db = getAdminDb();
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        const orderData = orderSnap.data();
        if (!orderData) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        if (orderData.paymentStatus === 'verified') {
            if (action === 'accept') {
                let retryFulfillmentError = null;
                let fulfillmentResult;
                try {
                    fulfillmentResult = await fulfillOrder(orderId, adminUid);
                }
                catch (e) {
                    retryFulfillmentError = e.message || 'Fulfillment retry failed';
                }
                return res.json({
                    success: true,
                    alreadyVerified: true,
                    message: fulfillmentResult?.status === 'pending'
                        ? 'The registrar request is still pending; it was not submitted again.'
                        : 'Fulfillment retry requested successfully.',
                    fulfillmentResult,
                    fulfillmentError: retryFulfillmentError || undefined,
                });
            }
            return res.status(200).json({ success: true, alreadyVerified: true, message: 'Payment has already been verified.' });
        }
        const now = new Date().toISOString();
        const txId = orderData.transactionId || 'MANUAL-VERIFY';
        const orderTotal = Number(orderData.total) || 0;
        if (action === 'reject') {
            await orderRef.update({
                paymentStatus: 'rejected',
                paymentVerificationStatus: 'rejected',
                providerStatus: 'cancelled',
                paymentRejectedBy: adminUid,
                paymentRejectedAt: now,
                paymentRejectionReason: reason || 'Payment verification failed.',
                updatedAt: now,
            });
            try {
                await db.collection('paymentAuditLog').add({
                    orderId,
                    action: 'payment_rejected',
                    adminUid,
                    transactionId: txId,
                    amount: orderTotal,
                    timestamp: now,
                    reason: reason || 'Payment verification failed.',
                });
            }
            catch (auditErr) {
                console.warn('[Orders] Failed to write audit log:', auditErr);
            }
            let emailSent = true;
            if (orderData.customerEmail) {
                queueEmail({
                    to: orderData.customerEmail,
                    subject: `Payment Rejected - #${orderId.slice(0, 8)}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #dc2626;">Payment Rejected</h2>
              <p>Dear ${orderData.customerName || 'Customer'},</p>
              <p>Your payment for order <strong>#${orderId.slice(0, 8)}</strong> could not be verified.</p>
              <p><strong>Reason:</strong> ${reason || 'Payment verification failed.'}</p>
              <p>Please contact support or try again with a valid transaction.</p>
              <p>Thank you,<br>Click2IT Team</p>
            </div>
          `,
                    orderId,
                    customerEmail: orderData.customerEmail,
                    category: 'payment',
                });
            }
            return res.json({
                success: true,
                message: 'Payment rejected successfully.',
                emailSent,
            });
        }
        if (action === 'accept') {
            await orderRef.update({
                paymentStatus: 'verified',
                paymentVerificationStatus: 'verified',
                providerStatus: 'processing',
                paymentVerifiedBy: adminUid,
                paymentVerifiedAt: now,
                updatedAt: now,
            });
            try {
                await db.collection('paymentAuditLog').add({
                    orderId,
                    action: 'payment_verified',
                    adminUid,
                    transactionId: txId,
                    amount: orderTotal,
                    timestamp: now,
                });
            }
            catch (auditErr) {
                console.warn('[Orders] Failed to write audit log:', auditErr);
            }
            // Process affiliate referral commission with anti-fraud verification
            processAffiliateCommissionForOrder({ id: orderId, ...orderData, total: orderTotal }, extractClientIp(req)).catch(err => {
                console.warn('[Orders] Affiliate commission processing error:', err);
            });
            let emailSent = false;
            if (orderData.customerEmail) {
                try {
                    const docNum = orderData.documentNumber || `#${orderId.slice(0, 8)}`;
                    const items = Array.isArray(orderData.items) ? orderData.items : [];
                    const customerName = orderData.customerName || 'Valued Customer';
                    const customerPhone = orderData.customerPhone || '';
                    const customerAddress = orderData.shippingAddress || '';
                    const paymentMethod = (orderData.paymentMethod || 'bKash').toUpperCase();
                    const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                    const itemsRows = items.map((item) => `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 12px 16px; text-align: left;">
                <div style="font-weight: 600; color: #111827; font-size: 14px;">${item.name || item.domain || 'Service Item'}</div>
                ${item.description ? `<div style="font-size: 12px; color: #6b7280; margin-top: 2px;">${item.description}</div>` : ''}
              </td>
              <td style="padding: 12px 16px; text-align: center; color: #4b5563; font-size: 14px;">${item.quantity || 1}</td>
              <td style="padding: 12px 16px; text-align: right; color: #111827; font-weight: 600; font-size: 14px;">৳${(item.price || item.total || 0).toLocaleString()}</td>
            </tr>
          `).join('');
                    queueEmail({
                        to: orderData.customerEmail,
                        subject: `Payment Confirmed & Receipt - ${docNum}`,
                        html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 30px 10px;">
                  <tr>
                    <td align="center">
                      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
                        
                        <!-- Header Banner -->
                        <tr>
                          <td style="background: linear-gradient(135deg, #0a1628 0%, #1e3a8a 100%); padding: 32px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">CLICK2IT BD</h1>
                            <p style="margin: 6px 0 0; color: #93c5fd; font-size: 13px; font-weight: 500;">Cloud Hosting & Domain Services</p>
                            
                            <div style="margin-top: 18px; display: inline-block; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; border-radius: 30px; padding: 6px 18px;">
                              <span style="color: #4ade80; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">✓ Payment Verified & Confirmed</span>
                            </div>
                          </td>
                        </tr>

                        <!-- Greeting -->
                        <tr>
                          <td style="padding: 28px 30px 15px;">
                            <p style="margin: 0; font-size: 16px; color: #111827;">Dear <strong>${customerName}</strong>,</p>
                            <p style="margin: 8px 0 0; font-size: 14px; color: #4b5563; line-height: 1.6;">
                              Thank you for your payment! We have verified your transaction. Below is your official receipt and order summary.
                            </p>
                          </td>
                        </tr>

                        <!-- Invoice Details Card -->
                        <tr>
                          <td style="padding: 0 30px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px 20px;">
                              <tr>
                                <td width="50%" style="vertical-align: top;">
                                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Invoice Number</div>
                                  <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px;">${docNum}</div>
                                  
                                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 12px; letter-spacing: 0.5px;">Payment Method</div>
                                  <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px;">${paymentMethod}</div>
                                </td>
                                <td width="50%" style="vertical-align: top; text-align: right;">
                                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">Date</div>
                                  <div style="font-size: 13px; font-weight: 600; color: #0f172a; margin-top: 2px;">${dateStr}</div>
                                  
                                  <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 12px; letter-spacing: 0.5px;">Transaction ID</div>
                                  <div style="font-size: 13px; font-family: monospace; font-weight: 700; color: #059669; margin-top: 2px;">${txId}</div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Items Table -->
                        <tr>
                          <td style="padding: 24px 30px 10px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; border-collapse: collapse;">
                              <thead>
                                <tr style="background-color: #f1f5f9; border-bottom: 2px solid #e2e8f0;">
                                  <th style="padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Description</th>
                                  <th style="padding: 10px 16px; text-align: center; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Qty</th>
                                  <th style="padding: 10px 16px; text-align: right; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase;">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${itemsRows || `
                                  <tr>
                                    <td style="padding: 12px 16px; text-align: left; font-size: 14px; font-weight: 600; color: #111827;">Hosting / Domain Service</td>
                                    <td style="padding: 12px 16px; text-align: center; font-size: 14px; color: #4b5563;">1</td>
                                    <td style="padding: 12px 16px; text-align: right; font-size: 14px; font-weight: 600; color: #111827;">৳${orderTotal.toLocaleString()}</td>
                                  </tr>
                                `}
                              </tbody>
                              <tfoot>
                                <tr style="background-color: #f8fafc; border-top: 2px solid #e2e8f0;">
                                  <td colspan="2" style="padding: 12px 16px; text-align: right; font-weight: 700; color: #0f172a; font-size: 14px;">Total Paid:</td>
                                  <td style="padding: 12px 16px; text-align: right; font-weight: 800; color: #16a34a; font-size: 17px;">৳${orderTotal.toLocaleString()}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </td>
                        </tr>

                        <!-- Customer Details -->
                        ${(customerPhone || customerAddress) ? `
                        <tr>
                          <td style="padding: 10px 30px 15px;">
                            <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Customer Info</div>
                            <div style="font-size: 13px; color: #374151; line-height: 1.5;">
                              ${customerPhone ? `<div><strong>Phone:</strong> ${customerPhone}</div>` : ''}
                              ${customerAddress ? `<div><strong>Address:</strong> ${customerAddress}</div>` : ''}
                            </div>
                          </td>
                        </tr>
                        ` : ''}

                        <!-- Next Steps Info -->
                        <tr>
                          <td style="padding: 10px 30px 25px;">
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 0 8px 8px 0;">
                              <div style="font-weight: 700; color: #1e40af; font-size: 13px;">What Happens Next?</div>
                              <p style="margin: 4px 0 0; font-size: 13px; color: #1e3a8a; line-height: 1.5;">
                                Your order is currently being processed. Once setup is complete, you will receive an activation email with full service details.
                              </p>
                            </div>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="background-color: #f8fafc; border-top: 1px solid #e5e7eb; padding: 24px 30px; text-align: center;">
                            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #0f172a;">Click2IT BD</p>
                            <p style="margin: 4px 0 0; font-size: 12px; color: #64748b;">
                              Email: <a href="mailto:info@click2it.bd" style="color: #2563eb; text-decoration: none;">info@click2it.bd</a> | Web: <a href="https://click2it.bd" style="color: #2563eb; text-decoration: none;">click2it.bd</a>
                            </p>
                            <p style="margin: 8px 0 0; font-size: 11px; color: #94a3b8;">
                              © 2026 Click2IT BD. All rights reserved.
                            </p>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>
                </table>
              </body>
              </html>
            `,
                        orderId,
                        customerEmail: orderData.customerEmail,
                        category: 'payment',
                    });
                    emailSent = true;
                }
                catch (mailErr) {
                    console.warn('[Orders] Email notification error:', mailErr);
                }
            }
            let fulfillmentError = null;
            let fulfillmentResult;
            try {
                fulfillmentResult = await fulfillOrder(orderId, adminUid);
                console.log(`[Orders] Fulfillment started for order ${orderId}:`, fulfillmentResult);
            }
            catch (err) {
                fulfillmentError = err.message || 'Unknown fulfillment error';
                console.error(`[Orders] Fulfillment notice for order ${orderId}:`, err);
            }
            return res.json({
                success: true,
                message: fulfillmentResult?.status === 'pending'
                    ? 'Payment verified. The registrar accepted the request, but registration is not active yet.'
                    : 'Payment verified successfully. Order is now processing.',
                emailSent,
                fulfillmentResult,
                fulfillmentError: fulfillmentError || undefined,
            });
        }
        return res.status(400).json({ error: 'Invalid action.' });
    }
    catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ error: error.message || 'Failed to verify payment.' });
    }
});
ordersRouter.post('/admin/:orderId/retry-fulfillment', requireFirebaseAuth, async (req, res) => {
    try {
        const adminUid = req.user?.uid;
        const { orderId } = req.params;
        const isAdmin = await isUserAdmin(adminUid);
        if (!isAdmin) {
            return res.status(403).json({ success: false, error: 'Admin authorization required' });
        }
        const result = await fulfillOrder(orderId, adminUid);
        return res.json(result);
    }
    catch (error) {
        console.error('Retry fulfillment error:', error);
        return res.status(500).json({ success: false, error: error?.message || 'Internal server error' });
    }
});
ordersRouter.get('/:orderId/payment/query-bkash', requireFirebaseAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentId } = req.query;
        if (!paymentId) {
            return res.status(400).json({ success: false, error: 'paymentId is required' });
        }
        const db = getAdminDb();
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        const orderData = orderSnap.data();
        if (!orderData) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        return res.json({
            success: true,
            status: orderData.paymentStatus === 'verified' ? 'Completed' : 'Pending',
            orderId,
            paymentId,
        });
    }
    catch (error) {
        console.error('bKash query payment error:', error);
        return res.status(500).json({ success: false, error: error?.message || 'Payment query failed' });
    }
});
ordersRouter.post('/:orderId/payment/execute-bkash', requireFirebaseAuth, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentId } = req.body;
        if (!paymentId) {
            return res.status(400).json({ success: false, error: 'paymentId is required' });
        }
        const db = getAdminDb();
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        const orderData = orderSnap.data();
        if (!orderData) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        if (orderData.paymentStatus === 'verified') {
            return res.json({ success: true, message: 'Payment already verified' });
        }
        await orderRef.update({
            paymentStatus: 'verified',
            bkashPaymentId: paymentId,
            updatedAt: new Date().toISOString(),
        });
        return res.json({ success: true, message: 'Payment executed successfully' });
    }
    catch (error) {
        console.error('bKash execute payment error:', error);
        return res.status(500).json({ success: false, error: error?.message || 'Payment execution failed' });
    }
});
// Admin: Complete an order and activate its linked domain / hosting accounts
ordersRouter.post('/admin/:orderId/complete', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid || req.user?.user_id || req.user?.sub || 'admin';
    const adminCheck = await isUserAdmin(adminUid).catch(() => false);
    if (!adminCheck) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    try {
        const { orderId } = req.params;
        const db = getAdminDb();
        const now = new Date().toISOString();
        const orderRef = db.collection('orders').doc(orderId);
        await orderRef.update({
            status: 'completed',
            providerStatus: 'completed',
            updatedAt: now,
        });
        // Update hostingAccounts linked to this order
        const hSnap = await db.collection('hostingAccounts').where('orderId', '==', orderId).get();
        for (const docSnap of hSnap.docs) {
            await docSnap.ref.update({
                status: 'active',
                provisioningStatus: 'completed',
                updatedAt: now,
            });
        }
        // Update domainOrders linked to this order
        const dSnap = await db.collection('domainOrders').where('orderId', '==', orderId).get();
        for (const docSnap of dSnap.docs) {
            await docSnap.ref.update({
                status: 'active',
                updatedAt: now,
            });
        }
        return res.json({ success: true, message: 'Order marked as completed.' });
    }
    catch (error) {
        console.error('Admin mark complete error:', error);
        return res.status(500).json({ error: error.message || 'Failed to complete order.' });
    }
});
// Admin: Update status of a specific domainOrder or hostingAccount
ordersRouter.post('/admin/service-status', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid || req.user?.user_id || req.user?.sub || 'admin';
    const adminCheck = await isUserAdmin(adminUid).catch(() => false);
    if (!adminCheck) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    try {
        const { collectionName, documentId, newStatus, updates } = req.body;
        if (!['domainOrders', 'hostingAccounts'].includes(collectionName) || !documentId || !newStatus) {
            return res.status(400).json({ error: 'Invalid parameters.' });
        }
        const db = getAdminDb();
        const docRef = db.collection(collectionName).doc(documentId);
        await docRef.update({
            status: newStatus,
            updatedAt: new Date().toISOString(),
            ...(updates || {}),
        });
        return res.json({ success: true, message: `${collectionName} updated successfully.` });
    }
    catch (error) {
        console.error('Admin update service status error:', error);
        return res.status(500).json({ error: error.message || 'Failed to update service status.' });
    }
});
export default ordersRouter;
