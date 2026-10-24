import { Router, Request, Response } from 'express';
import { registerSSEClient, unregisterSSEClient, sseClientCount } from './engine';
import { query } from '../database/pool';
import { logger } from '../utils/logger';

const router = Router();

/**
 * GET /honeypot/events
 * Real-time Server-Sent Events (SSE) feed consumed by the VIGILANCE dashboard.
 */
router.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  res.write('data: {"type":"connected","message":"VIGILANCE honeypot stream connected (PostgreSQL)"}\n\n');

  const heartbeat = setInterval(() => {
    res.write(`: heartbeat ${Date.now()}\n\n`);
  }, 25000);

  registerSSEClient(res);

  req.on('close', () => {
    clearInterval(heartbeat);
    unregisterSSEClient(res);
  });
});

/**
 * GET /honeypot/stats
 * Aggregated statistics for the VIGILANCE monitoring cards.
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const [
      totalRes,
      critRes,
      highRes,
      medRes,
      lowRes,
      typeRes,
      protocolRes,
      recentRes,
    ] = await Promise.all([
      query('SELECT COUNT(*) as count FROM attacks'),
      query('SELECT COUNT(*) as count FROM attacks WHERE severity >= 90'),
      query('SELECT COUNT(*) as count FROM attacks WHERE severity >= 70 AND severity < 90'),
      query('SELECT COUNT(*) as count FROM attacks WHERE severity >= 40 AND severity < 70'),
      query('SELECT COUNT(*) as count FROM attacks WHERE severity < 40'),
      query(`
        SELECT attack_type as _id, COUNT(*) as count
        FROM attacks
        GROUP BY attack_type
        ORDER BY count DESC
        LIMIT 8
      `),
      query(`
        SELECT protocol as name, COUNT(*) as count
        FROM attacks
        GROUP BY protocol
      `),
      query(`
        SELECT COUNT(*) as count
        FROM attacks
        WHERE timestamp >= NOW() - INTERVAL '1 minute'
      `),
    ]);

    const total = parseInt(totalRes.rows[0]?.count || '0', 10);
    const critical = parseInt(critRes.rows[0]?.count || '0', 10);
    const highSev = parseInt(highRes.rows[0]?.count || '0', 10);
    const mediumSev = parseInt(medRes.rows[0]?.count || '0', 10);
    const lowSev = parseInt(lowRes.rows[0]?.count || '0', 10);
    const attacksPerMin = parseInt(recentRes.rows[0]?.count || '0', 10);

    return res.json({
      total_attacks: total,
      critical_count: critical,
      high_count: highSev,
      medium_count: mediumSev,
      low_count: lowSev,
      attacks_per_min: attacksPerMin,
      top_types: typeRes.rows,
      by_protocol: protocolRes.rows,
    });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch honeypot stats');
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /honeypot/logs
 * Query recent attacks from PostgreSQL.
 */
router.get('/logs', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(100, parseInt(req.query.limit as string) || 50);
    const minSev = parseInt(req.query.severity as string) || 0;

    const sql = `
      SELECT * FROM attacks
      WHERE severity >= $1
      ORDER BY timestamp DESC
      LIMIT $2
    `;
    const result = await query(sql, [minSev, limit]);

    return res.json({ count: result.rows.length, logs: result.rows });
  } catch (err: any) {
    logger.error({ err: err.message }, 'Failed to fetch honeypot logs');
    return res.status(500).json({ error: err.message });
  }
});

export default router;
