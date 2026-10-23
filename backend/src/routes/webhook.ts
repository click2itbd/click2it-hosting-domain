import { Router, Response } from 'express';

const webhookRouter = Router();

webhookRouter.get('/whatsapp', (req: any, res: Response) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verify_token) {
    return res.sendStatus(403);
  }
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(403);
  }
});

webhookRouter.post('/whatsapp', async (req: any, res: Response) => {
  try {
    const body = req.body;

    if (!body || !body.object) {
      return res.sendStatus(404);
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;

    if (value?.messages && value.messages.length > 0) {
      const message = value.messages[0];
      const phoneNumber = value.contacts?.[0]?.wa_id || message?.from || 'unknown';
      const msgBody = message?.text?.body || message?.interactive?.button_reply?.title || message?.type || 'non-text message';

      console.log(`[WhatsApp Webhook] Received message from ${phoneNumber}: ${msgBody}`);
    } else if (value?.statuses && value.statuses.length > 0) {
      const status = value.statuses[0];
      console.log(`[WhatsApp Webhook] Status update for ${status.recipient_id}: ${status.status}`);
    }

    return res.sendStatus(200);
  } catch (error: any) {
    console.error('[WhatsApp Webhook] Processing error:', error?.message || error);
    return res.sendStatus(200); // Always return 200 to WhatsApp to avoid repeated retries
  }
});

export default webhookRouter;
