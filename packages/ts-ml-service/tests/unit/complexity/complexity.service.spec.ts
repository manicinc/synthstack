import { Test, TestingModule } from '@nestjs/testing';
import { ComplexityService } from '../../../src/complexity/complexity.service';

describe('ComplexityService', () => {
  let service: ComplexityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ComplexityService],
    }).compile();

    service = module.get<ComplexityService>(ComplexityService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('preEstimate', () => {
    it('should estimate trivial complexity for typo fixes', async () => {
      const result = await service.preEstimate({
        title: 'Fix typo in README',
        description: 'Update typo in documentation',
      });
      expect(result.complexityScore).toBe(1);
      expect(result.complexityName).toBe('Trivial');
    });

    it('should estimate simple complexity for small tasks', async () => {
      const result = await service.preEstimate({
        title: 'Add simple validation',
        description: 'Quick small change to add input validation',
      });
      expect(result.complexityScore).toBeLessThanOrEqual(2);
    });

    it('should estimate complex complexity for refactoring', async () => {
      const result = await service.preEstimate({
        title: 'Refactor authentication system',
        description: 'Major refactor to improve security',
      });
      expect(result.complexityScore).toBeGreaterThanOrEqual(4);
    });

    it('should estimate epic complexity for architecture changes', async () => {
      const result = await service.preEstimate({
        title: 'Architecture overhaul',
        description: 'Major platform redesign',
      });
      expect(result.complexityScore).toBe(5);
      expect(result.complexityName).toBe('Epic');
    });

    it('should default to moderate for generic tasks', async () => {
      const result = await service.preEstimate({
        title: 'Generic task',
      });
      expect(result.complexityScore).toBe(3);
    });

    it('should adjust for issue type - bug', async () => {
      const result = await service.preEstimate({
        title: 'Generic task',
        issueType: 'bug',
      });
      expect(result.complexityScore).toBeLessThanOrEqual(3);
      expect(result.factors).toHaveProperty('issueTypeAdjustment');
    });

    it('should adjust for issue type - feature', async () => {
      const result = await service.preEstimate({
        title: 'Generic task',
        issueType: 'feature',
      });
      expect(result.complexityScore).toBeGreaterThanOrEqual(3);
    });

    it('should increase complexity for many related files', async () => {
      const result = await service.preEstimate({
        title: 'Generic task',
        relatedFiles: Array(15).fill('file.ts'),
      });
      expect(result.complexityScore).toBeGreaterThanOrEqual(4);
      expect(result.factors).toHaveProperty('relatedFilesCount', 15);
    });

    it('should increase complexity for long descriptions', async () => {
      const result = await service.preEstimate({
        title: 'Task',
        description: 'x'.repeat(1100),
      });
      expect(result.complexityScore).toBeGreaterThanOrEqual(4);
      expect(result.factors).toHaveProperty('descriptionLength');
    });

    it('should include confidence score', async () => {
      const result = await service.preEstimate({
        title: 'Fix typo in README',
      });
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should include reasoning', async () => {
      const result = await service.preEstimate({
        title: 'Fix typo in README',
      });
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it('should include timestamp', async () => {
      const result = await service.preEstimate({
        title: 'Test task',
      });
      expect(result.timestamp).toBeDefined();
      const date = new Date(result.timestamp);
      expect(date.toISOString()).toBe(result.timestamp);
    });
  });

  describe('postAnalyze', () => {
    it('should analyze trivial changes (< 50 lines)', async () => {
      const result = await service.postAnalyze({
        linesAdded: 20,
        linesRemoved: 10,
        filesChanged: 1,
        commits: 1,
      });
      expect(result.actualComplexity).toBe(1);
    });

    it('should analyze simple changes (50-200 lines)', async () => {
      const result = await service.postAnalyze({
        linesAdded: 100,
        linesRemoved: 50,
        filesChanged: 2,
        commits: 3,
      });
      expect(result.actualComplexity).toBe(2);
    });

    it('should analyze moderate changes (200-500 lines)', async () => {
      const result = await service.postAnalyze({
        linesAdded: 300,
        linesRemoved: 100,
        filesChanged: 5,
        commits: 10,
      });
      expect(result.actualComplexity).toBe(3);
    });

    it('should analyze complex changes (500-1000 lines)', async () => {
      const result = await service.postAnalyze({
        linesAdded: 600,
        linesRemoved: 200,
        filesChanged: 10,
        commits: 20,
      });
      expect(result.actualComplexity).toBe(4);
    });

    it('should analyze epic changes (> 1000 lines)', async () => {
      const result = await service.postAnalyze({
        linesAdded: 1500,
        linesRemoved: 500,
        filesChanged: 30,
        commits: 50,
      });
      expect(result.actualComplexity).toBe(5);
    });

    it('should increase complexity for many files changed', async () => {
      const result = await service.postAnalyze({
        linesAdded: 50,
        linesRemoved: 20,
        filesChanged: 25,
        commits: 5,
      });
      expect(result.actualComplexity).toBeGreaterThanOrEqual(4);
    });

    it('should increase complexity for long merge time', async () => {
      const result = await service.postAnalyze({
        linesAdded: 50,
        linesRemoved: 20,
        filesChanged: 2,
        commits: 5,
        timeToMergeHours: 50,
      });
      expect(result.actualComplexity).toBeGreaterThanOrEqual(4);
    });

    it('should increase complexity for many review comments', async () => {
      const result = await service.postAnalyze({
        linesAdded: 50,
        linesRemoved: 20,
        filesChanged: 2,
        commits: 5,
        reviewComments: 25,
      });
      expect(result.actualComplexity).toBeGreaterThanOrEqual(4);
    });

    it('should calculate accuracy when pre-estimate provided', async () => {
      const result = await service.postAnalyze(
        {
          linesAdded: 300,
          linesRemoved: 100,
          filesChanged: 5,
          commits: 10,
        },
        {
          complexityScore: 3,
          estimatedHours: 10,
        },
      );
      expect(result.accuracyScore).toBe(100);
    });

    it('should return adjustment reason', async () => {
      const result = await service.postAnalyze(
        {
          linesAdded: 300,
          linesRemoved: 100,
          filesChanged: 5,
          commits: 10,
        },
        {
          complexityScore: 3,
        },
      );
      expect(result.adjustmentReason).toContain('Perfect estimation accuracy');
    });

    it('should include metrics in result', async () => {
      const result = await service.postAnalyze({
        linesAdded: 200,
        linesRemoved: 100,
        filesChanged: 5,
        commits: 10,
      });
      expect(result.metrics).toHaveProperty('totalLinesChanged', 300);
      expect(result.metrics).toHaveProperty('filesChanged', 5);
    });

    it('should include analysis text', async () => {
      const result = await service.postAnalyze({
        linesAdded: 200,
        linesRemoved: 100,
        filesChanged: 5,
        commits: 10,
      });
      expect(result.analysis).toBeDefined();
      expect(result.analysis.length).toBeGreaterThan(0);
    });
  });

  describe('getComplexityScale', () => {
    it('should return all 5 complexity levels', () => {
      const scale = service.getComplexityScale();
      expect(Object.keys(scale)).toHaveLength(5);
    });

    it('should include all required properties', () => {
      const scale = service.getComplexityScale();
      Object.values(scale).forEach((level) => {
        expect(level).toHaveProperty('level');
        expect(level).toHaveProperty('name');
        expect(level).toHaveProperty('description');
        expect(level).toHaveProperty('hoursMin');
        expect(level).toHaveProperty('hoursMax');
        expect(level).toHaveProperty('basePoints');
        expect(level).toHaveProperty('indicators');
      });
    });

    it('should have correct level names', () => {
      const scale = service.getComplexityScale();
      expect(scale[1].name).toBe('Trivial');
      expect(scale[2].name).toBe('Simple');
      expect(scale[3].name).toBe('Moderate');
      expect(scale[4].name).toBe('Complex');
      expect(scale[5].name).toBe('Epic');
    });
  });

  describe('calculatePointAdjustment', () => {
    it('should give 25% bonus for significantly underestimated', () => {
      const result = service.calculatePointAdjustment(2, 4);
      expect(result.multiplier).toBe(1.25);
      expect(result.bonusPercent).toBe(25);
    });

    it('should give 15% bonus for slightly underestimated', () => {
      const result = service.calculatePointAdjustment(2, 3);
      expect(result.multiplier).toBe(1.15);
      expect(result.bonusPercent).toBe(15);
    });

    it('should give 10% bonus for perfect accuracy', () => {
      const result = service.calculatePointAdjustment(3, 3);
      expect(result.multiplier).toBe(1.1);
      expect(result.bonusPercent).toBe(10);
    });

    it('should give no adjustment for slightly overestimated', () => {
      const result = service.calculatePointAdjustment(4, 3);
      expect(result.multiplier).toBe(1.0);
      expect(result.bonusPercent).toBe(0);
    });

    it('should give 10% penalty for significantly overestimated', () => {
      const result = service.calculatePointAdjustment(5, 3);
      expect(result.multiplier).toBe(0.9);
      expect(result.bonusPercent).toBe(-10);
    });

    it('should include reason in result', () => {
      const result = service.calculatePointAdjustment(3, 3);
      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });
});
