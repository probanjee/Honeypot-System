/**
 * VIGILANCE Nowhere Esports Intranet - Canary & Decoy Trap Routes
 * High-value honeytokens designed to capture automated scanners and path traversals.
 */

import { Router, Request, Response } from 'express';

export const canaryRouter = Router();

// GET /robots.txt - Web Crawler Trap
canaryRouter.get('/robots.txt', (_req: Request, res: Response) => {
  const robotsTxt = `# Nowhere Esports Intranet - Restricted Crawler Policy
User-agent: *
Disallow: /admin/
Disallow: /admin/config/
Disallow: /staff/dashboard/
Disallow: /.env
Disallow: /backup/
Disallow: /actuator/
Disallow: /api/v1/internal/
`;
  res.type('text/plain').status(200).send(robotsTxt);
});

// Decoy canary: /.env
canaryRouter.get('/.env', (_req: Request, res: Response) => {
  res.status(403).type('text/plain').send('Access Denied: Internal configuration canary.');
});

// Decoy canary: /admin and /admin/config
canaryRouter.all(['/admin', '/admin/config', '/admin/settings'], (req: Request, res: Response) => {
  if (req.accepts('html')) {
    res.status(403).render('errors/403', {
      title: 'Administrative Access Prohibited',
      message: 'Access to administrative consoles from unauthorized subnets is restricted.',
    });
    return;
  }
  res.status(403).json({
    status: 'error',
    error: 'AdministrativeAccessForbidden',
    message: 'Canary path triggered: Unauthorized subnet connection attempt.',
  });
});

// Decoy canary: Spring Boot actuator traps
canaryRouter.all(['/actuator', '/actuator/health', '/actuator/env'], (_req: Request, res: Response) => {
  res.status(403).json({
    status: 'error',
    error: 'Forbidden',
    message: 'Actuator management interface is disabled in production profile.',
  });
});

// Decoy canary: Database backup traps
canaryRouter.all(['/backup', '/backup/db.sql', '/backup/dump.tar.gz'], (_req: Request, res: Response) => {
  res.status(403).type('text/plain').send('Forbidden: Backup archives are stored offline.');
});
