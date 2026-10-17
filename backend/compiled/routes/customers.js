import { Router } from 'express';
import { getAdminDb, isUserAdmin, getAdminAuth } from '../firebase/admin.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { sendEmail } from '../services/email.js';
import { fulfillOrder } from '../services/fulfillment.js';
import { getDomainProviderConfig } from '../services/domainProviderConfig.js';
import { getDomainProvider } from '../providers/providerFactory.js';
import { getDomainPricingSettings, calculateCustomerPriceBdt } from '../services/domainPricing.js';
const customersRouter = Router();
// ==========================================
// 1. CLIENT WALLET ENDPOINTS
// ==========================================
/**
 * GET /api/customers/me/wallet
 * Returns current user's account balance and recent wallet transactions
 */
customersRouter.get('/me/wallet', requireFirebaseAuth, async (req, res) => {
    const userId = req.user.uid;
    try {
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        let balance = 0;
        let userData = {};
        if (userDoc.exists) {
            userData = userDoc.data() || {};
            balance = typeof userData.balance === 'number' ? userData.balance : 0;
        }
        // Fetch transactions
        const txSnap = await db.collection('wallet_transactions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
        const transactions = txSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        // Fetch pending deposit requests
        const depSnap = await db.collection('deposit_requests')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();
        const deposits = depSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        return res.json({
            success: true,
            balance,
            user: {
                id: userId,
                email: req.user.email,
                name: userData.displayName || userData.name || userData.email || 'Customer',
                phone: userData.phone || userData.phoneNumber || '',
                status: userData.status || 'active'
            },
            transactions,
            deposits
        });
    }
    catch (error) {
        console.error('Failed to fetch wallet info:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch wallet' });
    }
});
/**
 * POST /api/customers/deposit-request
 * Submit a manual deposit request (bKash/Nagad/Bank) to add balance
 */
customersRouter.post('/deposit-request', requireFirebaseAuth, async (req, res) => {
    const userId = req.user.uid;
    const { amount, paymentMethod, transactionId, notes } = req.body;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Please enter a valid deposit amount.' });
    }
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim().length < 3) {
        return res.status(400).json({ error: 'A valid payment transaction ID is required.' });
    }
    try {
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const now = new Date().toISOString();
        const depositRef = db.collection('deposit_requests').doc();
        const depositData = {
            id: depositRef.id,
            userId,
            customerEmail: req.user.email || userData.email || '',
            customerName: userData.displayName || userData.name || 'Customer',
            amount: numAmount,
            paymentMethod: paymentMethod || 'bKash',
            transactionId: transactionId.trim(),
            notes: notes || '',
            status: 'pending',
            createdAt: now,
            updatedAt: now
        };
        await depositRef.set(depositData);
        // Send admin alert email if configured
        sendEmail({
            to: process.env.ADMIN_EMAIL || 'click2itbd@gmail.com',
            subject: `New Deposit Request: ৳${numAmount.toLocaleString()} (${paymentMethod})`,
            html: `
        <h3>New Deposit Request Received</h3>
        <p><strong>Customer:</strong> ${depositData.customerName} (${depositData.customerEmail})</p>
        <p><strong>Amount:</strong> ৳${numAmount.toLocaleString()}</p>
        <p><strong>Method:</strong> ${paymentMethod}</p>
        <p><strong>TrxID:</strong> ${transactionId}</p>
        <p>Please review and verify in Admin Dashboard.</p>
      `,
            category: 'payment'
        }).catch(e => console.warn('Deposit alert email failed:', e));
        return res.json({
            success: true,
            message: 'Deposit request submitted successfully! Funds will be added after admin verification.',
            deposit: depositData
        });
    }
    catch (error) {
        console.error('Failed to submit deposit request:', error);
        return res.status(500).json({ error: error.message || 'Failed to submit deposit request.' });
    }
});
/**
 * POST /api/customers/pay-order
 * Direct Wallet Balance Payment for Order Fulfillment
 */
customersRouter.post('/pay-order', requireFirebaseAuth, async (req, res) => {
    const userId = req.user.uid;
    const { orderId } = req.body;
    if (!orderId || typeof orderId !== 'string') {
        return res.status(400).json({ error: 'Order ID is required.' });
    }
    try {
        const db = getAdminDb();
        const orderRef = db.collection('orders').doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: 'Order not found.' });
        }
        const orderData = orderSnap.data();
        if (orderData.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized to pay for this order.' });
        }
        if (orderData.paymentStatus === 'verified' || orderData.paymentStatus === 'paid') {
            return res.status(400).json({ error: 'Order is already paid.' });
        }
        const totalAmount = Number(orderData.total || orderData.totalBdt || 0);
        if (!totalAmount || totalAmount <= 0) {
            return res.status(400).json({ error: 'Invalid order total amount.' });
        }
        // Check user balance
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const currentBalance = typeof userData.balance === 'number' ? userData.balance : 0;
        if (currentBalance < totalAmount) {
            return res.status(400).json({
                error: `Insufficient wallet balance. Order total: ৳${totalAmount.toLocaleString()}, Available: ৳${currentBalance.toLocaleString()}. Please top up your wallet balance.`
            });
        }
        // Deduct balance
        const newBalance = currentBalance - totalAmount;
        const now = new Date().toISOString();
        await userRef.update({
            balance: newBalance,
            updatedAt: now
        });
        const txRef = db.collection('wallet_transactions').doc();
        const txData = {
            id: txRef.id,
            userId,
            customerEmail: req.user.email || userData.email || orderData.customerEmail,
            customerName: userData.displayName || userData.name || orderData.customerName || 'Customer',
            type: 'debit',
            amount: totalAmount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            reason: `Payment for Order #${orderId.slice(0, 8)} (${orderData.items?.[0]?.name || 'Domain/Hosting Services'})`,
            orderId,
            createdAt: now
        };
        await txRef.set(txData);
        // Update order status to paid / verified
        await orderRef.update({
            paymentStatus: 'verified',
            paymentMethod: 'wallet_balance',
            paymentVerificationStatus: 'approved',
            providerStatus: 'processing',
            paymentSubmittedAt: now,
            paidAt: now,
            updatedAt: now
        });
        // Auto trigger fulfillment (domain registration / hosting provisioning)
        let fulfillmentRes = null;
        try {
            fulfillmentRes = await fulfillOrder(orderId, userId);
        }
        catch (fErr) {
            console.warn('[Wallet Pay] Fulfillment background trigger error:', fErr);
        }
        // Send payment confirmation email
        if (txData.customerEmail) {
            await sendEmail({
                to: txData.customerEmail,
                subject: `Payment Receipt - Order #${orderId.slice(0, 8)}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #10b981;">Payment Successful!</h2>
            <p>Dear ${txData.customerName},</p>
            <p>Your order <strong>#${orderId.slice(0, 8)}</strong> has been paid using your Account Wallet Balance.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 4px 0;"><strong>Deducted Amount:</strong> ৳${totalAmount.toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>Remaining Balance:</strong> ৳${newBalance.toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>Payment Method:</strong> Account Wallet Balance</p>
            </div>
            <p>Your order is now being provisioned automatically.</p>
            <p style="margin-top: 20px; color: #64748b; text-align: center;">Thank you for your business!</p>
          </div>
        `,
                customerEmail: txData.customerEmail,
                category: 'payment'
            }).catch(e => console.warn('Payment receipt email failed:', e));
        }
        return res.json({
            success: true,
            message: 'Payment completed successfully with account balance.',
            newBalance,
            orderStatus: 'verified',
            fulfillment: fulfillmentRes
        });
    }
    catch (error) {
        console.error('Wallet payment failed:', error);
        return res.status(500).json({ error: error.message || 'Payment processing failed.' });
    }
});
/**
 * POST /api/customers/renew-domain
 * Direct 1-Click Domain Renewal using Wallet Balance
 */
customersRouter.post('/renew-domain', requireFirebaseAuth, async (req, res) => {
    const userId = req.user.uid;
    const { domainName, periodYears = 1 } = req.body;
    if (!domainName || typeof domainName !== 'string') {
        return res.status(400).json({ error: 'Domain name is required for renewal.' });
    }
    const cleanDomain = domainName.trim().toLowerCase();
    const tldMatch = cleanDomain.match(/\.([a-z0-9.-]+)$/i);
    if (!tldMatch) {
        return res.status(400).json({ error: 'Invalid domain name format.' });
    }
    const tld = tldMatch[1];
    try {
        const db = getAdminDb();
        const config = await getDomainProviderConfig();
        const provider = getDomainProvider(config);
        let pricingSettings = { usdToBdtRate: 123, markupPercent: 15 };
        try {
            pricingSettings = await getDomainPricingSettings();
        }
        catch { }
        // Get live pricing quote for this TLD
        let renewPriceBdt = 1500; // default fallback
        try {
            if (provider.getTldPricing) {
                const quote = await provider.getTldPricing(tld);
                if (quote && quote.renewalPrice > 0) {
                    renewPriceBdt = calculateCustomerPriceBdt(quote.renewalPrice, pricingSettings);
                }
            }
        }
        catch {
            // check stored domainPricing doc
            const priceDoc = await db.collection('domainPricing').doc(tld).get();
            if (priceDoc.exists && priceDoc.data()?.renewPrice) {
                renewPriceBdt = priceDoc.data()?.renewPrice;
            }
        }
        const totalCost = renewPriceBdt * Number(periodYears);
        // Check user balance
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        const userData = userSnap.exists ? userSnap.data() : {};
        const currentBalance = typeof userData.balance === 'number' ? userData.balance : 0;
        if (currentBalance < totalCost) {
            return res.status(400).json({
                error: `Insufficient wallet balance. Renewal cost: ৳${totalCost.toLocaleString()} (${periodYears} yr), Available: ৳${currentBalance.toLocaleString()}. Please top up your wallet balance.`
            });
        }
        // Attempt provider renewal call
        let providerResult = null;
        let renewSuccess = false;
        try {
            if (provider.renewDomain) {
                providerResult = await provider.renewDomain(cleanDomain, Number(periodYears));
                renewSuccess = true;
            }
            else {
                renewSuccess = true; // Manual review or fallback
            }
        }
        catch (pErr) {
            console.error('[Domain Renew] Provider call failed:', pErr);
            return res.status(500).json({ error: `Domain provider renewal failed: ${pErr.message}` });
        }
        // Deduct balance
        const newBalance = currentBalance - totalCost;
        const now = new Date().toISOString();
        await userRef.update({
            balance: newBalance,
            updatedAt: now
        });
        // Log transaction
        const txRef = db.collection('wallet_transactions').doc();
        await txRef.set({
            id: txRef.id,
            userId,
            customerEmail: req.user.email || userData.email,
            customerName: userData.displayName || userData.name || 'Customer',
            type: 'debit',
            amount: totalCost,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            reason: `Domain Renewal for ${cleanDomain} (${periodYears} Year${periodYears > 1 ? 's' : ''})`,
            domainName: cleanDomain,
            createdAt: now
        });
        // Record renewal order document
        const renewalOrderRef = db.collection('domainOrders').doc();
        await renewalOrderRef.set({
            id: renewalOrderRef.id,
            userId,
            customerEmail: req.user.email || userData.email,
            customerName: userData.displayName || userData.name || 'Customer',
            domainName: cleanDomain,
            type: 'renewal',
            periodYears: Number(periodYears),
            amount: totalCost,
            paymentStatus: 'verified',
            paymentMethod: 'wallet_balance',
            providerStatus: renewSuccess ? 'completed' : 'manual_review',
            providerResult,
            createdAt: now
        });
        // Send email
        if (req.user.email || userData.email) {
            await sendEmail({
                to: req.user.email || userData.email,
                subject: `Domain Renewed - ${cleanDomain}`,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #2563eb;">Domain Renewal Successful</h2>
            <p>Dear ${userData.displayName || userData.name || 'Customer'},</p>
            <p>Your domain <strong>${cleanDomain}</strong> has been successfully renewed for <strong>${periodYears} year(s)</strong>.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 4px 0;"><strong>Cost:</strong> ৳${totalCost.toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>New Wallet Balance:</strong> ৳${newBalance.toLocaleString()}</p>
            </div>
            <p>Thank you for keeping your services active with Click2IT!</p>
          </div>
        `,
                customerEmail: req.user.email || userData.email,
                category: 'domain'
            }).catch(e => console.warn('Renewal email failed:', e));
        }
        return res.json({
            success: true,
            message: `Domain ${cleanDomain} renewed successfully for ${periodYears} year(s).`,
            newBalance,
            providerResult
        });
    }
    catch (error) {
        console.error('Domain renewal failed:', error);
        return res.status(500).json({ error: error.message || 'Failed to renew domain.' });
    }
});
// ==========================================
// 2. ADMIN CUSTOMER MANAGEMENT ENDPOINTS
// ==========================================
/**
 * GET /api/admin/customers or /api/customers/admin/list
 * Get comprehensive list of all customers
 */
customersRouter.get('/admin/list', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    try {
        const db = getAdminDb();
        const usersSnap = await db.collection('users').limit(500).get();
        // Aggregations
        const domainsSnap = await db.collection('domainOrders').get().catch(() => ({ docs: [] }));
        const hostingSnap = await db.collection('hostingAccounts').get().catch(() => ({ docs: [] }));
        const ordersSnap = await db.collection('orders').get().catch(() => ({ docs: [] }));
        const domainsByUser = {};
        domainsSnap.docs.forEach((doc) => {
            const uId = doc.data()?.userId;
            if (uId)
                domainsByUser[uId] = (domainsByUser[uId] || 0) + 1;
        });
        const hostingByUser = {};
        hostingSnap.docs.forEach((doc) => {
            const uId = doc.data()?.userId;
            if (uId)
                hostingByUser[uId] = (hostingByUser[uId] || 0) + 1;
        });
        const totalSpentByUser = {};
        const ordersCountByUser = {};
        ordersSnap.docs.forEach((doc) => {
            const d = doc.data();
            const uId = d?.userId;
            if (uId) {
                ordersCountByUser[uId] = (ordersCountByUser[uId] || 0) + 1;
                if (d.paymentStatus === 'verified' || d.status === 'completed') {
                    totalSpentByUser[uId] = (totalSpentByUser[uId] || 0) + Number(d.total || d.totalBdt || 0);
                }
            }
        });
        const customers = usersSnap.docs.map((doc) => {
            const data = doc.data();
            const uid = doc.id;
            // Generate consistent numeric Customer ID (e.g. 29398326)
            const numericId = data.customerId || Math.abs(uid.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 90000000 + 10000000;
            return {
                id: uid,
                uid,
                customerId: String(numericId),
                email: data.email || 'N/A',
                name: data.displayName || data.name || data.email || 'Customer',
                displayName: data.displayName || data.name || 'Customer',
                status: data.status || 'active',
                statusDescription: data.statusDescription || '',
                pin: data.pin || String(Math.floor(1000 + Math.random() * 9000)),
                company: data.company || '',
                address1: data.address1 || '',
                address2: data.address2 || '',
                address3: data.address3 || '',
                city: data.city || 'Chattogram',
                zip: data.zip || '4216',
                state: data.state || data.region || 'Chittagong',
                country: data.country || 'Bangladesh',
                phone: data.phone || data.phoneNumber || '',
                mobile: data.mobile || data.phone || data.phoneNumber || '',
                language: data.language || 'English',
                role: data.role || 'customer',
                balance: typeof data.balance === 'number' ? data.balance : 0,
                createdAt: data.createdAt || null,
                domainsCount: domainsByUser[uid] || 0,
                hostingCount: hostingByUser[uid] || 0,
                ordersCount: ordersCountByUser[uid] || 0,
                totalSpent: totalSpentByUser[uid] || 0
            };
        });
        return res.json({
            success: true,
            count: customers.length,
            customers
        });
    }
    catch (error) {
        console.error('Failed to list customers for admin:', error);
        return res.status(500).json({ error: error.message || 'Failed to list customers.' });
    }
});
/**
 * GET /api/admin/customers/:userId/details
 * Fetch complete WHMCS-style Customer Profile details, Domains, Hosting Accounts, and Transactions
 */
customersRouter.get('/admin/:userId/details', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid;
    const { userId } = req.params;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    try {
        const db = getAdminDb();
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            return res.status(404).json({ error: 'Customer user account not found.' });
        }
        const userData = userDoc.data();
        const numericId = userData.customerId || Math.abs(userId.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0)) % 90000000 + 10000000;
        // Fetch user domains (domainOrders & bd_domain_applications)
        const domainsSnap = await db.collection('domainOrders').where('userId', '==', userId).limit(50).get().catch(() => ({ docs: [] }));
        const bdDomainsSnap = await db.collection('bd_domain_applications').where('userId', '==', userId).limit(50).get().catch(() => ({ docs: [] }));
        const domainsList = [
            ...domainsSnap.docs.map((d) => ({ id: d.id, source: 'openprovider', ...d.data() })),
            ...bdDomainsSnap.docs.map((d) => ({ id: d.id, source: 'btcl_bd', ...d.data() }))
        ];
        // Fetch hosting accounts
        const hostingSnap = await db.collection('hostingAccounts').where('userId', '==', userId).limit(50).get().catch(() => ({ docs: [] }));
        const hostingList = hostingSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Fetch wallet transactions
        const txSnap = await db.collection('wallet_transactions').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(50).get().catch(() => ({ docs: [] }));
        const transactionsList = txSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Fetch user orders / invoices
        const ordersSnap = await db.collection('orders').where('userId', '==', userId).orderBy('createdAt', 'desc').limit(50).get().catch(() => ({ docs: [] }));
        const ordersList = ordersSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const totalReceipts = transactionsList
            .filter((t) => t.type === 'credit')
            .reduce((sum, t) => sum + Number(t.amount || 0), 0);
        const customerDetails = {
            id: userId,
            uid: userId,
            customerId: String(numericId),
            name: userData.displayName || userData.name || userData.email || 'Customer',
            displayName: userData.displayName || userData.name || 'Customer',
            email: userData.email || '',
            status: userData.status || 'active',
            statusDescription: userData.statusDescription || 'Active Account',
            pin: userData.pin || String(Math.floor(1000 + Math.random() * 9000)),
            company: userData.company || '',
            address1: userData.address1 || '',
            address2: userData.address2 || '',
            address3: userData.address3 || '',
            city: userData.city || 'Chattogram',
            zip: userData.zip || '4216',
            state: userData.state || userData.region || 'Chittagong',
            country: userData.country || 'Bangladesh',
            phone: userData.phone || userData.phoneNumber || '',
            mobile: userData.mobile || userData.phone || userData.phoneNumber || '',
            language: userData.language || 'English',
            balance: typeof userData.balance === 'number' ? userData.balance : 0,
            totalReceipts,
            createdAt: userData.createdAt || new Date().toISOString(),
            domains: domainsList,
            hosting: hostingList,
            transactions: transactionsList,
            orders: ordersList
        };
        return res.json({
            success: true,
            customer: customerDetails
        });
    }
    catch (error) {
        console.error('Failed to get customer details:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch customer details.' });
    }
});
/**
 * POST /api/admin/customers/:userId/update
 * Admin Edit / Modify Customer Profile Information
 */
customersRouter.post('/admin/:userId/update', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid;
    const { userId } = req.params;
    const { name, displayName, phone, mobile, company, address1, address2, address3, city, zip, state, country, pin, language, status, statusDescription } = req.body;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    try {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return res.status(404).json({ error: 'Customer user document not found.' });
        }
        const now = new Date().toISOString();
        const updateData = {
            updatedAt: now
        };
        if (name)
            updateData.name = name;
        if (displayName || name)
            updateData.displayName = displayName || name;
        if (phone)
            updateData.phone = phone;
        if (mobile)
            updateData.mobile = mobile;
        if (company !== undefined)
            updateData.company = company;
        if (address1 !== undefined)
            updateData.address1 = address1;
        if (address2 !== undefined)
            updateData.address2 = address2;
        if (address3 !== undefined)
            updateData.address3 = address3;
        if (city !== undefined)
            updateData.city = city;
        if (zip !== undefined)
            updateData.zip = zip;
        if (state !== undefined)
            updateData.state = state;
        if (country !== undefined)
            updateData.country = country;
        if (pin !== undefined)
            updateData.pin = pin;
        if (language !== undefined)
            updateData.language = language;
        if (status)
            updateData.status = status;
        if (statusDescription !== undefined)
            updateData.statusDescription = statusDescription;
        await userRef.update(updateData);
        return res.json({
            success: true,
            message: 'Customer profile updated successfully.',
            updatedData: updateData
        });
    }
    catch (error) {
        console.error('Failed to update customer profile:', error);
        return res.status(500).json({ error: error.message || 'Failed to update customer profile.' });
    }
});
/**
 * POST /api/admin/customers/:userId/status
 * Admin Suspend / Unsuspend / Delete Customer
 */
customersRouter.post('/admin/:userId/status', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid;
    const { userId } = req.params;
    const { status, description } = req.body;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    if (!['active', 'suspended', 'deleted'].includes(status)) {
        return res.status(400).json({ error: 'Status must be active, suspended, or deleted.' });
    }
    try {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return res.status(404).json({ error: 'Customer user document not found.' });
        }
        const now = new Date().toISOString();
        if (status === 'deleted') {
            await userRef.delete();
            return res.json({
                success: true,
                message: 'Customer account deleted successfully.'
            });
        }
        await userRef.update({
            status,
            statusDescription: description || (status === 'suspended' ? 'Suspended by admin' : 'Active Account'),
            updatedAt: now
        });
        return res.json({
            success: true,
            message: `Customer account status changed to ${status}.`
        });
    }
    catch (error) {
        console.error('Failed to change customer status:', error);
        return res.status(500).json({ error: error.message || 'Failed to change customer status.' });
    }
});
/**
 * POST /api/admin/customers/:userId/send-password-reset
 * Trigger Password Reset Email to Customer
 */
customersRouter.post('/admin/:userId/send-password-reset', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid;
    const { userId } = req.params;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    try {
        const db = getAdminDb();
        const userSnap = await db.collection('users').doc(userId).get();
        if (!userSnap.exists) {
            return res.status(404).json({ error: 'Customer account not found.' });
        }
        const userData = userSnap.data() || {};
        const email = userData.email;
        if (!email) {
            return res.status(400).json({ error: 'Customer has no valid email address.' });
        }
        // Generate Firebase Auth Password Reset Link if Firebase Admin Auth is active
        let resetLink = `https://click2it.bd/login?resetEmail=${encodeURIComponent(email)}`;
        try {
            const authSdk = getAdminAuth();
            if (authSdk) {
                resetLink = await authSdk.generatePasswordResetLink(email);
            }
        }
        catch (authErr) {
            console.warn('Firebase Admin Auth password reset link generation skipped:', authErr);
        }
        await sendEmail({
            to: email,
            subject: 'Password Reset Request - Click2IT',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #2563eb;">Reset Your Password</h2>
          <p>Dear ${userData.displayName || userData.name || 'Customer'},</p>
          <p>An administrator has initiated a password reset for your Click2IT account.</p>
          <p style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Reset Password Now</a>
          </p>
          <p style="color: #64748b; font-size: 12px;">If you did not request this, please contact support immediately.</p>
        </div>
      `,
            customerEmail: email,
            category: 'system'
        });
        return res.json({
            success: true,
            message: `Password reset email sent successfully to ${email}.`
        });
    }
    catch (error) {
        console.error('Failed to send password reset:', error);
        return res.status(500).json({ error: error.message || 'Failed to send password reset.' });
    }
});
/**
 * POST /api/admin/customers/:userId/balance
 * Admin Add or Deduct Balance
 */
const handleAdminBalanceAdjust = async (req, res) => {
    const adminUid = req.user?.uid;
    const userId = req.params?.userId || req.body?.userId;
    const { amount, action, reason, adminNotes } = req.body;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    if (!userId) {
        return res.status(400).json({ error: 'Target customer User ID is required.' });
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
        return res.status(400).json({ error: 'Valid positive amount is required.' });
    }
    const effectiveAction = (action || 'add').toLowerCase();
    if (!['add', 'deduct'].includes(effectiveAction)) {
        return res.status(400).json({ error: 'Action must be "add" or "deduct".' });
    }
    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return res.status(400).json({ error: 'Reason/Description is required for balance adjustment.' });
    }
    try {
        const db = getAdminDb();
        const userRef = db.collection('users').doc(userId);
        const userSnap = await userRef.get();
        if (!userSnap.exists) {
            return res.status(404).json({ error: 'Customer user account not found.' });
        }
        const userData = userSnap.data();
        const currentBalance = typeof userData.balance === 'number' ? userData.balance : 0;
        let newBalance = currentBalance;
        if (action === 'add') {
            newBalance = currentBalance + numAmount;
        }
        else {
            if (currentBalance < numAmount) {
                return res.status(400).json({
                    error: `Cannot deduct ৳${numAmount.toLocaleString()}. Customer current balance is only ৳${currentBalance.toLocaleString()}.`
                });
            }
            newBalance = currentBalance - numAmount;
        }
        const now = new Date().toISOString();
        await userRef.update({
            balance: newBalance,
            updatedAt: now
        });
        // Record wallet transaction
        const txRef = db.collection('wallet_transactions').doc();
        const txData = {
            id: txRef.id,
            userId,
            customerEmail: userData.email || '',
            customerName: userData.displayName || userData.name || 'Customer',
            type: action === 'add' ? 'credit' : 'debit',
            amount: numAmount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            reason: reason.trim(),
            adminNotes: adminNotes || '',
            createdBy: req.user.email || 'Admin',
            createdAt: now
        };
        await txRef.set(txData);
        // Send email notification to customer
        if (userData.email) {
            const subject = action === 'add'
                ? `Account Balance Credited - ৳${numAmount.toLocaleString()}`
                : `Account Balance Debited - ৳${numAmount.toLocaleString()}`;
            await sendEmail({
                to: userData.email,
                subject,
                html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: ${action === 'add' ? '#10b981' : '#f59e0b'};">
              Account Wallet ${action === 'add' ? 'Credited' : 'Debited'}
            </h2>
            <p>Dear ${userData.displayName || userData.name || 'Customer'},</p>
            <p>Your account balance has been updated by administrator.</p>
            <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <p style="margin: 4px 0;"><strong>${action === 'add' ? 'Amount Added' : 'Amount Deducted'}:</strong> ৳${numAmount.toLocaleString()}</p>
              <p style="margin: 4px 0;"><strong>Reason:</strong> ${reason.trim()}</p>
              <p style="margin: 4px 0;"><strong>New Balance:</strong> ৳${newBalance.toLocaleString()}</p>
            </div>
            <p>You can use your wallet balance for fast 1-click domain registration and renewals!</p>
            <p style="margin-top: 20px; color: #64748b; text-align: center;">Click2IT Billing Team</p>
          </div>
        `,
                customerEmail: userData.email,
                category: 'payment'
            }).catch(e => console.warn('Balance change email failed:', e));
        }
        return res.json({
            success: true,
            message: `Balance successfully ${effectiveAction === 'add' ? 'credited' : 'debited'}.`,
            newBalance,
            transaction: txData
        });
    }
    catch (error) {
        console.error('Failed to adjust customer balance:', error);
        return res.status(500).json({ error: error.message || 'Failed to adjust balance.' });
    }
};
customersRouter.post('/admin/:userId/balance', requireFirebaseAuth, handleAdminBalanceAdjust);
customersRouter.post('/admin/balance', requireFirebaseAuth, handleAdminBalanceAdjust);
customersRouter.post('/admin/add-funds', requireFirebaseAuth, handleAdminBalanceAdjust);
/**
 * GET /api/admin/customers/:userId/transactions
 * Admin Get Wallet Transactions for a specific customer
 */
customersRouter.get('/admin/:userId/transactions', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid;
    const { userId } = req.params;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    try {
        const db = getAdminDb();
        const txSnap = await db.collection('wallet_transactions')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const transactions = txSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        return res.json({
            success: true,
            transactions
        });
    }
    catch (error) {
        console.error('Failed to get transactions:', error);
        return res.status(500).json({ error: error.message || 'Failed to fetch transactions.' });
    }
});
/**
 * GET /api/admin/customers/deposits/pending
 * Admin List all pending deposit requests
 */
customersRouter.get('/admin/deposits/pending', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    try {
        const db = getAdminDb();
        const depSnap = await db.collection('deposit_requests')
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();
        const deposits = depSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
        return res.json({
            success: true,
            deposits
        });
    }
    catch (error) {
        console.error('Failed to list deposit requests:', error);
        return res.status(500).json({ error: error.message || 'Failed to list deposit requests.' });
    }
});
/**
 * POST /api/admin/customers/deposits/:depositId/verify
 * Admin Approve or Reject a Deposit Request
 */
customersRouter.post('/admin/deposits/:depositId/verify', requireFirebaseAuth, async (req, res) => {
    const adminUid = req.user?.uid;
    const { depositId } = req.params;
    const { action, adminNotes } = req.body;
    const isAdmin = await isUserAdmin(adminUid, req.user?.email).catch(() => false);
    if (!isAdmin) {
        return res.status(403).json({ error: 'Admin authorization required.' });
    }
    if (!['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Action must be approve or reject.' });
    }
    try {
        const db = getAdminDb();
        const depRef = db.collection('deposit_requests').doc(depositId);
        const depSnap = await depRef.get();
        if (!depSnap.exists) {
            return res.status(404).json({ error: 'Deposit request not found.' });
        }
        const depData = depSnap.data();
        if (depData.status !== 'pending') {
            return res.status(400).json({ error: `Deposit request is already ${depData.status}.` });
        }
        const now = new Date().toISOString();
        if (action === 'approve') {
            const userRef = db.collection('users').doc(depData.userId);
            const userSnap = await userRef.get();
            if (!userSnap.exists) {
                return res.status(404).json({ error: 'Customer user document not found.' });
            }
            const userData = userSnap.data();
            const currentBalance = typeof userData.balance === 'number' ? userData.balance : 0;
            const newBalance = currentBalance + depData.amount;
            await userRef.update({
                balance: newBalance,
                updatedAt: now
            });
            // Log wallet transaction
            const txRef = db.collection('wallet_transactions').doc();
            await txRef.set({
                id: txRef.id,
                userId: depData.userId,
                customerEmail: depData.customerEmail,
                customerName: depData.customerName,
                type: 'credit',
                amount: depData.amount,
                balanceBefore: currentBalance,
                balanceAfter: newBalance,
                reason: `Approved Deposit via ${depData.paymentMethod.toUpperCase()} (TX: ${depData.transactionId})`,
                depositRequestId: depositId,
                adminNotes: adminNotes || '',
                createdBy: req.user.email || 'Admin',
                createdAt: now
            });
            await depRef.update({
                status: 'approved',
                adminNotes: adminNotes || '',
                verifiedAt: now,
                verifiedBy: req.user.email || 'Admin',
                updatedAt: now
            });
            // Send email
            if (depData.customerEmail) {
                await sendEmail({
                    to: depData.customerEmail,
                    subject: `Deposit Approved - ৳${depData.amount.toLocaleString()} Credited`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #10b981;">Deposit Request Approved!</h2>
              <p>Dear ${depData.customerName},</p>
              <p>Your deposit of <strong>৳${depData.amount.toLocaleString()}</strong> has been verified and added to your wallet balance.</p>
              <p><strong>New Balance:</strong> ৳${newBalance.toLocaleString()}</p>
              <p>You can now use your balance for domain registration, renewals, and web hosting!</p>
              <p style="margin-top: 20px; color: #64748b; text-align: center;">Thank you for choosing Click2IT!</p>
            </div>
          `,
                    customerEmail: depData.customerEmail,
                    category: 'payment'
                }).catch(e => console.warn('Deposit approved email failed:', e));
            }
            return res.json({
                success: true,
                message: 'Deposit request approved and funds added to customer balance.',
                newBalance
            });
        }
        else {
            // Reject
            await depRef.update({
                status: 'rejected',
                adminNotes: adminNotes || '',
                verifiedAt: now,
                verifiedBy: req.user.email || 'Admin',
                updatedAt: now
            });
            if (depData.customerEmail) {
                await sendEmail({
                    to: depData.customerEmail,
                    subject: `Deposit Request Update - ৳${depData.amount.toLocaleString()}`,
                    html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #ef4444;">Deposit Request Not Approved</h2>
              <p>Dear ${depData.customerName},</p>
              <p>Your deposit request of ৳${depData.amount.toLocaleString()} could not be verified.</p>
              ${adminNotes ? `<p><strong>Note:</strong> ${adminNotes}</p>` : ''}
              <p>If you believe this is an error, please contact support with your payment receipt.</p>
            </div>
          `,
                    customerEmail: depData.customerEmail,
                    category: 'payment'
                }).catch(e => console.warn('Deposit rejected email failed:', e));
            }
            return res.json({
                success: true,
                message: 'Deposit request rejected.'
            });
        }
    }
    catch (error) {
        console.error('Failed to verify deposit request:', error);
        return res.status(500).json({ error: error.message || 'Failed to process deposit verification.' });
    }
});
export default customersRouter;
