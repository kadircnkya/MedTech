import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Schema, Document } from 'mongoose';
import jwt from 'jsonwebtoken';
import amqp from 'amqplib';
import cron from 'node-cron';
import axios from 'axios';
import Joi from 'joi';

const app = express();
const PORT = process.env.PORT || 3006;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Models
interface ReminderDocument extends Document {
  userId: string;
  medicationId: string;
  medicationName: string;
  schedule: string; // cron expression
  dosage: string;
  isActive: boolean;
  pushToken?: string;
}

interface NotificationLogDocument extends Document {
  userId: string;
  type: 'REMINDER' | 'DOSE_WARNING' | 'TREATMENT_TRACKING' | 'SYSTEM_LOG' | 'reminder' | 'dose_missed' | 'info';
  title: string;
  body: string;
  sentAt: Date;
  status: 'sent' | 'failed';
  isRead: boolean;
  readAt?: Date;
  relatedMedicationId?: string;
  relatedTreatmentId?: string;
}

const ReminderSchema = new Schema<ReminderDocument>({
  userId: { type: String, required: true, index: true },
  medicationId: { type: String, required: true },
  medicationName: { type: String, required: true },
  schedule: { type: String, required: true },
  dosage: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  pushToken: String,
}, { timestamps: true });

const NotificationLogSchema = new Schema<NotificationLogDocument>({
  userId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  sentAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  relatedMedicationId: { type: String },
  relatedTreatmentId: { type: String }
}, { timestamps: true });

const ReminderModel = mongoose.model<ReminderDocument>('Reminder', ReminderSchema);
const NotificationLogModel = mongoose.model<NotificationLogDocument>('NotificationLog', NotificationLogSchema);

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'default_secret');
    next();
  } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

// Send push notification via Expo Push API
async function sendPushNotification(pushToken: string, title: string, body: string): Promise<boolean> {
  try {
    await axios.post('https://exp.host/--/api/v2/push/send', {
      to: pushToken,
      sound: 'default',
      title,
      body,
    });
    return true;
  } catch (err) {
    console.error('[Notification Service] Push failed:', err);
    return false;
  }
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'notification-service' }));

// POST /api/v1/notifications/reminders
app.post('/api/v1/notifications/reminders', authMiddleware, async (req: any, res) => {
  try {
    const schema = Joi.object({
      medicationId: Joi.string().required(),
      medicationName: Joi.string().required(),
      schedule: Joi.string().required(), // cron expression e.g. "0 8 * * *"
      dosage: Joi.string().required(),
      pushToken: Joi.string(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const reminder = await ReminderModel.create({ ...value, userId: req.user.userId });
    res.status(201).json({ success: true, data: reminder });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/v1/notifications/reminders
app.get('/api/v1/notifications/reminders', authMiddleware, async (req: any, res) => {
  try {
    const reminders = await ReminderModel.find({ userId: req.user.userId }).sort({ createdAt: -1 });
    res.json({ success: true, data: reminders });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// PUT /api/v1/notifications/reminders/:id
app.put('/api/v1/notifications/reminders/:id', authMiddleware, async (req: any, res) => {
  try {
    const reminder = await ReminderModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: req.body },
      { new: true }
    );
    if (!reminder) return res.status(404).json({ success: false, error: 'Reminder not found' });
    res.json({ success: true, data: reminder });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// DELETE /api/v1/notifications/reminders/:id
app.delete('/api/v1/notifications/reminders/:id', authMiddleware, async (req: any, res) => {
  try {
    const result = await ReminderModel.findOneAndDelete({ _id: req.params.id, userId: req.user.userId });
    if (!result) return res.status(404).json({ success: false, error: 'Reminder not found' });
    res.json({ success: true, message: 'Reminder deleted' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});
// GET /api/v1/notifications/logs
app.get('/api/v1/notifications/logs', authMiddleware, async (req: any, res) => {
  try {
    const logs = await NotificationLogModel.find({ userId: req.user.userId }).sort({ sentAt: -1 }).limit(50);
    res.json({ success: true, data: logs });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/v1/notifications/logs/unread-count
app.get('/api/v1/notifications/logs/unread-count', authMiddleware, async (req: any, res) => {
  try {
    const count = await NotificationLogModel.countDocuments({ userId: req.user.userId, isRead: false });
    res.json({ success: true, count });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/v1/notifications/logs/read-all
app.patch('/api/v1/notifications/logs/read-all', authMiddleware, async (req: any, res) => {
  try {
    await NotificationLogModel.updateMany(
      { userId: req.user.userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    res.json({ success: true, message: 'All marked as read' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// PATCH /api/v1/notifications/logs/:id/read
app.patch('/api/v1/notifications/logs/:id/read', authMiddleware, async (req: any, res) => {
  try {
    const log = await NotificationLogModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true }
    );
    if (!log) return res.status(404).json({ success: false, error: 'Log not found' });
    res.json({ success: true, data: log });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});
async function bootstrap() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/notification_db');
  console.log('[Notification Service] Connected to MongoDB');

  // Subscribe to tracking events
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    const channel = await conn.createChannel();
    await channel.assertExchange('mediflow.tracking', 'topic', { durable: true });
    await channel.assertQueue('notification-service.dose-missed', { durable: true });
    await channel.bindQueue('notification-service.dose-missed', 'mediflow.tracking', 'tracking.dose_missed');

    channel.consume('notification-service.dose-missed', async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        console.log('[Notification Service] Dose missed event:', data.userId);
        await NotificationLogModel.create({
          userId: data.userId,
          type: 'dose_missed',
          title: 'İlaç Hatırlatma',
          body: `${data.medicationName || 'İlacınızı'} almayı unuttunuz!`,
        });
        channel.ack(msg);
      } catch (err) {
        channel.nack(msg, false, false);
      }
    });
    console.log('[Notification Service] Subscribed to dose_missed events');
  } catch { console.warn('[Notification Service] RabbitMQ not available'); }

  // Cron job: check reminders every minute
  cron.schedule('* * * * *', async () => {
    try {
      const activeReminders = await ReminderModel.find({ isActive: true });
      const now = new Date();

      for (const reminder of activeReminders) {
        // Simple schedule matching (in production, use proper cron parsing)
        if (reminder.pushToken) {
          // Only send at the scheduled time
          const [min, hour] = reminder.schedule.split(' ');
          if (now.getHours() === Number(hour) && now.getMinutes() === Number(min)) {
            const sent = await sendPushNotification(
              reminder.pushToken,
              '💊 İlaç Hatırlatma',
              `${reminder.medicationName} - ${reminder.dosage} almanız gereken zaman!`
            );
            await NotificationLogModel.create({
              userId: reminder.userId,
              type: 'reminder',
              title: 'İlaç Hatırlatma',
              body: `${reminder.medicationName} - ${reminder.dosage}`,
              status: sent ? 'sent' : 'failed',
            });
          }
        }
      }
    } catch (err) {
      console.error('[Notification Service] Cron error:', err);
    }
  });

  app.listen(PORT, () => console.log(`[Notification Service] Running on port ${PORT}`));
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
process.on('SIGTERM', async () => { await mongoose.disconnect(); process.exit(0); });
