import { getAdminDb, getAdminDocument, isUserAdmin } from '../firebase/admin.js';
import { sendEmail } from './email.js';
import { getDynamicTemplate } from './templateHelper.js';
import { getDomainProvider, getHostingProvider } from '../providers/providerFactory.js';
import { getDomainPricingSettings } from './domainPricing.js';
import { resolveDomainProvider } from './btclConfig.js';
import { ProviderError } from '../providers/domain/DomainProviderError.js';
import { classifyHostingError, changeHostingPlan, unsuspendHostingAccount } from './hosting.js';
import { config } from '../config/index.js';
import { getDomainProviderConfig } from './domainProviderConfig.js';

export interface FulfillmentResult {
  success: boolean;
  orderId: string;
  status: 'completed' | 'failed' | 'manual_review' | 'pending';
  domainResults: FulfillmentItemResult[];
  hostingResults: FulfillmentItemResult[];
  error?: string;
}

export interface FulfillmentItemResult {
  itemId: string;
  type: 'domain' | 'hosting';
  action: 'register' | 'renew' | 'transfer' | 'provision' | 'upgrade' | 'unsuspend';
  success: boolean;
  status: string;
  error?: string;
  errorCode?: string;
  providerResult?: any;
}

export async function fulfillOrder(orderId: string, actorUid: string): Promise<FulfillmentResult> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  const orderRef = db.collection('orders').doc(orderId);
  const orderSnap = await orderRef.get();

  if (!orderSnap.exists) {
    return { success: false, orderId, status: 'failed', domainResults: [], hostingResults: [], error: 'Order not found' };
  }

  const orderData = orderSnap.data();
  if (!orderData) {
    return { success: false, orderId, status: 'failed', domainResults: [], hostingResults: [], error: 'Order not found' };
  }

  if (orderData.paymentStatus !== 'verified') {
    return { success: false, orderId, status: 'failed', domainResults: [], hostingResults: [], error: 'Order payment is not verified' };
  }

  if (orderData.status === 'completed') {
    return { success: true, orderId, status: 'completed', domainResults: [], hostingResults: [], error: 'Order already completed' };
  }

  if (orderData.status === 'processing' && !actorUid) {
    return { success: false, orderId, status: 'failed', domainResults: [], hostingResults: [], error: 'Order is already being processed' };
  }

  await orderRef.update({
    status: 'processing',
    providerStatus: 'processing',
    updatedAt: now,
  });

  await writeAuditLog(db, orderId, 'fulfillment_started', actorUid, orderData.status, 'processing', null, null);

  const domainResults: FulfillmentItemResult[] = [];
  const hostingResults: FulfillmentItemResult[] = [];

  const domainOrdersSnap = await db.collection('domainOrders')
    .where('orderId', '==', orderId)
    .get();

  const hostingAccountsSnap = await db.collection('hostingAccounts')
    .where('orderId', '==', orderId)
    .get();

  let hasFailure = false;
  let hasManualReview = false;
  let hasPending = false;

  for (const docSnap of domainOrdersSnap.docs) {
    const dDoc = docSnap.data();
    const domainData = {
      customerEmail: orderData.customerEmail,
      customerName: orderData.customerName,
      customerPhone: orderData.customerPhone,
      shippingAddress: orderData.shippingAddress,
      company: orderData.company,
      contact: dDoc.contact || {
        firstName: orderData.firstName || (orderData.customerName ? orderData.customerName.trim().split(/\s+/)[0] : 'Customer'),
        lastName: orderData.lastName || (orderData.customerName ? orderData.customerName.trim().split(/\s+/).slice(1).join(' ') : 'User'),
        email: orderData.customerEmail,
        phone: orderData.customerPhone,
        companyName: orderData.company || '',
        address: orderData.shippingAddress || 'Dhaka',
        city: 'Dhaka',
        state: 'Dhaka',
        zipcode: '1200',
        country: 'BD'
      },
      ...dDoc
    };
    const result = await fulfillDomainOrder(docSnap.id, domainData, actorUid);
    domainResults.push(result);
    if (!result.success) {
      if (result.status === 'manual_review') {
        hasManualReview = true;
      } else if (result.status === 'pending') {
        hasPending = true;
      } else {
        hasFailure = true;
      }
    }
  }

  for (const docSnap of hostingAccountsSnap.docs) {
    const hostingData = docSnap.data();
    const result = await fulfillHostingAccount(docSnap.id, hostingData, actorUid);
    hostingResults.push(result);
    if (!result.success) {
      if (result.status === 'manual_review') {
        hasManualReview = true;
      } else if (result.status === 'pending') {
        hasPending = true;
      } else {
        hasFailure = true;
      }
    }
  }

  // Process hosting upgrade or renewal items in order
  const orderItems = Array.isArray(orderData.items) ? orderData.items : [];
  for (const item of orderItems) {
    if (item.itemType === 'hosting_upgrade') {
      const hAccountId = item.hostingAccountId;
      const targetPlanId = item.targetPlanId || item.newPlanId || item.planId;
      if (hAccountId && targetPlanId) {
        try {
          const hDocRef = db.collection('hostingAccounts').doc(hAccountId);
          const hSnap = await hDocRef.get();
          if (hSnap.exists) {
            const hData = hSnap.data() || {};
            const providerAccountId = hData.providerAccountId || hData.username;
            if (providerAccountId) {
              await changeHostingPlan(providerAccountId, targetPlanId);
            }
            if (hData.status === 'suspended' && providerAccountId) {
              try {
                await unsuspendHostingAccount(providerAccountId);
              } catch (unsuspendErr) {
                console.warn('[Fulfillment] Error unsuspending hosting account during upgrade:', unsuspendErr);
              }
            }
            await hDocRef.update({
              planId: targetPlanId,
              status: 'active',
              suspendedAt: null,
              suspensionReason: null,
              updatedAt: now,
            });
            await writeAuditLog(db, hAccountId, 'hosting_upgraded', actorUid, hData.planId, targetPlanId, null, 'Hosting plan upgraded to ' + targetPlanId);
            hostingResults.push({
              itemId: hAccountId,
              type: 'hosting',
              action: 'upgrade',
              success: true,
              status: 'completed',
            });
          }
        } catch (upgradeErr: any) {
          console.error('[Fulfillment] Failed to apply hosting upgrade:', upgradeErr);
          hasFailure = true;
          hostingResults.push({
            itemId: hAccountId || orderId,
            type: 'hosting',
            action: 'upgrade',
            success: false,
            status: 'failed',
            error: upgradeErr?.message || 'Failed to apply hosting upgrade',
          });
        }
      }
    }

    if (item.itemType === 'hosting_renewal' && item.hostingAccountId) {
      try {
        const hDocRef = db.collection('hostingAccounts').doc(item.hostingAccountId);
        const hSnap = await hDocRef.get();
        if (hSnap.exists) {
          const hData = hSnap.data() || {};
          if (hData.status === 'suspended') {
            const providerAccountId = hData.providerAccountId || hData.username;
            if (providerAccountId) {
              try {
                await unsuspendHostingAccount(providerAccountId);
              } catch (unsuspendErr) {
                console.warn('[Fulfillment] Error unsuspending hosting account:', unsuspendErr);
              }
            }
            await hDocRef.update({
              status: 'active',
              suspendedAt: null,
              suspensionReason: null,
              updatedAt: now,
            });
            await writeAuditLog(db, item.hostingAccountId, 'hosting_auto_unsuspended', actorUid, 'suspended', 'active', null, 'Auto-unsuspended upon renewal payment');
            hostingResults.push({
              itemId: item.hostingAccountId,
              type: 'hosting',
              action: 'unsuspend',
              success: true,
              status: 'completed',
            });
          }
        }
      } catch (renewErr: any) {
        console.warn('[Fulfillment] Error processing hosting renewal/unsuspend:', renewErr);
      }
    }
  }

  let finalStatus: FulfillmentResult['status'];
  if (hasManualReview) {
    finalStatus = 'manual_review';
  } else if (hasFailure) {
    finalStatus = 'failed';
  } else if (hasPending) {
    finalStatus = 'pending';
  } else {
    finalStatus = 'completed';
  }

  const auditAction = finalStatus === 'pending' ? 'fulfillment_pending' : 'fulfillment_completed';
  const orderStatus = finalStatus === 'pending' ? 'fulfillment_pending' : finalStatus;
  const auditMessage = finalStatus === 'pending'
    ? 'Openprovider accepted the domain request; registration is not active yet.'
    : finalStatus === 'completed' ? null : 'Some items failed fulfillment';
  await orderRef.update({
    status: orderStatus,
    providerStatus: finalStatus,
    updatedAt: now,
  });
  await writeAuditLog(db, orderId, auditAction, actorUid, 'processing', orderStatus, null, auditMessage);

  if (finalStatus === 'completed' && orderData.customerEmail) {
    const subject = `Order Completed - #${orderId.slice(0, 8)} [${orderData.documentNumber || 'Click2IT'}]`;
    const itemsListHtml = (orderData.items || []).map((item: any) => `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 8px; font-weight: 600; color: #1e293b;">${item.name || item.domain || 'Service'}</td>
        <td style="padding: 10px 8px; color: #64748b; text-align: center;">${item.termYears ? `${item.termYears} Year(s)` : (item.description || '1 Year')}</td>
        <td style="padding: 10px 8px; font-weight: 700; color: #0f172a; text-align: right;">৳${item.price || 0}</td>
      </tr>
    `).join('');

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0;">
          <h1 style="color: #0f172a; font-size: 24px; margin: 0 0 6px 0; font-weight: 800;">Click2IT</h1>
          <p style="color: #16a34a; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin: 0;">Order Completed & Activated</p>
        </div>

        <div style="padding: 20px 0;">
          <p style="font-size: 15px; margin: 0 0 12px 0;">Dear <strong>${orderData.customerName || 'Valued Customer'}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
            Great news! Your order <strong>#${orderId.slice(0, 8)}</strong> (${orderData.documentNumber || 'Invoice'}) has been fully processed and all your services are now <strong>ACTIVE</strong>.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
            <thead>
              <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                <th style="padding: 10px 8px; text-align: left; color: #475569; font-weight: 600;">Item / Service</th>
                <th style="padding: 10px 8px; text-align: center; color: #475569; font-weight: 600;">Duration</th>
                <th style="padding: 10px 8px; text-align: right; color: #475569; font-weight: 600;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemsListHtml}
              <tr>
                <td colspan="2" style="padding: 12px 8px; font-weight: 700; text-align: right; color: #334155;">Total Paid:</td>
                <td style="padding: 12px 8px; font-weight: 800; text-align: right; color: #16a34a; font-size: 15px;">৳${orderData.total || 0}</td>
              </tr>
            </tbody>
          </table>

          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px; font-size: 13px;">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #0f172a;">Quick Order Summary:</p>
            <p style="margin: 0 0 4px 0; color: #475569;"><strong>Invoice No:</strong> ${orderData.documentNumber || 'INV-' + orderId.slice(0, 8)}</p>
            <p style="margin: 0 0 4px 0; color: #475569;"><strong>Payment Method:</strong> ${(orderData.paymentMethod || 'Online').toUpperCase()}</p>
            <p style="margin: 0; color: #475569;"><strong>Default Nameservers:</strong> ns1.click2itbd.com, ns2.click2itbd.com</p>
          </div>

          <div style="text-align: center; margin: 24px 0 16px 0;">
            <a href="https://click2it.bd/account/services" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Manage Services in Dashboard</a>
          </div>
        </div>

        <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; font-size: 12px; color: #94a3b8;">
          <p style="margin: 0 0 4px 0;">Click2IT BD &bull; Premium Hosting & Domain Solutions</p>
          <p style="margin: 0;">Need support? Reach out anytime at info@click2itbd.com</p>
        </div>
      </div>
    `;
    const dynamicTmpl = await getDynamicTemplate(
      'order_completed',
      {
        customer_name: orderData.customerName || 'Valued Customer',
        customerName: orderData.customerName || 'Valued Customer',
        order_id: orderId,
        orderId: orderId,
        invoice_no: orderData.documentNumber || ('INV-' + orderId.slice(0, 8)),
        total_amount: '৳' + (orderData.total || 0),
        total: '৳' + (orderData.total || 0),
        payment_method: (orderData.paymentMethod || 'Online').toUpperCase(),
        items_summary: itemsListHtml,
        nameservers: 'ns1.click2itbd.com, ns2.click2itbd.com',
        client_portal_url: 'https://click2it.bd/account/services',
      },
      subject,
      html
    );
    if (dynamicTmpl.isActive !== false) {
      await sendEmail({
        to: orderData.customerEmail,
        subject: dynamicTmpl.subject,
        html: dynamicTmpl.html,
        orderId,
        customerEmail: orderData.customerEmail,
        category: 'order'
      });
    }
  }

  if (finalStatus === 'manual_review' || finalStatus === 'failed') {
    let adminEmail: string | null = null;
    try {
      const siteResult = await getAdminDocument('settings', 'site');
      if (siteResult.exists && siteResult.data) {
        adminEmail = (siteResult.data as any).contactEmail || null;
      }
    } catch (error) {
      console.error('Failed to read site settings:', error);
    }
    if (!adminEmail) {
      adminEmail = process.env.ADMIN_EMAIL || config.smtp.fromEmail || 'info@click2it.bd';
    }
    if (adminEmail) {
      const failedItems = [...domainResults.filter(r => !r.success), ...hostingResults.filter(r => !r.success)];
      const subject = `Order Fulfillment ${finalStatus === 'manual_review' ? 'Needs Review' : 'Failed'} - #${orderId.slice(0, 8)}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: ${finalStatus === 'manual_review' ? '#f59e0b' : '#dc2626'};">Order Fulfillment ${finalStatus === 'manual_review' ? 'Needs Review' : 'Failed'}</h2>
          <p>Order <strong>#${orderId.slice(0, 8)}</strong> requires attention.</p>
          <h3>Failed Items:</h3>
          <ul>
            ${failedItems.map(item => `<li>${item.type}: ${item.action} - ${item.error || 'Unknown error'} (${item.errorCode || 'unknown'})</li>`).join('')}
          </ul>
          <p>Please review and take appropriate action.</p>
        </div>
      `;
      await sendEmail({ to: adminEmail, subject, html, orderId, customerEmail: adminEmail, category: 'system' });
    }
  }

  return {
    success: finalStatus === 'completed',
    orderId,
    status: finalStatus,
    domainResults,
    hostingResults,
    error: finalStatus === 'completed'
      ? undefined
      : finalStatus === 'pending'
        ? 'Registrar accepted the request; confirmation is pending.'
        : 'Some items failed fulfillment',
  };
}

async function fulfillDomainOrder(domainOrderId: string, domainData: any, actorUid: string): Promise<FulfillmentItemResult> {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const isTransferOrder = domainData.type === 'transfer' || domainData.action === 'transfer';
  const itemAction = domainData.type === 'renewal' || domainData.action === 'renewal'
    ? 'renew'
    : isTransferOrder ? 'transfer' : 'register';

  if (domainData.status === 'active' || domainData.status === 'registered') {
    return {
      itemId: domainOrderId,
      type: 'domain',
      action: itemAction,
      success: true,
      status: domainData.status,
      error: 'Already fulfilled',
    };
  }

  if (domainData.status === 'pending' && domainData.registrationId) {
    return {
      itemId: domainOrderId,
      type: 'domain',
      action: itemAction,
      success: false,
      status: 'pending',
      error: 'The registrar accepted this domain request; it will not be submitted a second time.',
    };
  }

  if (isTransferOrder && domainData.transferSubmissionIndeterminate) {
    return {
      itemId: domainOrderId,
      type: 'domain',
      action: 'transfer',
      success: false,
      status: 'manual_review',
      error: 'The transfer request may have reached Openprovider, but no definitive response was recorded. Check Openprovider before retrying to avoid a duplicate transfer.',
    };
  }

  if (
    domainData.status !== 'pending' &&
    domainData.status !== 'pending_payment' &&
    domainData.status !== 'payment_verified' &&
    domainData.status !== 'failed' &&
    domainData.status !== 'manual_review'
  ) {
    return {
      itemId: domainOrderId,
      type: 'domain',
      action: itemAction,
      success: false,
      status: domainData.status,
      error: `Domain status '${domainData.status}' is not eligible for fulfillment`,
    };
  }

  const config = await getDomainProviderConfig();
  const { provider } = await resolveDomainProvider(domainData.domain, config);

  let result: any;
  let action: 'register' | 'renew' | 'transfer' = 'register';
  let errorCode: string | undefined;
  let transferAuthCodeRef: any;
  let transferSubmissionMarked = false;

  try {
    if (isTransferOrder) {
      action = 'transfer';
      const cleanDomain = String(domainData.domain || '').trim().toLowerCase();
      transferAuthCodeRef = db.collection('transferAuthCodes').doc(`${domainData.orderId}_${cleanDomain}`);
      const authCodeSnap = await transferAuthCodeRef.get();
      const authCodeData = authCodeSnap.exists ? authCodeSnap.data() : null;
      const expiresAt = authCodeData?.expiresAt?.toDate
        ? authCodeData.expiresAt.toDate()
        : authCodeData?.expiresAt ? new Date(authCodeData.expiresAt) : null;
      const storedAuthCode = expiresAt && expiresAt.getTime() <= Date.now() ? null : authCodeData?.authCode;
      let authCode = (storedAuthCode || domainData.authCode || domainData.eppCode || '').trim();

      if (!authCode && domainData.orderId) {
        try {
          const ordSnap = await db.collection('orders').doc(domainData.orderId).get();
          if (ordSnap.exists) {
            const ordData = ordSnap.data();
            const matchItem = (ordData?.items || []).find((i: any) =>
              (i.domain && i.domain.toLowerCase() === cleanDomain) ||
              (i.id && i.id.toLowerCase().includes(cleanDomain)) ||
              i.itemType === 'domain_transfer'
            );
            if (matchItem?.authCode || matchItem?.eppCode) {
              authCode = String(matchItem.authCode || matchItem.eppCode).trim();
            }
          }
        } catch {}
      }

      if (!authCode) {
        const message = (expiresAt && !domainData.authCode && !domainData.eppCode)
          ? 'The transfer authorization code has expired. Please submit a fresh EPP/Auth code.'
          : 'Auth code is required for transfer';
        await db.collection('domainOrders').doc(domainOrderId).update({
          status: 'manual_review',
          fulfillmentError: message,
          updatedAt: now,
        });
        await writeAuditLog(db, domainOrderId, 'fulfillment_failed', actorUid, domainData.status, 'manual_review', 'validation_error', message);
        return {
          itemId: domainOrderId,
          type: 'domain',
          action: 'transfer',
          success: false,
          status: 'manual_review',
          error: message,
          errorCode: 'validation_error',
        };
      }
      if (!provider.transferDomain) {
        throw new Error('The configured registrar does not support domain transfers.');
      }
      await db.collection('domainOrders').doc(domainOrderId).update({
        transferRequestStartedAt: now,
        transferSubmissionIndeterminate: true,
        providerResponseReceivedAt: null,
        updatedAt: now,
      });
      transferSubmissionMarked = true;
      // Fetch Order Document to obtain customer profile and contact details
      let ordData: any = null;
      if (domainData.orderId) {
        try {
          const ordSnap = await db.collection('orders').doc(domainData.orderId).get();
          if (ordSnap.exists) {
            ordData = ordSnap.data();
          }
        } catch (e: any) {
          console.warn('[Fulfillment] Failed to fetch order for transfer contact:', e.message);
        }
      }

      // Fetch User Profile fallback
      const targetUserId = domainData.userId || ordData?.userId;
      let userData: any = null;
      if (targetUserId) {
        try {
          const uSnap = await db.collection('users').doc(targetUserId).get();
          if (uSnap.exists) {
            userData = uSnap.data();
          }
        } catch (e: any) {
          console.warn('[Fulfillment] Failed to fetch user profile for transfer contact:', e.message);
        }
      }

      const resolvedEmail = (
        domainData.contact?.email ||
        domainData.customerEmail ||
        ordData?.customerEmail ||
        userData?.email ||
        ''
      ).trim().toLowerCase();

      const rawFullName = (
        (domainData.contact?.firstName ? `${domainData.contact.firstName} ${domainData.contact.lastName || ''}` : '') ||
        domainData.customerName ||
        ordData?.customerName ||
        userData?.displayName ||
        userData?.name ||
        ''
      ).trim();

      const nameParts = rawFullName ? rawFullName.split(/\s+/) : [];
      const firstName = domainData.contact?.firstName || nameParts[0] || 'Customer';
      const lastName = domainData.contact?.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : (firstName !== 'Customer' ? firstName : 'User'));

      const transferContact = {
        firstName,
        lastName,
        email: resolvedEmail,
        phone: domainData.contact?.phone || domainData.customerPhone || ordData?.customerPhone || userData?.phoneNumber || '01700000000',
        companyName: domainData.contact?.companyName || domainData.company || ordData?.company || '',
        address: domainData.contact?.address || domainData.shippingAddress || ordData?.shippingAddress || 'House 1, Road 1, Dhaka',
        city: domainData.contact?.city || ordData?.city || userData?.city || 'Dhaka',
        state: domainData.contact?.state || ordData?.state || userData?.state || 'Dhaka',
        zipcode: domainData.contact?.zipcode || ordData?.zipcode || userData?.zipcode || '1200',
        country: domainData.contact?.country || ordData?.country || userData?.country || 'BD',
      };
      const rawDomainNs = domainData.nameServers || domainData.nameservers || [];
      const transferNs = Array.isArray(rawDomainNs) && rawDomainNs.length > 0 ? rawDomainNs : ['ns1.click2itbd.com', 'ns2.click2itbd.com'];
      result = await provider.transferDomain(
        cleanDomain,
        authCode,
        domainData.years || domainData.termYears || 1,
        transferContact,
        domainData.contactId,
        transferNs
      );
    } else if (domainData.type === 'renewal' || domainData.action === 'renewal') {
      action = 'renew';
      const renewPeriod = Number(domainData.renewalPeriod || domainData.termYears || domainData.years || 1);
      result = await provider.renewDomain(domainData.domain, renewPeriod);
    } else {
      action = 'register';
      const nameParts = (domainData.customerName || '').trim().split(/\s+/);
      const customerContact = domainData.contact || {
        firstName: nameParts[0] || 'Customer',
        lastName: nameParts.slice(1).join(' ') || (nameParts[0] ? nameParts[0] : 'User'),
        email: domainData.customerEmail,
        phone: domainData.customerPhone,
        companyName: domainData.company || '',
        address: domainData.shippingAddress || 'Dhaka',
        city: 'Dhaka',
        state: 'Dhaka',
        zipcode: '1200',
        country: 'BD'
      };

      result = await provider.registerDomain({
        domain: domainData.domain,
        years: domainData.years || domainData.termYears || 1,
        contactId: domainData.contactId,
        contact: customerContact,
        nameServers: domainData.nameServers || domainData.nameservers,
        autoRenew: domainData.autoRenew,
      });
    }
  } catch (error: any) {
    errorCode = error instanceof ProviderError ? error.code : 'provider_error';
    const errorMessage = error.message || 'Fulfillment failed';

    await db.collection('domainOrders').doc(domainOrderId).update({
      status: 'manual_review',
      fulfillmentError: errorMessage,
      errorCode,
      ...(action === 'transfer' ? {
        transferSubmissionIndeterminate: transferSubmissionMarked,
      } : {}),
      retryCount: (domainData.retryCount || 0) + 1,
      lastRetryAt: now,
      updatedAt: now,
    });

    await writeAuditLog(db, domainOrderId, 'fulfillment_failed', actorUid, domainData.status, 'manual_review', errorCode, errorMessage);

    return {
      itemId: domainOrderId,
      type: 'domain',
      action,
      success: false,
      status: 'manual_review',
      error: errorMessage,
      errorCode,
    };
  }

  const isSuccess = result?.success || false;
  const providerStatus = String(result?.status || '').toUpperCase();
  const isProviderPending = (action === 'register' || action === 'transfer')
    && isSuccess
    && ['REQ', 'UNKNOWN'].includes(providerStatus);
  const transferSubmissionIndeterminate = action === 'transfer'
    && Boolean(result?.requestStartedAt)
    && (!result?.responseReceivedAt
      || (!isSuccess && result?.providerHttpStatus >= 200 && result?.providerHttpStatus < 300 && result?.providerCode === '0'));
  const newStatus = transferSubmissionIndeterminate
    ? 'manual_review'
    : isProviderPending ? 'pending' : isSuccess ? 'active' : 'failed';
  const providerMessage = isProviderPending
    ? result?.error || 'Openprovider accepted the request; registration is not active yet.'
    : transferSubmissionIndeterminate
      ? 'The transfer request may have reached Openprovider, but no definitive result was returned. Check Openprovider before retrying.'
      : result?.error || null;

  const calculatedExpiry = result?.expiresAt || result?.newExpiryDate || domainData.expiresAt || null;
  await db.collection('domainOrders').doc(domainOrderId).update({
    status: newStatus,
    registrationId: result?.registrationId || result?.transferId || domainData.registrationId || null,
    transferId: result?.transferId || domainData.transferId || null,
    expiresAt: calculatedExpiry,
    newExpiryDate: calculatedExpiry,
    error: providerMessage,
    fulfillmentError: providerMessage,
    providerStatus: result?.status || null,
    providerCode: result?.providerCode || null,
    providerHttpStatus: result?.providerHttpStatus || null,
    providerRequestStartedAt: result?.requestStartedAt || null,
    providerResponseReceivedAt: result?.responseReceivedAt || null,
    ...(action === 'transfer' ? {
      transferRequestStartedAt: result?.requestStartedAt || null,
      transferSubmissionIndeterminate,
    } : {}),
    updatedAt: now,
  });
  if (action === 'renew' && isSuccess && calculatedExpiry) {
    try {
      const cleanDom = String(domainData.domain || '').trim().toLowerCase();
      const activeDomainsSnap = await db.collection('domainOrders')
        .where('domain', '==', cleanDom)
        .where('status', '==', 'active')
        .get();

      for (const aDoc of activeDomainsSnap.docs) {
        if (aDoc.id !== domainOrderId) {
          await aDoc.ref.update({
            expiresAt: calculatedExpiry,
            newExpiryDate: calculatedExpiry,
            updatedAt: now,
          });
        }
      }
    } catch (renewUpdateErr: any) {
      console.warn('[Fulfillment] Error updating primary active domain record after renewal:', renewUpdateErr.message);
    }
  }

  if (action === 'transfer' && isSuccess && transferAuthCodeRef) {
    try {
      await transferAuthCodeRef.delete();
    } catch (error) {
      console.error('[Fulfillment] Failed to remove consumed transfer authorization code:', {
        domainOrderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const auditResult = isProviderPending ? 'fulfillment_pending' : isSuccess ? 'fulfilled' : 'fulfillment_failed';
  await writeAuditLog(db, domainOrderId, auditResult, actorUid, domainData.status, newStatus, result?.providerCode || null, providerMessage);

  const nsList = Array.isArray(domainData.nameServers) && domainData.nameServers.filter(Boolean).length > 0
    ? domainData.nameServers.filter(Boolean)
    : Array.isArray(domainData.nameservers) && domainData.nameservers.filter(Boolean).length > 0
      ? domainData.nameservers.filter(Boolean)
      : ['ns1.click2itbd.com', 'ns2.click2itbd.com'];
  const ownerDisplay = domainData.customerName || domainData.contact?.firstName || 'Valued Customer';
  const transferOrRegId = result?.transferId || result?.registrationId || domainOrderId.slice(0, 10);
  const expiryDisplay = result?.expiresAt || result?.newExpiryDate
    ? new Date(result.expiresAt || result.newExpiryDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : `${domainData.years || domainData.termYears || 1} Year(s) (+1 Year Extended)`;

  if (isSuccess && isProviderPending && action === 'transfer' && domainData.customerEmail) {
    const subject = `🔄 Domain Transfer Initiated - ${domainData.domain} [Click2IT]`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #2563eb 100%); padding: 24px; border-radius: 12px; color: #ffffff; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800;">🔄 Domain Transfer Initiated</h2>
          <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 13px;">Your transfer request has been submitted to the global domain registry</p>
        </div>
        <p style="font-size: 15px; margin: 0 0 12px 0;">Dear <strong>${ownerDisplay}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          Your domain transfer for <strong>${domainData.domain}</strong> has been verified and submitted to Openprovider. Below are your complete domain, ownership, and nameserver details:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px;">
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; width: 42%; border-bottom: 1px solid #e2e8f0;">Domain Name</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${domainData.domain}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Transfer Status</td><td style="padding: 10px 14px; color: #d97706; font-weight: 800; border-bottom: 1px solid #e2e8f0;">Pending Registry Approval (REQ)</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Transfer Reference ID</td><td style="padding: 10px 14px; color: #0f172a; font-family: monospace; border-bottom: 1px solid #e2e8f0;">#${transferOrRegId}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Registered Owner</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${ownerDisplay} (${domainData.customerEmail})</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Primary Nameserver (NS1)</td><td style="padding: 10px 14px; color: #2563eb; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${nsList[0] || 'ns1.click2itbd.com'}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Secondary Nameserver (NS2)</td><td style="padding: 10px 14px; color: #2563eb; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${nsList[1] || 'ns2.click2itbd.com'}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569;">Validity Extension</td><td style="padding: 10px 14px; color: #16a34a; font-weight: 700;">+1 Year Free Renewal Included</td></tr>
        </table>
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 14px; font-size: 13px; color: #92400e; margin-bottom: 18px;">
          <strong>⏱ What Happens Next?</strong><br/>
          Please check your email for any transfer confirmation link from your previous registrar to speed up the release. Otherwise, standard registry transfers complete automatically within 5–7 days.
        </div>
        <div style="text-align: center; margin: 22px 0 12px 0;">
          <a href="https://click2it.com.bd/my-services" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Track Transfer &amp; Manage Nameservers</a>
        </div>
      </div>
    `;
    const dynamicTmpl = await getDynamicTemplate(
      'domain_transfer',
      {
        customer_name: ownerDisplay,
        customerName: ownerDisplay,
        domain: domainData.domain,
        transfer_id: '#' + transferOrRegId,
        nameservers: nsList.join(', '),
        ns1: nsList[0] || 'ns1.click2itbd.com',
        ns2: nsList[1] || 'ns2.click2itbd.com',
        status: 'Pending Registry Approval (REQ)',
        portal_url: 'https://click2it.com.bd/my-services',
      },
      subject,
      html
    );
    if (dynamicTmpl.isActive !== false) {
      await sendEmail({
        to: domainData.customerEmail,
        subject: dynamicTmpl.subject,
        html: dynamicTmpl.html,
        orderId: domainData.orderId,
        customerEmail: domainData.customerEmail,
        category: 'domain'
      });
    }
  }

  if (isSuccess && !isProviderPending && domainData.customerEmail) {
    const actionLabel = action === 'renew' ? 'Renewed' : action === 'transfer' ? 'Transferred & Activated' : 'Registered & Activated';
    const subject = `✅ Domain ${actionLabel} - ${domainData.domain} [Click2IT]`;
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
        <div style="background: linear-gradient(135deg, #065f46 0%, #16a34a 100%); padding: 24px; border-radius: 12px; color: #ffffff; text-align: center; margin-bottom: 20px;">
          <h2 style="margin: 0; font-size: 22px; font-weight: 800;">🎉 Domain ${actionLabel}!</h2>
          <p style="margin: 6px 0 0; color: #bbf7d0; font-size: 13px;">Your domain is active and ready to manage in your Click2IT Client Portal</p>
        </div>
        <p style="font-size: 15px; margin: 0 0 12px 0;">Dear <strong>${ownerDisplay}</strong>,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
          Great news! Your domain <strong>${domainData.domain}</strong> has been successfully ${action === 'renew' ? 'renewed' : action === 'transfer' ? 'transferred to Click2IT' : 'registered'}. Below are your active domain &amp; nameserver details:
        </p>
        <table style="width: 100%; border-collapse: collapse; margin: 18px 0; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; font-size: 13px;">
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; width: 42%; border-bottom: 1px solid #e2e8f0;">Domain Name</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 800; border-bottom: 1px solid #e2e8f0;">${domainData.domain}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Status</td><td style="padding: 10px 14px; color: #16a34a; font-weight: 800; border-bottom: 1px solid #e2e8f0;">ACTIVE</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Reference ID</td><td style="padding: 10px 14px; color: #0f172a; font-family: monospace; border-bottom: 1px solid #e2e8f0;">#${transferOrRegId}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Registered Owner</td><td style="padding: 10px 14px; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${ownerDisplay} (${domainData.customerEmail})</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Primary Nameserver (NS1)</td><td style="padding: 10px 14px; color: #2563eb; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${nsList[0] || 'ns1.click2itbd.com'}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569; border-bottom: 1px solid #e2e8f0;">Secondary Nameserver (NS2)</td><td style="padding: 10px 14px; color: #2563eb; font-family: monospace; font-weight: 700; border-bottom: 1px solid #e2e8f0;">${nsList[1] || 'ns2.click2itbd.com'}</td></tr>
          <tr><td style="padding: 10px 14px; font-weight: 700; color: #475569;">Validity / Expiry</td><td style="padding: 10px 14px; color: #0f172a; font-weight: 700;">${expiryDisplay}</td></tr>
        </table>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
          You can update your Nameservers, manage DNS records (A, CNAME, MX, TXT), or configure Registrar Lock anytime from your Client Dashboard.
        </p>
        <div style="text-align: center; margin: 22px 0 12px 0;">
          <a href="https://click2it.com.bd/my-services" style="background-color: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">Manage Nameservers &amp; DNS</a>
        </div>
      </div>
    `;
    const dynamicTmpl = await getDynamicTemplate(
      'domain_registration',
      {
        customer_name: ownerDisplay,
        customerName: ownerDisplay,
        domain: domainData.domain,
        registration_id: '#' + transferOrRegId,
        expiry_date: expiryDisplay,
        nameservers: nsList.join(', '),
        ns1: nsList[0] || 'ns1.click2itbd.com',
        ns2: nsList[1] || 'ns2.click2itbd.com',
        action_label: actionLabel,
        portal_url: 'https://click2it.com.bd/my-services',
      },
      subject,
      html
    );
    if (dynamicTmpl.isActive !== false) {
      await sendEmail({
        to: domainData.customerEmail,
        subject: dynamicTmpl.subject,
        html: dynamicTmpl.html,
        orderId: domainData.orderId,
        customerEmail: domainData.customerEmail,
        category: 'domain'
      });
    }
  }

  return {
    itemId: domainOrderId,
    type: 'domain',
    action,
    success: isSuccess && !isProviderPending,
    status: newStatus,
    error: providerMessage || undefined,
    errorCode: isSuccess && !isProviderPending ? undefined : errorCode || result?.providerCode,
    providerResult: result,
  };
}

async function fulfillHostingAccount(hostingAccountId: string, hostingData: any, actorUid: string): Promise<FulfillmentItemResult> {
  const db = getAdminDb();
  const now = new Date().toISOString();

  if (hostingData.status === 'suspended') {
    const providerAccountId = hostingData.providerAccountId || hostingData.username;
    if (providerAccountId) {
      try {
        await unsuspendHostingAccount(providerAccountId);
      } catch (err: any) {
        console.warn('[Fulfillment] Could not unsuspend cPanel account ' + providerAccountId + ':', err.message);
      }
    }
    await db.collection('hostingAccounts').doc(hostingAccountId).update({
      status: 'active',
      suspendedAt: null,
      suspensionReason: null,
      updatedAt: now,
    });
    await writeAuditLog(db, hostingAccountId, 'hosting_auto_unsuspended', actorUid, 'suspended', 'active', null, 'Auto-unsuspended upon order fulfillment');
    return {
      itemId: hostingAccountId,
      type: 'hosting',
      action: 'unsuspend',
      success: true,
      status: 'active',
    };
  }

  if (hostingData.status === 'active' || hostingData.provisioningStatus === 'completed') {
    return {
      itemId: hostingAccountId,
      type: 'hosting',
      action: 'provision',
      success: true,
      status: hostingData.status,
      error: 'Already fulfilled',
    };
  }

  if (hostingData.status !== 'pending' && hostingData.status !== 'pending_payment' && hostingData.status !== 'failed' && hostingData.status !== 'manual_review' && hostingData.provisioningStatus !== 'pending' && hostingData.provisioningStatus !== 'failed') {
    return {
      itemId: hostingAccountId,
      type: 'hosting',
      action: 'provision',
      success: false,
      status: hostingData.status,
      error: `Hosting status '${hostingData.status}' is not eligible for fulfillment`,
    };
  }

  let contactEmail = hostingData.contactEmail || hostingData.customerEmail || '';
  let customerName = hostingData.customerName || '';
  if ((!contactEmail || !customerName) && hostingData.orderId) {
    try {
      const orderDoc = await db.collection('orders').doc(hostingData.orderId).get();
      if (orderDoc.exists) {
        const oData = orderDoc.data() || {};
        if (!contactEmail) contactEmail = oData.customerEmail || oData.email || '';
        if (!customerName) customerName = oData.customerName || '';
      }
    } catch (e) {
      console.warn('Error loading order for hosting account:', e);
    }
  }

  // Handle VPS accounts (manual provisioning / dedicated server setup)
  if (hostingData.provider === 'vps' || hostingData.type === 'vps' || hostingData.vpsDetails) {
    const vpsDetails = hostingData.vpsDetails || {};
    await db.collection('hostingAccounts').doc(hostingAccountId).update({
      status: 'pending_setup',
      provisioningStatus: 'manual_pending',
      contactEmail,
      customerEmail: contactEmail,
      updatedAt: now,
    });

    await writeAuditLog(
      db,
      hostingAccountId,
      'vps_fulfillment_queued',
      actorUid,
      hostingData.status,
      'pending_setup',
      null,
      `Cloud VPS order acknowledged for ${vpsDetails.hostname || 'server'}. Waiting for admin dedicated IP allocation.`
    );

    if (contactEmail) {
      const vpsName = hostingData.name || hostingData.planId || 'Cloud VPS';
      const subject = `🚀 Cloud VPS Order Confirmed - ${vpsDetails.hostname || vpsName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #4f46e5;">Cloud VPS Provisioning in Progress</h2>
          <p>Dear <strong>${customerName || 'Valued Customer'}</strong>,</p>
          <p>Thank you for your order! Your payment has been verified, and your Cloud VPS deployment request is queued.</p>
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 18px 0;">
            <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; text-transform: uppercase;">Server Configuration</div>
            <div style="font-size: 14px; margin-bottom: 6px;"><strong>Hostname:</strong> ${vpsDetails.hostname || 'Not specified'}</div>
            <div style="font-size: 14px; margin-bottom: 6px;"><strong>Operating System:</strong> ${vpsDetails.os || 'Linux'}</div>
            <div style="font-size: 14px; margin-bottom: 6px;"><strong>Datacenter:</strong> ${vpsDetails.serverLocation || 'Dhaka / Global'}</div>
          </div>
          <p>Our network team is configuring your dedicated IP address and OS image. You will receive an activation email once your server is live and reachable via SSH.</p>
          <p>Track your server status anytime in your <a href="https://click2it.bd/dashboard" style="color: #4f46e5; font-weight: 600;">Client Dashboard</a>.</p>
        </div>
      `;
      try {
        await sendEmail({
          to: contactEmail,
          subject,
          html,
          orderId: hostingData.orderId,
          customerEmail: contactEmail,
          category: 'hosting'
        });
      } catch (err) {
        console.warn('[Fulfillment] VPS email sending error:', err);
      }
    }

    return {
      itemId: hostingAccountId,
      type: 'hosting',
      action: 'provision',
      success: true,
      status: 'pending_setup',
      error: undefined,
    };
  }

  const { provider } = await getHostingProviderWithSettings();

  try {
    const result = await provider.provisionAccount({
      domain: hostingData.domain || 'click2it.bd',
      contactEmail,
      billingCycle: hostingData.billingCycle || 'monthly',
      planCode: hostingData.planId || 'default',
    });

    const isSuccess = result.success || false;

    if (isSuccess) {
      await db.collection('hostingAccounts').doc(hostingAccountId).update({
        providerAccountId: result.providerAccountId,
        status: 'active',
        provisioningStatus: 'completed',
        cPanelUrl: result.cPanelUrl,
        nameservers: result.nameservers || [],
        contactEmail,
        customerEmail: contactEmail,
        updatedAt: now,
      });
    } else {
      await db.collection('hostingAccounts').doc(hostingAccountId).update({
        status: 'failed',
        provisioningStatus: 'failed',
        error: result.error,
        contactEmail,
        customerEmail: contactEmail,
        updatedAt: now,
      });
    }

    await writeAuditLog(db, hostingAccountId, isSuccess ? 'fulfilled' : 'fulfillment_failed', actorUid, hostingData.status, isSuccess ? 'active' : 'failed', null, result?.error || null);

    if (isSuccess && contactEmail) {
      const fromName = await getSiteName();
      let emailSubject = `🎉 Your Hosting Account is Ready - ${hostingData.domain}`;
      let heading = 'Welcome to Click2IT Cloud Hosting!';
      let badgeText = '✓ Hosting Account Active';
      let bodyHtml = `
        <p>Dear <strong>${customerName || 'Valued Customer'}</strong>,</p>
        <p>Congratulations! Your cPanel cloud hosting account for <strong>${hostingData.domain}</strong> is now active and ready for your website.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 18px; margin: 18px 0;">
          <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 10px; text-transform: uppercase;">cPanel Login Details</div>
          <div style="font-size: 14px; margin-bottom: 6px;"><strong>Domain:</strong> ${hostingData.domain}</div>
          <div style="font-size: 14px; margin-bottom: 6px;"><strong>cPanel Username:</strong> <code style="background:#e2e8f0; padding:2px 6px; border-radius:4px;">${result.providerAccountId || 'See control panel'}</code></div>
          ${result.cPanelUrl ? `<div style="font-size: 14px; margin-bottom: 6px;"><strong>Control Panel:</strong> <a href="${result.cPanelUrl}" style="color: #2563eb; font-weight: 600;">${result.cPanelUrl}</a></div>` : ''}
          ${result.nameservers?.length ? `<div style="font-size: 14px; margin-top: 10px;"><strong>Nameservers:</strong><br>${result.nameservers.map((ns: string) => `&bull; ${ns}`).join('<br>')}</div>` : ''}
        </div>
        <p>You can also log in to your account from your client portal at <a href="https://click2it.bd" style="color: #2563eb;">click2it.bd</a> anytime.</p>
      `;
      let footerNote = 'Need help moving your site? Contact our 24/7 technical support team.';

      try {
        const tmplSnap = await db.collection('emailTemplates').doc('welcome_hosting').get();
        if (tmplSnap.exists) {
          const tData = tmplSnap.data() || {};
          if (tData.subject) {
            emailSubject = tData.subject
              .replace(/\{\{domain\}\}/g, hostingData.domain)
              .replace(/\{\{customerName\}\}/g, customerName || 'Valued Customer')
              .replace(/\{\{username\}\}/g, result.providerAccountId || '')
                .replace(/\{\{password\}\}/g, result.password || '')
              .replace(/\{\{cPanelUrl\}\}/g, result.cPanelUrl || '');
          }
          if (tData.heading) heading = tData.heading;
          if (tData.badgeText) badgeText = tData.badgeText;
          if (tData.bodyHtml) {
            bodyHtml = tData.bodyHtml
              .replace(/\{\{domain\}\}/g, hostingData.domain)
              .replace(/\{\{customerName\}\}/g, customerName || 'Valued Customer')
              .replace(/\{\{username\}\}/g, result.providerAccountId || '')
                .replace(/\{\{password\}\}/g, result.password || '')
              .replace(/\{\{cPanelUrl\}\}/g, result.cPanelUrl || '')
              .replace(/\{\{nameservers\}\}/g, (result.nameservers || []).join(', '));
          }
          if (tData.footerNote !== undefined) footerNote = tData.footerNote;
        }
      } catch (tmplErr) {
        console.warn('Could not load custom email template from Firestore:', tmplErr);
      }

      const fullHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 25px 10px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
                  <tr>
                    <td style="background: linear-gradient(135deg, #0a1628 0%, #1e3a8a 100%); padding: 30px 24px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">${fromName}</h1>
                      <p style="margin: 4px 0 0; color: #93c5fd; font-size: 13px;">${heading}</p>
                      <div style="margin-top: 14px; display: inline-block; background: rgba(34, 197, 94, 0.2); border: 1px solid #22c55e; border-radius: 30px; padding: 4px 14px;">
                        <span style="color: #4ade80; font-size: 12px; font-weight: 700; text-transform: uppercase;">${badgeText}</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 24px 28px; color: #1f2937; line-height: 1.6; font-size: 14px;">
                      ${bodyHtml}
                    </td>
                  </tr>
                  ${footerNote ? `
                  <tr>
                    <td style="padding: 0 28px 20px;">
                      <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; border-radius: 0 8px 8px 0; font-size: 12px; color: #1e40af;">
                        ${footerNote}
                      </div>
                    </td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="background-color: #f8fafc; border-top: 1px solid #e5e7eb; padding: 20px 24px; text-align: center; font-size: 12px; color: #64748b;">
                      <p style="margin: 0; font-weight: 700; color: #0f172a;">${fromName}</p>
                      <p style="margin: 4px 0 0;">Email: info@click2it.bd | Web: click2it.bd</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `;

      await sendEmail({ to: contactEmail, subject: emailSubject, html: fullHtml, orderId: hostingData.orderId, customerEmail: contactEmail, category: 'hosting' });
    }

    return {
      itemId: hostingAccountId,
      type: 'hosting',
      action: 'provision',
      success: isSuccess,
      status: isSuccess ? 'active' : 'failed',
      error: result.error,
      errorCode: isSuccess ? undefined : classifyHostingError(result.error).code,
      providerResult: result,
    };
  } catch (error: any) {
    const classified = classifyHostingError(error);
    await db.collection('hostingAccounts').doc(hostingAccountId).update({
      status: 'manual_review',
      provisioningStatus: 'failed',
      error: classified.message,
      errorCode: classified.code,
      retryCount: (hostingData.retryCount || 0) + 1,
      lastRetryAt: now,
      updatedAt: now,
    });

    await writeAuditLog(db, hostingAccountId, 'fulfillment_failed', actorUid, hostingData.status, 'manual_review', classified.code, classified.message);

    return {
      itemId: hostingAccountId,
      type: 'hosting',
      action: 'provision',
      success: false,
      status: 'manual_review',
      error: classified.message,
      errorCode: classified.code,
    };
  }
}

async function getHostingProviderWithSettings() {
  let hostingApiType = process.env.WHM_API_TYPE || config.secrets.whmApiType || 'cpanel';
  let hostingApiKey = process.env.WHM_API_TOKEN || process.env.WHM_API_KEY || config.secrets.whmApiToken || config.secrets.whmApiKey || '';
  let hostingApiUrl = process.env.WHM_URL || process.env.WHM_API_URL || config.secrets.whmApiUrl || '';
  let hostingApiUsername = (process.env.WHM_USERNAME || config.secrets.whmUsername || 'root').trim();

  if (!hostingApiKey || !hostingApiUrl) {
    try {
      const hostingDoc = await getAdminDocument('settings', 'hostingApiConfig');
      if (hostingDoc.exists && hostingDoc.data) {
        if (!hostingApiKey && hostingDoc.data.hostingApiKey) hostingApiKey = hostingDoc.data.hostingApiKey;
        if (!hostingApiUrl && hostingDoc.data.hostingApiUrl) hostingApiUrl = hostingDoc.data.hostingApiUrl;
        if (hostingDoc.data.hostingApiType) hostingApiType = hostingDoc.data.hostingApiType;
        if (hostingDoc.data.hostingApiUsername) hostingApiUsername = hostingDoc.data.hostingApiUsername;
      }
    } catch (e) {
      console.warn('[Fulfillment] Error reading hostingApiConfig from Firestore:', e);
    }
  }

  if (!hostingApiKey) {
    throw new Error('No WHM API token configured. Set in Admin Hosting API Settings or backend/.env');
  }
  if (!hostingApiUrl) {
    throw new Error('No WHM API URL configured. Set in Admin Hosting API Settings or backend/.env');
  }

  const provider = getHostingProvider({
    hostingApiType,
    hostingApiKey,
    hostingApiUrl,
    hostingApiUsername,
  });

  return { provider };
}

async function getSiteName(): Promise<string> {
  try {
    const result = await getAdminDocument('settings', 'site');
    if (result.exists && result.data) {
      return (result.data as any).siteName || 'Click2IT';
    }
  } catch (error) {
    console.error('Failed to read site settings:', error);
  }
  return 'Click2IT';
}

async function writeAuditLog(
  db: any,
  orderId: string,
  action: string,
  actorUid: string,
  previousStatus: string,
  newStatus: string,
  errorCode: string | null,
  errorMessage: string | null
): Promise<void> {
  try {
    await db.collection('fulfillmentAuditLog').add({
      orderId,
      action,
      actorUid,
      previousStatus,
      newStatus,
      errorCode: errorCode || null,
      errorMessage: errorMessage || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to write audit log:', error);
  }
}
