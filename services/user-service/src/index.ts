import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import amqp from 'amqplib';
import Joi from 'joi';
import { UserProfileModel, HealthInfoModel } from './infrastructure/database/models';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'default_secret');
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
}

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service', timestamp: new Date().toISOString() });
});

// GET /api/v1/users/profile
app.get('/api/v1/users/profile', authMiddleware, async (req: any, res) => {
  try {
    const profile = await UserProfileModel.findOne({ userId: req.user.userId });
    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/users/profile
app.put('/api/v1/users/profile', authMiddleware, async (req: any, res) => {
  try {
    const schema = Joi.object({
      firstName: Joi.string().max(100),
      lastName: Joi.string().max(100),
      nationalId: Joi.string().max(20),
      email: Joi.string().email(),
      dateOfBirth: Joi.date(),
      gender: Joi.string().valid('male', 'female', 'other'),
      bloodType: Joi.string().max(5),
      phone: Joi.string().max(20),
      height: Joi.number().positive(),
      weight: Joi.number().positive(),
      emergencyContactName: Joi.string().max(100),
      emergencyContactPhone: Joi.string().max(20)
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const profile = await UserProfileModel.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: value },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/users/health
app.get('/api/v1/users/health', authMiddleware, async (req: any, res) => {
  try {
    const health = await HealthInfoModel.findOne({ userId: req.user.userId });
    if (!health) {
      return res.status(404).json({ success: false, error: 'Health info not found' });
    }
    res.json({ success: true, data: health });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/v1/users/health
app.put('/api/v1/users/health', authMiddleware, async (req: any, res) => {
  try {
    const schema = Joi.object({
      allergies: Joi.array().items(Joi.string()),
      diseases: Joi.array().items(Joi.string()),
      currentMedications: Joi.array().items(Joi.string()),
      weight: Joi.number().positive(),
      height: Joi.number().positive(),
      notes: Joi.string().max(1000),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const health = await HealthInfoModel.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: value },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: health });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// POST /api/v1/users/login-track
app.post('/api/v1/users/login-track', authMiddleware, async (req: any, res) => {
  try {
    await UserProfileModel.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { lastLoginDate: new Date() } }
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/v1/users/profile-image
app.patch('/api/v1/users/profile-image', authMiddleware, async (req: any, res) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) return res.status(400).json({ success: false, error: 'Avatar URL is required' });

    const profile = await UserProfileModel.findOneAndUpdate(
      { userId: req.user.userId },
      { $set: { avatarUrl } },
      { new: true }
    );
    if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/v1/users/account
app.delete('/api/v1/users/account', authMiddleware, async (req: any, res) => {
  try {
    const { hardDelete } = req.query;

    if (hardDelete === 'true') {
      // Hard delete (remove database records entirely)
      await UserProfileModel.deleteOne({ userId: req.user.userId });
      await HealthInfoModel.deleteOne({ userId: req.user.userId });
      res.json({ success: true, message: 'Account permanently deleted (Hard Delete)' });
    } else {
      // Soft delete (mark as deleted)
      const profile = await UserProfileModel.findOneAndUpdate(
        { userId: req.user.userId },
        { $set: { isDeleted: true } },
        { new: true }
      );
      if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });
      res.json({ success: true, message: 'Account suspended/soft-deleted successfully', data: profile });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function bootstrap() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/user_db');
  console.log('[User Service] Connected to MongoDB');

  // Subscribe to user.registered event
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    const channel = await conn.createChannel();
    await channel.assertExchange('mediflow.users', 'topic', { durable: true });
    await channel.assertQueue('user-service.user-registered', { durable: true });
    await channel.bindQueue('user-service.user-registered', 'mediflow.users', 'user.registered');

    channel.consume('user-service.user-registered', async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        console.log('[User Service] Creating profile for user:', data.userId);
        await UserProfileModel.create({ userId: data.userId, firstName: '', lastName: '' });
        await HealthInfoModel.create({ userId: data.userId, allergies: [], diseases: [], currentMedications: [] });
        channel.ack(msg);
      } catch (err) {
        console.error('[User Service] Event processing error:', err);
        channel.nack(msg, false, false);
      }
    });
    console.log('[User Service] Subscribed to user.registered events');
  } catch {
    console.warn('[User Service] RabbitMQ not available');
  }

  app.listen(PORT, () => console.log(`[User Service] Running on port ${PORT}`));
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
process.on('SIGTERM', async () => { await mongoose.disconnect(); process.exit(0); });
