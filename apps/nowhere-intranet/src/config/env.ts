/**
 * VIGILANCE Nowhere Esports Intranet - Environment Configuration
 */

export interface EnvConfig {
  nodeEnv: string;
  port: number;
  mongoUri: string;
  mongoDbName: string;
  rulesPath: string;
  sensorId: string;
  maxBodySizeBytes: number;
}

export function loadEnvConfig(): EnvConfig {
  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017',
    mongoDbName: process.env.MONGO_DB_NAME || (process.env.NODE_ENV === 'test' ? 'vigilance_evidence_test' : 'vigilance_evidence'),
    rulesPath: process.env.RULES_PATH || '../../configs/honeypot-rules.yaml',
    sensorId: process.env.SENSOR_ID || 'honeypot-nowhere-01',
    maxBodySizeBytes: parseInt(process.env.MAX_BODY_SIZE_BYTES || '4096', 10),
  };
}
