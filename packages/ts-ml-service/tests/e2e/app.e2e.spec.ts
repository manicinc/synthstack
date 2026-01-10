import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('App (e2e)', () => {
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

  describe('Health Endpoints', () => {
    it('GET /health - should return health status', () => {
      return request(app.getHttpServer())
        .get('/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status');
          expect(res.body).toHaveProperty('timestamp');
          expect(res.body).toHaveProperty('version');
          expect(res.body).toHaveProperty('services');
          expect(res.body).toHaveProperty('config');
        });
    });

    it('GET /health/ready - should return readiness status', () => {
      return request(app.getHttpServer())
        .get('/health/ready')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('ready');
          expect(res.body).toHaveProperty('status');
        });
    });

    it('GET /health/live - should return liveness status', () => {
      return request(app.getHttpServer())
        .get('/health/live')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('live', true);
          expect(res.body).toHaveProperty('timestamp');
        });
    });
  });

  describe('Complexity Endpoints', () => {
    it('GET /complexity/scale - should return complexity scale', () => {
      return request(app.getHttpServer())
        .get('/complexity/scale')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('scale');
          expect(Array.isArray(res.body.scale)).toBe(true);
          expect(res.body.scale.length).toBe(5);
        });
    });

    it('GET /complexity/health - should return service health', () => {
      return request(app.getHttpServer())
        .get('/complexity/health')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('status', 'ok');
          expect(res.body).toHaveProperty('service', 'complexity-estimation');
        });
    });

    it('POST /complexity/estimate - should estimate complexity', () => {
      return request(app.getHttpServer())
        .post('/complexity/estimate')
        .send({
          title: 'Fix typo in README',
          description: 'Simple documentation fix',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('complexityScore');
          expect(res.body).toHaveProperty('complexityName');
          expect(res.body).toHaveProperty('estimatedHours');
          expect(res.body).toHaveProperty('estimatedPoints');
          expect(res.body).toHaveProperty('confidence');
        });
    });

    it('POST /complexity/analyze - should analyze complexity', () => {
      return request(app.getHttpServer())
        .post('/complexity/analyze')
        .send({
          linesAdded: 100,
          linesRemoved: 50,
          filesChanged: 3,
          commits: 5,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('actualComplexity');
          expect(res.body).toHaveProperty('complexityName');
          expect(res.body).toHaveProperty('actualPoints');
          expect(res.body).toHaveProperty('metrics');
        });
    });

    it('POST /complexity/adjustment - should calculate adjustment', () => {
      return request(app.getHttpServer())
        .post('/complexity/adjustment')
        .send({
          preLevel: 3,
          actualLevel: 3,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('multiplier');
          expect(res.body).toHaveProperty('bonusPercent');
          expect(res.body).toHaveProperty('reason');
        });
    });
  });

  describe('Embeddings Endpoints', () => {
    it('GET /embeddings/models - should return available models', () => {
      return request(app.getHttpServer())
        .get('/embeddings/models')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('models');
          expect(Array.isArray(res.body.models)).toBe(true);
        });
    });
  });

  describe('Transcription Endpoints', () => {
    it('GET /transcription/formats - should return supported formats', () => {
      return request(app.getHttpServer())
        .get('/transcription/formats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('formats');
          expect(Array.isArray(res.body.formats)).toBe(true);
          expect(res.body.formats).toContain('mp3');
        });
    });

    it('GET /transcription/languages - should return supported languages', () => {
      return request(app.getHttpServer())
        .get('/transcription/languages')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('success', true);
          expect(res.body).toHaveProperty('languages');
          expect(Array.isArray(res.body.languages)).toBe(true);
        });
    });
  });
});
