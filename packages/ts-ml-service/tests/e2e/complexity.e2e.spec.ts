import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

describe('Complexity (e2e)', () => {
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

  describe('POST /complexity/estimate', () => {
    it('should estimate trivial complexity for typo fixes', () => {
      return request(app.getHttpServer())
        .post('/complexity/estimate')
        .send({
          title: 'Fix typo in documentation',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.complexityScore).toBe(1);
          expect(res.body.complexityName).toBe('Trivial');
        });
    });

    it('should estimate moderate complexity for standard tasks', () => {
      return request(app.getHttpServer())
        .post('/complexity/estimate')
        .send({
          title: 'Add new API endpoint',
          description: 'Create CRUD operations for user management',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.complexityScore).toBeGreaterThanOrEqual(2);
          expect(res.body.complexityScore).toBeLessThanOrEqual(4);
        });
    });

    it('should estimate complex for refactoring tasks', () => {
      return request(app.getHttpServer())
        .post('/complexity/estimate')
        .send({
          title: 'Refactor authentication system',
          description: 'Major security overhaul',
          issueType: 'refactor',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.complexityScore).toBeGreaterThanOrEqual(4);
        });
    });

    it('should estimate epic for architecture changes', () => {
      return request(app.getHttpServer())
        .post('/complexity/estimate')
        .send({
          title: 'Architecture overhaul and platform redesign',
          description: 'Major system redesign',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.complexityScore).toBe(5);
          expect(res.body.complexityName).toBe('Epic');
        });
    });

    it('should increase complexity for many related files', () => {
      return request(app.getHttpServer())
        .post('/complexity/estimate')
        .send({
          title: 'Update configuration',
          relatedFiles: Array(15).fill('file.ts'),
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.complexityScore).toBeGreaterThanOrEqual(4);
        });
    });

    it('should include confidence score', () => {
      return request(app.getHttpServer())
        .post('/complexity/estimate')
        .send({
          title: 'Test task',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.confidence).toBeGreaterThan(0);
          expect(res.body.confidence).toBeLessThanOrEqual(1);
        });
    });

    it('should reject request without title', () => {
      return request(app.getHttpServer())
        .post('/complexity/estimate')
        .send({
          description: 'Only description',
        })
        .expect(400);
    });
  });

  describe('POST /complexity/analyze', () => {
    it('should analyze trivial changes', () => {
      return request(app.getHttpServer())
        .post('/complexity/analyze')
        .send({
          linesAdded: 10,
          linesRemoved: 5,
          filesChanged: 1,
          commits: 1,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.actualComplexity).toBe(1);
        });
    });

    it('should analyze moderate changes', () => {
      return request(app.getHttpServer())
        .post('/complexity/analyze')
        .send({
          linesAdded: 200,
          linesRemoved: 100,
          filesChanged: 5,
          commits: 8,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.actualComplexity).toBe(3);
        });
    });

    it('should analyze epic changes', () => {
      return request(app.getHttpServer())
        .post('/complexity/analyze')
        .send({
          linesAdded: 2000,
          linesRemoved: 500,
          filesChanged: 50,
          commits: 100,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.actualComplexity).toBe(5);
        });
    });

    it('should calculate accuracy with pre-estimate', () => {
      return request(app.getHttpServer())
        .post('/complexity/analyze')
        .send({
          linesAdded: 200,
          linesRemoved: 100,
          filesChanged: 5,
          commits: 8,
          preComplexityScore: 3,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.accuracyScore).toBe(100);
        });
    });
  });

  describe('POST /complexity/adjustment', () => {
    it('should return bonus for underestimated tasks', () => {
      return request(app.getHttpServer())
        .post('/complexity/adjustment')
        .send({
          preLevel: 2,
          actualLevel: 4,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.multiplier).toBe(1.25);
          expect(res.body.bonusPercent).toBe(25);
        });
    });

    it('should return bonus for perfect accuracy', () => {
      return request(app.getHttpServer())
        .post('/complexity/adjustment')
        .send({
          preLevel: 3,
          actualLevel: 3,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.multiplier).toBe(1.1);
          expect(res.body.bonusPercent).toBe(10);
        });
    });

    it('should return penalty for overestimated tasks', () => {
      return request(app.getHttpServer())
        .post('/complexity/adjustment')
        .send({
          preLevel: 5,
          actualLevel: 2,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.multiplier).toBe(0.9);
          expect(res.body.bonusPercent).toBe(-10);
        });
    });
  });

  describe('GET /complexity/scale', () => {
    it('should return all 5 complexity levels', () => {
      return request(app.getHttpServer())
        .get('/complexity/scale')
        .expect(200)
        .expect((res) => {
          expect(res.body.scale).toHaveLength(5);
        });
    });

    it('should include all required properties for each level', () => {
      return request(app.getHttpServer())
        .get('/complexity/scale')
        .expect(200)
        .expect((res) => {
          res.body.scale.forEach((level: any) => {
            expect(level).toHaveProperty('level');
            expect(level).toHaveProperty('name');
            expect(level).toHaveProperty('description');
            expect(level).toHaveProperty('hoursMin');
            expect(level).toHaveProperty('hoursMax');
            expect(level).toHaveProperty('basePoints');
          });
        });
    });
  });
});
