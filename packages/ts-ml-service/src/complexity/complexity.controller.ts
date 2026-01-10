import {
  Controller,
  Post,
  Get,
  Body,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ComplexityService } from './complexity.service';
import {
  PreEstimateRequestDto,
  PostAnalyzeRequestDto,
  PointAdjustmentRequestDto,
  PreEstimateResponse,
  PostAnalyzeResponse,
  PointAdjustmentResponse,
} from './dto/complexity.dto';

@ApiTags('Complexity')
@Controller('complexity')
export class ComplexityController {
  constructor(private readonly complexityService: ComplexityService) {}

  @Post('estimate')
  @ApiOperation({
    summary: 'Pre-estimate task complexity',
    description: 'Estimate task complexity before work starts based on title, description, and context'
  })
  @ApiResponse({ status: 201, description: 'Complexity estimated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Estimation failed' })
  async preEstimate(
    @Body() dto: PreEstimateRequestDto,
  ): Promise<PreEstimateResponse> {
    try {
      return await this.complexityService.preEstimate({
        title: dto.title,
        description: dto.description,
        issueType: dto.issueType,
        labels: dto.labels,
        milestone: dto.milestone,
        projectContext: dto.projectContext,
        relatedFiles: dto.relatedFiles,
      });
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Estimation failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('analyze')
  @ApiOperation({
    summary: 'Post-mortem complexity analysis',
    description: 'Analyze actual complexity after work completion and compare with pre-estimate'
  })
  @ApiResponse({ status: 201, description: 'Analysis completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Analysis failed' })
  async postAnalyze(
    @Body() dto: PostAnalyzeRequestDto,
  ): Promise<PostAnalyzeResponse> {
    try {
      const preEstimate = dto.preComplexityScore
        ? {
            complexityScore: dto.preComplexityScore,
            estimatedHours: dto.preEstimatedHours,
            reasoning: dto.preReasoning,
          }
        : undefined;

      return await this.complexityService.postAnalyze(
        {
          linesAdded: dto.linesAdded,
          linesRemoved: dto.linesRemoved,
          filesChanged: dto.filesChanged,
          commits: dto.commits,
          timeToMergeHours: dto.timeToMergeHours,
          reviewComments: dto.reviewComments,
          prDescription: dto.prDescription,
        },
        preEstimate,
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('scale')
  @ApiOperation({
    summary: 'Get complexity scale',
    description: 'Get the complexity scale with all 5 levels, descriptions, and hour estimates'
  })
  @ApiResponse({ status: 200, description: 'Complexity scale retrieved successfully' })
  getComplexityScale() {
    const scale = this.complexityService.getComplexityScale();
    return {
      scale: Object.values(scale).map((level) => ({
        level: level.level,
        name: level.name,
        description: level.description,
        hoursMin: level.hoursMin,
        hoursMax: level.hoursMax,
        basePoints: level.basePoints,
        indicators: level.indicators,
      })),
    };
  }

  @Post('adjustment')
  @ApiOperation({
    summary: 'Calculate point adjustment',
    description: 'Calculate point multiplier based on estimation accuracy (pre vs actual complexity)'
  })
  @ApiResponse({ status: 201, description: 'Adjustment calculated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 500, description: 'Calculation failed' })
  calculateAdjustment(
    @Body() dto: PointAdjustmentRequestDto,
  ): PointAdjustmentResponse {
    try {
      return this.complexityService.calculatePointAdjustment(
        dto.preLevel,
        dto.actualLevel,
      );
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Calculation failed',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('health')
  @ApiOperation({
    summary: 'Complexity service health check',
    description: 'Check if complexity estimation service is operational'
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  healthCheck() {
    return {
      status: 'ok',
      service: 'complexity-estimation',
      timestamp: new Date().toISOString(),
    };
  }
}
