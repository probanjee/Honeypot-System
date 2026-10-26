/**
 * React Hook for Probing Backend Health (Phase 5)
 * Verifies real connectivity to FastAPI, PostgreSQL, and broadcaster state.
 */

import { useState, useEffect, useCallback } from 'react';
import { vigilanceApi } from '../services/api';

export interface HealthState {
  isBackendReachable: boolean;
  status: string;
  version: string;
  components: {
    database?: { status: string; pool_size?: number };
    event_broadcaster?: { status: string; active_subscribers?: number };
    [key: string]: unknown;
  };
  lastChecked: Date | null;
  error: string | null;
}

export function useHealth(pollIntervalMs: number = 30000) {
  const [health, setHealth] = useState<HealthState>({
    isBackendReachable: false,
    status: 'UNKNOWN',
    version: '0.0.0',
    components: {},
    lastChecked: null,
    error: null,
  });

  const checkHealth = useCallback(async () => {
    try {
      const data = await vigilanceApi.getHealth();
      setHealth({
        isBackendReachable: data.status === 'HEALTHY',
        status: data.status,
        version: data.version,
        components: (data.components || {}) as HealthState['components'],
        lastChecked: new Date(),
        error: null,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Backend unreachable';
      setHealth((prev) => ({
        ...prev,
        isBackendReachable: false,
        status: 'DOWN',
        lastChecked: new Date(),
        error: msg,
      }));
    }
  }, []);

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, pollIntervalMs);
    return () => clearInterval(interval);
  }, [checkHealth, pollIntervalMs]);

  return {
    ...health,
    checkHealth,
  };
}
