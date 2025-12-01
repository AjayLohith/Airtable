import express from 'express';
import Response from '../models/Response.js';
import crypto from 'crypto';

const router = express.Router();

router.post('/airtable', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    if (process.env.AIRTABLE_WEBHOOK_SECRET) {
      const signature = req.headers['x-airtable-signature'];
      if (!signature) {
        return res.status(401).json({ error: 'Missing signature' });
      }

      const hmac = crypto.createHmac('sha256', process.env.AIRTABLE_WEBHOOK_SECRET);
      hmac.update(req.body);
      const expectedSignature = hmac.digest('hex');

      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

    const payload = JSON.parse(req.body.toString());
    const { eventType, base, webhook } = payload;

    if (eventType === 'record.updated' || eventType === 'record.created') {
      const { recordId, changedFields } = payload;
      
      const response = await Response.findOne({ airtableRecordId: recordId });
      if (response) {
        if (changedFields) {
          response.answers = { ...response.answers, ...changedFields };
        }
        response.status = 'active';
        response.updatedAt = new Date();
        await response.save();
      }
    } else if (eventType === 'record.deleted') {
      const { recordId } = payload;
      
      const response = await Response.findOne({ airtableRecordId: recordId });
      if (response) {
        response.status = 'deletedInAirtable';
        response.updatedAt = new Date();
        await response.save();
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;


