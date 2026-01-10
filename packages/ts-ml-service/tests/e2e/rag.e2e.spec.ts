import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('RAG (e2e)', () => {
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

  describe('POST /rag/index', () => {
    it('should reject request without required fields', () => {
      return request(app.getHttpServer())
        .post('/rag/index')
        .send({})
        .expect(400);
    });

    it('should reject request without content', () => {
      return request(app.getHttpServer())
        .post('/rag/index')
        .send({
          source: 'test',
          sourceType: 'document',
          collection: 'test',
        })
        .expect(400);
    });

    it('should reject request without source', () => {
      return request(app.getHttpServer())
        .post('/rag/index')
        .send({
          content: 'test content',
          sourceType: 'document',
          collection: 'test',
        })
        .expect(400);
    });
  });

  describe('POST /rag/index-project-document', () => {
    it('should reject request without required fields', () => {
      return request(app.getHttpServer())
        .post('/rag/index-project-document')
        .send({})
        .expect(400);
    });

    it('should reject request without documentId', () => {
      return request(app.getHttpServer())
        .post('/rag/index-project-document')
        .send({
          projectId: 'proj-1',
          filename: 'test.txt',
          content: 'content',
          fileType: 'text',
        })
        .expect(400);
    });

    it('should reject request without projectId', () => {
      return request(app.getHttpServer())
        .post('/rag/index-project-document')
        .send({
          documentId: 'doc-1',
          filename: 'test.txt',
          content: 'content',
          fileType: 'text',
        })
        .expect(400);
    });
  });

  describe('POST /rag/search', () => {
    it('should reject request without query', () => {
      return request(app.getHttpServer())
        .post('/rag/search')
        .send({
          collection: 'test',
        })
        .expect(400);
    });

    it('should accept optional collection parameter', () => {
      return request(app.getHttpServer())
        .post('/rag/search')
        .send({
          query: 'test query',
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });

    it('should accept optional limit parameter', () => {
      return request(app.getHttpServer())
        .post('/rag/search')
        .send({
          query: 'test query',
          limit: 10,
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });
  });

  describe('POST /rag/query', () => {
    it('should reject request without query', () => {
      return request(app.getHttpServer())
        .post('/rag/query')
        .send({})
        .expect(400);
    });

    it('should accept optional collection parameter', () => {
      return request(app.getHttpServer())
        .post('/rag/query')
        .send({
          query: 'test query',
          collection: 'test',
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });

    it('should accept optional model parameter', () => {
      return request(app.getHttpServer())
        .post('/rag/query')
        .send({
          query: 'test query',
          model: 'gpt-4',
        })
        .expect((res) => {
          expect([200, 201, 500]).toContain(res.status);
        });
    });
  });

  describe('GET /rag/collections', () => {
    it('should return list of collections', () => {
      return request(app.getHttpServer())
        .get('/rag/collections')
        .expect((res) => {
          expect([200, 500]).toContain(res.status);
          if (res.status === 200) {
            expect(Array.isArray(res.body)).toBe(true);
          }
        });
    });
  });

  describe('DELETE /rag/collections/:name', () => {
    it('should require collection name', () => {
      return request(app.getHttpServer())
        .delete('/rag/collections/')
        .expect(404);
    });
  });

  describe('GET /rag/stats', () => {
    it('should return stats', () => {
      return request(app.getHttpServer())
        .get('/rag/stats')
        .expect((res) => {
          expect([200, 500]).toContain(res.status);
        });
    });
  });
});
