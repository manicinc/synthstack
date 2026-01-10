import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter(),
    );
    await app.init();
    await (app as NestFastifyApplication).getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(['ok', 'degraded', 'error']).toContain(res.body.status);
        });
    });

    it('should include timestamp', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('timestamp');
          const date = new Date(res.body.timestamp);
          expect(date.toISOString()).toBe(res.body.timestamp);
        });
    });

    it('should include version', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('version', '0.1.0');
        });
    });

    it('should include services status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.services).toHaveProperty('embeddings');
          expect(res.body.services).toHaveProperty('rag');
          expect(res.body.services).toHaveProperty('transcription');
          expect(res.body.services).toHaveProperty('analysis');
          expect(res.body.services).toHaveProperty('complexity');
        });
    });

    it('should report complexity as always available', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.services.complexity).toBe(true);
        });
    });

    it('should include config information', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.config).toHaveProperty('hasOpenAiKey');
          expect(res.body.config).toHaveProperty('hasQdrantUrl');
          expect(res.body.config).toHaveProperty('embeddingModel');
          expect(res.body.config).toHaveProperty('defaultLlmModel');
        });
    });
  });

  describe('GET /health/ready', () => {
    it('should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ready');
          expect(res.body).toHaveProperty('status');
          expect(typeof res.body.ready).toBe('boolean');
        });
    });

    it('should be ready when status is not error', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          if (res.body.status !== 'error') {
            expect(res.body.ready).toBe(true);
          }
        });
    });
  });

  describe('GET /health/live', () => {
    it('should return live status', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('live', true);
        });
    });

    it('should include timestamp', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('timestamp');
          const date = new Date(res.body.timestamp);
          expect(date.toISOString()).toBe(res.body.timestamp);
        });
    });

    it('should always return live=true', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body.live).toBe(true);
        });
    });
  });
});
