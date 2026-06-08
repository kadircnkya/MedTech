import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ElasticsearchModule } from '@nestjs/elasticsearch';
import { ConfigModule, ConfigService } from '@nestjs/config';

// Modules
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MedicationModule } from './modules/medication/medication.module';
import { MedicalHistoryModule } from './modules/medical-history/medical-history.module';
import { OcrModule } from './modules/ocr/ocr.module';
import { AiModule } from './modules/ai/ai.module';
import { SearchModule } from './modules/search/search.module';
import { NotificationModule } from './modules/notification/notification.module';

@Module({
  imports: [
    // Configuration Management
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // MongoDB Mongoose Connection
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),

    // Elasticsearch global registration
    ElasticsearchModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        node: configService.get<string>('ELASTICSEARCH_NODE') || 'http://elasticsearch:9200',
      }),
      inject: [ConfigService],
    }),

    // Business Logic Modules
    AuthModule,
    UserModule,
    MedicationModule,
    MedicalHistoryModule,
    OcrModule,
    AiModule,
    SearchModule,
    NotificationModule,
  ],
})
export class AppModule {}
