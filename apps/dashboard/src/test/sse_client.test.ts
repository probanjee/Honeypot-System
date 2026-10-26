/**
 * Frontend Unit Tests for SSE Client & Event Pipeline (Phase 5)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VigilanceSSEClient } from '../services/sse';
import type { AttackListItem } from '../types/attacks';

describe('VigilanceSSEClient', () => {
  let client: VigilanceSSEClient;

  beforeEach(() => {
    client = new VigilanceSSEClient('http://testserver/api/v1/attacks/stream');
  });

  it('initializes with INITIALIZING status and transitions to CONNECTING on connect', () => {
    expect(client.getState().status).toBe('INITIALIZING');
    client.connect();
    expect(client.getState().status).toBe('CONNECTING');
    client.disconnect();
    expect(client.getState().status).toBe('DISCONNECTED');
  });

  it('processes valid incoming attack event and notifies subscribers', async () => {
    const onAttack = vi.fn();
    client.subscribe(onAttack);

    const validAttack: AttackListItem = {
      id: 'd9b2d63d-a417-498c-8f2c-55452fcf3e84',
      timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      source_ip: '198.51.100.22',
      source_port: 50222,
      is_private_ip: false,
      http_method: 'POST',
      request_path: '/api/v1/tournaments',
      protocol: 'HTTP/1.1',
      primary_category: 'SQL_INJECTION',
      severity_score: 92,
      severity_level: 'CRITICAL',
      geo_country: 'United States',
      geo_country_code: 'US',
      geo_city: 'Ashburn',
      geo_latitude: 39.0438,
      geo_longitude: -77.4874,
      geoip_status: 'ENRICHED',
    };

    // Simulate MessageEvent
    const msgEvent = new MessageEvent('attack.created', {
      data: JSON.stringify(validAttack),
      lastEventId: validAttack.id,
    });

    // @ts-expect-error Access private method for unit testing
    client.handleIncomingEvent(msgEvent);

    expect(onAttack).toHaveBeenCalledTimes(1);
    expect(onAttack).toHaveBeenCalledWith(validAttack);
    expect(client.getState().lastEventId).toBe(validAttack.id);

    client.disconnect();
  });

  it('rejects duplicate attack events with identical UUIDs', () => {
    const onAttack = vi.fn();
    client.subscribe(onAttack);

    const attack: AttackListItem = {
      id: 'repeat-uuid-1234',
      timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      source_ip: '10.0.0.1',
      source_port: 4444,
      is_private_ip: true,
      http_method: 'GET',
      request_path: '/admin',
      protocol: 'HTTP/1.1',
      primary_category: 'BRUTE_FORCE',
      severity_score: 50,
      severity_level: 'MEDIUM',
      geo_country: 'Unknown',
      geo_country_code: 'XX',
      geo_city: 'Unknown',
      geo_latitude: null,
      geo_longitude: null,
      geoip_status: 'UNAVAILABLE',
    };

    const msg = new MessageEvent('attack.created', {
      data: JSON.stringify(attack),
    });

    // Send first time
    // @ts-expect-error Access private method for testing
    client.handleIncomingEvent(msg);
    expect(onAttack).toHaveBeenCalledTimes(1);

    // Send second time (duplicate)
    // @ts-expect-error Access private method for testing
    client.handleIncomingEvent(msg);
    expect(onAttack).toHaveBeenCalledTimes(1); // Should not increase

    client.disconnect();
  });

  it('safely rejects malformed or incomplete event payloads without error', () => {
    const onAttack = vi.fn();
    client.subscribe(onAttack);

    // Malformed JSON
    const badJson = new MessageEvent('message', { data: 'not-valid-json{{' });
    // @ts-expect-error Access private method for testing
    client.handleIncomingEvent(badJson);
    expect(onAttack).not.toHaveBeenCalled();

    // Missing mandatory fields
    const missingFields = new MessageEvent('message', { data: JSON.stringify({ partial: true }) });
    // @ts-expect-error Access private method for testing
    client.handleIncomingEvent(missingFields);
    expect(onAttack).not.toHaveBeenCalled();

    client.disconnect();
  });

  it('buffers events when paused and flushes upon unpausing', () => {
    const onAttack = vi.fn();
    client.subscribe(onAttack);

    client.setPaused(true);
    expect(client.isStreamPaused()).toBe(true);

    const attack: AttackListItem = {
      id: 'paused-test-id-1',
      timestamp: new Date().toISOString(),
      ingested_at: new Date().toISOString(),
      source_ip: '192.168.1.5',
      source_port: 8080,
      is_private_ip: true,
      http_method: 'GET',
      request_path: '/.env',
      protocol: 'HTTP/1.1',
      primary_category: 'ENVIRONMENT_FILE',
      severity_score: 75,
      severity_level: 'HIGH',
      geo_country: 'Unknown',
      geo_country_code: 'XX',
      geo_city: 'Unknown',
      geo_latitude: null,
      geo_longitude: null,
      geoip_status: 'UNAVAILABLE',
    };

    // @ts-expect-error Access private method for testing
    client.handleIncomingEvent(new MessageEvent('attack.created', { data: JSON.stringify(attack) }));
    expect(onAttack).not.toHaveBeenCalled();

    // Unpause -> should flush buffered attack
    client.setPaused(false);
    expect(onAttack).toHaveBeenCalledTimes(1);
    expect(onAttack).toHaveBeenCalledWith(attack);

    client.disconnect();
  });
});
