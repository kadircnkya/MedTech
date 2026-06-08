import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose, { Schema, Document } from 'mongoose';
import jwt from 'jsonwebtoken';
import amqp from 'amqplib';
import Joi from 'joi';

const app = express();
const PORT = process.env.PORT || 3007;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Models
interface DoseLogDocument extends Document {
  userId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: Date;
  takenTime?: Date;
  status: 'taken' | 'missed' | 'skipped';
  notes?: string;
}

const DoseLogSchema = new Schema<DoseLogDocument>({
  userId: { type: String, required: true, index: true },
  medicationId: { type: String, required: true },
  medicationName: { type: String, required: true },
  scheduledTime: { type: Date, required: true },
  takenTime: Date,
  status: { type: String, enum: ['taken', 'missed', 'skipped'], required: true },
  notes: String,
}, { timestamps: true });

DoseLogSchema.index({ userId: 1, medicationId: 1, scheduledTime: -1 });

const DoseLogModel = mongoose.model<DoseLogDocument>('DoseLog', DoseLogSchema);

// =============================================
// NEW SCHEMAS FOR V2.0
// =============================================
interface MedicationScheduleDocument extends Document {
  userId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string; // e.g., "1x1", "2x1", "every_8_hours"
  startDate: Date;
  endDate?: Date;
  reminderTimes: string[]; // ["08:00", "20:00"]
  isActive: boolean;
}

const MedicationScheduleSchema = new Schema<MedicationScheduleDocument>({
  userId: { type: String, required: true, index: true },
  medicationId: { type: String, required: true },
  medicationName: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  reminderTimes: [{ type: String }],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

const MedicationScheduleModel = mongoose.model<MedicationScheduleDocument>('MedicationSchedule', MedicationScheduleSchema);

interface AppointmentDocument extends Document {
  userId: string;
  doctorName: string;
  branch: string;
  hospitalName: string;
  appointmentDate: Date;
  status: 'upcoming' | 'completed' | 'cancelled';
  notes?: string;
}

const AppointmentSchema = new Schema<AppointmentDocument>({
  userId: { type: String, required: true, index: true },
  doctorName: { type: String, required: true },
  branch: { type: String, required: true },
  hospitalName: { type: String, required: true },
  appointmentDate: { type: Date, required: true, index: true },
  status: { type: String, enum: ['upcoming', 'completed', 'cancelled'], default: 'upcoming' },
  notes: { type: String }
}, { timestamps: true });

const AppointmentModel = mongoose.model<AppointmentDocument>('Appointment', AppointmentSchema);

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

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'tracking-service' }));

// POST /api/v1/tracking/doses
app.post('/api/v1/tracking/doses', authMiddleware, async (req: any, res) => {
  try {
    const schema = Joi.object({
      medicationId: Joi.string().required(),
      medicationName: Joi.string().required(),
      scheduledTime: Joi.date().required(),
      takenTime: Joi.date(),
      status: Joi.string().valid('taken', 'missed', 'skipped').required(),
      notes: Joi.string().max(500),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    const dose = await DoseLogModel.create({ ...value, userId: req.user.userId });

    // Publish event
    if (rabbitChannel) {
      const eventKey = value.status === 'taken' ? 'tracking.dose_taken' : 'tracking.dose_missed';
      rabbitChannel.publish('mediflow.tracking', eventKey,
        Buffer.from(JSON.stringify({
          userId: req.user.userId,
          medicationId: value.medicationId,
          medicationName: value.medicationName,
          status: value.status,
          doseId: dose._id,
        })), { persistent: true });
    }

    res.status(201).json({ success: true, data: dose });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/v1/tracking/doses
app.get('/api/v1/tracking/doses', authMiddleware, async (req: any, res) => {
  try {
    const { page = 1, limit = 30, medicationId, from, to } = req.query;
    const filter: any = { userId: req.user.userId };
    if (medicationId) filter.medicationId = medicationId;
    if (from || to) {
      filter.scheduledTime = {};
      if (from) filter.scheduledTime.$gte = new Date(from as string);
      if (to) filter.scheduledTime.$lte = new Date(to as string);
    }

    const doses = await DoseLogModel.find(filter)
      .sort({ scheduledTime: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await DoseLogModel.countDocuments(filter);
    res.json({ success: true, data: doses, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/v1/tracking/adherence
app.get('/api/v1/tracking/adherence', authMiddleware, async (req: any, res) => {
  try {
    const { medicationId, days = 30 } = req.query;
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - Number(days));

    const filter: any = { userId: req.user.userId, scheduledTime: { $gte: fromDate } };
    if (medicationId) filter.medicationId = medicationId;

    const total = await DoseLogModel.countDocuments(filter);
    const taken = await DoseLogModel.countDocuments({ ...filter, status: 'taken' });
    const missed = await DoseLogModel.countDocuments({ ...filter, status: 'missed' });
    const skipped = await DoseLogModel.countDocuments({ ...filter, status: 'skipped' });

    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    res.json({
      success: true,
      data: {
        period: `${days} days`,
        total,
        taken,
        missed,
        skipped,
        adherenceRate,
        rating: adherenceRate >= 80 ? 'excellent' : adherenceRate >= 60 ? 'good' : adherenceRate >= 40 ? 'fair' : 'poor',
      },
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// =============================================
// SCHEDULE ENDPOINTS
// =============================================
app.post('/api/v1/tracking/schedules', authMiddleware, async (req: any, res) => {
  try {
    const schedule = await MedicationScheduleModel.create({ ...req.body, userId: req.user.userId });
    res.status(201).json({ success: true, data: schedule });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/v1/tracking/schedules', authMiddleware, async (req: any, res) => {
  try {
    const schedules = await MedicationScheduleModel.find({ userId: req.user.userId, isActive: true });
    res.json({ success: true, data: schedules });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// =============================================
// APPOINTMENT ENDPOINTS
// =============================================
app.post('/api/v1/tracking/appointments', authMiddleware, async (req: any, res) => {
  try {
    const appt = await AppointmentModel.create({ ...req.body, userId: req.user.userId });
    res.status(201).json({ success: true, data: appt });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/v1/tracking/appointments', authMiddleware, async (req: any, res) => {
  try {
    const appointments = await AppointmentModel.find({ userId: req.user.userId }).sort({ appointmentDate: 1 });
    res.json({ success: true, data: appointments });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});


async function bootstrap() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/tracking_db');
  console.log('[Tracking Service] Connected to MongoDB');

  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    rabbitChannel = await conn.createChannel();
    await rabbitChannel.assertExchange('mediflow.tracking', 'topic', { durable: true });
    console.log('[Tracking Service] Connected to RabbitMQ');
  } catch { console.warn('[Tracking Service] RabbitMQ not available'); }

  app.listen(PORT, () => console.log(`[Tracking Service] Running on port ${PORT}`));
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
process.on('SIGTERM', async () => { await mongoose.disconnect(); process.exit(0); });
