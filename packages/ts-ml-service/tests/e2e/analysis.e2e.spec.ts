import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Analysis (e2e)', () => {
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

  describe('POST /analysis/summarize', () => {
    it('should reject request without OpenAI key', () => {
      if (!process.env.OPENAI_API_KEY) {
        return request(app.getHttpServer())
          .post('/analysis/summarize')
          .send({ text: 'Long text to summarize...' })
          .expect(500);
      }
      return Promise.resolve();
    });

    it('should reject empty text', () => {
      return request(app.getHttpServer())
        .post('/analysis/summarize')
        .send({ text: '' })
        .expect(400);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/analysis/summarize')
        .send({})
        .expect(400);
    });

    it('should accept maxLength parameter', () => {
      return request(app.getHttpServer())
        .post('/analysis/summarize')
        .send({
          text: 'Sample text',
          maxLength: 50,
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });

    it('should accept model parameter', () => {
      return request(app.getHttpServer())
        .post('/analysis/summarize')
        .send({
          text: 'Sample text',
          model: 'gpt-4',
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });
  });

  describe('POST /analysis/sentiment', () => {
    it('should reject request without OpenAI key', () => {
      if (!process.env.OPENAI_API_KEY) {
        return request(app.getHttpServer())
          .post('/analysis/sentiment')
          .send({ text: 'This is great!' })
          .expect(500);
      }
      return Promise.resolve();
    });

    it('should reject empty text', () => {
      return request(app.getHttpServer())
        .post('/analysis/sentiment')
        .send({ text: '' })
        .expect(400);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/analysis/sentiment')
        .send({})
        .expect(400);
    });

    it('should accept includeAspects parameter', () => {
      return request(app.getHttpServer())
        .post('/analysis/sentiment')
        .send({
          text: 'Sample text',
          includeAspects: true,
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });

    it('should accept model parameter', () => {
      return request(app.getHttpServer())
        .post('/analysis/sentiment')
        .send({
          text: 'Sample text',
          model: 'gpt-4',
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });
  });

  describe('POST /analysis/keywords', () => {
    it('should reject request without OpenAI key', () => {
      if (!process.env.OPENAI_API_KEY) {
        return request(app.getHttpServer())
          .post('/analysis/keywords')
          .send({ text: 'Extract keywords from this text' })
          .expect(500);
      }
      return Promise.resolve();
    });

    it('should reject empty text', () => {
      return request(app.getHttpServer())
        .post('/analysis/keywords')
        .send({ text: '' })
        .expect(400);
    });

    it('should validate request body', () => {
      return request(app.getHttpServer())
        .post('/analysis/keywords')
        .send({})
        .expect(400);
    });

    it('should accept maxKeywords parameter', () => {
      return request(app.getHttpServer())
        .post('/analysis/keywords')
        .send({
          text: 'Sample text',
          maxKeywords: 5,
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });

    it('should accept model parameter', () => {
      return request(app.getHttpServer())
        .post('/analysis/keywords')
        .send({
          text: 'Sample text',
          model: 'gpt-4',
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });
  });
});
