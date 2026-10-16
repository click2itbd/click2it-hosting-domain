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
  const body = req.body;

  if (!body.object) {
    return res.sendStatus(404);
  }

  if (
    body.entry &&
    body.entry[0].changes &&
    body.entry[0].changes[0] &&
    body.entry[0].changes[0].value.messages &&
    body.entry[0].changes[0].value.messages[0]
  ) {
    const phoneNumber = body.entry[0].changes[0].value.contacts[0].wa_id;
    const msgBody = body.entry[0].changes[0].value.messages[0].text.body;

    console.log(`Received WhatsApp message from ${phoneNumber}`);
  }

  res.sendStatus(200);
});

export default webhookRouter;
