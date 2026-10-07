import { useState, useEffect } from 'react';

export type RealAttack = {
  id: string;
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
  isReal: true;
};

export function useHoneypotStream() {
  const [attacks, setAttacks] = useState<RealAttack[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let statsInterval: any;

    const connectSSE = () => {
      eventSource = new EventSource('http://localhost:3000/honeypot/events');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        if (event.data.startsWith(': heartbeat')) return;

        try {
          const data = JSON.parse(event.data);
          if (data.type === 'connected') return;

          // add stable id
          data.id = data._id || Math.random().toString(36).substring(7);
          data.isReal = true;

          setAttacks(prev => {
            if (isPaused) return prev;
            return [data, ...prev].slice(0, 100);
          });
        } catch (e) {
          console.error('SSE Parse error', e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        if (eventSource) eventSource.close();
        setTimeout(connectSSE, 3000);
      };
    };

    connectSSE();

    const fetchStats = async () => {
      try {
        const res = await fetch('http://localhost:3000/honeypot/stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {}
    };

    fetchStats();
    statsInterval = setInterval(fetchStats, 5000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(statsInterval);
    };
  }, [isPaused]);

  return { attacks, stats, connected: isConnected, isPaused, setIsPaused };
}
