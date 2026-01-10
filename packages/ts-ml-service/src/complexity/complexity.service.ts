import { Injectable } from '@nestjs/common';
import type {
  PreEstimateResponse,
  PostAnalyzeResponse,
  ComplexityLevel,
  PointAdjustmentResponse,
} from './dto/complexity.dto';

/**
 * Complexity scale definition
 */
const COMPLEXITY_SCALE: Record<number, ComplexityLevel> = {
  1: {
    level: 1,
    name: 'Trivial',
    description: 'Quick fix, typo, or configuration change',
    hoursMin: 0.1,
    hoursMax: 1,
    basePoints: 1,
    indicators: [
      'Single file change',
      'Config update',
      'Typo fix',
      'Documentation update',
    ],
  },
  2: {
    level: 2,
    name: 'Simple',
    description: 'Small, well-defined change',
    hoursMin: 1,
    hoursMax: 4,
    basePoints: 3,
    indicators: [
      'Single component change',
      'Simple bug fix',
      'Minor refactor',
      'Add test cases',
    ],
  },
  3: {
    level: 3,
    name: 'Moderate',
    description: 'Standard feature or significant bug fix',
    hoursMin: 4,
    hoursMax: 16,
    basePoints: 5,
    indicators: [
      'Multiple file changes',
      'New API endpoint',
      'UI component with state',
      'Database migration',
    ],
  },
  4: {
    level: 4,
    name: 'Complex',
    description: 'Large feature requiring careful design',
    hoursMin: 16,
    hoursMax: 40,
    basePoints: 8,
    indicators: [
      'Cross-service changes',
      'New integration',
      'Performance optimization',
      'Security implementation',
    ],
  },
  5: {
    level: 5,
    name: 'Epic',
    description: 'Major feature or system overhaul',
    hoursMin: 40,
    hoursMax: 120,
    basePoints: 13,
    indicators: [
      'Architecture change',
      'New service',
      'Major refactor',
      'Platform migration',
    ],
  },
};

@Injectable()
export class ComplexityService {
  /**
   * Pre-estimate task complexity based on title, description, and context
   */
  async preEstimate(taskContext: {
    title: string;
    description?: string;
    issueType?: string;
    labels?: string[];
    milestone?: string;
    projectContext?: string;
    relatedFiles?: string[];
  }): Promise<PreEstimateResponse> {
    const factors: Record<string, unknown> = {};
    let complexityScore = 3; // Default to moderate

    // Analyze title keywords
    const titleLower = taskContext.title.toLowerCase();
    const descLower = (taskContext.description || '').toLowerCase();
    const combinedText = `${titleLower} ${descLower}`;

    // Trivial indicators
    const trivialKeywords = ['typo', 'fix typo', 'update readme', 'bump version', 'config'];
    if (trivialKeywords.some((kw) => combinedText.includes(kw))) {
      complexityScore = 1;
      factors.trivialKeyword = true;
    }

    // Simple indicators
    const simpleKeywords = ['simple', 'small', 'minor', 'quick'];
    if (simpleKeywords.some((kw) => combinedText.includes(kw))) {
      complexityScore = Math.min(complexityScore, 2);
      factors.simpleKeyword = true;
    }

    // Complex indicators
    const complexKeywords = ['refactor', 'migration', 'integrate', 'security', 'performance'];
    if (complexKeywords.some((kw) => combinedText.includes(kw))) {
      complexityScore = Math.max(complexityScore, 4);
      factors.complexKeyword = true;
    }

    // Epic indicators
    const epicKeywords = ['architecture', 'overhaul', 'platform', 'major', 'redesign'];
    if (epicKeywords.some((kw) => combinedText.includes(kw))) {
      complexityScore = 5;
      factors.epicKeyword = true;
    }

    // Issue type adjustments
    if (taskContext.issueType) {
      const typeAdjustments: Record<string, number> = {
        bug: -0.5,
        documentation: -1,
        feature: 0.5,
        enhancement: 0.5,
        refactor: 1,
      };
      const adjustment = typeAdjustments[taskContext.issueType.toLowerCase()] || 0;
      complexityScore = Math.max(1, Math.min(5, complexityScore + adjustment));
      factors.issueTypeAdjustment = adjustment;
    }

    // Related files count
    if (taskContext.relatedFiles && taskContext.relatedFiles.length > 0) {
      factors.relatedFilesCount = taskContext.relatedFiles.length;
      if (taskContext.relatedFiles.length > 10) {
        complexityScore = Math.max(complexityScore, 4);
      } else if (taskContext.relatedFiles.length > 5) {
        complexityScore = Math.max(complexityScore, 3);
      }
    }

    // Description length as complexity indicator
    if (taskContext.description) {
      factors.descriptionLength = taskContext.description.length;
      if (taskContext.description.length > 1000) {
        complexityScore = Math.max(complexityScore, 4);
      } else if (taskContext.description.length > 500) {
        complexityScore = Math.max(complexityScore, 3);
      }
    }

    complexityScore = Math.round(complexityScore);
    const level = COMPLEXITY_SCALE[complexityScore];

    return {
      complexityScore,
      complexityName: level.name,
      estimatedHours: (level.hoursMin + level.hoursMax) / 2,
      estimatedPoints: level.basePoints,
      factors,
      reasoning: this.generateReasoning(factors, level),
      confidence: this.calculateConfidence(factors),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Analyze actual complexity after PR merge
   */
  async postAnalyze(
    prMetrics: {
      linesAdded: number;
      linesRemoved: number;
      filesChanged: number;
      commits: number;
      timeToMergeHours?: number;
      reviewComments?: number;
      prDescription?: string;
    },
    preEstimate?: {
      complexityScore: number;
      estimatedHours?: number;
      reasoning?: string;
    },
  ): Promise<PostAnalyzeResponse> {
    const totalLines = prMetrics.linesAdded + prMetrics.linesRemoved;
    const metrics: Record<string, unknown> = {
      totalLinesChanged: totalLines,
      filesChanged: prMetrics.filesChanged,
      commits: prMetrics.commits,
      timeToMergeHours: prMetrics.timeToMergeHours,
      reviewComments: prMetrics.reviewComments,
    };

    // Calculate actual complexity based on PR metrics
    let actualComplexity = 3;

    // Lines changed scoring
    if (totalLines < 50) actualComplexity = 1;
    else if (totalLines < 200) actualComplexity = 2;
    else if (totalLines < 500) actualComplexity = 3;
    else if (totalLines < 1000) actualComplexity = 4;
    else actualComplexity = 5;

    // Files changed adjustment
    if (prMetrics.filesChanged > 20) actualComplexity = Math.max(actualComplexity, 4);
    else if (prMetrics.filesChanged > 10) actualComplexity = Math.max(actualComplexity, 3);

    // Time to merge adjustment
    if (prMetrics.timeToMergeHours && prMetrics.timeToMergeHours > 40) {
      actualComplexity = Math.max(actualComplexity, 4);
    }

    // Review comments adjustment
    if (prMetrics.reviewComments && prMetrics.reviewComments > 20) {
      actualComplexity = Math.max(actualComplexity, 4);
    }

    actualComplexity = Math.max(1, Math.min(5, Math.round(actualComplexity)));
    const level = COMPLEXITY_SCALE[actualComplexity];

    // Calculate point adjustment if pre-estimate provided
    let pointAdjustment = 1.0;
    let adjustmentReason = 'No pre-estimate provided';
    let accuracyScore: number | undefined;

    if (preEstimate) {
      const adjustment = this.calculatePointAdjustment(
        preEstimate.complexityScore,
        actualComplexity,
      );
      pointAdjustment = adjustment.multiplier;
      adjustmentReason = adjustment.reason;
      accuracyScore = 100 - Math.abs(preEstimate.complexityScore - actualComplexity) * 25;
    }

    return {
      actualComplexity,
      complexityName: level.name,
      actualPoints: Math.round(level.basePoints * pointAdjustment),
      metrics,
      accuracyScore,
      pointAdjustment,
      adjustmentReason,
      analysis: this.generateAnalysis(metrics, level, preEstimate),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get the complexity scale definitions
   */
  getComplexityScale(): Record<number, ComplexityLevel> {
    return COMPLEXITY_SCALE;
  }

  /**
   * Calculate point adjustment for estimation accuracy
   */
  calculatePointAdjustment(
    preLevel: number,
    actualLevel: number,
  ): PointAdjustmentResponse {
    const diff = actualLevel - preLevel;

    if (diff >= 2) {
      // Significantly underestimated
      return {
        multiplier: 1.25,
        bonusPercent: 25,
        reason: 'Significantly underestimated complexity - 25% bonus',
      };
    } else if (diff === 1) {
      // Slightly underestimated
      return {
        multiplier: 1.15,
        bonusPercent: 15,
        reason: 'Slightly underestimated complexity - 15% bonus',
      };
    } else if (diff === 0) {
      // Perfect accuracy
      return {
        multiplier: 1.1,
        bonusPercent: 10,
        reason: 'Perfect estimation accuracy - 10% bonus',
      };
    } else if (diff === -1) {
      // Slightly overestimated
      return {
        multiplier: 1.0,
        bonusPercent: 0,
        reason: 'Slightly overestimated complexity - no adjustment',
      };
    } else {
      // Significantly overestimated
      return {
        multiplier: 0.9,
        bonusPercent: -10,
        reason: 'Significantly overestimated complexity - 10% penalty',
      };
    }
  }

  private generateReasoning(
    factors: Record<string, unknown>,
    level: ComplexityLevel,
  ): string {
    const reasons: string[] = [];

    if (factors.trivialKeyword) reasons.push('Contains trivial task keywords');
    if (factors.simpleKeyword) reasons.push('Contains simple task keywords');
    if (factors.complexKeyword) reasons.push('Contains complex task keywords');
    if (factors.epicKeyword) reasons.push('Contains major/epic task keywords');
    if (factors.relatedFilesCount) {
      reasons.push(`${factors.relatedFilesCount} related files identified`);
    }
    if (factors.descriptionLength) {
      reasons.push(`Description length: ${factors.descriptionLength} characters`);
    }

    if (reasons.length === 0) {
      reasons.push('Default moderate complexity estimate');
    }

    return `Estimated as ${level.name} (${level.level}/5): ${reasons.join('. ')}.`;
  }

  private generateAnalysis(
    metrics: Record<string, unknown>,
    level: ComplexityLevel,
    preEstimate?: {
      complexityScore: number;
      estimatedHours?: number;
      reasoning?: string;
    },
  ): string {
    const parts: string[] = [];

    parts.push(
      `Actual complexity: ${level.name} (${level.level}/5) based on ${metrics.totalLinesChanged} lines changed across ${metrics.filesChanged} files.`,
    );

    if (preEstimate) {
      const diff = level.level - preEstimate.complexityScore;
      if (diff > 0) {
        parts.push(`Task was more complex than estimated (${diff} level${diff > 1 ? 's' : ''} higher).`);
      } else if (diff < 0) {
        parts.push(`Task was simpler than estimated (${Math.abs(diff)} level${Math.abs(diff) > 1 ? 's' : ''} lower).`);
      } else {
        parts.push('Estimation was accurate.');
      }
    }

    return parts.join(' ');
  }

  private calculateConfidence(factors: Record<string, unknown>): number {
    // Base confidence
    let confidence = 0.6;

    // More factors = more confidence
    const factorCount = Object.keys(factors).length;
    confidence += Math.min(0.2, factorCount * 0.05);

    // Keyword matches increase confidence
    if (factors.trivialKeyword || factors.simpleKeyword || factors.complexKeyword || factors.epicKeyword) {
      confidence += 0.1;
    }

    // Related files provide context
    if (factors.relatedFilesCount) {
      confidence += 0.1;
    }

    return Math.min(0.95, confidence);
  }
}
