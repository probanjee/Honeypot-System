import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { RealAttack } from '../../../hooks/useHoneypotStream';

const MAX_POINTS  = 40;   
const TICK_MS     = 1000;  // 1 second tick

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const attacks  = payload.find((p: any) => p.dataKey === 'attacks');
  const severity = payload.find((p: any) => p.dataKey === 'severity');
  return (
    <div style={{
      background: 'rgba(6,6,14,0.95)',
      border: '1px solid rgba(0,255,136,0.2)',
      borderRadius: '10px',
      padding: '10px 14px',
      backdropFilter: 'blur(12px)',
      fontSize: '12px',
      fontFamily: 'JetBrains Mono, monospace',
      minWidth: '160px',
    }}>
      <p style={{ color: '#52525b', fontSize: '10px', marginBottom: '8px' }}>{label}</p>
      {attacks && (
        <p style={{ color: '#00ff88', marginBottom: '4px' }}>
          ⬡ Attacks/s: <strong>{attacks.value}</strong>
        </p>
      )}
      {severity && (
        <p style={{ color: '#ff003c' }}>
          ⬡ Max Severity:  <strong>{severity.value}</strong>
        </p>
      )}
    </div>
  );
};

const BurstDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload?.severity < 80) return null;
  return (
    <circle
      cx={cx} cy={cy} r={5}
      fill="#ff003c"
      stroke="rgba(255,0,60,0.4)"
      strokeWidth={8}
      opacity={0.9}
    />
  );
};

const AttackTimeline = ({ attacks = [] }: { attacks?: RealAttack[] }) => {
  const [data, setData]         = useState<any[]>([]);
  const lastTickTime            = useRef<number>(Date.now());
  const attacksRef              = useRef(attacks);

  useEffect(() => {
    attacksRef.current = attacks;
  }, [attacks]);

  useEffect(() => {
    // initialize empty array
    if (data.length === 0) {
      const empty = Array.from({ length: MAX_POINTS }, () => ({ time: '', attacks: 0, severity: 0 }));
      setData(empty);
    }
  }, []);

  const tick = useCallback(() => {
    const now = Date.now();
    const last = lastTickTime.current;
    
    // Count attacks that happened between last tick and now
    let count = 0;
    let maxSev = 0;
    
    attacksRef.current.forEach(a => {
      const t = new Date(a.timestamp).getTime();
      if (t > last && t <= now) {
        count++;
        if (a.severity > maxSev) maxSev = a.severity;
      }
    });

    lastTickTime.current = now;

    const label = new Date(now).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    
    const point = { time: label, attacks: count, severity: maxSev };

    setData(prev => {
      if (prev.length === 0) return [point];
      return [...prev.slice(-MAX_POINTS + 1), point];
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(tick, TICK_MS);
    return () => clearInterval(timer);
  }, [tick]);

  const latest = data[data.length - 1] || { attacks: 0, severity: 0 };
  const rateStr = latest.attacks.toString();
  const sevStr = latest.severity.toString();
  
  const status = latest.severity >= 80 ? 'critical' : latest.severity > 0 ? 'high' : 'normal';
  const statusColor = status === 'critical' ? '#ff003c' : status === 'high' ? '#ff6600' : '#00ff88';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
      {/* ── Live header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 4px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
            background: statusColor,
            boxShadow: `0 0 8px ${statusColor}`,
            animation: 'pulse-glow 1.2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: statusColor, letterSpacing: '0.1em' }}>
            {status === 'critical' ? '⚠ CRITICAL' : status === 'high' ? '▲ LIVE ATTACKS' : '● IDLE'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '22px', fontWeight: 700,
              color: '#00ff88',
              textShadow: '0 0 12px rgba(0,255,136,0.4)',
              transition: 'color 0.3s',
            }}>{rateStr}</span>
            <span style={{ fontSize: '10px', color: '#52525b', marginLeft: 4 }}>atk/s</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '22px', fontWeight: 700,
              color: statusColor,
              textShadow: `0 0 12px ${statusColor}60`,
              transition: 'color 0.3s',
            }}>{sevStr}</span>
            <span style={{ fontSize: '10px', color: '#52525b', marginLeft: 4 }}>max sev</span>
          </div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div style={{ flex: 1, minHeight: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
            <defs>
              <linearGradient id="gradAttacks" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor="#00ff88" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#00ff88" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSeverity" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stopColor={statusColor} stopOpacity={0.4} />
                <stop offset="100%" stopColor={statusColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="time" stroke="#3a3a44" tick={{ fill: '#52525b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} tickLine={false} axisLine={false} minTickGap={60} interval="preserveStartEnd" />
            <YAxis stroke="#3a3a44" tick={{ fill: '#52525b', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 'dataMax + 20']} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={80} stroke="rgba(255,0,60,0.25)" strokeDasharray="6 4" label={{ value: 'CRITICAL', position: 'insideTopRight', fill: 'rgba(255,0,60,0.5)', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }} />
            <Area type="monotone" dataKey="attacks" stroke="#00ff88" strokeWidth={2} fill="url(#gradAttacks)" dot={false} activeDot={{ r: 4, fill: '#00ff88', stroke: 'rgba(0,255,136,0.3)', strokeWidth: 6 }} isAnimationActive={false} />
            <Area type="monotone" dataKey="severity" stroke={statusColor} strokeWidth={2} fill="url(#gradSeverity)" dot={<BurstDot />} activeDot={{ r: 4, fill: statusColor, stroke: `${statusColor}50`, strokeWidth: 6 }} isAnimationActive={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ── */}
      <div style={{ display: 'flex', gap: '20px', padding: '0 4px' }}>
        {[
          { color: '#00ff88', label: 'Real Attacks / sec' },
          { color: statusColor, label: 'Max Severity' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ display: 'inline-block', width: 24, height: 2, background: color, borderRadius: 2, boxShadow: `0 0 6px ${color}80` }} />
            <span style={{ fontSize: '11px', color: '#71717a' }}>{label}</span>
          </div>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#3a3a44', fontFamily: 'JetBrains Mono, monospace' }}>
          tick: {TICK_MS}ms · window: {MAX_POINTS}pts (Live)
        </span>
      </div>
    </div>
  );
};

export default AttackTimeline;
