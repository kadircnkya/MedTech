import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import amqp from 'amqplib';
import Joi from 'joi';
import { MedicationModel, validateEAN13 } from './domain/entities/Medication';
import TURKISH_MEDICATIONS_SEED from './data/turkishMedicationsDatabase';

const app = express();
const PORT = process.env.PORT || 3003;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'default_secret');
    next();
  } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

function adminOnly(req: any, res: any, next: any) {
  if (req.user?.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
  next();
}

let rabbitChannel: any = null;

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'medication-service' }));

// ═══════════════════════════════════════════
// GET /api/v1/medications — Tüm ilaçları listele (sayfalama)
// ═══════════════════════════════════════════
app.get('/api/v1/medications', authMiddleware, async (req: any, res) => {
  try {
    const { page = 1, limit = 20, category, search, prescriptionOnly } = req.query;
    const filter: any = { isActive: true };
    if (category) filter.category = category;
    if (prescriptionOnly === 'true') filter.isPrescriptionRequired = true;
    if (prescriptionOnly === 'false') filter.isPrescriptionRequired = false;

    // Metin arama
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { activeIngredient: { $regex: search, $options: 'i' } },
        { manufacturer: { $regex: search, $options: 'i' } },
      ];
    }

    const medications = await MedicationModel.find(filter)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .sort({ name: 1 });

    const total = await MedicationModel.countDocuments(filter);
    res.json({ success: true, data: medications, pagination: { page: Number(page), limit: Number(limit), total } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// GET /api/v1/medications/:id — Tekil ilaç
// ═══════════════════════════════════════════
app.get('/api/v1/medications/:id', authMiddleware, async (req, res) => {
  try {
    const med = await MedicationModel.findById(req.params.id);
    if (!med) return res.status(404).json({ success: false, error: 'Medication not found' });
    res.json({ success: true, data: med });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// GET /api/v1/medications/barcode/:code — Barkod ile ilaç ara
// Performans: Barkod UNIQUE index sayesinde < 10ms yanıt
// ═══════════════════════════════════════════
app.get('/api/v1/medications/barcode/:code', authMiddleware, async (req, res) => {
  try {
    const { code } = req.params;

    // Barkod format doğrulaması
    if (code.length === 13 && !validateEAN13(code)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz EAN-13 barkod (checkdigit hatası)',
        validationFailed: true,
      });
    }

    const med = await MedicationModel.findOne({ barcode: code, isActive: true });
    if (!med) return res.status(404).json({ success: false, error: 'Medication not found for barcode' });

    res.json({
      success: true,
      data: med,
      confidence: med.verificationStatus === 'verified' ? 1.0 : 0.7,
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// POST /api/v1/medications/barcode-lookup — Hızlı barkod arama (batch destekli)
// ═══════════════════════════════════════════
app.post('/api/v1/medications/barcode-lookup', authMiddleware, async (req: any, res) => {
  try {
    const { barcodes } = req.body;
    if (!barcodes || !Array.isArray(barcodes)) {
      return res.status(400).json({ success: false, error: 'barcodes array required' });
    }

    // Maks 50 barkod aynı anda
    const codes = barcodes.slice(0, 50);
    const medications = await MedicationModel.find({ barcode: { $in: codes }, isActive: true });

    const resultMap: Record<string, any> = {};
    for (const med of medications) {
      resultMap[med.barcode] = {
        ...med.toObject(),
        confidence: med.verificationStatus === 'verified' ? 1.0 : 0.7,
      };
    }

    res.json({
      success: true,
      data: resultMap,
      found: medications.length,
      notFound: codes.filter(c => !resultMap[c]),
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// POST /api/v1/medications — Admin: Yeni ilaç ekle
// ═══════════════════════════════════════════
app.post('/api/v1/medications', authMiddleware, adminOnly, async (req: any, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required(),
      genericName: Joi.string().required(),
      activeIngredient: Joi.string().allow(''),
      barcode: Joi.string().required(),
      gtin: Joi.string().allow(''),
      atcCode: Joi.string().allow(''),
      manufacturer: Joi.string().required(),
      dosageForm: Joi.string().required(),
      strength: Joi.string().required(),
      dosageInfo: Joi.string().allow(''),
      usageInstructions: Joi.string().allow(''),
      prospectus: Joi.string().allow(''),
      description: Joi.string().allow(''),
      sideEffects: Joi.array().items(Joi.string()),
      interactions: Joi.array().items(Joi.string()),
      contraindications: Joi.array().items(Joi.string()),
      warnings: Joi.array().items(Joi.string()),
      category: Joi.string(),
      subCategory: Joi.string().allow(''),
      isPrescriptionRequired: Joi.boolean(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    // EAN-13 checkdigit doğrulaması
    if (value.barcode.length === 13 && !validateEAN13(value.barcode)) {
      return res.status(400).json({ success: false, error: 'Geçersiz EAN-13 barkod' });
    }

    // Duplicate kontrolü
    const existing = await MedicationModel.findOne({ barcode: value.barcode });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Bu barkod zaten kayıtlı',
        existingMedication: { name: existing.name, barcode: existing.barcode },
      });
    }

    const med = await MedicationModel.create({
      ...value,
      verificationStatus: 'verified',
      source: 'system',
      lastSyncDate: new Date(),
    });

    // Publish event for Search Service
    if (rabbitChannel) {
      rabbitChannel.publish('mediflow.medications', 'medication.created',
        Buffer.from(JSON.stringify({ medicationId: med._id, ...value })), { persistent: true });
    }

    res.status(201).json({ success: true, data: med });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// POST /api/v1/medications/user-submit — Kullanıcı ilaç katkısı
// Kullanıcılar veritabanında bulamadıkları ilaçları ekleyebilir
// Status "pending" olarak kaydedilir, admin onayı ile "verified" olur
// ═══════════════════════════════════════════
app.post('/api/v1/medications/user-submit', authMiddleware, async (req: any, res) => {
  try {
    const schema = Joi.object({
      name: Joi.string().required().min(2).max(200),
      genericName: Joi.string().allow('').default('Belirtilmedi'),
      activeIngredient: Joi.string().allow('').default(''),
      barcode: Joi.string().required(),
      manufacturer: Joi.string().allow('').default('Belirtilmedi'),
      dosageForm: Joi.string().allow('').default('Belirtilmedi'),
      strength: Joi.string().allow('').default(''),
      dosageInfo: Joi.string().allow(''),
      usageInstructions: Joi.string().allow(''),
      prospectus: Joi.string().allow(''),
      description: Joi.string().allow(''),
      category: Joi.string().allow('').default('Genel'),
      isPrescriptionRequired: Joi.boolean().default(false),
    });
    const { error, value } = schema.validate(req.body);
    if (error) return res.status(400).json({ success: false, error: error.details[0].message });

    // Duplicate kontrolü
    const existing = await MedicationModel.findOne({ barcode: value.barcode });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Bu barkod zaten kayıtlı',
        existingMedication: { name: existing.name, barcode: existing.barcode },
      });
    }

    const med = await MedicationModel.create({
      ...value,
      verificationStatus: 'pending',
      source: 'user',
      addedBy: req.user.userId,
      lastSyncDate: new Date(),
    });

    // Publish event
    if (rabbitChannel) {
      rabbitChannel.publish('mediflow.medications', 'medication.user_submitted',
        Buffer.from(JSON.stringify({
          medicationId: med._id,
          submittedBy: req.user.userId,
          barcode: value.barcode,
        })), { persistent: true });
    }

    res.status(201).json({ success: true, data: med, status: 'pending_review' });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// POST /api/v1/medications/bulk-seed — Toplu ilaç yükleme (seed)
// ═══════════════════════════════════════════
app.post('/api/v1/medications/bulk-seed', authMiddleware, adminOnly, async (req: any, res) => {
  try {
    const { useTurkishDefaults } = req.body;
    let seedData = req.body.medications;

    if (useTurkishDefaults) {
      seedData = TURKISH_MEDICATIONS_SEED;
    }

    if (!seedData || !Array.isArray(seedData) || seedData.length === 0) {
      return res.status(400).json({ success: false, error: 'medications array required or set useTurkishDefaults: true' });
    }

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const med of seedData) {
      try {
        const exists = await MedicationModel.findOne({ barcode: med.barcode });
        if (exists) {
          skipped++;
          continue;
        }
        await MedicationModel.create({ ...med, isActive: true, lastSyncDate: new Date() });
        inserted++;
      } catch (e: any) {
        errors.push(`${med.name}: ${e.message}`);
      }
    }

    res.json({
      success: true,
      message: `Seed tamamlandı. ${inserted} eklendi, ${skipped} zaten mevcut.`,
      stats: { inserted, skipped, errors: errors.length },
      errors: errors.slice(0, 10),
    });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// GET /api/v1/medications/categories — Tüm kategoriler
// ═══════════════════════════════════════════
app.get('/api/v1/medications/categories', authMiddleware, async (_req: any, res) => {
  try {
    const categories = await MedicationModel.distinct('category', { isActive: true });
    res.json({ success: true, data: categories.sort() });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// PUT /api/v1/medications/:id — Admin: İlaç güncelle
// ═══════════════════════════════════════════
app.put('/api/v1/medications/:id', authMiddleware, adminOnly, async (req: any, res) => {
  try {
    const updateData = { ...req.body, lastSyncDate: new Date() };
    const med = await MedicationModel.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    if (!med) return res.status(404).json({ success: false, error: 'Not found' });

    if (rabbitChannel) {
      rabbitChannel.publish('mediflow.medications', 'medication.updated',
        Buffer.from(JSON.stringify({ medicationId: med._id, ...med.toObject() })), { persistent: true });
    }

    res.json({ success: true, data: med });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// ═══════════════════════════════════════════
// Bootstrap — DB + RabbitMQ bağlantısı + Auto-seed
// ═══════════════════════════════════════════
async function bootstrap() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/medication_db');
  console.log('[Medication Service] Connected to MongoDB');

  // Auto-seed: Veritabanı boşsa Türk ilaçları yükle
  const count = await MedicationModel.countDocuments();
  if (count === 0) {
    console.log('[Medication Service] Veritabanı boş — Türk ilaçları seed ediliyor...');
    let inserted = 0;
    for (const med of TURKISH_MEDICATIONS_SEED) {
      try {
        await MedicationModel.create({ ...med, isActive: true });
        inserted++;
      } catch { /* duplicate or validation error — skip */ }
    }
    console.log(`[Medication Service] ${inserted}/${TURKISH_MEDICATIONS_SEED.length} ilaç başarıyla yüklendi.`);
  } else {
    console.log(`[Medication Service] Veritabanında ${count} ilaç mevcut.`);
  }

  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    rabbitChannel = await conn.createChannel();
    await rabbitChannel.assertExchange('mediflow.medications', 'topic', { durable: true });
    console.log('[Medication Service] Connected to RabbitMQ');
  } catch { console.warn('[Medication Service] RabbitMQ not available'); }

  app.listen(PORT, () => console.log(`[Medication Service] Running on port ${PORT}`));
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
process.on('SIGTERM', async () => { await mongoose.disconnect(); process.exit(0); });
