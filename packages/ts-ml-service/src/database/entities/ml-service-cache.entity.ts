/**
 * TypeORM Entity for ML Service Cache
 * Maps to ml_service_cache table
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ml_service_cache')
@Index('idx_ml_cache_key', ['cacheKey'])
@Index('idx_ml_cache_hash', ['requestHash'])
@Index('idx_ml_cache_expires', ['expiresAt'], { where: 'expires_at IS NOT NULL' })
@Index('idx_ml_cache_endpoint', ['endpoint'])
@Index('idx_ml_cache_created', ['createdAt'])
@Index('idx_ml_cache_last_hit', ['lastHitAt'], { where: 'last_hit_at IS NOT NULL' })
@Index('idx_ml_cache_hot', ['hitCount', 'lastHitAt'], { where: 'hit_count > 10' })
export class MLServiceCache {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Cache Key
  @Column({ name: 'cache_key', length: 255, unique: true })
  cacheKey: string;

  @Column({ name: 'request_hash', length: 64 })
  requestHash: string;

  // Request Context
  @Column({ length: 255 })
  endpoint: string;

  @Column({ name: 'service_name', type: 'varchar', length: 50, nullable: true })
  serviceName: 'fastapi' | 'django' | 'nestjs' | null;

  // Cached Response
  @Column({ name: 'response_data', type: 'jsonb' })
  responseData: Record<string, any>;

  // Cache Metadata
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ name: 'hit_count', type: 'int', default: 0 })
  hitCount: number;

  @Column({ name: 'last_hit_at', type: 'timestamptz', nullable: true })
  lastHitAt: Date | null;

  // Size tracking
  @Column({ name: 'size_bytes', type: 'int', nullable: true })
  sizeBytes: number | null;
}
