/**
 * TypeORM Entity for ML Service Requests
 * Maps to ml_service_requests table
 */

import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('ml_service_requests')
@Index('idx_ml_requests_user', ['userId'], { where: 'user_id IS NOT NULL' })
@Index('idx_ml_requests_org', ['organizationId'], { where: 'organization_id IS NOT NULL' })
@Index('idx_ml_requests_created', ['createdAt'])
@Index('idx_ml_requests_service_endpoint', ['serviceName', 'endpoint'])
@Index('idx_ml_requests_status', ['statusCode'])
@Index('idx_ml_requests_user_created', ['userId', 'createdAt'], {
  where: 'user_id IS NOT NULL',
})
@Index('idx_ml_requests_errors', ['createdAt'], { where: 'status_code >= 400' })
export class MLServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // User and Organization Context
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'organization_id', type: 'uuid', nullable: true })
  organizationId: string | null;

  // Service Information
  @Column({ name: 'service_name', length: 50 })
  serviceName: 'fastapi' | 'django' | 'nestjs';

  @Column({ length: 255 })
  endpoint: string;

  @Column({ length: 10 })
  method: string;

  // Request/Response Data
  @Column({ name: 'request_payload', type: 'jsonb', nullable: true })
  requestPayload: Record<string, any> | null;

  @Column({ name: 'response_payload', type: 'jsonb', nullable: true })
  responsePayload: Record<string, any> | null;

  @Column({ name: 'status_code', type: 'int' })
  statusCode: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string | null;

  // Performance Metrics
  @Column({ name: 'duration_ms', type: 'int' })
  durationMs: number;

  @Column({ name: 'credits_charged', type: 'int', default: 0 })
  creditsCharged: number;

  // Request Metadata
  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent: string | null;

  @Column({ name: 'request_id', length: 255, nullable: true })
  requestId: string | null;

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
