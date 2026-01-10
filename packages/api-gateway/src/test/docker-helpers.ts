/**
 * Docker Test Helpers
 *
 * Utilities for managing Docker Compose test environment
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import axios from 'axios';

const execAsync = promisify(exec);

const DOCKER_COMPOSE_FILE = 'docker-compose.test.yml';
const SERVICE_HEALTH_CHECKS = {
  postgres: 'http://localhost:5451', // Will fail gracefully, we check via pg
  redis: 'http://localhost:6391', // Will fail gracefully, we check via redis-cli
  'ml-service': 'http://localhost:8031/health',
  qdrant: 'http://localhost:6334/health',
};

/**
 * Start Docker Compose test services
 */
export async function startTestContainers(services?: string[]): Promise<void> {
  console.log('🐳 Starting Docker Compose test environment...\n');

  const serviceArgs = services ? services.join(' ') : '';
  const command = `docker compose -f ${DOCKER_COMPOSE_FILE} up -d ${serviceArgs}`;

  try {
    const { stdout, stderr } = await execAsync(command);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('\n✅ Docker Compose services started\n');
  } catch (error: any) {
    console.error('❌ Failed to start Docker Compose services:', error.message);
    throw error;
  }
}

/**
 * Stop Docker Compose test services
 */
export async function stopTestContainers(): Promise<void> {
  console.log('🛑 Stopping Docker Compose test environment...\n');

  try {
    const { stdout, stderr } = await execAsync(`docker compose -f ${DOCKER_COMPOSE_FILE} down -v`);
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('\n✅ Docker Compose services stopped\n');
  } catch (error: any) {
    console.error('❌ Failed to stop Docker Compose services:', error.message);
    throw error;
  }
}

/**
 * Restart a specific service
 */
export async function restartService(service: string): Promise<void> {
  console.log(`♻️  Restarting service: ${service}...\n`);

  try {
    await execAsync(`docker compose -f ${DOCKER_COMPOSE_FILE} restart ${service}`);
    console.log(`✅ Service ${service} restarted\n`);
  } catch (error: any) {
    console.error(`❌ Failed to restart service ${service}:`, error.message);
    throw error;
  }
}

/**
 * Get logs from a service
 */
export async function getServiceLogs(service: string, tail = 100): Promise<string> {
  try {
    const { stdout } = await execAsync(`docker compose -f ${DOCKER_COMPOSE_FILE} logs --tail=${tail} ${service}`);
    return stdout;
  } catch (error: any) {
    console.error(`❌ Failed to get logs for service ${service}:`, error.message);
    throw error;
  }
}

/**
 * Check if a service is running
 */
export async function isServiceRunning(service: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`docker compose -f ${DOCKER_COMPOSE_FILE} ps -q ${service}`);
    return stdout.trim().length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Wait for a service to be healthy
 */
export async function waitForServiceHealthy(
  service: string,
  maxRetries = 30,
  delayMs = 1000
): Promise<void> {
  const healthUrl = SERVICE_HEALTH_CHECKS[service as keyof typeof SERVICE_HEALTH_CHECKS];

  if (!healthUrl) {
    console.log(`⚠️  No health check configured for ${service}, assuming ready`);
    return;
  }

  console.log(`⏳ Waiting for ${service} to be healthy...`);

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(healthUrl, {
        timeout: 2000,
        validateStatus: () => true, // Accept any status code
      });

      if (response.status === 200) {
        console.log(`✅ ${service} is healthy`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }

    if (i === maxRetries - 1) {
      // Last attempt failed, show logs
      console.error(`❌ ${service} failed to become healthy after ${maxRetries} attempts`);
      console.error('\n📋 Last 50 lines of logs:\n');
      const logs = await getServiceLogs(service, 50);
      console.error(logs);
      throw new Error(`Service ${service} is not healthy`);
    }

    await new Promise(resolve => setTimeout(resolve, delayMs));
    process.stdout.write('.');
  }
}

/**
 * Wait for all services to be healthy
 */
export async function waitForAllServicesHealthy(
  services: string[] = ['postgres-test', 'redis-test', 'ml-service-test'],
  maxRetries = 30
): Promise<void> {
  console.log('⏳ Waiting for all services to be healthy...\n');

  for (const service of services) {
    await waitForServiceHealthy(service, maxRetries);
  }

  console.log('\n🎉 All services are healthy!\n');
}

/**
 * Execute a command in a running container
 */
export async function execInContainer(
  service: string,
  command: string
): Promise<{ stdout: string; stderr: string }> {
  try {
    const { stdout, stderr } = await execAsync(
      `docker compose -f ${DOCKER_COMPOSE_FILE} exec -T ${service} ${command}`
    );
    return { stdout, stderr };
  } catch (error: any) {
    console.error(`❌ Failed to execute command in ${service}:`, error.message);
    throw error;
  }
}

/**
 * Check PostgreSQL health
 */
export async function checkPostgresHealth(): Promise<boolean> {
  try {
    const { stdout } = await execInContainer(
      'postgres-test',
      'pg_isready -U test_user -d synthstack_test'
    );
    return stdout.includes('accepting connections');
  } catch (error) {
    return false;
  }
}

/**
 * Check Redis health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const { stdout } = await execInContainer('redis-test', 'redis-cli ping');
    return stdout.trim() === 'PONG';
  } catch (error) {
    return false;
  }
}

/**
 * Clean up Docker resources
 */
export async function cleanupDockerResources(): Promise<void> {
  console.log('🧹 Cleaning up Docker resources...\n');

  try {
    // Stop containers
    await stopTestContainers();

    // Remove orphaned containers
    await execAsync(`docker compose -f ${DOCKER_COMPOSE_FILE} down --remove-orphans`);

    // Prune volumes (optional, can be commented out)
    // await execAsync('docker volume prune -f');

    console.log('✅ Docker cleanup complete\n');
  } catch (error: any) {
    console.error('❌ Docker cleanup failed:', error.message);
  }
}

/**
 * Setup test environment (start services and wait for health)
 */
export async function setupTestEnvironment(): Promise<void> {
  console.log('🚀 Setting up test environment...\n');

  await startTestContainers();
  await waitForAllServicesHealthy();

  console.log('✅ Test environment ready!\n');
}

/**
 * Teardown test environment
 */
export async function teardownTestEnvironment(): Promise<void> {
  console.log('🧹 Tearing down test environment...\n');

  await stopTestContainers();

  console.log('✅ Test environment torn down\n');
}

/**
 * Get container stats
 */
export async function getContainerStats(service: string): Promise<string> {
  try {
    const { stdout } = await execAsync(
      `docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" $(docker compose -f ${DOCKER_COMPOSE_FILE} ps -q ${service})`
    );
    return stdout;
  } catch (error: any) {
    console.error(`❌ Failed to get stats for ${service}:`, error.message);
    throw error;
  }
}

/**
 * Check if Docker is available
 */
export async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker --version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Check if Docker Compose is available
 */
export async function isDockerComposeAvailable(): Promise<boolean> {
  try {
    await execAsync('docker compose version');
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Verify Docker prerequisites
 */
export async function verifyDockerPrerequisites(): Promise<void> {
  console.log('🔍 Verifying Docker prerequisites...\n');

  const dockerAvailable = await isDockerAvailable();
  const composeAvailable = await isDockerComposeAvailable();

  if (!dockerAvailable) {
    throw new Error('Docker is not installed or not available in PATH');
  }

  if (!composeAvailable) {
    throw new Error('Docker Compose is not installed or not available in PATH');
  }

  console.log('✅ Docker prerequisites verified\n');
}
