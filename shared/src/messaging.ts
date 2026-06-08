import * as amqp from 'amqplib';
import { logger } from './logger';

export class MessageBroker {
  private connection: any = null;
  private channel: any = null;
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async connect(retries = 5): Promise<void> {
    for (let i = 0; i < retries; i++) {
      try {
        this.connection = await amqp.connect(this.url);
        this.channel = await this.connection.createChannel();
        logger.info('Connected to RabbitMQ');

        this.connection.on('error', (err: any) => {
          logger.error('RabbitMQ connection error', err);
        });

        this.connection.on('close', () => {
          logger.warn('RabbitMQ connection closed, reconnecting...');
          setTimeout(() => this.connect(retries), 5000);
        });

        return;
      } catch (err) {
        logger.warn(`RabbitMQ connection attempt ${i + 1}/${retries} failed`);
        if (i < retries - 1) await new Promise((r) => setTimeout(r, 5000));
      }
    }
    throw new Error('Failed to connect to RabbitMQ');
  }

  async publishEvent(exchange: string, routingKey: string, data: unknown): Promise<void> {
    if (!this.channel) throw new Error('Channel not initialized');

    await this.channel.assertExchange(exchange, 'topic', { durable: true });

    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(data)),
      { persistent: true, timestamp: Date.now() }
    );

    logger.info(`Event published: ${exchange}/${routingKey}`);
  }

  async subscribe(
    exchange: string,
    queue: string,
    routingKey: string,
    handler: (data: unknown) => Promise<void>
  ): Promise<void> {
    if (!this.channel) throw new Error('Channel not initialized');

    await this.channel.assertExchange(exchange, 'topic', { durable: true });
    await this.channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: `${exchange}.dlx`,
    });
    await this.channel.bindQueue(queue, exchange, routingKey);

    // Dead Letter Queue
    await this.channel.assertExchange(`${exchange}.dlx`, 'topic', { durable: true });
    await this.channel.assertQueue(`${queue}.dlq`, { durable: true });
    await this.channel.bindQueue(`${queue}.dlq`, `${exchange}.dlx`, routingKey);

    this.channel.prefetch(10);

    this.channel.consume(queue, async (msg: amqp.ConsumeMessage | null) => {
      if (!msg) return;
      try {
        const data = JSON.parse(msg.content.toString());
        await handler(data);
        this.channel!.ack(msg);
      } catch (err) {
        logger.error(`Error processing message from ${queue}`, err);
        this.channel!.nack(msg, false, false); // Send to DLQ
      }
    });

    logger.info(`Subscribed to ${exchange}/${routingKey} via ${queue}`);
  }

  async close(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }
}
