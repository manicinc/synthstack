import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Embeddings (e2e)', () => {
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

  describe('POST /embeddings/generate', () => {
    it('should reject request without OpenAI key', () => {
      if (!process.env.OPENAI_API_KEY) {
        return request(app.getHttpServer())
          .post('/embeddings/generate')
          .send({ text: 'Hello world' })
          .expect(500);
      }
      return Promise.resolve();
    });

    it('should reject empty text', () => {
      return request(app.getHttpServer())
        .post('/embeddings/generate')
        .send({ text: '' })
        .expect((res) => {
          expect([400, 500]).toContain(res.status);
        });
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/embeddings/generate')
        .send({})
        .expect(400);
    });
  });

  describe('POST /embeddings/batch', () => {
    it('should reject request without texts array', () => {
      return request(app.getHttpServer())
        .post('/embeddings/batch')
        .send({})
        .expect(400);
    });

    it('should validate texts is an array', () => {
      return request(app.getHttpServer())
        .post('/embeddings/batch')
        .send({ texts: 'not an array' })
        .expect(400);
    });
  });

  describe('POST /embeddings/similarity', () => {
    it('should reject request without text1', () => {
      return request(app.getHttpServer())
        .post('/embeddings/similarity')
        .send({ text2: 'World' })
        .expect(400);
    });

    it('should reject request without text2', () => {
      return request(app.getHttpServer())
        .post('/embeddings/similarity')
        .send({ text1: 'Hello' })
        .expect(400);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/embeddings/similarity')
        .send({})
        .expect(400);
    });
  });

  describe('GET /embeddings/models', () => {
    it('should return list of available models', () => {
      return request(app.getHttpServer())
        .get('/embeddings/models')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should include model details', () => {
      return request(app.getHttpServer())
        .get('/embeddings/models')
        .expect(200)
        .expect((res) => {
          res.body.forEach((model: any) => {
            expect(model).toHaveProperty('id');
            expect(model).toHaveProperty('dimensions');
            expect(model).toHaveProperty('maxTokens');
            expect(model).toHaveProperty('provider');
            expect(model).toHaveProperty('description');
          });
        });
    });

    it('should include text-embedding-3-small', () => {
      return request(app.getHttpServer())
        .get('/embeddings/models')
        .expect(200)
        .expect((res) => {
          const model = res.body.find((m: any) => m.id === 'text-embedding-3-small');
          expect(model).toBeDefined();
          expect(model.dimensions).toBe(1536);
        });
    });
  });
});
