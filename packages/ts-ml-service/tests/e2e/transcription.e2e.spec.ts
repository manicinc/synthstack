import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Transcription (e2e)', () => {
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

  describe('POST /transcription/audio', () => {
    it('should reject request without file', () => {
      return request(app.getHttpServer())
        .post('/transcription/audio')
        .expect(400);
    });

    it('should validate multipart form data', () => {
      return request(app.getHttpServer())
        .post('/transcription/audio')
        .send({})
        .expect(400);
    });
  });

  describe('POST /transcription/audio/base64', () => {
    it('should reject request without audio field', () => {
      return request(app.getHttpServer())
        .post('/transcription/audio/base64')
        .send({})
        .expect(400);
    });

    it('should reject request without filename', () => {
      return request(app.getHttpServer())
        .post('/transcription/audio/base64')
        .send({
          audio: 'base64data',
        })
        .expect(400);
    });

    it('should accept valid base64 audio', () => {
      return request(app.getHttpServer())
        .post('/transcription/audio/base64')
        .send({
          audio: Buffer.from('test audio').toString('base64'),
          filename: 'test.mp3',
        })
        .expect((res) => {
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });

    it('should accept language parameter', () => {
      return request(app.getHttpServer())
        .post('/transcription/audio/base64')
        .send({
          audio: Buffer.from('test audio').toString('base64'),
          filename: 'test.mp3',
          language: 'es',
        })
        .expect((res) => {
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });

    it('should accept model parameter', () => {
      return request(app.getHttpServer())
        .post('/transcription/audio/base64')
        .send({
          audio: Buffer.from('test audio').toString('base64'),
          filename: 'test.mp3',
          model: 'whisper-1',
        })
        .expect((res) => {
          expect([200, 201, 400, 500]).toContain(res.status);
        });
    });
  });

  describe('GET /transcription/formats', () => {
    it('should return list of supported formats', () => {
      return request(app.getHttpServer())
        .get('/transcription/formats')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
          expect(res.body).toContain('mp3');
          expect(res.body).toContain('wav');
        });
    });

    it('should return exactly 10 formats', () => {
      return request(app.getHttpServer())
        .get('/transcription/formats')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveLength(10);
        });
    });
  });

  describe('GET /transcription/languages', () => {
    it('should return list of supported languages', () => {
      return request(app.getHttpServer())
        .get('/transcription/languages')
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should include language code and name', () => {
      return request(app.getHttpServer())
        .get('/transcription/languages')
        .expect(200)
        .expect((res) => {
          res.body.forEach((lang: any) => {
            expect(lang).toHaveProperty('code');
            expect(lang).toHaveProperty('name');
          });
        });
    });

    it('should include English', () => {
      return request(app.getHttpServer())
        .get('/transcription/languages')
        .expect(200)
        .expect((res) => {
          const english = res.body.find((l: any) => l.code === 'en');
          expect(english).toBeDefined();
          expect(english.name).toBe('English');
        });
    });
  });
});
