import { Router, Response } from 'express';
import { sendEmail, EmailTemplates, verifySmtpConnection } from '../services/email.js';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';
import { getDynamicTemplate } from '../services/templateHelper.js';

const emailRouter = Router();

emailRouter.post('/send-email', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { to, subject, html, attachments } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    const result = await sendEmail({ to, subject, html, attachments });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to send email' });
    }

    res.status(200).json({ success: true, message: 'Email sent successfully' });
  } catch (error: any) {
    console.error('Email send error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

emailRouter.post('/verify-smtp', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const result = await verifySmtpConnection();
    res.status(200).json(result);
  } catch (error: any) {
    console.error('SMTP verify error:', error);
    res.status(500).json({ success: false, message: error.message || 'Verification failed' });
  }
});

// --- Customer E-Commerce Emails ---

emailRouter.post('/order-confirmation', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { orderId, customerName, customerEmail, attachments } = req.body;
    if (!orderId || !customerName || !customerEmail) return res.status(400).json({ error: 'Missing fields' });
    
    const defaultTmpl = EmailTemplates.orderConfirmation(orderId, customerName);
    const template = await getDynamicTemplate(
      'order_confirmation', 
      { orderId, customerName }, 
      defaultTmpl.subject, 
      defaultTmpl.html
    );
    
    const result = await sendEmail({ to: customerEmail, subject: template.subject, html: template.html, attachments, category: 'order' });
    
    if (!result.success) return res.status(400).json({ error: result.error });
    res.status(200).json({ success: true, message: 'Order confirmation sent' });
  } catch (error) {
    console.error(error); res.status(500).json({ error: 'Internal server error' });
  }
});

emailRouter.post('/order-status-update', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { orderId, customerName, customerEmail, status } = req.body;
    if (!orderId || !customerName || !customerEmail || !status) return res.status(400).json({ error: 'Missing fields' });
    
    const defaultTmpl = EmailTemplates.orderStatusUpdate(orderId, customerName, status);
    const template = await getDynamicTemplate(
      'order_status_update', 
      { orderId, customerName, status: status.toUpperCase() }, 
      defaultTmpl.subject, 
      defaultTmpl.html
    );

    const result = await sendEmail({ to: customerEmail, subject: template.subject, html: template.html, category: 'order' });
    
    if (!result.success) return res.status(400).json({ error: result.error });
    res.status(200).json({ success: true, message: 'Order status update sent' });
  } catch (error) {
    console.error(error); res.status(500).json({ error: 'Internal server error' });
  }
});

emailRouter.post('/payment-verification', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { orderId, customerName, customerEmail, amount, method } = req.body;
    if (!orderId || !customerName || !customerEmail || !amount || !method) return res.status(400).json({ error: 'Missing fields' });
    
    const defaultTmpl = EmailTemplates.paymentVerification(orderId, customerName, amount, method);
    const template = await getDynamicTemplate(
      'payment_verification', 
      { orderId, customerName, total: String(amount), paymentMethod: method }, 
      defaultTmpl.subject, 
      defaultTmpl.html
    );

    const result = await sendEmail({ to: customerEmail, subject: template.subject, html: template.html, category: 'payment' });
    
    if (!result.success) return res.status(400).json({ error: result.error });
    res.status(200).json({ success: true, message: 'Payment verification sent' });
  } catch (error) {
    console.error(error); res.status(500).json({ error: 'Internal server error' });
  }
});

// --- PC Builder Emails ---

emailRouter.post('/pc-build-summary', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { customerName, customerEmail, totalAmount, attachments } = req.body;
    if (!customerName || !customerEmail || !totalAmount) return res.status(400).json({ error: 'Missing fields' });
    
    const defaultTmpl = EmailTemplates.pcBuildSummary(customerName, totalAmount);
    const template = await getDynamicTemplate(
      'pc_build_summary', 
      { customerName, total: String(totalAmount) }, 
      defaultTmpl.subject, 
      defaultTmpl.html
    );

    const result = await sendEmail({ to: customerEmail, subject: template.subject, html: template.html, attachments, category: 'system' });
    
    if (!result.success) return res.status(400).json({ error: result.error });
    res.status(200).json({ success: true, message: 'PC Build Summary sent' });
  } catch (error) {
    console.error(error); res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Admin Alerts ---

emailRouter.post('/low-stock-warning', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { productName, currentStock } = req.body;
    if (!productName || currentStock === undefined) return res.status(400).json({ error: 'Missing fields' });
    
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || 'info@click2itbd.com';
    const defaultTmpl = EmailTemplates.lowStockWarning(productName, currentStock);
    
    const template = await getDynamicTemplate(
      'low_stock_warning', 
      { productName, currentStock: String(currentStock) }, 
      defaultTmpl.subject, 
      defaultTmpl.html
    );

    const result = await sendEmail({ to: adminEmail, subject: template.subject, html: template.html, category: 'system' });
    
    if (!result.success) return res.status(400).json({ error: result.error });
    res.status(200).json({ success: true, message: 'Low stock warning sent' });
  } catch (error) {
    console.error(error); res.status(500).json({ error: 'Internal server error' });
  }
});

emailRouter.post('/notify-admin-new-order', requireFirebaseAuth, async (req: any, res: Response) => {
  try {
    const { orderId, orderData } = req.body;
    
    if (!orderId || !orderData) {
      return res.status(400).json({ error: 'Missing orderId or orderData' });
    }

    const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_FROM_EMAIL || 'info@click2itbd.com';
    const customerName = orderData.customerName || 'A customer';
    const totalAmount = orderData.total || 0;
    
    const subject = `New Order Received - #${orderId.slice(0, 8)}`;
    let itemsHtml = '';
    if (orderData.items && orderData.items.length > 0) {
      itemsHtml = '<h3>Order Items:</h3><ul>' + orderData.items.map((i: any) => `<li>${i.name} (x${i.quantity || 1}) - ৳${i.price}</li>`).join('') + '</ul>';
    }

    const defaultHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #2563eb;">New Order Received!</h2>
        <p>A new order has been placed on Click2ItBD.</p>
        <p><strong>Order ID:</strong> ${orderId}</p>
        <p><strong>Customer:</strong> ${customerName} (${orderData.customerEmail || 'No email'})</p>
        <p><strong>Phone:</strong> ${orderData.customerPhone || 'N/A'}</p>
        <p><strong>Total Amount:</strong> ৳ ${totalAmount}</p>
        <p><strong>Payment Method:</strong> ${orderData.paymentMethod || 'N/A'}</p>
        ${itemsHtml}
        <br/>
        <a href="https://click2itbd.com/admin" style="display: inline-block; padding: 10px 20px; background: #2563eb; color: white; text-decoration: none; border-radius: 5px;">View Order in Admin Panel</a>
      </div>
    `;

    const template = await getDynamicTemplate(
      'admin_new_order', 
      { orderId, customerName, total: String(totalAmount), paymentMethod: orderData.paymentMethod || 'N/A' }, 
      subject, 
      defaultHtml
    );

    const result = await sendEmail({ 
      to: adminEmail, 
      subject: template.subject, 
      html: template.html,
      orderId,
      category: 'system'
    });

    if (!result.success) {
      return res.status(400).json({ error: result.error || 'Failed to send admin notification' });
    }

    res.status(200).json({ success: true, message: 'Admin notification sent' });
  } catch (error: any) {
    console.error('Admin notification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default emailRouter;
