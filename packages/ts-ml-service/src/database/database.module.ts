/**
 * Database Module for ML Service Shared Database
 */

import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  MLServiceRequest,
  MLServiceUsage,
  MLServiceCache,
} from './entities';
import { DatabaseService } from './database.service';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('database.url'),
        entities: [MLServiceRequest, MLServiceUsage, MLServiceCache],
        synchronize: false, // Never auto-sync in production
        logging: configService.get<string>('nodeEnv') === 'development',
        poolSize: configService.get<number>('database.poolSize', 10),
        extra: {
          max: configService.get<number>('database.poolSize', 10),
          idleTimeoutMillis: configService.get<number>(
            'database.idleTimeout',
            30000,
          ),
        },
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([
      MLServiceRequest,
      MLServiceUsage,
      MLServiceCache,
    ]),
  ],
  providers: [DatabaseService],
  exports: [DatabaseService, TypeOrmModule],
})
export class DatabaseModule {}
