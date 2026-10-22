import { getAdminDb } from '../firebase/admin.js';
/**
 * Normalizes phone numbers to standard format for accurate matching
 * (e.g., '+8801712345678', '01712345678', '8801712345678' all resolve to '01712345678')
 */
export function normalizePhoneNumber(rawPhone) {
    if (!rawPhone)
        return '';
    const cleaned = rawPhone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+880')) {
        return '0' + cleaned.slice(4);
    }
    if (cleaned.startsWith('880')) {
        return '0' + cleaned.slice(3);
    }
    return cleaned;
}
/**
 * Evaluates whether an affiliate referral attempt is a self-referral or fraudulent pattern.
 * Checks for:
 * 1. Same user ID (buyer UID === affiliate UID)
 * 2. Same email address
 * 3. Matching IP address between buyer and affiliate's known/recent login IPs
 * 4. Matching payment or contact phone number (bKash/Nagad/Phone)
 */
export async function checkAffiliateFraud(params) {
    const { affiliateId, buyerUserId, buyerEmail, buyerPhone, clientIp, paymentPhone } = params;
    // 1. Direct Self-Referral (Same User ID)
    if (affiliateId && buyerUserId && affiliateId === buyerUserId) {
        return {
            isFraud: true,
            fraudCode: 'SELF_REFERRAL_SAME_USER',
            fraudReason: 'Self-referral blocked: The purchaser account is the same as the affiliate account.',
        };
    }
    const db = getAdminDb();
    const affiliateDoc = await db.collection('users').doc(affiliateId).get();
    if (!affiliateDoc.exists) {
        return {
            isFraud: true,
            fraudCode: 'SELF_REFERRAL_SAME_USER',
            fraudReason: 'Invalid affiliate identifier.',
        };
    }
    const affiliateData = affiliateDoc.data() || {};
    const affiliateEmail = String(affiliateData.email || '').trim().toLowerCase();
    const cleanBuyerEmail = String(buyerEmail || '').trim().toLowerCase();
    // 2. Matching Email
    if (affiliateEmail && cleanBuyerEmail && affiliateEmail === cleanBuyerEmail) {
        return {
            isFraud: true,
            fraudCode: 'SELF_REFERRAL_SAME_EMAIL',
            fraudReason: 'Self-referral blocked: Purchaser email matches the affiliate email address.',
        };
    }
    // 3. Matching Phone Numbers (bKash / Nagad / Contact Phone)
    const normBuyerPhone = normalizePhoneNumber(buyerPhone);
    const normPaymentPhone = normalizePhoneNumber(paymentPhone);
    const affiliatePhones = [
        normalizePhoneNumber(affiliateData.phone),
        normalizePhoneNumber(affiliateData.bkashNumber),
        normalizePhoneNumber(affiliateData.nagadNumber),
        normalizePhoneNumber(affiliateData.payoutNumber),
    ].filter(p => p.length >= 10);
    if (normBuyerPhone && affiliatePhones.includes(normBuyerPhone)) {
        return {
            isFraud: true,
            fraudCode: 'SELF_REFERRAL_SAME_PAYMENT_PHONE',
            fraudReason: 'Self-referral blocked: Purchaser contact phone matches affiliate registered payment phone.',
        };
    }
    if (normPaymentPhone && affiliatePhones.includes(normPaymentPhone)) {
        return {
            isFraud: true,
            fraudCode: 'SELF_REFERRAL_SAME_PAYMENT_PHONE',
            fraudReason: 'Self-referral blocked: Payment transaction sender number matches affiliate registered phone.',
        };
    }
    // 4. IP Match Detection (Exclude local loopback IPs in development)
    const isPublicIp = (ip) => ip && !['127.0.0.1', '::1', 'localhost', ''].includes(ip);
    if (isPublicIp(clientIp)) {
        // Check against affiliate's lastLoginIp
        if (affiliateData.lastLoginIp && affiliateData.lastLoginIp === clientIp) {
            return {
                isFraud: true,
                fraudCode: 'SELF_REFERRAL_SAME_IP',
                fraudReason: 'Self-referral blocked: Order placed from the same IP address as the affiliate.',
            };
        }
        // Check against affiliate's recent security logs in last 14 days
        try {
            const recentLogsSnap = await db.collection('user_security_logs')
                .where('userId', '==', affiliateId)
                .where('ipAddress', '==', clientIp)
                .limit(1)
                .get();
            if (!recentLogsSnap.empty) {
                return {
                    isFraud: true,
                    fraudCode: 'SELF_REFERRAL_SAME_IP',
                    fraudReason: 'Self-referral blocked: IP address matches recent login history of the affiliate.',
                };
            }
        }
        catch (ipLogErr) {
            console.warn('[AffiliateFraud] IP history check warning:', ipLogErr);
        }
    }
    return {
        isFraud: false,
    };
}
/**
 * Processes affiliate commission for an order.
 * Calculates commission, runs anti-fraud validation, and records commission document.
 */
export async function processAffiliateCommissionForOrder(orderData, clientIp) {
    const affiliateRef = orderData.affiliateRef || orderData.referredBy;
    if (!affiliateRef || typeof affiliateRef !== 'string')
        return;
    const orderId = orderData.id || orderData.orderId;
    const db = getAdminDb();
    // Avoid duplicate commissions for the same order
    const existingCommSnap = await db.collection('affiliate_commissions')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
    if (!existingCommSnap.empty) {
        return;
    }
    const orderTotal = Math.max(0, Number(orderData.total) || 0);
    if (orderTotal <= 0)
        return;
    // Run Fraud Check
    const fraudResult = await checkAffiliateFraud({
        affiliateId: affiliateRef,
        buyerUserId: orderData.userId,
        buyerEmail: orderData.customerEmail,
        buyerPhone: orderData.customerPhone,
        clientIp: clientIp || orderData.clientIp,
        paymentPhone: orderData.senderPhone || orderData.transactionPhone || orderData.customerPhone,
        orderId,
    });
    const now = new Date().toISOString();
    const commissionRate = 0.10; // 10% standard commission
    const commissionAmount = Math.round(orderTotal * commissionRate);
    const commRef = db.collection('affiliate_commissions').doc();
    await commRef.set({
        id: commRef.id,
        affiliateId: affiliateRef,
        orderId,
        buyerUserId: orderData.userId || 'guest',
        buyerEmail: orderData.customerEmail ? `${orderData.customerEmail.slice(0, 3)}***@***` : 'Anonymous',
        orderTotal,
        commissionRate,
        commissionAmount,
        status: fraudResult.isFraud ? 'fraud_flagged' : 'pending',
        fraudFlagged: fraudResult.isFraud,
        fraudReason: fraudResult.fraudReason || null,
        fraudCode: fraudResult.fraudCode || null,
        lockExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30-day pending lock
        createdAt: now,
        updatedAt: now,
    });
    if (fraudResult.isFraud) {
        console.warn(`[AffiliateFraud] Flagged self-referral for order ${orderId} by affiliate ${affiliateRef}: ${fraudResult.fraudReason}`);
    }
}
