import { Request, Response, NextFunction } from 'express';
import { Kafka, Producer } from 'kafkajs';
import { query } from '../database/pool';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// ---------------------------------------------------------------------------
// VIGILANCE Honeypot Detection Engine (14 Weighted Signatures)
// Analyzes all inbound traffic, computes risk score, logs to PostgreSQL,
// broadcasts via SSE, and produces events to Apache Kafka ('raw-attacks').
// ---------------------------------------------------------------------------

export interface AttackSignature {
  name: string;
  regex: RegExp;
  weight: number;
}

export const ATTACK_SIGNATURES: AttackSignature[] = [
  { name: 'SQL Injection', regex: /('|"|;|--|union\s+select|select\s+.*from|insert\s+into|drop\s+table|alter\s+table|1=1|OR\s+'1'='1')/i, weight: 25 },
  { name: 'SQL Injection Advanced', regex: /(benchmark\s*\(|sleep\s*\(|waitfor\s+delay|pg_sleep|information_schema)/i, weight: 30 },
  { name: 'XSS', regex: /(<script|javascript:|onerror=|onload=|<img\s+src=x|<svg.*onload|alert\()/i, weight: 20 },
  { name: 'Path Traversal', regex: /(\.\.\/|\.\.\\|\/etc\/passwd|\/etc\/shadow|C:\\Windows\\System32)/i, weight: 35 },
  { name: 'Command Injection', regex: /(;\s*(ls|cat|id|whoami|uname|wget|curl|bash|sh|python)|&&|\|\||`[^`]+`|\$\([^)]+\))/i, weight: 40 },
  { name: 'Log4Shell (CVE-2021-44228)', regex: /(\$\{jndi:(ldap|rmi|dns|nis|iiop|corba|nds|http):)/i, weight: 50 },
  { name: 'PHP Remote Code Execution', regex: /(eval\s*\(|base64_decode\s*\(|system\s*\(|passthru\s*\(|shell_exec\s*\(|popen\s*\()/i, weight: 45 },
  { name: 'Shellshock (CVE-2014-6271)', regex: /(\(\s*\)\s*\{\s*[:;]\s*\}\s*;)/i, weight: 40 },
  { name: 'Sensitive File Access', regex: /(\.env|\.git\/config|\.aws\/credentials|\.ssh\/id_rsa|wp-config\.php|config\.php|database\.yml)/i, weight: 30 },
  { name: 'NoSQL Injection', regex: /(\$gt|\$ne|\$where|\$regex|\$or|\$and|\$nin|\$exists)/i, weight: 25 },
  { name: 'XML External Entity (XXE)', regex: /(<!ENTITY|SYSTEM\s+["']file:|<!DOCTYPE.*\[|<!\[CDATA\[)/i, weight: 35 },
  { name: 'Server-Side Template Injection (SSTI)', regex: /(\{\{.*\}\}|\{%.*%\}|\$\{.*\}|#\{.*\})/i, weight: 30 },
  { name: 'Network Scanner Signature', regex: /(Nmap|Zgrab|Masscan|censys|shodan|nikto|nuclei|dirbuster|gobuster|feroxbuster)/i, weight: 15 },
  { name: 'Credential Stuffing', regex: /(admin:admin|root:root|guest:guest|test:test|administrator:password)/i, weight: 20 },
];

export interface AttackEvent {
  id?: string;
  timestamp: string;
  source_ip: string;
  source_port: number;
  method: string;
  path: string;
  protocol: string;
  attack_type: string;
  payload: string;
  severity: number;
  user_agent: string;
  signatures: string[];
  geo_country: string;
  geo_city: string;
  geo_lat?: number;
  geo_lon?: number;
  blocked: boolean;
}

// ── SSE Broadcaster ─────────────────────────────────────────────────────────
const sseClients = new Set<Response>();

export function registerSSEClient(res: Response): void {
  sseClients.add(res);
}

export function unregisterSSEClient(res: Response): void {
  sseClients.delete(res);
}

export function sseClientCount(): number {
  return sseClients.size;
}

function broadcastSSE(event: AttackEvent): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    client.write(payload);
  }
}

// ── Kafka Producer with Graceful Fallback ────────────────────────────────────
let kafkaProducer: Producer | null = null;
let kafkaAvailable = false;

async function initKafka(): Promise<void> {
  try {
    const kafka = new Kafka({
      clientId: env.KAFKA_CLIENT_ID,
      brokers: [env.KAFKA_BOOTSTRAP_SERVERS],
      retry: { retries: 2 },
    });
    const producer = kafka.producer();
    await producer.connect();
    kafkaProducer = producer;
    kafkaAvailable = true;
    logger.info('[Honeypot Kafka] Producer connected to ' + env.KAFKA_BOOTSTRAP_SERVERS);
  } catch (err: any) {
    kafkaAvailable = false;
    logger.warn({ err: err.message }, '[Honeypot Kafka] Kafka offline — operating in local direct-logging mode');
  }
}

// Initialize Kafka in background
void initKafka();

async function publishToKafka(event: AttackEvent): Promise<void> {
  if (!kafkaAvailable || !kafkaProducer) return;
  try {
    await kafkaProducer.send({
      topic: 'raw-attacks',
      messages: [{ value: JSON.stringify(event) }],
    });
  } catch (err: any) {
    logger.warn({ err: err.message }, '[Honeypot Kafka] Failed to publish attack to Kafka');
  }
}

// ── Honeypot Express Middleware ─────────────────────────────────────────────
export async function honeypotMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.path.startsWith('/honeypot') || req.path.startsWith('/health')) {
    return next();
  }

  const payloadString =
    JSON.stringify(req.body || {}) +
    JSON.stringify(req.query || {}) +
    req.originalUrl +
    ' ' +
    JSON.stringify(req.headers || {});

  const matched: AttackSignature[] = [];
  let severityScore = 0;

  for (const sig of ATTACK_SIGNATURES) {
    if (sig.regex.test(payloadString)) {
      matched.push(sig);
      severityScore += sig.weight;
    }
  }

  // Header inspection (User-Agent scanner probes)
  const userAgent = (req.headers['user-agent'] as string) || 'Unknown';
  if (/nmap|nikto|sqlmap|gobuster|masscan|zgrab|nuclei/i.test(userAgent)) {
    if (!matched.some((s) => s.name === 'Network Scanner Signature')) {
      matched.push({ name: 'Network Scanner Signature', regex: /./, weight: 25 });
      severityScore += 25;
    }
  }

  if (matched.length > 0) {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    const cleanIp = rawIp.replace('::ffff:', '').split(',')[0].trim();
    const finalSeverity = Math.min(100, severityScore);
    const isBlocked = finalSeverity >= 85;

    const event: AttackEvent = {
      timestamp: new Date().toISOString(),
      source_ip: cleanIp,
      source_port: req.socket.remotePort || 0,
      method: req.method,
      path: req.originalUrl,
      protocol: 'HTTP',
      attack_type: matched[0].name,
      payload: payloadString.slice(0, 4000),
      severity: finalSeverity,
      user_agent: userAgent,
      signatures: matched.map((s) => s.name),
      geo_country: cleanIp.startsWith('127.') || cleanIp === '::1' ? 'Localhost' : 'Unknown',
      geo_city: cleanIp.startsWith('127.') || cleanIp === '::1' ? 'Localhost' : 'Unknown',
      geo_lat: 37.77,
      geo_lon: -122.41,
      blocked: isBlocked,
    };

    // 1. Broadcast over SSE to dashboard
    broadcastSSE(event);

    // 2. Publish to Apache Kafka (raw-attacks)
    void publishToKafka(event);

    // 3. Persist to PostgreSQL attacks table
    try {
      await query(
        `
        INSERT INTO attacks (
          timestamp, source_ip, source_port, protocol, attack_type, payload,
          severity, geo_country, geo_city, latitude, longitude, headers, signatures, blocked
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        `,
        [
          event.timestamp,
          event.source_ip,
          event.source_port,
          event.protocol,
          event.attack_type,
          event.payload,
          event.severity,
          event.geo_country,
          event.geo_city,
          event.geo_lat || 0,
          event.geo_lon || 0,
          JSON.stringify(req.headers),
          JSON.stringify(event.signatures),
          event.blocked,
        ]
      );
    } catch (err: any) {
      logger.error({ err: err.message }, '[Honeypot Engine] Failed to persist attack to PostgreSQL');
    }

    if (isBlocked) {
      res.status(403).json({
        error: 'Forbidden',
        message: 'Security inspection alert triggered',
        referenceId: Math.random().toString(36).substring(7),
      });
      return;
    }
  }

  next();
}
