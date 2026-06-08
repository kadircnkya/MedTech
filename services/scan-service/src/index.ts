import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Schema, Document } from 'mongoose';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import amqp from 'amqplib';

const app = express();
const PORT = process.env.PORT || 3004;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Scan Record Model
interface ScanDocument extends Document {
  userId: string;
  barcode: string;
  medicationId?: string;
  medicationName?: string;
  aiExplanation?: string;
  sideEffects?: string[];
  source: 'camera' | 'manual';
  scanDate: Date;
}

const ScanSchema = new Schema<ScanDocument>({
  userId: { type: String, required: true, index: true },
  barcode: { type: String, required: true },
  medicationId: String,
  medicationName: String,
  aiExplanation: String,
  sideEffects: [String],
  source: { type: String, enum: ['camera', 'manual'], default: 'camera' },
  scanDate: { type: Date, default: Date.now },
}, { timestamps: true });

const ScanModel = mongoose.model<ScanDocument>('ScanRecord', ScanSchema);

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'default_secret');
    next();
  } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

let rabbitChannel: any = null;

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'scan-service' }));

// POST /api/v1/scans - Main scan flow (orchestrates medication lookup + AI)
app.post('/api/v1/scans', authMiddleware, async (req: any, res) => {
  try {
    const { barcode, source = 'camera' } = req.body;
    if (!barcode) return res.status(400).json({ success: false, error: 'Barcode required' });

    const token = req.headers.authorization;

    // 1. Find medication by barcode
    let medication: any = null;
    try {
      const medRes = await axios.get(
        `${process.env.MEDICATION_SERVICE_URL || 'http://localhost:3003'}/api/v1/medications/barcode/${barcode}`,
        { headers: { Authorization: token } }
      );
      medication = medRes.data.data;
    } catch { /* medication not found */ }

    // 2. Get user health info
    let healthInfo: any = null;
    try {
      const healthRes = await axios.get(
        `${process.env.USER_SERVICE_URL || 'http://localhost:3002'}/api/v1/users/health`,
        { headers: { Authorization: token } }
      );
      healthInfo = healthRes.data.data;
    } catch { /* health info not found */ }

    // 3. Get AI explanation
    let aiResult: any = null;
    if (medication) {
      try {
        const aiRes = await axios.post(
          `${process.env.AI_SERVICE_URL || 'http://localhost:3005'}/api/v1/ai/explain`,
          { medication, healthInfo },
          { headers: { Authorization: token }, timeout: 30000 }
        );
        aiResult = aiRes.data.data;
      } catch { /* AI not available */ }
    }

    // 4. Save scan record
    const scan = await ScanModel.create({
      userId: req.user.userId,
      barcode,
      medicationId: medication?._id,
      medicationName: medication?.name,
      aiExplanation: aiResult?.explanation,
      sideEffects: aiResult?.sideEffects || medication?.sideEffects,
      source,
    });

    // 5. Publish scan.completed event
    if (rabbitChannel) {
      rabbitChannel.publish('mediflow.scans', 'scan.completed',
        Buffer.from(JSON.stringify({
          userId: req.user.userId,
          scanId: scan._id,
          medicationId: medication?._id,
          barcode,
        })), { persistent: true });
    }

    res.status(201).json({
      success: true,
      data: {
        scan,
        medication,
        aiExplanation: aiResult?.explanation || null,
        sideEffects: aiResult?.sideEffects || medication?.sideEffects || [],
        warnings: aiResult?.warnings || [],
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/scans/history
app.get('/api/v1/scans/history', authMiddleware, async (req: any, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const scans = await ScanModel.find({ userId: req.user.userId })
      .sort({ scanDate: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await ScanModel.countDocuments({ userId: req.user.userId });
    res.json({ success: true, data: scans, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

async function bootstrap() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/scan_db');
  console.log('[Scan Service] Connected to MongoDB');

  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    rabbitChannel = await conn.createChannel();
    await rabbitChannel.assertExchange('mediflow.scans', 'topic', { durable: true });
    console.log('[Scan Service] Connected to RabbitMQ');
  } catch { console.warn('[Scan Service] RabbitMQ not available'); }

  app.listen(PORT, () => console.log(`[Scan Service] Running on port ${PORT}`));
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
process.on('SIGTERM', async () => { await mongoose.disconnect(); process.exit(0); });
