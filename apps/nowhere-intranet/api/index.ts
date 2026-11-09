/**
 * Vercel Serverless Function Handler for Nowhere Esports Intranet
 */

import { createApp } from '../src/app.js';
import { loadEnvConfig } from '../src/config/env.js';
import { MockEvidenceRepository } from '../src/repository/mockEvidenceRepository.js';
import { MongoEvidenceRepository } from '../src/repository/mongoEvidenceRepository.js';
import path from 'node:path';
import fs from 'node:fs';

let appInstance: any = null;

export default async function handler(req: any, res: any) {
  if (!appInstance) {
    const env = loadEnvConfig();
    let evidenceRepo: any = new MockEvidenceRepository();

    // Use live MongoDB if a remote MONGO_URI is configured
    if (env.mongoUri && !env.mongoUri.includes('127.0.0.1')) {
      try {
        const mongo = new MongoEvidenceRepository({
          uri: env.mongoUri,
          dbName: env.mongoDbName,
        });
        await mongo.connect();
        evidenceRepo = mongo;
      } catch (err) {
        console.warn('[VERCEL_WARN] Falling back to in-memory evidence store:', (err as Error).message);
      }
    }

    // Resolve rules path dynamically across serverless filesystem layouts
    let rulesPath = env.rulesPath;
    if (!fs.existsSync(rulesPath)) {
      const candidates = [
        path.join(process.cwd(), 'configs', 'honeypot-rules.yaml'),
        path.join(process.cwd(), '..', '..', 'configs', 'honeypot-rules.yaml'),
        path.join(process.cwd(), 'apps', 'nowhere-intranet', 'configs', 'honeypot-rules.yaml'),
      ];
      for (const cand of candidates) {
        if (fs.existsSync(cand)) {
          rulesPath = cand;
          break;
        }
      }
    }

    appInstance = createApp({
      evidenceRepository: evidenceRepo,
      rulesPath: fs.existsSync(rulesPath) ? rulesPath : undefined,
      maxBodySizeBytes: env.maxBodySizeBytes,
    });
  }

  return appInstance(req, res);
}

