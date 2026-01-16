import { vi } from 'vitest';

/**
 * Mock Directus API client
 */
export const createMockApi = () => ({
  get: vi.fn().mockResolvedValue({ data: null }),
  post: vi.fn().mockResolvedValue({ data: null }),
  patch: vi.fn().mockResolvedValue({ data: null }),
  delete: vi.fn().mockResolvedValue({ data: null })
});

/**
 * Mock Directus stores
 */
export const createMockStores = () => ({
  useSettingsStore: () => ({
    settings: {
      synthstack_license_key: undefined
    }
  })
});

/**
 * Mock Directus services for hooks testing
 */
export const createMockServices = () => ({
  ItemsService: vi.fn().mockImplementation(() => ({
    readByQuery: vi.fn().mockResolvedValue([]),
    deleteMany: vi.fn().mockResolvedValue([]),
    createOne: vi.fn().mockResolvedValue({ id: 'mock-id' }),
    updateOne: vi.fn().mockResolvedValue({ id: 'mock-id' })
  })),
  ActivityService: vi.fn().mockImplementation(() => ({
    createOne: vi.fn().mockResolvedValue({ id: 'activity-id' })
  }))
});

/**
 * Mock Directus database/knex
 */
export const createMockDatabase = () => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  first: vi.fn().mockResolvedValue(null),
  insert: vi.fn().mockResolvedValue([1]),
  update: vi.fn().mockResolvedValue(1),
  delete: vi.fn().mockResolvedValue(1)
});

/**
 * Mock Directus logger
 */
export const createMockLogger = () => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
});

/**
 * Mock Directus env
 */
export const createMockEnv = (overrides: Record<string, string> = {}) => ({
  SYNTHSTACK_LICENSE_KEY: undefined,
  SYNTHSTACK_WEBHOOK_URL: undefined,
  ...overrides
});

/**
 * Mock Directus schema
 */
export const createMockSchema = () => ({
  collections: {},
  relations: []
});

/**
 * Mock Directus accountability
 */
export const createMockAccountability = (overrides: Partial<{
  user: string;
  role: string;
  admin: boolean;
  ip: string;
}> = {}) => ({
  user: 'test-user-id',
  role: 'test-role-id',
  admin: false,
  ip: '127.0.0.1',
  ...overrides
});

/**
 * Create a complete hook context mock
 */
export const createHookContext = (overrides: Record<string, unknown> = {}) => {
  const services = createMockServices();
  const database = createMockDatabase();
  const logger = createMockLogger();
  const env = createMockEnv();
  const schema = createMockSchema();

  return {
    services,
    database,
    logger,
    env,
    schema,
    ...overrides
  };
};

/**
 * Mock Vue composables from @directus/extensions-sdk
 */
export const mockDirectusExtensionsSdk = () => {
  const mockApi = createMockApi();
  const mockStores = createMockStores();

  vi.mock('@directus/extensions-sdk', () => ({
    useApi: () => mockApi,
    useStores: () => mockStores,
    defineHook: vi.fn((callback) => callback),
    defineModule: vi.fn((config) => config),
    definePanel: vi.fn((config) => config)
  }));

  return { mockApi, mockStores };
};
