/**
 * Configuration for ts-ml-service
 * TypeScript ML service configuration
 */

export interface DatabaseConfig {
  url?: string;
  poolSize: number;
  idleTimeout: number;
  enableRequestLogging: boolean;
  enableUsageAnalytics: boolean;
  enableDbCache: boolean;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  host: string;
  openaiApiKey: string;
  qdrantUrl: string;
  qdrantApiKey?: string;
  embeddingModel: string;
  defaultLlmModel: string;
  vectorSize: number;
  database: DatabaseConfig;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.TS_ML_SERVICE_PORT || '3001', 10),
  host: process.env.TS_ML_SERVICE_HOST || '0.0.0.0',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  qdrantUrl: process.env.QDRANT_URL || 'http://localhost:6333',
  qdrantApiKey: process.env.QDRANT_API_KEY,
  embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  defaultLlmModel: process.env.DEFAULT_LLM_MODEL || 'gpt-4o-mini',
  vectorSize: parseInt(process.env.VECTOR_SIZE || '1536', 10),
  database: {
    url: process.env.DATABASE_URL,
    poolSize: parseInt(process.env.DB_POOL_SIZE || '10', 10),
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000', 10),
    enableRequestLogging:
      process.env.ENABLE_REQUEST_LOGGING !== 'false',
    enableUsageAnalytics:
      process.env.ENABLE_USAGE_ANALYTICS !== 'false',
    enableDbCache: process.env.ENABLE_DB_CACHE !== 'false',
  },
});
