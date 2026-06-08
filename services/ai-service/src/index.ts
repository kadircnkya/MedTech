import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import Redis from 'ioredis';

const app = express();
const PORT = process.env.PORT || 3005;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Redis cache
let redis: Redis | null = null;
try {
  redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  redis.on('connect', () => console.log('[AI Service] Connected to Redis'));
  redis.on('error', (err) => console.error('[AI Service] Redis error:', err.message));
} catch { console.warn('[AI Service] Redis not available'); }

const HUGGINGFACE_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HUGGINGFACE_URL = 'https://api-inference.huggingface.co/models/';
const CACHE_TTL = 86400; // 24 hours

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'default_secret');
    next();
  } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'ai-service' }));

// HuggingFace API call with circuit breaker pattern
async function callHuggingFace(prompt: string): Promise<string> {
  if (!HUGGINGFACE_API_KEY) {
    // Fallback: generate a structured response without AI
    return `Bu ilaç hakkında detaylı bilgi için lütfen doktorunuza veya eczacınıza danışın. Yapay zeka servisi şu anda yapılandırılmamış.`;
  }

  try {
    const response = await axios.post(
      `${HUGGINGFACE_URL}mistralai/Mistral-7B-Instruct-v0.2`,
      { inputs: prompt, parameters: { max_new_tokens: 500, temperature: 0.3 } },
      {
        headers: { Authorization: `Bearer ${HUGGINGFACE_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
    return response.data?.[0]?.generated_text || 'AI yanıtı alınamadı.';
  } catch (err: any) {
    console.error('[AI Service] HuggingFace error:', err.message);
    return 'AI servisi şu anda yanıt veremiyor. Lütfen daha sonra tekrar deneyin.';
  }
}

// POST /api/v1/ai/explain
app.post('/api/v1/ai/explain', authMiddleware, async (req: any, res) => {
  try {
    const { medication, healthInfo } = req.body;
    if (!medication) return res.status(400).json({ success: false, error: 'Medication data required' });

    // Check cache
    const cacheKey = `ai:explain:${medication.barcode || medication.name}`;
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.json({ success: true, data: JSON.parse(cached), cached: true });
      }
    }

    const prompt = `Sen bir ilaç uzmanısın. Aşağıdaki ilaç hakkında Türkçe olarak açıklama yap:
İlaç Adı: ${medication.name}
Etken Madde: ${medication.genericName}
Doz Formu: ${medication.dosageForm}
Güç: ${medication.strength}
${healthInfo ? `Hastanın alerjileri: ${healthInfo.allergies?.join(', ') || 'Yok'}
Hastanın hastalıkları: ${healthInfo.diseases?.join(', ') || 'Yok'}` : ''}

Lütfen şunları açıkla:
1. İlacın ne için kullanıldığı
2. Nasıl kullanılması gerektiği
3. Olası yan etkileri
4. Dikkat edilmesi gerekenler`;

    const explanation = await callHuggingFace(prompt);

    const result = {
      explanation,
      sideEffects: medication.sideEffects || [],
      warnings: medication.contraindications || [],
      medicationName: medication.name,
    };

    // Cache result
    if (redis) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/v1/ai/side-effects
app.post('/api/v1/ai/side-effects', authMiddleware, async (req: any, res) => {
  try {
    const { medicationName, sideEffects } = req.body;
    if (!medicationName) return res.status(400).json({ success: false, error: 'Medication name required' });

    const cacheKey = `ai:sideeffects:${medicationName}`;
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return res.json({ success: true, data: JSON.parse(cached), cached: true });
    }

    const prompt = `${medicationName} ilacının yan etkilerini Türkçe olarak özetle: ${sideEffects?.join(', ') || 'Bilgi yok'}. Yaygın ve nadir yan etkileri ayrı listele.`;
    const summary = await callHuggingFace(prompt);

    const result = { medicationName, summary, sideEffects: sideEffects || [] };

    if (redis) await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(result));
    res.json({ success: true, data: result });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/v1/ai/interactions
app.post('/api/v1/ai/interactions', authMiddleware, async (req: any, res) => {
  try {
    const { medications } = req.body;
    if (!medications || medications.length < 2) {
      return res.status(400).json({ success: false, error: 'At least 2 medications required' });
    }

    const names = medications.map((m: any) => m.name || m).join(', ');
    const prompt = `Aşağıdaki ilaçlar arasındaki olası etkileşimleri Türkçe olarak açıkla: ${names}`;
    const analysis = await callHuggingFace(prompt);

    res.json({ success: true, data: { medications: names, analysis } });
  } catch (err: any) { res.status(500).json({ success: false, error: err.message }); }
});

app.listen(PORT, () => console.log(`[AI Service] Running on port ${PORT}`));
