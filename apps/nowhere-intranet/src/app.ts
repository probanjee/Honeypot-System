/**
 * VIGILANCE Nowhere Esports Intranet - Express Application Factory
 * Configures view engine, middleware pipeline, detection engine, and route hierarchy.
 */

import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureBodyParsers } from './middleware/bodyParser.js';
import { createDetectionMiddleware } from './middleware/detectionMiddleware.js';
import { safeErrorHandler } from './middleware/errorHandler.js';
import { webRouter } from './routes/web.js';
import { apiRouter } from './routes/api.js';
import { canaryRouter } from './routes/canary.js';
import { SignatureEngine } from './engine/signatureEngine.js';
import { SeverityScorer } from './engine/scorer.js';
import { IEvidenceRepository } from './repository/evidenceRepository.interface.js';
import { loadAndValidateRules } from './config/rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface AppOptions {
  evidenceRepository: IEvidenceRepository;
  rulesPath?: string;
  maxBodySizeBytes?: number;
}

export function createApp(optionsOrRepo: AppOptions | IEvidenceRepository): express.Application {
  const options: AppOptions = 'saveEvidence' in optionsOrRepo 
    ? { evidenceRepository: optionsOrRepo } 
    : optionsOrRepo;
  const app = express();

  // 1. Configure EJS view engine
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));

  // 2. Configure bounded body parsers (4KB hard limit)
  configureBodyParsers(app, options.maxBodySizeBytes || 4096);

  // 3. Initialize Signature Engine & Severity Scorer
  const rulesConfig = loadAndValidateRules(options.rulesPath);
  const signatureEngine = new SignatureEngine(rulesConfig);
  const severityScorer = new SeverityScorer();

  // 4. Register In-line Honeypot Detection Middleware
  app.use(createDetectionMiddleware(
    signatureEngine,
    severityScorer,
    options.evidenceRepository
  ));

  // 5. Mount Canary & Trap Routes (highest precedence for honeytokens)
  app.use(canaryRouter);

  // 6. Mount Web Decoy Views
  app.use(webRouter);

  // 7. Mount Mock REST APIs
  app.use('/api', apiRouter);

  // 8. 404 Handler for unmatched routes
  app.use((req, res) => {
    if (req.accepts('html')) {
      res.status(404).render('errors/404', {
        title: '404 - Page Not Found',
        message: `The requested path '${req.path}' does not exist on this intranet node.`,
      });
      return;
    }
    res.status(404).json({
      status: 'error',
      error: 'NotFound',
      message: `The endpoint '${req.path}' does not exist.`,
    });
  });

  // 9. Safe Global Error Handler
  app.use(safeErrorHandler);

  return app;
}
