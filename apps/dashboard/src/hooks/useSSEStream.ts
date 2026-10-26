/**
 * React Hook for Live SSE Attack Stream (Phase 5)
 * Manages EventSource subscription, live event buffering, deduplication,
 * and user pause/resume control.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { AttackListItem } from '../types/attacks';
import type { StreamState, LiveAttackEvent } from '../types/stream';
import { sseClient } from '../services/sse';

export function useSSEStream(maxBufferSize: number = 200) {
  const [liveAttacks, setLiveAttacks] = useState<LiveAttackEvent[]>([]);
  const [streamState, setStreamState] = useState<StreamState>(sseClient.getState());
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const maxBufferRef = useRef(maxBufferSize);
  maxBufferRef.current = maxBufferSize;

  useEffect(() => {
    const unsubscribe = sseClient.subscribe(
      (newAttack: AttackListItem) => {
        const liveEvent: LiveAttackEvent = {
          ...newAttack,
          is_live: true,
          received_at: new Date().toISOString(),
        };

        setLiveAttacks((prev) => {
          // Prepend latest attack to top of feed
          const updated = [liveEvent, ...prev];
          if (updated.length > maxBufferRef.current) {
            return updated.slice(0, maxBufferRef.current);
          }
          return updated;
        });
      },
      (state: StreamState) => {
        setStreamState(state);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      sseClient.setPaused(next);
      return next;
    });
  }, []);

  const clearLiveFeed = useCallback(() => {
    setLiveAttacks([]);
  }, []);

  const reconnect = useCallback(() => {
    sseClient.connect();
  }, []);

  return {
    liveAttacks,
    streamState,
    isPaused,
    togglePause,
    clearLiveFeed,
    reconnect,
  };
}
