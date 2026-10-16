import { Router, Response } from 'express';
import { getAdminDb, isAdminDbAvailable } from '../firebase/admin.js';
import { sendEmail } from '../services/email.js';

const priceAlertsRouter = Router();

// 1. Subscribe to Price Alert
priceAlertsRouter.post('/subscribe', async (req: any, res: Response) => {
  try {
    const { productId, productName, productImage, currentPrice, targetPrice, email, userId } = req.body;

    if (!productId || !productName || !email || targetPrice === undefined || targetPrice <= 0) {
      return res.status(400).json({ success: false, error: 'Missing required fields: productId, productName, email, targetPrice' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, error: 'Invalid email address' });
    }

    if (!isAdminDbAvailable()) {
      return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    const db = getAdminDb();
    const cleanEmail = email.trim().toLowerCase();
    
    // Check if subscription already exists for this email & product
    const existingSnap = await db.collection('price_alerts')
      .where('productId', '==', productId)
      .where('email', '==', cleanEmail)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    let alertId: string;
    const alertData = {
      productId,
      productName,
      productImage: productImage || '',
      currentPrice: Number(currentPrice || 0),
      targetPrice: Number(targetPrice),
      email: cleanEmail,
      userId: userId || 'guest',
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    if (!existingSnap.empty) {
      const existingDoc = existingSnap.docs[0];
      alertId = existingDoc.id;
      await existingDoc.ref.update(alertData);
    } else {
      const newRef = await db.collection('price_alerts').add({
        ...alertData,
        createdAt: new Date().toISOString(),
      });
      alertId = newRef.id;
    }

    // Send confirmation email
    const productUrl = `https://click2itbd.com/product/${productId}`;
    const formattedTarget = Number(targetPrice).toLocaleString();
    const formattedCurrent = Number(currentPrice || targetPrice).toLocaleString();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
        <div style="background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">🔔 Price Alert Confirmed!</h1>
        </div>
        <div style="padding: 24px; color: #1f2937;">
          <p style="font-size: 15px; margin-top: 0;">Hello,</p>
          <p style="font-size: 15px; line-height: 1.5;">You have successfully set up a price drop alert on <strong>CLICK2IT</strong>. We will keep an eye on this product and email you the moment the price drops!</p>
          
          <div style="background-color: #fff7ed; border: 1px solid #ffedd5; padding: 18px; border-radius: 10px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                ${productImage ? `<td style="width: 80px; vertical-align: top; padding-right: 15px;"><img src="${productImage}" alt="${productName}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 8px; background: #fff; border: 1px solid #eee;" /></td>` : ''}
                <td style="vertical-align: top;">
                  <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #111827;">${productName}</h3>
                  <p style="margin: 0 0 4px 0; font-size: 14px; color: #4b5563;">Current Price: <strong>৳${formattedCurrent}</strong></p>
                  <p style="margin: 0; font-size: 14px; color: #c2410c; font-weight: bold;">Target Price Alert: ৳${formattedTarget} or lower</p>
                </td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin-top: 25px;">
            <a href="${productUrl}" style="background-color: #F97316; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 15px; display: inline-block; shadow: 0 2px 4px rgba(0,0,0,0.1);">View Product Page</a>
          </div>
        </div>
        <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px; font-size: 12px; color: #6b7280; text-align: center;">
          <p style="margin: 0;">CLICK2IT Tech Store & Services • Bangladesh</p>
          <p style="margin: 4px 0 0 0;">Need help? Visit <a href="https://click2itbd.com" style="color: #F97316; text-decoration: none;">click2itbd.com</a></p>
        </div>
      </div>
    `;

    // Fire & forget or await sending
    sendEmail({
      to: cleanEmail,
      subject: `🔔 Price Alert Set: ${productName}`,
      html: emailHtml,
      category: 'system',
    }).catch(err => console.error('[PriceAlert] Error sending confirmation email:', err));

    return res.status(200).json({
      success: true,
      alertId,
      message: `Price alert set! We will email ${cleanEmail} when the price drops to ৳${formattedTarget} or lower.`,
    });
  } catch (error: any) {
    console.error('[PriceAlert] Subscribe error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create price alert subscription' });
  }
});

// 2. Unsubscribe / Cancel Price Alert
priceAlertsRouter.post('/unsubscribe', async (req: any, res: Response) => {
  try {
    const { alertId, productId, email } = req.body;

    if (!isAdminDbAvailable()) {
      return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    const db = getAdminDb();

    if (alertId) {
      await db.collection('price_alerts').doc(alertId).update({
        status: 'cancelled',
        updatedAt: new Date().toISOString(),
      });
      return res.status(200).json({ success: true, message: 'Price alert cancelled successfully' });
    }

    if (productId && email) {
      const cleanEmail = email.trim().toLowerCase();
      const snap = await db.collection('price_alerts')
        .where('productId', '==', productId)
        .where('email', '==', cleanEmail)
        .get();

      const batch = db.batch();
      snap.docs.forEach((doc: any) => {
        batch.update(doc.ref, { status: 'cancelled', updatedAt: new Date().toISOString() });
      });
      await batch.commit();

      return res.status(200).json({ success: true, message: 'Price alert cancelled successfully' });
    }

    return res.status(400).json({ success: false, error: 'Provide either alertId or (productId and email)' });
  } catch (error: any) {
    console.error('[PriceAlert] Unsubscribe error:', error);
    return res.status(500).json({ success: false, error: 'Failed to cancel price alert' });
  }
});

// 3. Check status of a price alert for a given product & email/userId
priceAlertsRouter.get('/check-status', async (req: any, res: Response) => {
  try {
    const { productId, email, userId } = req.query;

    if (!productId || (!email && !userId)) {
      return res.status(400).json({ success: false, error: 'productId and email/userId required' });
    }

    if (!isAdminDbAvailable()) {
      return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    const db = getAdminDb();
    let queryRef: any = db.collection('price_alerts')
      .where('productId', '==', String(productId))
      .where('status', '==', 'active');

    if (email) {
      queryRef = queryRef.where('email', '==', String(email).trim().toLowerCase());
    } else if (userId) {
      queryRef = queryRef.where('userId', '==', String(userId));
    }

    const snap = await queryRef.limit(1).get();

    if (snap.empty) {
      return res.json({ success: true, activeAlert: null });
    }

    const alertDoc = snap.docs[0];
    return res.json({
      success: true,
      activeAlert: {
        id: alertDoc.id,
        ...alertDoc.data(),
      },
    });
  } catch (error: any) {
    console.error('[PriceAlert] Check status error:', error);
    return res.status(500).json({ success: false, error: 'Failed to check alert status' });
  }
});

// 4. Get all active alerts for logged-in user or email
priceAlertsRouter.get('/user-alerts', async (req: any, res: Response) => {
  try {
    const { email, userId } = req.query;

    if (!email && !userId) {
      return res.status(400).json({ success: false, error: 'Email or userId required' });
    }

    if (!isAdminDbAvailable()) {
      return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    const db = getAdminDb();
    let snap;

    if (email) {
      snap = await db.collection('price_alerts')
        .where('email', '==', String(email).trim().toLowerCase())
        .where('status', '==', 'active')
        .get();
    } else {
      snap = await db.collection('price_alerts')
        .where('userId', '==', String(userId))
        .where('status', '==', 'active')
        .get();
    }

    const alerts = snap.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({ success: true, alerts });
  } catch (error: any) {
    console.error('[PriceAlert] User alerts error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch user price alerts' });
  }
});

// 5. Trigger price drop check and send notifications to subscribers
priceAlertsRouter.post('/check-price-drop', async (req: any, res: Response) => {
  try {
    const { productId, newPrice, oldPrice } = req.body;

    if (!productId || newPrice === undefined) {
      return res.status(400).json({ success: false, error: 'productId and newPrice are required' });
    }

    const numNewPrice = Number(newPrice);
    const numOldPrice = oldPrice ? Number(oldPrice) : null;

    if (!isAdminDbAvailable()) {
      return res.status(500).json({ success: false, error: 'Database service unavailable' });
    }

    const db = getAdminDb();
    
    // Find all active alerts for this product where targetPrice >= newPrice OR currentPrice > newPrice
    const snap = await db.collection('price_alerts')
      .where('productId', '==', String(productId))
      .where('status', '==', 'active')
      .get();

    if (snap.empty) {
      return res.json({ success: true, notifiedCount: 0, message: 'No active alerts for this product' });
    }

    let notifiedCount = 0;
    const batch = db.batch();

    for (const alertDoc of snap.docs) {
      const data = alertDoc.data();
      const targetPrice = Number(data.targetPrice || 0);
      const originalAlertPrice = Number(data.currentPrice || targetPrice);

      // Trigger if newPrice <= targetPrice or newPrice < originalAlertPrice
      if (numNewPrice <= targetPrice || (numOldPrice && numNewPrice < numOldPrice)) {
        const savings = (numOldPrice || originalAlertPrice) - numNewPrice;
        const formattedNewPrice = numNewPrice.toLocaleString();
        const formattedOldPrice = (numOldPrice || originalAlertPrice).toLocaleString();
        const formattedSavings = savings > 0 ? savings.toLocaleString() : null;
        const productUrl = `https://click2itbd.com/product/${productId}`;

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
            <div style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800;">🎉 Great News! Price Dropped!</h1>
              <p style="color: #d1fae5; margin: 6px 0 0 0; font-size: 15px;">Your saved item is now available at a lower price!</p>
            </div>
            
            <div style="padding: 24px; color: #1f2937;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #111827;">${data.productName}</h2>
              
              <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 20px; border-radius: 12px; margin: 16px 0; text-align: center;">
                ${data.productImage ? `<img src="${data.productImage}" alt="${data.productName}" style="max-width: 140px; max-height: 140px; object-fit: contain; margin-bottom: 12px; border-radius: 8px;" /><br/>` : ''}
                
                <div style="font-size: 14px; color: #6b7280; text-decoration: line-through;">Previous Price: ৳${formattedOldPrice}</div>
                <div style="font-size: 28px; font-weight: 800; color: #059669; margin: 4px 0;">New Price: ৳${formattedNewPrice}</div>
                ${formattedSavings ? `<div style="display: inline-block; background-color: #dcfce7; color: #166534; font-weight: bold; padding: 4px 12px; border-radius: 20px; font-size: 13px; margin-top: 6px;">You Save: ৳${formattedSavings}!</div>` : ''}
              </div>

              <p style="font-size: 14px; color: #4b5563; line-height: 1.5;">Stock is limited. Don't miss out on this price drop!</p>

              <div style="text-align: center; margin-top: 24px;">
                <a href="${productUrl}" style="background-color: #F97316; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 50px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(249, 115, 22, 0.25);">Shop Now & Save</a>
              </div>
            </div>

            <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px; font-size: 12px; color: #6b7280; text-align: center;">
              <p style="margin: 0;">CLICK2IT Tech Store & Services • Bangladesh</p>
              <p style="margin: 4px 0 0 0;">You received this email because you subscribed to price alerts for this product.</p>
            </div>
          </div>
        `;

        // Send email
        await sendEmail({
          to: data.email,
          subject: `🔥 Price Drop Alert: ${data.productName} is now ৳${formattedNewPrice}!`,
          html: emailHtml,
          category: 'system',
        });

        // Mark alert as triggered
        batch.update(alertDoc.ref, {
          status: 'triggered',
          lastNotifiedPrice: numNewPrice,
          lastNotifiedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        notifiedCount++;
      }
    }

    if (notifiedCount > 0) {
      await batch.commit();
    }

    return res.json({
      success: true,
      notifiedCount,
      message: `Checked alerts for product. Sent notifications to ${notifiedCount} subscriber(s).`,
    });
  } catch (error: any) {
    console.error('[PriceAlert] Check price drop error:', error);
    return res.status(500).json({ success: false, error: 'Failed to process price drop check' });
  }
});

export default priceAlertsRouter;
