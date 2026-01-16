import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check',
    description: 'Returns service health status and component availability'
  })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  getHealth() {
    return this.healthService.getHealth();
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness check',
    description: 'Checks if service is ready to handle requests (external dependencies)'
  })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  @ApiResponse({ status: 503, description: 'Service is not ready' })
  getReady() {
    const health = this.healthService.getHealth();
    return {
      ready: health.status !== 'error',
      status: health.status,
    };
  }

  @Get('live')
  @ApiOperation({
    summary: 'Liveness check',
    description: 'Checks if service is alive (for Kubernetes liveness probes)'
  })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  getLive() {
    return {
      live: true,
      timestamp: new Date().toISOString(),
    };
  }
}
