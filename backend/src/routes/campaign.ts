import { Router, Response } from 'express';
import { requireFirebaseAuth } from '../middleware/firebaseAuth.js';

const campaignRouter = Router();

campaignRouter.post('/send-sms-campaign', requireFirebaseAuth, async (req: any, res: Response) => {
  const { leads, message } = req.body;
  const smsApiKey = process.env.SMS_API_KEY;

  if (!smsApiKey) {
    return res.status(500).json({ success: false, error: 'SMS API is not configured in environment.' });
  }

  try {
    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
      if (!lead.phone) continue;
      try {
        const response = await fetch('https://api.sms-gateway.example/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: smsApiKey,
            number: lead.phone,
            message: message
          })
        });
        const data: any = await response.json();
        if (data?.success) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }

    res.status(200).json({ success: true, sentCount: successCount, failCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to send SMS campaign' });
  }
});

campaignRouter.post('/send-whatsapp-campaign', requireFirebaseAuth, async (req: any, res: Response) => {
  const { leads, message } = req.body;
  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return res.status(500).json({ success: false, error: 'WhatsApp API (Token/Phone ID) not configured.' });
  }

  try {
    let successCount = 0;
    let failCount = 0;

    for (const lead of leads) {
      if (!lead.phone) continue;
      
      let waNumber = lead.phone.replace(/\D/g, '');
      if (waNumber.startsWith('01')) waNumber = '88' + waNumber;

      try {
        const response = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: waNumber,
            type: 'text',
            text: { body: message }
          })
        });
        const data: any = await response.json();
        if (data?.messages) successCount++;
        else failCount++;
      } catch (err: any) {
        console.error(`WhatsApp send failed to ${waNumber}:`, err.message);
        failCount++;
      }
    }

    res.status(200).json({ success: true, sentCount: successCount, failCount });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to send WhatsApp campaign' });
  }
});

export default campaignRouter;