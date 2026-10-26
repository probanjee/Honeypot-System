/**
 * TypeScript Contracts for Server-Sent Events (SSE) Live Feed (Phase 5)
 */

import type { AttackListItem } from './attacks';

export type SSEConnectionStatus =
  | 'INITIALIZING'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'RECONNECTING'
  | 'DISCONNECTED'
  | 'ERROR';

export interface LiveAttackEvent extends AttackListItem {
  is_live?: boolean;
  received_at?: string;
}

export interface StreamState {
  status: SSEConnectionStatus;
  lastEventId: string | null;
  lastHeartbeat: string | null;
  error: string | null;
  reconnectAttempts: number;
}
