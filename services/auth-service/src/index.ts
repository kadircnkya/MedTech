import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import amqp from 'amqplib';
import { createAuthRoutes } from './presentation/routes/authRoutes';
import { AuthController } from './presentation/controllers/AuthController';
import { MongoUserRepository } from './infrastructure/database/MongoUserRepository';
import { RegisterUseCase, LoginUseCase } from './application/use-cases/AuthUseCases';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});

async function bootstrap(): Promise<void> {
  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/auth_db';
  await mongoose.connect(mongoUri);
  console.log('[Auth Service] Connected to MongoDB');

  // Connect to RabbitMQ
  const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://localhost:5672';
  let messageBroker = { publishEvent: async (_e: string, _k: string, _d: unknown) => {} };

  try {
    const conn = await amqp.connect(rabbitUrl);
    const channel = await conn.createChannel();
    await channel.assertExchange('mediflow.users', 'topic', { durable: true });

    messageBroker = {
      publishEvent: async (exchange: string, routingKey: string, data: unknown) => {
        channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(data)), {
          persistent: true,
        });
        console.log(`[Auth Service] Event published: ${routingKey}`);
      },
    };
    console.log('[Auth Service] Connected to RabbitMQ');
  } catch (err) {
    console.warn('[Auth Service] RabbitMQ not available, events disabled');
  }

  // Initialize repositories, use cases, and controllers
  const userRepo = new MongoUserRepository();
  const registerUseCase = new RegisterUseCase(userRepo, messageBroker);
  const loginUseCase = new LoginUseCase(userRepo);
  const authController = new AuthController(registerUseCase, loginUseCase);

  // Register routes
  app.use('/api/v1/auth', createAuthRoutes(authController));

  // Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[Auth Service] Error:', err.message);
    res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Internal error' });
  });

  app.listen(PORT, () => {
    console.log(`[Auth Service] Running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[Auth Service] Failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Auth Service] Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});
