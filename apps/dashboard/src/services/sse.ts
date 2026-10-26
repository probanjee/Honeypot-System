/**
 * Native EventSource SSE Client for Live Attack Telemetry (Phase 5)
 * Handles auto-reconnect with exponential backoff, payload validation,
 * deduplication by stable UUID, and Last-Event-ID tracking for server replay.
 */

import type { AttackListItem } from '../types/attacks';
import type { SSEConnectionStatus, StreamState } from '../types/stream';
import { API_BASE_URL, API_PREFIX } from './api';

export type AttackEventHandler = (attack: AttackListItem) => void;
export type StatusChangeHandler = (state: StreamState) => void;

export class VigilanceSSEClient {
  private eventSource: EventSource | null = null;
  private url: string;
  private onAttackCallbacks: Set<AttackEventHandler> = new Set();
  private onStatusCallbacks: Set<StatusChangeHandler> = new Set();
  private state: StreamState = {
    status: 'INITIALIZING',
    lastEventId: null,
    lastHeartbeat: null,
    error: null,
    reconnectAttempts: 0,
  };
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isExplicitlyClosed = false;
  private isPaused = false;
  private pausedQueue: AttackListItem[] = [];
  private seenIds: Set<string> = new Set();
  private idRingBuffer: string[] = [];
  private maxRingBufferSize = 500;

  constructor(customUrl?: string) {
    this.url = customUrl || `${API_BASE_URL}${API_PREFIX}/attacks/stream`;
  }

  public getState(): StreamState {
    return { ...this.state };
  }

  public isStreamPaused(): boolean {
    return this.isPaused;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    if (!paused && this.pausedQueue.length > 0) {
      // Flush buffered items upon unpausing
      const toFlush = [...this.pausedQueue];
      this.pausedQueue = [];
      for (const item of toFlush) {
        this.notifyAttack(item);
      }
    }
  }

  public subscribe(onAttack: AttackEventHandler, onStatus?: StatusChangeHandler): () => void {
    this.onAttackCallbacks.add(onAttack);
    if (onStatus) {
      this.onStatusCallbacks.add(onStatus);
      onStatus(this.getState());
    }

    if (!this.eventSource && !this.isExplicitlyClosed) {
      this.connect();
    }

    return () => {
      this.onAttackCallbacks.delete(onAttack);
      if (onStatus) this.onStatusCallbacks.delete(onStatus);
    };
  }

  public connect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isExplicitlyClosed = false;
    this.updateStatus('CONNECTING', null);

    try {
      // Native browser EventSource
      this.eventSource = new EventSource(this.url, { withCredentials: false });

      this.eventSource.onopen = () => {
        this.state.reconnectAttempts = 0;
        this.updateStatus('CONNECTED', null);
      };

      // Listen specifically for attack.created events
      this.eventSource.addEventListener('attack.created', (event: MessageEvent) => {
        this.handleIncomingEvent(event);
      });

      // Generic message listener (fallback)
      this.eventSource.onmessage = (event: MessageEvent) => {
        this.handleIncomingEvent(event);
      };

      this.eventSource.onerror = () => {
        if (this.isExplicitlyClosed) return;

        const attempts = this.state.reconnectAttempts + 1;
        this.state.reconnectAttempts = attempts;
        this.updateStatus('RECONNECTING', `Connection lost. Attempting reconnect #${attempts}...`);

        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }

        // Exponential backoff with jitter (max 15s)
        const delay = Math.min(1000 * Math.pow(1.5, attempts), 15000);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => {
          if (!this.isExplicitlyClosed) {
            this.connect();
          }
        }, delay);
      };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Failed to instantiate EventSource';
      this.updateStatus('ERROR', errMsg);
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.updateStatus('DISCONNECTED', null);
  }

  private handleIncomingEvent(event: MessageEvent): void {
    if (!event.data) return;

    // Track Last-Event-ID if provided by server
    if (event.lastEventId) {
      this.state.lastEventId = event.lastEventId;
    }

    try {
      const parsed = JSON.parse(event.data);
      if (!parsed || typeof parsed !== 'object') return;

      // Validate mandatory fields
      if (!parsed.id || !parsed.severity_level || !parsed.source_ip) {
        return;
      }

      const attack = parsed as AttackListItem;

      // Deduplication check using in-memory ring buffer
      if (this.seenIds.has(attack.id)) {
        return;
      }

      // Record in bounded ring buffer
      if (this.idRingBuffer.length >= this.maxRingBufferSize) {
        const oldestId = this.idRingBuffer.shift();
        if (oldestId) this.seenIds.delete(oldestId);
      }
      this.idRingBuffer.push(attack.id);
      this.seenIds.add(attack.id);

      if (this.isPaused) {
        this.pausedQueue.push(attack);
        // Bound paused queue to 100 items to prevent unbounded memory growth
        if (this.pausedQueue.length > 100) {
          this.pausedQueue.shift();
        }
      } else {
        this.notifyAttack(attack);
      }
    } catch {
      // Ignore keepalive comments or non-JSON heartbeats
    }
  }

  private notifyAttack(attack: AttackListItem): void {
    for (const cb of this.onAttackCallbacks) {
      try {
        cb(attack);
      } catch (err) {
        console.error('Error in SSE onAttack callback:', err);
      }
    }
  }

  private updateStatus(status: SSEConnectionStatus, error: string | null): void {
    this.state.status = status;
    this.state.error = error;
    if (status === 'CONNECTED') {
      this.state.lastHeartbeat = new Date().toISOString();
    }
    for (const cb of this.onStatusCallbacks) {
      try {
        cb(this.getState());
      } catch (err) {
        console.error('Error in SSE onStatus callback:', err);
      }
    }
  }
}

// Global SSE client singleton
export const sseClient = new VigilanceSSEClient();
