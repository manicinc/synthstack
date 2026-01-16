/**
 * TypeORM Entity for ML Service Usage Analytics
 * Maps to ml_service_usage table
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  BeforeInsert,
  BeforeUpdate,
} from 'typeorm';

@Entity('ml_service_usage')
@Index('idx_ml_usage_user_date', ['userId', 'date'], {
  where: 'user_id IS NOT NULL',
})
@Index('idx_ml_usage_org_date', ['organizationId', 'date'], {
  where: 'organization_id IS NOT NULL',
})
@Index('idx_ml_usage_date', ['date'])
@Index('idx_ml_usage_service_category', ['serviceName', 'endpointCategory'])
export class MLServiceUsage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Scope
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  @Column({ type: 'date' })
  date: Date;

  // Service and Endpoint
  @Column({ name: 'service_name', length: 50 })
  serviceName: 'fastapi' | 'django' | 'nestjs';

  @Column({ name: 'endpoint_category', length: 50 })
  endpointCategory:
    | 'embeddings'
    | 'rag'
    | 'analysis'
    | 'complexity'
    | 'transcription'
    | 'other';

  // Aggregated Metrics
  @Column({ name: 'total_requests', type: 'int', default: 0 })
  totalRequests: number;

  @Column({ name: 'total_credits', type: 'int', default: 0 })
  totalCredits: number;

  @Column({ name: 'total_duration_ms', type: 'bigint', default: 0 })
  totalDurationMs: string; // bigint is returned as string

  @Column({ name: 'avg_duration_ms', type: 'int', nullable: true })
  avgDurationMs: number | null;

  @Column({ name: 'success_count', type: 'int', default: 0 })
  successCount: number;

  @Column({ name: 'error_count', type: 'int', default: 0 })
  errorCount: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @BeforeInsert()
  @BeforeUpdate()
  calculateAvgDuration() {
    if (this.totalRequests > 0) {
      const totalDurationNum = parseInt(this.totalDurationMs.toString(), 10);
      this.avgDurationMs = Math.floor(totalDurationNum / this.totalRequests);
    } else {
      this.avgDurationMs = 0;
    }
  }
}
