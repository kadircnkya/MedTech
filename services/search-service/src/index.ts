import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import amqp from 'amqplib';
import { Client } from '@elastic/elasticsearch';

const app = express();
const PORT = process.env.PORT || 3008;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Elasticsearch client
const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
});

const MEDICATION_INDEX = 'medications';

// Auth middleware
function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: 'Auth required' });
  try {
    req.user = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET || 'default_secret');
    next();
  } catch { res.status(401).json({ success: false, error: 'Invalid token' }); }
}

// Initialize Elasticsearch index
async function initIndex(): Promise<void> {
  try {
    const exists = await esClient.indices.exists({ index: MEDICATION_INDEX });
    if (!exists) {
      await esClient.indices.create({
        index: MEDICATION_INDEX,
        body: {
          settings: {
            analysis: {
              filter: {
                medication_synonyms: {
                  type: 'synonym',
                  synonyms: [
                    'parasetamol, acetaminophen',
                    'aspirin, acetylsalicylic acid, asetilsalisilik asit',
                    'ibuprofen, advil, nurofen',
                    'amoksisilin, amoxicillin',
                    'lipitor, atorvastatin',
                    'panadol, calpol, tylenol => parasetamol'
                  ],
                },
              },
              analyzer: {
                medication_analyzer: {
                  type: 'custom',
                  tokenizer: 'standard',
                  filter: ['lowercase', 'asciifolding', 'medication_synonyms'],
                },
              },
            },
          },
          mappings: {
            properties: {
              name: { type: 'text', analyzer: 'medication_analyzer', fields: { keyword: { type: 'keyword' } } },
              genericName: { type: 'text', analyzer: 'medication_analyzer' },
              manufacturer: { type: 'text', analyzer: 'medication_analyzer' },
              barcode: { type: 'keyword' },
              dosageForm: { type: 'keyword' },
              category: { type: 'keyword' },
              description: { type: 'text', analyzer: 'medication_analyzer' },
              sideEffects: { type: 'text' },
              suggest: { type: 'completion', analyzer: 'medication_analyzer' },
            },
          },
        },
      });
      console.log('[Search Service] Created medications index');
    }
  } catch (err) {
    console.error('[Search Service] Index init error:', err);
  }
}

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'search-service' }));

// GET /api/v1/search/medications?q=aspirin&page=1&limit=20
app.get('/api/v1/search/medications', authMiddleware, async (req: any, res) => {
  try {
    const { q, page = 1, limit = 20, category } = req.query;

    if (!q) return res.status(400).json({ success: false, error: 'Query (q) parameter required' });

    const must: any[] = [
      {
        multi_match: {
          query: q as string,
          fields: ['name^3', 'genericName^2', 'manufacturer', 'description'],
          type: 'best_fields',
          fuzziness: 'AUTO',
        },
      },
    ];

    if (category) {
      must.push({ term: { category: category as string } });
    }

    const result = await esClient.search({
      index: MEDICATION_INDEX,
      body: {
        from: (Number(page) - 1) * Number(limit),
        size: Number(limit),
        query: { bool: { must } },
        highlight: {
          fields: {
            name: {},
            genericName: {},
            description: {},
          },
        },
      },
    });

    const hits = result.hits.hits.map((hit: any) => ({
      ...hit._source,
      _id: hit._id,
      _score: hit._score,
      _highlight: hit.highlight,
    }));

    res.json({
      success: true,
      data: hits,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: typeof result.hits.total === 'object' ? result.hits.total.value : result.hits.total,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/v1/search/suggestions?q=asp
app.get('/api/v1/search/suggestions', authMiddleware, async (req: any, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ success: false, error: 'Query parameter required' });

    const result = await esClient.search({
      index: MEDICATION_INDEX,
      body: {
        suggest: {
          medication_suggest: {
            prefix: q as string,
            completion: {
              field: 'suggest',
              size: 10,
              fuzzy: { fuzziness: 'AUTO' },
            },
          },
        },
      },
    });

    const suggestions = (result.suggest as any)?.medication_suggest?.[0]?.options?.map((opt: any) => ({
      text: opt.text,
      score: opt._score,
      source: opt._source,
    })) || [];

    res.json({ success: true, data: suggestions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function bootstrap() {
  // Init Elasticsearch index
  await initIndex();
  console.log('[Search Service] Connected to Elasticsearch');

  // Subscribe to medication events for index sync
  try {
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
    const channel = await conn.createChannel();
    await channel.assertExchange('mediflow.medications', 'topic', { durable: true });

    // medication.created
    await channel.assertQueue('search-service.medication-created', { durable: true });
    await channel.bindQueue('search-service.medication-created', 'mediflow.medications', 'medication.created');

    channel.consume('search-service.medication-created', async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        console.log('[Search Service] Indexing new medication:', data.name);

        await esClient.index({
          index: MEDICATION_INDEX,
          id: data.medicationId,
          body: {
            name: data.name,
            genericName: data.genericName,
            manufacturer: data.manufacturer,
            barcode: data.barcode,
            dosageForm: data.dosageForm,
            category: data.category || 'general',
            description: data.description || '',
            sideEffects: data.sideEffects?.join(' ') || '',
            suggest: {
              input: [data.name, data.genericName, data.manufacturer].filter(Boolean),
            },
          },
        });

        channel.ack(msg);
      } catch (err) {
        console.error('[Search Service] Index error:', err);
        channel.nack(msg, false, false);
      }
    });

    // medication.updated
    await channel.assertQueue('search-service.medication-updated', { durable: true });
    await channel.bindQueue('search-service.medication-updated', 'mediflow.medications', 'medication.updated');

    channel.consume('search-service.medication-updated', async (msg) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        console.log('[Search Service] Updating medication index:', data.name);

        await esClient.update({
          index: MEDICATION_INDEX,
          id: data.medicationId,
          body: {
            doc: {
              name: data.name,
              genericName: data.genericName,
              manufacturer: data.manufacturer,
              barcode: data.barcode,
              dosageForm: data.dosageForm,
              category: data.category,
              description: data.description,
              suggest: {
                input: [data.name, data.genericName, data.manufacturer].filter(Boolean),
              },
            },
          },
        });

        channel.ack(msg);
      } catch (err) {
        console.error('[Search Service] Update index error:', err);
        channel.nack(msg, false, false);
      }
    });

    console.log('[Search Service] Subscribed to medication events');
  } catch {
    console.warn('[Search Service] RabbitMQ not available');
  }

  app.listen(PORT, () => console.log(`[Search Service] Running on port ${PORT}`));
}

bootstrap().catch((err) => { console.error(err); process.exit(1); });
