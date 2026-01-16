/**
 * @file setup.ts
 * @description Test setup for admin integration tests
 */

import { beforeAll, afterAll } from 'vitest';

const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056';
const ADMIN_EMAIL = process.env.DIRECTUS_ADMIN_EMAIL || 'team@manic.agency';
const ADMIN_PASSWORD = process.env.DIRECTUS_ADMIN_PASSWORD || 'admin123';

let directusAvailable = false;
let apiGatewayAvailable = false;

beforeAll(async () => {
  // Check if Directus is available
  try {
    const response = await fetch(`${DIRECTUS_URL}/server/health`, {
      method: 'GET',
    });
    directusAvailable = response.ok;
    
    if (directusAvailable) {
      console.log('✅ Directus is available');
    } else {
      console.warn('⚠️ Directus health check failed');
    }
  } catch (error) {
    console.warn('⚠️ Could not connect to Directus:', (error as Error).message);
  }

  // Check if API Gateway is available
  const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:3030';
  try {
    const response = await fetch(`${API_GATEWAY_URL}/health`, {
      method: 'GET',
    });
    apiGatewayAvailable = response.ok;
    
    if (apiGatewayAvailable) {
      console.log('✅ API Gateway is available');
    } else {
      console.warn('⚠️ API Gateway health check failed');
    }
  } catch (error) {
    console.warn('⚠️ Could not connect to API Gateway:', (error as Error).message);
  }

  // Warn if services are not available
  if (!directusAvailable || !apiGatewayAvailable) {
    console.warn('⚠️ Some services are not available. Tests may fail.');
    console.warn('Make sure to start the dev environment with: docker compose -f docker-compose.dev.yml up -d');
  }
});

afterAll(async () => {
  console.log('🧹 Test cleanup complete');
});

// Export availability flags for conditional tests
export { directusAvailable, apiGatewayAvailable };

