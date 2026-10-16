const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { getFirestore, updateDoc } = require("firebase-admin/firestore");
const crypto = require("crypto");
const openprovider = require('./openprovider');
admin.initializeApp();

async function isAdminUser(uid) {
  if (!uid) return false;
  try {
    const userDoc = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('users').doc(uid).get();
    if (userDoc.exists) {
      const data = userDoc.data();
      return data?.role === 'admin';
    }
    return false;
  } catch (error) {
    console.error('Failed to check admin role:', error);
    return false;
  }
}

function sanitizeLogData(data) {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  const sensitiveFields = ['apiKey', 'openproviderPassword', 'resendApiKey', 'bkashAppKey', 'bkashAppSecret', 'bkashUsername', 'bkashPassword', 'clnSecretKey', 'smtpPassword', 'hostingApiKey', 'whmApiToken', 'accessToken', 'id_token', 'authCode', 'password', 'secret'];
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '***REDACTED***';
    }
  }
  return sanitized;
}

async function verifyPaymentWithGateway(orderId, orderData) {
  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  
  if (orderData.bkashPaymentId) {
    try {
      let accessToken;
      try {
        accessToken = await getBkashAccessToken(db);
      } catch (e) {
        console.error('Failed to get bKash access token:', e);
        return false;
      }

      const creds = await getBkashCredentials(db);
      const response = await fetch(`${creds.baseUrl}/tokenized/checkout/payment/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
          'X-APP-Key': creds.appKey
        },
        body: JSON.stringify({
          paymentID: orderData.bkashPaymentId
        })
      });

      const rawText = await response.text();
      let apiData;
      try { apiData = JSON.parse(rawText); } catch (e) { apiData = {}; }

      if (!response.ok || apiData.status_code !== '0000') {
        const status = apiData?.status;
        const status_code = apiData?.status_code;
        console.error('bKash payment verification failed:', { status, status_code });
        return false;
      }

      const paymentStatus = apiData.status || apiData.transactionStatus || '';
      const isPaid = paymentStatus.toLowerCase() === 'completed' || 
                     paymentStatus.toLowerCase() === 'success' ||
                     apiData.status_code === '0000';
      
      if (!isPaid) {
        console.error('bKash payment not completed:', { paymentId: orderData.bkashPaymentId, status: paymentStatus });
        return false;
      }

      const paidAmount = parseFloat(apiData.amount || '0');
      const orderAmount = parseFloat(orderData.total || orderData.grandTotal || '0');
      
      if (paidAmount > 0 && Math.abs(paidAmount - orderAmount) > 1) {
        console.error('bKash payment amount mismatch:', { expected: orderAmount, actual: paidAmount });
        return false;
      }

      return true;
    } catch (error) {
      console.error('bKash payment verification error:', error);
      return false;
    }
  }

  // No payment ID found - cannot verify
  console.warn('Payment verification skipped: no payment ID found for order', orderId);
  return false;
}

async function sendOrderEmail(to, subject, html) {
  console.warn('sendOrderEmail is deprecated. Use backend /api/send-email endpoint instead.');
}

exports.storeTransferAuthCodes = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { orderId, authCodes } = data;
  
  if (!orderId || !Array.isArray(authCodes) || authCodes.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId and authCodes array are required.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  
  try {
    const batch = db.batch();
    
    for (const codeData of authCodes) {
      const { domain, authCode } = codeData;
      if (!domain || !authCode) continue;
      
      const docRef = db.collection('transferAuthCodes').doc(`${orderId}_${domain}`);
      batch.set(docRef, {
        orderId,
        domain,
        authCode,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        expiresAt: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // 24 hours
      });
    }
    
    await batch.commit();
    return { success: true, message: 'Transfer auth codes stored securely' };
  } catch (error) {
    console.error('Failed to store transfer auth codes:', error);
    throw new functions.https.HttpsError('internal', 'Failed to store transfer auth codes.');
  }
});

exports.cleanupTransferAuthCodes = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { orderId, domains } = data;
  
  if (!orderId || !Array.isArray(domains)) {
    throw new functions.https.HttpsError('invalid-argument', 'orderId and domains array are required.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  
  try {
    const batch = db.batch();
    
    for (const domain of domains) {
      const docRef = db.collection('transferAuthCodes').doc(`${orderId}_${domain}`);
      batch.delete(docRef);
    }
    
    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Failed to cleanup transfer auth codes:', error);
    throw new functions.https.HttpsError('internal', 'Failed to cleanup transfer auth codes.');
  }
});

exports.checkTransferEligibility = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { domain } = data;
  
  if (!domain || typeof domain !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'Domain is required.');
  }

  const normalizedDomain = domain.toLowerCase().trim();
  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  
  try {
    // Check if domain is already transferred/registered with us
    const existingOrderSnap = await db.collection('domainOrders')
      .where('domain', '==', normalizedDomain)
      .where('status', 'in', ['active', 'pending', 'renewing'])
      .limit(1)
      .get();
    
    if (!existingOrderSnap.empty) {
      return {
        eligible: false,
        reason: 'This domain is already registered or being processed with us.',
        code: 'DOMAIN_ALREADY_MANAGED'
      };
    }

    // Check if there's a pending transfer for this domain
    const pendingTransferSnap = await db.collection('domainOrders')
      .where('domain', '==', normalizedDomain)
      .where('action', '==', 'transfer')
      .where('status', '==', 'pending')
      .limit(1)
      .get();
    
    if (!pendingTransferSnap.empty) {
      return {
        eligible: false,
        reason: 'A transfer for this domain is already in progress.',
        code: 'TRANSFER_ALREADY_PENDING'
      };
    }

    // Basic domain format validation
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(normalizedDomain)) {
      return {
        eligible: false,
        reason: 'Invalid domain format.',
        code: 'INVALID_DOMAIN_FORMAT'
      };
    }

    return {
      eligible: true,
      message: 'Domain appears eligible for transfer. Final eligibility will be confirmed by the current registrar during the transfer process.',
      checks: {
        formatValid: true,
        notAlreadyManaged: true,
        noPendingTransfer: true
      }
    };
  } catch (error) {
    console.error('Transfer eligibility check error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to check transfer eligibility.');
  }
});

exports.paymentWebhook = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type, x-internal-secret');
    return res.status(204).send('');
  }

  try {
    const { orderId, status, transactionId } = req.body; 

    if (!orderId || typeof orderId !== 'string') {
      return res.status(400).send("Missing or invalid orderId");
    }

    const allowedStatuses = ['success', 'manual_verified', 'failed'];
    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).send("Invalid status");
    }

    if (transactionId && typeof transactionId !== 'string') {
      return res.status(400).send("Invalid transactionId");
    }

    let targetRef = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection("orders").doc(orderId);
    let docSnap = await targetRef.get();

    if (!docSnap.exists) {
      targetRef = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection("invoices").doc(orderId);
      docSnap = await targetRef.get();
    }

    if (!docSnap.exists) {
      return res.status(404).send("Order/Invoice not found");
    }

    const orderData = docSnap.data();

    if (orderData.provisioningStatus === 'completed') {
      return res.status(200).send({ message: "Order already processed", orderId });
    }

    if (orderData.provisioningStatus === 'processing') {
      return res.status(200).send({ message: "Order is already being processed", orderId });
    }

    if (status === "success" || status === "manual_verified") {
      let paymentVerified = false;
      if (status === "success") {
        paymentVerified = await verifyPaymentWithGateway(orderId, orderData);
        if (!paymentVerified) {
          await targetRef.update({
            paymentStatus: 'failed',
            provisioningStatus: 'failed',
            provisioningError: 'Payment verification failed with gateway',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          return res.status(400).send({ error: "Payment verification failed" });
        }
      } else if (status === "manual_verified") {
        const internalSecret = req.headers['x-internal-secret'];
        if (internalSecret !== process.env.MANUAL_PAYMENT_SECRET) {
          return res.status(401).send("Unauthorized");
        }
        if (orderData.paymentStatus !== 'verified') {
          await targetRef.update({
            paymentStatus: 'failed',
            provisioningStatus: 'failed',
            provisioningError: 'Payment not verified by admin',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          return res.status(400).send({ error: "Payment not verified by admin" });
        }
        paymentVerified = true;
      }

      if (!paymentVerified) {
        return res.status(400).send({ error: "Payment not verified" });
      }

    const updateData = {
      status: "processing",
      provisioningStatus: "processing",
      transactionId: transactionId || orderData.transactionId || "N/A",
      paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status === "success") {
      updateData.paymentStatus = "paid";
    }

    await targetRef.update(updateData);

    const orderIdShort = orderId.slice(0, 8);
    sendOrderEmail(orderData.customerEmail, `Order Confirmed - #${orderIdShort}`, `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Order Confirmed!</h2>
        <p>Dear ${orderData.customerName || 'Customer'},</p>
        <p>Thank you for your order. Your order <strong>#${orderIdShort}</strong> has been confirmed.</p>
        <p><strong>Amount:</strong> ৳${orderData.total}</p>
        <p><strong>Payment Method:</strong> ${orderData.paymentMethod || 'bKash'}</p>
        <p>We will notify you when your order is processed.</p>
      </div>
    `);

      // Check if this order contains domains and process them via Openprovider
      if (docSnap.exists) {
        const orderData = docSnap.data();
        if (orderData.items && orderData.items.length > 0) {
          
          const domainItems = orderData.items.filter(item => item.itemType === 'domain');
          
          const renewalItems = orderData.items.filter(item => item.itemType === 'domain_renewal');
          const transferItems = orderData.items.filter(item => item.itemType === 'domain_transfer');


          
          if (domainItems.length > 0 || renewalItems.length > 0 || transferItems.length > 0) {
            const domainDb = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
            const openproviderClient = await openprovider.createClient(domainDb);
            const apiKey = openproviderClient.token;
            const isSandbox = openproviderClient.isSandbox;

            if (apiKey) {

            
              for (const item of transferItems) {
                const domain = item.domain || item.id.replace('domain_transfer_', '');
                
                // Fetch auth code from secure collection
                const authCodeSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277')
                  .collection('transferAuthCodes')
                  .doc(`${orderId}_${domain}`)
                  .get();
                
                const authCode = authCodeSnap.exists ? authCodeSnap.data()?.authCode : '';
                
                if (!authCode) {
                  console.warn(`No auth code found for transfer: ${domain}`);
                  const dOrdersSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('domainOrders')
                    .where('orderId', '==', orderId)
                    .where('domain', '==', domain)
                    .get();
                  if (!dOrdersSnap.empty) {
                    await updateDoc(dOrdersSnap.docs[0].ref, {
                      status: 'failed',
                      provisioningStatus: 'failed',
                      error: 'Missing authorization code',
                      updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                  }
                  continue;
                }
                
                try {
                  const regData = await openprovider.transferDomain(openproviderClient, domain, authCode);
                  
                   // Log Transfer
                   await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('apiLogs').add({
                     action: 'openprovider_transfer',
                     domain,
                     orderId,
                     isSandbox,
                     timestamp: admin.firestore.FieldValue.serverTimestamp(),
                     response: sanitizeLogData(regData)
                   });
                  
                  // Clean up auth code after use
                  await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277')
                    .collection('transferAuthCodes')
                    .doc(`${orderId}_${domain}`)
                    .delete();
                  
                  // Update domainOrders document with proper state machine
                  const dOrdersSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('domainOrders')
                    .where('orderId', '==', orderId)
                    .where('domain', '==', domain)
                    .get();
                    
                    if (!dOrdersSnap.empty) {
                      const dOrderRef = dOrdersSnap.docs[0].ref;
                      const isSuccess = Boolean(regData?.id || regData?.status);
                      
                      await dOrderRef.update({
                        status: isSuccess ? 'active' : 'failed',
                        transferResponse: JSON.stringify(regData),
                        provisioningStatus: isSuccess ? 'completed' : 'failed',
                        error: isSuccess ? null : (regData?.TransferResponse?.TransferResults?.[0]?.Message || 'Transfer failed'),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                      });

                      if (isSuccess) {
                        sendOrderEmail(orderData.customerEmail, `Domain Transfer Successful - ${domain}`, `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #16a34a;">Domain Transfer Successful!</h2>
                            <p>Your domain <strong>${domain}</strong> has been successfully transferred to Click2IT.</p>
                            <p>The transfer process typically takes 5-7 days to complete. You will receive another notification once the transfer is fully complete.</p>
                          </div>
                        `);
                      } else {
                        sendOrderEmail(orderData.customerEmail, `Domain Transfer Failed - ${domain}`, `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #dc2626;">Domain Transfer Failed</h2>
                            <p>We were unable to transfer your domain <strong>${domain}</strong>.</p>
                            <p>Please contact support for assistance.</p>
                          </div>
                        `);
                      }
                    }
                    
                  } catch (e) {
                    console.error('Auto-transfer failed for', domain, e);
                    const dOrdersSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('domainOrders')
                      .where('orderId', '==', orderId)
                      .where('domain', '==', domain)
                      .get();
                    if (!dOrdersSnap.empty) {
                      await updateDoc(dOrdersSnap.docs[0].ref, {
                        provisioningStatus: 'failed',
                        error: e.message,
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                      });
                    }
                    
                    // Clean up auth code even on failure
                    try {
                      await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277')
                        .collection('transferAuthCodes')
                        .doc(`${orderId}_${domain}`)
                        .delete();
                    } catch (cleanupError) {
                      console.error('Failed to cleanup auth code:', cleanupError);
                    }
                  }
                }
                for (const item of renewalItems) {
                const domain = item.domain;
                const years = item.termYears || 1;
                
                try {
                  const regData = await openprovider.renewDomain(openproviderClient, domain, years);
                  
                   // Log Registration
                   await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('apiLogs').add({
                     action: 'openprovider_renew',
                     domain,
                     orderId,
                     isSandbox,
                     timestamp: admin.firestore.FieldValue.serverTimestamp(),
                     response: sanitizeLogData(regData)
                   });
                  
                  // Update domainOrders document if successful
                  const dOrdersSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('domainOrders')
                    .where('orderId', '==', orderId)
                    .where('domain', '==', domain)
                    .get();
                    
                    if (!dOrdersSnap.empty) {
                      const dOrderRef = dOrdersSnap.docs[0].ref;
                      const isSuccess = Boolean(regData?.status);
                      
                      await dOrderRef.update({
                        status: isSuccess ? 'active' : 'failed',
                        renewalResponse: JSON.stringify(regData),
                        provisioningStatus: isSuccess ? 'completed' : 'failed',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                      });

                      if (isSuccess) {
                        sendOrderEmail(orderData.customerEmail, `Domain Renewed - ${domain}`, `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #16a34a;">Domain Renewed Successfully!</h2>
                            <p>Your domain <strong>${domain}</strong> has been successfully renewed.</p>
                            <p>Thank you for choosing Click2IT!</p>
                          </div>
                        `);
                      } else {
                        sendOrderEmail(orderData.customerEmail, `Domain Renewal Failed - ${domain}`, `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #dc2626;">Domain Renewal Failed</h2>
                            <p>We were unable to renew your domain <strong>${domain}</strong>.</p>
                            <p>Please contact support immediately to avoid domain expiration.</p>
                          </div>
                        `);
                      }
                    }
                   
                 } catch (e) {
                   console.error('Auto-renewal failed for', domain, e);
                   const dOrdersSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('domainOrders')
                     .where('orderId', '==', orderId)
                     .where('domain', '==', domain)
                     .get();
                   if (!dOrdersSnap.empty) {
                     await updateDoc(dOrdersSnap.docs[0].ref, {
                       provisioningStatus: 'failed',
                       error: e.message,
                       updatedAt: admin.firestore.FieldValue.serverTimestamp()
                     });
                   }
                 }
               }
             }

            
            if (apiKey) {
              for (const item of domainItems) {
                const domain = item.id.replace('domain_', '');
                const years = item.termYears || 1;
                
                try {
                  const regData = await openprovider.registerDomain(openproviderClient, {
                    domain,
                    years,
                    contactId: item.contactId,
                    nameServers: item.nameServers || item.nameservers || [],
                    autoRenew: item.autoRenew,
                  });
                  
                   // Log Registration
                   await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('apiLogs').add({
                     action: 'auto_register',
                     domain,
                     orderId,
                     isSandbox,
                     timestamp: admin.firestore.FieldValue.serverTimestamp(),
                     response: sanitizeLogData(regData)
                   });
                  
                  // Update domainOrders document if successful
                  // The UI created domainOrders with orderId matching this order
                  const dOrdersSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('domainOrders')
                    .where('orderId', '==', orderId)
                    .where('domain', '==', domain)
                    .get();
                    
                    if (!dOrdersSnap.empty) {
                      const dOrderRef = dOrdersSnap.docs[0].ref;
                      const isSuccess = Boolean(regData?.id || regData?.status);
                      
                      await dOrderRef.update({
                        status: isSuccess ? 'active' : 'failed',
                        registrationResponse: JSON.stringify(regData),
                        provisioningStatus: isSuccess ? 'completed' : 'failed',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                      });

                      if (isSuccess) {
                        sendOrderEmail(orderData.customerEmail, `Domain Registered - ${domain}`, `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #16a34a;">Domain Registered Successfully!</h2>
                            <p>Your domain <strong>${domain}</strong> has been successfully registered.</p>
                            <p>You can now use this domain for your website and email.</p>
                          </div>
                        `);
                      } else {
                        sendOrderEmail(orderData.customerEmail, `Domain Registration Failed - ${domain}`, `
                          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #dc2626;">Domain Registration Failed</h2>
                            <p>We were unable to register your domain <strong>${domain}</strong>.</p>
                            <p>Please contact support for assistance.</p>
                          </div>
                        `);
                      }
                    }
                   
                 } catch (e) {
                   console.error('Auto-registration failed for', domain, e);
                   const dOrdersSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('domainOrders')
                     .where('orderId', '==', orderId)
                     .where('domain', '==', domain)
                     .get();
                   if (!dOrdersSnap.empty) {
                     await updateDoc(dOrdersSnap.docs[0].ref, {
                       provisioningStatus: 'failed',
                       error: e.message,
                       updatedAt: admin.firestore.FieldValue.serverTimestamp()
                     });
                   }
                 }
               }
            }
          }

          // Provision hosting accounts if this order contains hosting items
          const hostingItems = orderData.items.filter(item => item.itemType === 'hosting');
          if (hostingItems.length > 0) {
            const hAccountsSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('hostingAccounts')
              .where('orderId', '==', orderId)
              .get();

            if (!hAccountsSnap.empty) {
              const hostingConfigSnap = await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('settings').doc('hostingApiConfig').get();
              const hostingConfig = hostingConfigSnap.exists ? hostingConfigSnap.data() : {};
              const hostingProviderType = hostingConfig?.hostingApiType || 'dummy';
              const hostingApiKey = hostingConfig?.hostingApiKey;
              const hostingApiUrl = hostingConfig?.hostingApiUrl;
              const isSandbox = hostingConfig?.isSandboxMode === true;

              let provider;
              if (hostingProviderType === 'cpanel' && hostingApiKey) {
                const { CpanelHostingProvider } = require('./providers/hosting/CpanelHostingProvider');
                provider = new CpanelHostingProvider(hostingApiKey, hostingApiUrl, hostingConfig?.hostingApiUsername || 'root');
              } else if (hostingProviderType === 'resellerclub' && hostingApiKey) {
                const { ResellerClubHostingProvider } = require('./providers/hosting/ResellerClubHostingProvider');
                provider = new ResellerClubHostingProvider(hostingApiKey, hostingApiUrl);
              } else {
                provider = null;
              }

              const clnLogin = hostingConfig?.clnLogin;
              const clnSecretKey = hostingConfig?.clnSecretKey;

              for (const accountDoc of hAccountsSnap.docs) {
                const accountData = accountDoc.data();

                await updateDoc(accountDoc.ref, {
                  provisioningStatus: 'processing',
                  provider: hostingProviderType,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });

                if (!provider) {
                  await updateDoc(accountDoc.ref, {
                    provisioningStatus: 'failed',
                    status: 'failed',
                    provisioningError: 'Hosting provider not configured. Please configure cPanel or ResellerClub in admin settings.',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                  continue;
                }

                try {
                  const provisionResult = await provider.provisionAccount({
                    planCode: accountData.planId || 'default',
                    domain: accountData.domain || '',
                    contactEmail: orderData.customerEmail || '',
                    billingCycle: accountData.billingCycle || 'monthly',
                  });

                  if (provisionResult.success) {
                    await updateDoc(accountDoc.ref, {
                      status: 'active',
                      provisioningStatus: 'provider_created',
                      providerAccountId: provisionResult.providerAccountId || null,
                      cPanelUrl: provisionResult.cPanelUrl || null,
                      nameservers: provisionResult.nameservers || [],
                      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
                      updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    const domain = accountData.domain || '';
                    if (domain) {
                      sendOrderEmail(orderData.customerEmail, `Hosting Ready - ${domain}`, `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                          <h2 style="color: #2563eb;">Your Hosting is Ready!</h2>
                          <p>Your hosting account for <strong>${domain}</strong> has been activated.</p>
                          ${provisionResult.cPanelUrl ? `<p><strong>cPanel URL:</strong> <a href="${provisionResult.cPanelUrl}">${provisionResult.cPanelUrl}</a></p>` : ''}
                          <p>You can now log in to your control panel and start building your website.</p>
                        </div>
                      `);
                    }
                  } else {
                    await updateDoc(accountDoc.ref, {
                      status: 'failed',
                      provisioningStatus: 'failed',
                      provisioningError: provisionResult.error || 'Provider returned failure',
                      updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });

                    const domain = accountData.domain || '';
                    if (domain && orderData.customerEmail) {
                      sendOrderEmail(orderData.customerEmail, `Hosting Provisioning Failed - ${domain}`, `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                          <h2 style="color: #dc2626;">Hosting Provisioning Failed</h2>
                          <p>We were unable to provision hosting for <strong>${domain}</strong>.</p>
                          <p>Our team has been notified and will contact you shortly.</p>
                        </div>
                      `);
                    }
                    continue;
                  }
                } catch (providerError) {
                  await updateDoc(accountDoc.ref, {
                    status: 'failed',
                    provisioningStatus: 'failed',
                    provisioningError: providerError.message || 'Provider error',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });

                  const domain = accountData.domain || '';
                  if (domain && orderData.customerEmail) {
                    sendOrderEmail(orderData.customerEmail, `Hosting Provisioning Failed - ${domain}`, `
                      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #dc2626;">Hosting Provisioning Failed</h2>
                        <p>We were unable to provision hosting for <strong>${domain}</strong>.</p>
                        <p>Our team has been notified and will contact you shortly.</p>
                      </div>
                    `);
                  }
                  continue;
                }

                const refreshedAccount = await accountDoc.ref.get();
                const refreshedData = refreshedAccount.data();
                const ip = refreshedData?.ipAddress || refreshedData?.ip;
                const licenseType = refreshedData?.licenseType || 1;

                if (!ip) {
                  console.warn('Hosting account missing IP address for CloudLinux provisioning:', accountDoc.id);
                  await updateDoc(accountDoc.ref, {
                    cloudLinuxStatus: 'skipped_no_ip',
                    provisioningStatus: 'completed',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                  continue;
                }

                if (!clnLogin || !clnSecretKey) {
                  console.warn('CloudLinux credentials not configured. Skipping provisioning.');
                  await updateDoc(accountDoc.ref, {
                    cloudLinuxStatus: 'CLOUDLINUX_NOT_CONFIGURED',
                    provisioningStatus: 'completed',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                  continue;
                }

                if (isSandbox) {
                  console.error('[CloudLinux] SANDBOX_MODE_ENABLED - Production provisioning blocked.');
                  await updateDoc(accountDoc.ref, {
                    cloudLinuxStatus: 'CLOUDLINUX_SANDBOX_MODE_ENABLED',
                    cloudLinuxError: 'Sandbox mode is enabled. Set isSandboxMode=false in settings/hostingApiConfig for production.',
                    provisioningStatus: 'completed',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                  continue;
                }

                const timestamp = Math.floor(Date.now() / 1000);
                const hash = crypto.createHash('sha1').update(clnSecretKey + timestamp).digest('hex');
                const token = `${clnLogin}|${timestamp}|${hash}`;
                const baseUrl = 'https://cln.cloudlinux.com/api';
                const endpoint = `/v2/ip-license/licenses?ip=${encodeURIComponent(ip)}&type=${licenseType}`;

                try {
                  const response = await fetch(`${baseUrl}${endpoint}`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${token}`
                    }
                  });

                  const rawText = await response.text();
                  let apiData;
                  try { apiData = JSON.parse(rawText); } catch (e) { apiData = {}; }

                  if (!response.ok) {
                    const message = apiData?.message;
                    console.error('CloudLinux provisioning error:', { status: response.status, message });
                    await updateDoc(accountDoc.ref, {
                      cloudLinuxStatus: 'failed',
                      cloudLinuxError: JSON.stringify(apiData),
                      provisioningStatus: 'completed',
                      updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                  } else {
                    
                    await updateDoc(accountDoc.ref, {
                      cloudLinuxStatus: 'active',
                      cloudLinuxLicenseId: apiData?.data?.id || apiData?.id || null,
                      cloudLinuxResponse: JSON.stringify(apiData),
                      provisioningStatus: 'completed',
                      updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                  }
                } catch (error) {
                  console.error('CloudLinux provisioning failed:', error);
                  await updateDoc(accountDoc.ref, {
                    cloudLinuxStatus: 'failed',
                    cloudLinuxError: error.message,
                    provisioningStatus: 'completed',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                  });
                }
              }

              await getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277').collection('apiLogs').add({
                action: 'hosting_provisioning_completed',
                orderId,
                accountCount: hAccountsSnap.size,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                isSandbox,
                provider: hostingProviderType,
                note: isSandbox ? 'CloudLinux blocked due to sandbox mode.' : 'Provisioning executed.'
              });
            }

            // Mark order provisioning as completed
            await targetRef.update({
              provisioningStatus: 'completed',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        }
      }

      return res.status(200).send({ message: "Payment status updated successfully" });
    } else {
      const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
      let targetRef = db.collection("orders").doc(orderId);
      let docSnap = await targetRef.get();

      if (!docSnap.exists) {
        targetRef = db.collection("invoices").doc(orderId);
        docSnap = await targetRef.get();
      }

      if (docSnap.exists) {
        await targetRef.update({
          status: 'cancelled',
          paymentStatus: 'failed',
          provisioningStatus: 'cancelled',
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const dOrdersSnap = await db.collection('domainOrders')
          .where('orderId', '==', orderId)
          .get();
          
        if (!dOrdersSnap.empty) {
          const batch = db.batch();
          dOrdersSnap.docs.forEach(doc => {
            batch.update(doc.ref, {
              status: 'cancelled',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          });
          await batch.commit();
        }

        const hAccountsSnap = await db.collection('hostingAccounts')
          .where('orderId', '==', orderId)
          .get();
          
        if (!hAccountsSnap.empty) {
          const batch = db.batch();
          hAccountsSnap.docs.forEach(doc => {
            batch.update(doc.ref, {
              status: 'cancelled',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          });
          await batch.commit();
        }
      }

      return res.status(200).send({ message: "Payment marked as failed" });
    }

  } catch (error) {
    console.error("Webhook Error:", error);
    return res.status(500).send("Internal Server Error");
  }
});



async function getDomainPricingSettings(db) {
  const [publicConfig, apiKeys] = await Promise.all([
    db.collection('settings').doc('public_config').get(),
    db.collection('settings').doc('api_keys').get(),
  ]);
  const settings = {
    ...(apiKeys.exists ? apiKeys.data() : {}),
    ...(publicConfig.exists ? publicConfig.data() : {}),
  };
  const usdToBdtRate = Number(settings.usdToBdtRate);
  const markupPercent = Number(settings.domainMarkupPercent);
  if (!Number.isFinite(usdToBdtRate) || usdToBdtRate <= 0) {
    throw new Error('Configure a valid USD to BDT exchange rate in domain pricing settings.');
  }
  if (!Number.isFinite(markupPercent) || markupPercent < 0) {
    throw new Error('Configure a valid domain markup percentage in domain pricing settings.');
  }
  return { usdToBdtRate, markupPercent };
}

function customerPriceBdt(priceUsd, settings, years = 1) {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0 || !Number.isInteger(years) || years < 1) {
    throw new Error('Openprovider returned an invalid domain quote.');
  }
  return Math.round(priceUsd * years * (1 + settings.markupPercent / 100) * settings.usdToBdtRate);
}

async function getOpenproviderQuote(db, tld, client = null) {
  const providerClient = client || await openprovider.createClient(db);
  const [quote, settings] = await Promise.all([
    openprovider.getTldPricing(providerClient, tld),
    getDomainPricingSettings(db),
  ]);
  if (quote.currency !== 'USD') throw new Error('Openprovider returned an unsupported currency.');
  return { client: providerClient, quote, settings };
}

exports.openproviderSearchProxy = functions.https.onCall(async (data) => {
  const payload = data?.data || data || {};
  const domain = String(payload.domain || '').trim().toLowerCase();
  if (!domain.includes('.')) throw new functions.https.HttpsError('invalid-argument', 'Invalid domain format.');
  try {
    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
    const client = await openprovider.createClient(db);
    const [availability] = await openprovider.checkAvailability(client, [domain]);
    if (!availability) throw new Error('Openprovider returned no availability result.');
    if (!availability.available) return { success: true, data: availability };
    const tld = domain.slice(domain.indexOf('.') + 1);
    const { quote, settings } = await getOpenproviderQuote(db, tld, client);
    const price = customerPriceBdt(quote.registrationPrice, settings);
    return { success: true, data: { ...availability, price, priceBdt: price, renewalPrice: customerPriceBdt(quote.renewalPrice, settings), currency: 'BDT' } };
  } catch (error) {
    console.error('[openproviderSearchProxy] Domain query failed:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Openprovider domain search failed.');
  }
});

exports.openproviderTldPricing = functions.https.onCall(async (data) => {
  const payload = data?.data || data || {};
  const tld = String(payload.tld || '').trim().replace(/^\./, '').toLowerCase();
  if (!tld) throw new functions.https.HttpsError('invalid-argument', 'Missing TLD parameter.');
  try {
    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
    const { quote, settings } = await getOpenproviderQuote(db, tld);
    return {
      success: true,
      tld: quote.tld,
      currency: 'BDT',
      registrationPrice: customerPriceBdt(quote.registrationPrice, settings),
      renewalPrice: customerPriceBdt(quote.renewalPrice, settings),
      transferPrice: customerPriceBdt(quote.transferPrice, settings),
      restorePrice: customerPriceBdt(quote.restorePrice, settings),
    };
  } catch (error) {
    console.error('[openproviderTldPricing] Quote failed:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Openprovider TLD pricing failed.');
  }
});

exports.openproviderTldPricingBatch = functions.https.onCall(async (data) => {
  const payload = data?.data || data || {};
  const tlds = Array.isArray(payload.tlds) ? [...new Set(payload.tlds)] : [];
  if (!tlds.length) throw new functions.https.HttpsError('invalid-argument', 'Missing TLD list.');
  try {
    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
    const client = await openprovider.createClient(db);
    const settings = await getDomainPricingSettings(db);
    const pricing = [];
    const failed = [];
    for (const value of tlds) {
      const tld = String(value).trim().replace(/^\./, '').toLowerCase();
      if (!tld) continue;
      try {
        const quote = await openprovider.getTldPricing(client, tld);
        if (quote.currency !== 'USD') throw new Error('Unsupported Openprovider currency.');
        pricing.push({
          tld: quote.tld,
          customerPriceBdt: customerPriceBdt(quote.registrationPrice, settings),
          renewalPriceBdt: customerPriceBdt(quote.renewalPrice, settings),
          transferPriceBdt: customerPriceBdt(quote.transferPrice, settings),
          currency: 'BDT',
        });
      } catch (error) {
        failed.push({ tld: `.${tld}`, error: error.message || 'Openprovider quote failed.' });
      }
    }
    if (!pricing.length) throw new Error('Openprovider returned no TLD prices.');
    return { success: true, pricing, failed };
  } catch (error) {
    console.error('[openproviderTldPricingBatch] Batch quote failed:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Openprovider batch pricing failed.');
  }
});

exports.getDomainRenewalPrice = functions.https.onCall(async (data) => {
  const domain = String(data?.data?.domain || data?.domain || '').trim().toLowerCase();
  if (!domain.includes('.')) throw new functions.https.HttpsError('invalid-argument', 'Invalid domain format.');
  try {
    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
    const { quote, settings } = await getOpenproviderQuote(db, domain.slice(domain.indexOf('.') + 1));
    return { success: true, domain, tld: quote.tld, renewalPriceBdt: customerPriceBdt(quote.renewalPrice, settings), maxDuration: 10 };
  } catch (error) {
    console.error('[getDomainRenewalPrice] Quote failed:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Openprovider renewal quote failed.');
  }
});

exports.getDomainRenewalPriceBreakdown = functions.https.onCall(async (data, context) => {
  if (!context.auth || !await isAdminUser(context.auth.uid)) {
    throw new functions.https.HttpsError('unauthenticated', 'Admin access required.');
  }
  const domain = String(data?.domain || '').trim().toLowerCase();
  if (!domain.includes('.')) throw new functions.https.HttpsError('invalid-argument', 'Invalid domain format.');
  try {
    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
    const { client, quote, settings } = await getOpenproviderQuote(db, domain.slice(domain.indexOf('.') + 1));
    return {
      success: true,
      domain,
      tld: quote.tld,
      supplierPriceUsd: quote.renewalPrice,
      markupPercent: settings.markupPercent,
      markupAmountUsd: quote.renewalPrice * settings.markupPercent / 100,
      sellingPriceUsd: quote.renewalPrice * (1 + settings.markupPercent / 100),
      exchangeRate: settings.usdToBdtRate,
      sellingPriceBdt: customerPriceBdt(quote.renewalPrice, settings),
      isSandbox: client.isSandbox,
    };
  } catch (error) {
    console.error('[getDomainRenewalPriceBreakdown] Quote failed:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Openprovider renewal quote failed.');
  }
});

exports.createDomainRenewalOrder = functions.https.onCall(async (data, context) => {
  const { domain, renewalPeriod, customerName, customerEmail, customerPhone, paymentMethod, transactionId } = data || {};
  if (!domain || !renewalPeriod || !customerName || !customerEmail || !customerPhone) {
    throw new functions.https.HttpsError('invalid-argument', 'Required renewal order fields are missing.');
  }
  try {
    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
    const years = Number(renewalPeriod);
    const { quote, settings } = await getOpenproviderQuote(db, String(domain).slice(String(domain).indexOf('.') + 1));
    const totalBdt = customerPriceBdt(quote.renewalPrice, settings, years);
    const documentNumber = await generateDocumentNumber('INV');
    const orderData = {
      userId: context.auth?.uid || 'guest',
      type: 'domain_renewal',
      documentNumber,
      domain,
      tld: quote.tld,
      renewalPriceBdt: customerPriceBdt(quote.renewalPrice, settings),
      renewalPeriod: years,
      totalBdt,
      status: 'pending_payment',
      paymentStatus: 'pending',
      renewalStatus: 'pending',
      customerName,
      customerEmail,
      customerPhone,
      paymentMethod: paymentMethod || 'bkash',
      transactionId: transactionId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const orderRef = await addDoc(collection(db, 'domain_renewals'), orderData);
    return { success: true, orderId: orderRef.id, order: orderData };
  } catch (error) {
    console.error('[createDomainRenewalOrder] Failed:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', error.message || 'Failed to create renewal order.');
  }
});


exports.validateHostingPrice = functions.https.onCall(async (data, context) => {
  try {
    const { planId, billingCycle, licenseCostUsd } = data;
    
    if (!planId || !billingCycle || !licenseCostUsd) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing required fields: planId, billingCycle, licenseCostUsd');
    }

    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
    const settingsSnap = await db.collection('settings').doc('api_keys').get();
    const apiKeysData = settingsSnap.exists ? settingsSnap.data() : {};
    const exchangeRate = parseFloat(apiKeysData.usdToBdtRate) || 120;
    const markupPercent = parseFloat(apiKeysData.hostingMarkupPercent) || 35;

    const calculatedMonthly = Math.round(licenseCostUsd * exchangeRate * (1 + markupPercent / 100));
    const finalPrice = billingCycle === 'yearly' ? calculatedMonthly * 10 : calculatedMonthly;

    return {
      success: true,
      planId,
      billingCycle,
      licenseCostUsd,
      exchangeRate,
      markupPercent,
      calculatedMonthly,
      finalPrice,
      currency: 'BDT',
    };

  } catch (error) {
    console.error('Hosting Price Validation Error:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to validate hosting price.');
  }
});

exports.manageDomain = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to manage domains.');
  const { command, domain, extraParams } = data || {};
  if (!domain || !['set_ns', 'renew'].includes(command)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid domain command or domain.');
  }
  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  const owned = await db.collection('domainOrders')
    .where('userId', '==', context.auth.uid)
    .where('domain', '==', domain)
    .get();
  if (owned.empty) throw new functions.https.HttpsError('permission-denied', 'You do not own this domain.');
  try {
    const client = await openprovider.createClient(db);
    if (command === 'renew') return await openprovider.renewDomain(client, domain, Number(extraParams?.duration || 1));
    const response = await openprovider.setNameservers(client, domain, [extraParams?.ns0, extraParams?.ns1, extraParams?.ns2, extraParams?.ns3]);
    return response.data;
  } catch (error) {
    console.error('[manageDomain] Openprovider request failed:', error);
    throw new functions.https.HttpsError('internal', error.message || 'Openprovider domain request failed.');
  }
});


exports.cloudLinuxProxy = functions.https.onCall(async (data, context) => {
  // Only admins can interact with CloudLinux API for adding/removing licenses
  if (!context.auth || !await isAdminUser(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required for this action.');
  }

  const { method, endpoint, payload } = data;
  if (!method || !endpoint) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing HTTP method or endpoint.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

  try {
    const settingsSnap = await db.collection('settings').doc('api_keys').get();
    const apiKeys = settingsSnap.exists ? settingsSnap.data() : null;
    
    const clnLogin = apiKeys?.clnLogin;
    const clnSecretKey = apiKeys?.clnSecretKey;

    if (!clnLogin || !clnSecretKey) {
      console.error('CloudLinux API keys missing in firestore');
      throw new functions.https.HttpsError('failed-precondition', 'CloudLinux credentials not configured.');
    }

    // Generate Token
    const timestamp = Math.floor(Date.now() / 1000);
    const hash = crypto.createHash('sha1').update(clnSecretKey + timestamp).digest('hex');
    const token = `${clnLogin}|${timestamp}|${hash}`;

    const baseUrl = 'https://cln.cloudlinux.com/api';
    const url = `${baseUrl}${endpoint}`;

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    if (payload && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
      options.body = JSON.stringify(payload);
    }

    const response = await fetch(url, options);
    const rawText = await response.text();
    
    let apiData;
    try {
      apiData = JSON.parse(rawText);
    } catch (e) {
      console.error('CloudLinux non-JSON response received');
      throw new functions.https.HttpsError('internal', 'CloudLinux API returned invalid format.');
    }

    if (!response.ok) {
      const message = apiData?.message;
      console.error('CloudLinux API Error:', { status: response.status, message });
      throw new functions.https.HttpsError('internal', message || 'Error from CloudLinux API.');
    }

    // Log the API call
    await db.collection('apiLogs').add({
      action: 'cloudlinux_' + method.toLowerCase(),
      endpoint,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      response: apiData
    });

    return apiData;

  } catch (error) {
    console.error('CloudLinux Proxy Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'CloudLinux API request failed.');
  }
});

// bKash Token Cache (simple in-memory cache for warm instances)
const bkashTokenCache = {
  token: null,
  expiresAt: 0
};

function getBkashBaseUrl(isSandbox) {
  return isSandbox ? 'https://tokenized.sandbox.bka.sh/v1.2.0-beta' : 'https://tokenized.pay.bka.sh/v1.2.0-beta';
}

async function getBkashCredentials(db) {
  const settingsSnap = await db.collection('settings').doc('api_keys').get();
  if (!settingsSnap.exists) {
    throw new functions.https.HttpsError('failed-precondition', 'Payment gateway credentials not configured.');
  }
  const data = settingsSnap.data();
  const isSandbox = data.isSandboxMode === true;
  const prefix = isSandbox ? 'sandbox_' : 'production_';
  
  return {
    appKey: data[`${prefix}bkashAppKey`] || data.bkashAppKey,
    appSecret: data[`${prefix}bkashAppSecret`] || data.bkashAppSecret,
    username: data[`${prefix}bkashUsername`] || data.bkashUsername,
    password: data[`${prefix}bkashPassword`] || data.bkashPassword,
    isSandbox,
    baseUrl: getBkashBaseUrl(isSandbox)
  };
}

async function getBkashAccessToken(db) {
  const now = Date.now();
  if (bkashTokenCache.token && now < bkashTokenCache.expiresAt) {
    return bkashTokenCache.token;
  }

  const creds = await getBkashCredentials(db);
  
  const authString = Buffer.from(`${creds.username}:${creds.password}`).toString('base64');
  
  const response = await fetch(`${creds.baseUrl}/tokenized/checkout/token/grant`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${authString}`,
      'X-APP-Key': creds.appKey
    },
    body: JSON.stringify({
      app_key: creds.appKey,
      app_secret: creds.appSecret
    })
  });

  const rawText = await response.text();
  let apiData;
  try {
    apiData = JSON.parse(rawText);
  } catch (e) {
    console.error('bKash non-JSON response received');
    throw new functions.https.HttpsError('internal', 'bKash API returned invalid format.');
  }

  if (!response.ok || apiData.status_code !== '0000') {
    const status = apiData?.status;
    const status_code = apiData?.status_code;
    const message = apiData?.status_message;
    console.error('bKash token error:', { status, status_code, message });
    throw new functions.https.HttpsError('internal', message || 'Failed to get bKash access token.');
  }

  // Cache token (expires in ~1 hour, we refresh 5 mins before)
  bkashTokenCache.token = apiData.id_token;
  bkashTokenCache.expiresAt = now + (55 * 60 * 1000); // 55 minutes

  return bkashTokenCache.token;
}

exports.bkashGrantToken = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  
  try {
    await getBkashAccessToken(db);
    return { success: true };
  } catch (error) {
    console.error('bKash Grant Token Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to get bKash access token.');
  }
});

exports.bkashCreatePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { orderId, amount, customerEmail, customerName, customerPhone } = data;
  
  if (!orderId || !amount || !customerEmail) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: orderId, amount, customerEmail.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  
  try {
    // Verify order exists
    const orderSnap = await db.collection('orders').doc(orderId).get();
    if (!orderSnap.exists) {
      throw new functions.https.HttpsError('not-found', 'Order not found.');
    }

    const accessToken = await getBkashAccessToken(db);
    const creds = await getBkashCredentials(db);

    const response = await fetch(`${creds.baseUrl}/tokenized/checkout/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-APP-Key': creds.appKey
      },
      body: JSON.stringify({
        mode: '0011',
        payerReference: customerPhone || customerEmail,
        callbackURL: `https://e-commerce-chi-six.vercel.app/payment/return`,
        amount: amount.toString(),
        currency: 'BDT',
        intent: 'sale',
        merchantInvoiceNumber: orderId
      })
    });

    const rawText = await response.text();
    let apiData;
    try {
      apiData = JSON.parse(rawText);
    } catch (e) {
      console.error('bKash create payment non-JSON response');
      throw new functions.https.HttpsError('internal', 'bKash API returned invalid format.');
    }

    if (!response.ok || apiData.status_code !== '0000') {
      const status = apiData?.status;
      const status_code = apiData?.status_code;
      const message = apiData?.status_message;
      console.error('bKash create payment error:', { status, status_code, message });
      throw new functions.https.HttpsError('internal', message || 'Failed to create bKash payment.');
    }

    // Save paymentID to order
    await db.collection('orders').doc(orderId).update({
      bkashPaymentId: apiData.paymentID,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return {
      success: true,
      paymentId: apiData.paymentID,
      paymentUrl: apiData.bkashURL
    };

  } catch (error) {
    console.error('bKash Create Payment Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to create bKash payment.');
  }
});

exports.bkashExecutePayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { paymentId, orderId } = data;
  
  if (!paymentId || !orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: paymentId, orderId.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  
  try {
    const accessToken = await getBkashAccessToken(db);
    const creds = await getBkashCredentials(db);

    const response = await fetch(`${creds.baseUrl}/tokenized/checkout/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-APP-Key': creds.appKey
      },
      body: JSON.stringify({
        paymentID: paymentId
      })
    });

    const rawText = await response.text();
    let apiData;
    try {
      apiData = JSON.parse(rawText);
    } catch (e) {
      console.error('bKash execute payment non-JSON response');
      throw new functions.https.HttpsError('internal', 'bKash API returned invalid format.');
    }

    if (!response.ok || apiData.status_code !== '0000') {
      const status = apiData?.status;
      const status_code = apiData?.status_code;
      const message = apiData?.status_message;
      console.error('bKash execute payment error:', { status, status_code, message });
      throw new functions.https.HttpsError('internal', message || 'Failed to execute bKash payment.');
    }

    // Update order with transaction details
    await db.collection('orders').doc(orderId).update({
      paymentStatus: 'paid',
      status: 'processing',
      transactionId: apiData.trxID || paymentId,
      paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Log success
    await db.collection('apiLogs').add({
      action: 'bkash_payment_success',
      orderId,
      paymentId,
      trxId: apiData.trxID,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      response: apiData
    });

    return { success: true, trxId: apiData.trxID };

  } catch (error) {
    console.error('bKash Execute Payment Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to execute bKash payment.');
  }
});

exports.bkashQueryPayment = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { paymentId, orderId } = data;
  
  if (!paymentId || !orderId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters: paymentId, orderId.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  
  try {
    const accessToken = await getBkashAccessToken(db);
    const creds = await getBkashCredentials(db);

    const response = await fetch(`${creds.baseUrl}/tokenized/checkout/payment/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-APP-Key': creds.appKey
      },
      body: JSON.stringify({
        paymentID: paymentId
      })
    });

    const rawText = await response.text();
    let apiData;
    try {
      apiData = JSON.parse(rawText);
    } catch (e) {
      console.error('bKash query payment non-JSON response');
      throw new functions.https.HttpsError('internal', 'bKash API returned invalid format.');
    }

    if (!response.ok || apiData.status_code !== '0000') {
      const status = apiData?.status;
      const status_code = apiData?.status_code;
      const message = apiData?.status_message;
      console.error('bKash query payment error:', { status, status_code, message });
      throw new functions.https.HttpsError('internal', message || 'Failed to query bKash payment.');
    }

    return {
      success: true,
      status: apiData.status,
      transactionStatus: apiData.transactionStatus,
      amount: apiData.amount,
      currency: apiData.currency,
      trxId: apiData.trxID,
      merchantInvoiceNumber: apiData.merchantInvoiceNumber
    };

  } catch (error) {
    console.error('bKash Query Payment Error:', error);
    if (error instanceof functions.https.HttpsError) throw error;
    throw new functions.https.HttpsError('internal', 'Failed to query bKash payment.');
  }
});

exports.bkashCallback = functions.https.onRequest(async (req, res) => {
  res.set('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).send('');
  }

  try {
    const { status, paymentId, orderId } = req.body || req.query;

    if (!orderId) {
      return res.status(400).send('Missing orderId');
    }

    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
    const orderSnap = await db.collection('orders').doc(orderId).get();

    if (!orderSnap.exists) {
      return res.status(404).send('Order not found');
    }

    if (status === 'success' || status === 'completed') {
      // Execute payment if we have paymentId
      if (paymentId) {
        try {
          const accessToken = await getBkashAccessToken(db);
          const creds = await getBkashCredentials(db);
          
          const executeResponse = await fetch(`${creds.baseUrl}/tokenized/checkout/execute`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`,
              'X-APP-Key': creds.appKey
            },
            body: JSON.stringify({ paymentID: paymentId })
          });

          const rawText = await executeResponse.text();
          let executeData;
          try { executeData = JSON.parse(rawText); } catch (e) { executeData = {}; }

          if (executeData.status_code === '0000') {
            await db.collection('orders').doc(orderId).update({
              paymentStatus: 'paid',
              status: 'processing',
              transactionId: executeData.trxID || paymentId,
              paymentCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          } else {
            console.error('bKash execute failed on callback:', { status: executeData?.status, status_code: executeData?.status_code });
          }
        } catch (e) {
          console.error('bKash execute error on callback:', e);
        }
      }
    } else {
      // Failed or cancelled - update order status
      await db.collection('orders').doc(orderId).update({
        paymentStatus: 'failed',
        status: 'cancelled',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    return res.status(200).send({ message: 'Callback processed' });
  } catch (error) {
    console.error('bKash Callback Error:', error);
    return res.status(500).send('Internal Server Error');
  }
});

// Force deploy update 3

exports.testApiConnection = functions.https.onCall(async (data, context) => {
  // Outer try/catch: ensures no uncaught exception produces opaque CORS-looking failure
  try {

    // 1. Authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'You must be logged in to test API connections.');
    }
    // 2. Admin authorization
    if (!context.auth || !await isAdminUser(context.auth.uid)) {
      throw new functions.https.HttpsError('permission-denied', 'Only admins can test API connections.');
    }

    const { type } = data;
    const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');

    // ── DOMAIN TEST ──────────────────────────────────────────────────────
    if (type === 'domain') {
      try {
        const client = await openprovider.createClient(db);
        return {
          success: true,
          message: `Connected to Openprovider ${client.isSandbox ? 'CTE sandbox' : 'production'} successfully.`,
        };
      } catch (err) {
        if (err instanceof functions.https.HttpsError) throw err;
        console.error('[testApiConnection] domain error:', err.message);
        return { success: false, message: err.message || 'Openprovider connection test failed.' };
      }
    }

    // ── HOSTING / WHM TEST ───────────────────────────────────────────────
    try {
      const hostingSnap = await db.collection('settings').doc('hostingApiConfig').get();
      if (!hostingSnap.exists) {
        return { success: false, message: 'Hosting API configuration not found in Firestore.' };
      }
      const config = hostingSnap.data();

      if (!config.hostingApiKey) {
        return { success: false, message: 'WHM API token is not configured.' };
      }
      if (!config.hostingApiUrl) {
        return { success: false, message: 'WHM API URL is not configured.' };
      }

      // Validate URL
      let parsedUrl;
      try {
        parsedUrl = new URL(config.hostingApiUrl);
      } catch (e) {
        return { success: false, message: 'WHM API URL is invalid. Expected: https://hostname:2087' };
      }

      const baseUrl = config.hostingApiUrl.replace(/\/$/, '');
      const username = config.hostingApiUsername ? config.hostingApiUsername.trim() : 'root';

      // Safe logging — no secrets
      console.log('[testApiConnection] Provider: cPanel/WHM');
      console.log('[testApiConnection] Endpoint:', parsedUrl.hostname);
      console.log('[testApiConnection] Token configured: yes, length:', config.hostingApiKey.length);

      const whmUrl = baseUrl + '/json-api/listaccts?api.version=1';

      // 15 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      let response;
      try {
        response = await fetch(whmUrl, {
          method: 'GET',
          headers: {
            'Authorization': 'whm ' + username + ':' + config.hostingApiKey,
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        const msg = String(fetchErr.message || '');
        if (fetchErr.name === 'AbortError') {
          return { success: false, message: 'WHM connection timed out after 15 seconds.' };
        }
        if (msg.includes('ECONNREFUSED')) {
          return { success: false, message: 'WHM server refused connection. Verify URL and port 2087.' };
        }
        if (msg.includes('ENOTFOUND') || msg.includes('EAI_AGAIN')) {
          return { success: false, message: 'Cannot resolve WHM hostname. Check the URL.' };
        }
        if (msg.includes('ETIMEDOUT') || msg.includes('ESOCKETTIMEDOUT')) {
          return { success: false, message: 'WHM server timed out. Verify network and firewall.' };
        }
        if (msg.includes('certificate') || msg.includes('self-signed') || msg.includes('CERT_')) {
          return { success: false, message: 'TLS/SSL certificate error connecting to WHM.' };
        }
        console.error('[testApiConnection] WHM fetch error:', msg);
        return { success: false, message: 'WHM connection error: ' + msg };
      }

      clearTimeout(timeoutId);
      console.log('[testApiConnection] HTTP status:', response.status);

      if (response.status === 401) return { success: false, message: 'WHM authentication failed (401). Verify username and API token.' };
      if (response.status === 403) return { success: false, message: 'WHM permission denied (403). API token may lack privileges.' };
      if (response.status === 404) return { success: false, message: 'WHM API endpoint not found (404). Verify URL and port 2087.' };
      if (!response.ok) return { success: false, message: 'WHM returned HTTP ' + response.status + '.' };

      const rawText = await response.text();
      try {
        const whmData = JSON.parse(rawText);
        const result = whmData?.metadata?.result;
        if (result === 1 || result === '1') {
          return { success: true, message: 'WHM connection successful.' };
        } else if (result === 0 || result === '0') {
          const reason = whmData?.metadata?.reason || 'Unknown error';
          return { success: false, message: 'WHM error: ' + reason };
        }
        // HTTP 200 but no metadata — treat as success
        return { success: true, message: 'WHM connection successful (HTTP 200).' };
      } catch (parseErr) {
        return { success: false, message: 'WHM returned an unexpected non-JSON response.' };
      }

    } catch (err) {
      if (err instanceof functions.https.HttpsError) throw err;
      console.error('[testApiConnection] WHM error:', err.message);
      return { success: false, message: err.message || 'WHM connection test failed.' };
    }

  } catch (outerErr) {
    // Re-throw proper HttpsErrors (auth failures) so Firebase SDK handles them correctly
    if (outerErr instanceof functions.https.HttpsError) throw outerErr;
    // Convert all unexpected exceptions — prevents opaque CORS-like browser failures
    console.error('[testApiConnection] Unhandled exception:', outerErr);
    throw new functions.https.HttpsError('internal', 'Unexpected server error: ' + (outerErr.message || 'Unknown'));
  }
});

exports.manageHosting = functions.https.onCall(async (data, context) => {
  if (!context.auth || !await isAdminUser(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }

  const { action, providerAccountId, params = {} } = data;
  if (!action || !providerAccountId) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing action or providerAccountId.');
  }

  const validActions = ['suspendacct', 'unsuspendacct', 'killacct', 'accountsummary'];
  if (!validActions.includes(action)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid action.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  const hostingSnap = await db.collection('settings').doc('hostingApiConfig').get();
  const config = hostingSnap.data();

  if (!config || !config.hostingApiKey || !config.hostingApiUrl) {
    throw new functions.https.HttpsError('failed-precondition', 'WHM API key or URL is not configured.');
  }

  const apiUrl = config.hostingApiUrl.replace(/\/$/, '');
  const url = new URL('/json-api/' + action, apiUrl + '/');
  url.searchParams.set('api.version', '1');
  url.searchParams.set('user', providerAccountId);
  
  if (action === 'killacct') {
    url.searchParams.set('preserve_dns', '1');
  }

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': 'whm ' + (config.hostingApiUsername ? config.hostingApiUsername.trim() : 'root') + ':' + config.hostingApiKey,
        'Accept': 'application/json',
      }
    });

    const rawText = await response.text();
    let resData;
    try {
      resData = JSON.parse(rawText);
    } catch (e) {
      throw new Error('Invalid WHM response: ' + rawText);
    }

    if (!response.ok || resData?.metadata?.result?.message) {
      const message = resData?.metadata?.result?.message || 'WHM API error: ' + response.statusText;
      throw new Error(message);
    }

    return { success: true, data: resData };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message || 'Hosting operation failed.');
  }
});
exports.adminApiConfig = functions.https.onCall(async (data, context) => {
  if (!context.auth || !await isAdminUser(context.auth.uid)) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access required.');
  }

  const { method, payload } = data;
  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  const docRef = db.collection('settings').doc('api_keys');

  const secretFields = [
    'openproviderPassword', 'dynadotApiKey', 'hostingApiKey', 'whmApiToken', 'resendApiKey',
    'bkashAppKey', 'bkashAppSecret', 'bkashUsername', 'bkashPassword',
    'sandbox_bkashAppKey', 'sandbox_bkashAppSecret', 'sandbox_bkashUsername', 'sandbox_bkashPassword',
    'production_bkashAppKey', 'production_bkashAppSecret', 'production_bkashUsername', 'production_bkashPassword',
    'clnSecretKey', 'smtpPassword', 'smsApiKey', 'whatsappAccessToken'
  ];

  if (method === 'GET') {
    const snap = await docRef.get();
    const currentData = snap.exists ? snap.data() : {};
    const sanitized = {};

    for (const [key, value] of Object.entries(currentData)) {
      if (secretFields.includes(key)) {
        sanitized[key] = typeof value === 'string' && value.length > 0;
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  } 
  
  if (method === 'POST') {
    const snap = await docRef.get();
    const existing = snap.exists ? snap.data() : {};
    const updates = { ...payload };

    for (const key of Object.keys(updates)) {
      if (secretFields.includes(key)) {
        const value = updates[key];
        if (value === true || (typeof value === 'string' && value.startsWith('****************'))) {
          updates[key] = existing[key];
        }
      }
    }

    await docRef.set(updates, { merge: true });
    return { success: true };
  }

  throw new functions.https.HttpsError('invalid-argument', 'Invalid method');
});

exports.sendEmail = functions.https.onCall(async (data, context) => {
  const { to, subject, html } = data;

  if (!to || !subject || !html) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing to, subject, or html.');
  }

  const db = getFirestore('ai-studio-422fbad2-d827-4e69-8599-aed85390d277');
  const settingsSnap = await db.collection('settings').doc('api_keys').get();
  const apiKeys = settingsSnap.exists ? settingsSnap.data() : null;

  if (!apiKeys || !apiKeys.resendApiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Email service not configured.');
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + apiKeys.resendApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Star Tech <onboarding@resend.dev>',
        to: Array.isArray(to) ? to : [to],
        subject,
        html
      })
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.message || 'Resend API error');
    }

    return { success: true, data: resData };
  } catch (error) {
    console.error('Send Email Error:', error?.message || 'Unknown error');
    throw new functions.https.HttpsError('internal', error.message || 'Failed to send email.');
  }
});

exports.sendWelcomeEmail = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  }

  const { email, name } = data;
  if (!email) {
    throw new functions.https.HttpsError('invalid-argument', 'Email is required.');
  }

  const subject = 'Welcome to Click2IT!';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to Click2IT!</h2>
      <p>Dear ${name || 'Customer'},</p>
      <p>Thank you for signing up with Click2IT. We're excited to have you on board!</p>
      <p>You can now:</p>
      <ul>
        <li>Search and register domains</li>
        <li>Purchase hosting plans</li>
        <li>Manage your services from your dashboard</li>
        <li>Access 24/7 support</li>
      </ul>
      <p>If you have any questions, feel free to contact our support team.</p>
      <p>Best regards,<br>Click2IT Team</p>
    </div>
  `;

  try {
    await sendOrderEmail(email, subject, html);
    return { success: true };
  } catch (error) {
    console.error('Send Welcome Email Error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to send welcome email.');
  }
});
