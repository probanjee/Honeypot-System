import React, { useState } from 'react';
import type { RealAttack } from '../../../hooks/useHoneypotStream';

// ── Helpers ───────────────────────────────────────────────────────────────────
function sevColor(s: number) {
  if (s >= 90) return '#ff003c';
  if (s >= 70) return '#ff6600';
  if (s >= 40) return '#ffaa00';
  return '#00ff88';
}
function sevLabel(s: number) {
  if (s >= 90) return 'CRITICAL';
  if (s >= 70) return 'HIGH';
  if (s >= 40) return 'MEDIUM';
  return 'LOW';
}

const PROTO_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  SSH:  { bg: 'rgba(255,102,0,0.12)',   color: '#ff6600', border: 'rgba(255,102,0,0.3)' },
  HTTP: { bg: 'rgba(0,255,136,0.08)',   color: '#00ff88', border: 'rgba(0,255,136,0.2)' },
  TCP:  { bg: 'rgba(0,212,255,0.08)',   color: '#00d4ff', border: 'rgba(0,212,255,0.2)' },
  UDP:  { bg: 'rgba(168,85,247,0.08)',  color: '#a855f7', border: 'rgba(168,85,247,0.2)' },
  DNS:  { bg: 'rgba(255,215,0,0.08)',   color: '#ffd700', border: 'rgba(255,215,0,0.2)' },
};
const DEFAULT_PROTO = { bg: 'rgba(255,255,255,0.06)', color: 'var(--text-2)', border: 'rgba(255,255,255,0.08)' };

interface Props {
  attacks: RealAttack[];
  connected: boolean;
}

const AttacksTable = ({ attacks, connected }: Props) => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const counts = {
    CRITICAL: attacks.filter(a => a.severity >= 90).length,
    HIGH:     attacks.filter(a => a.severity >= 70 && a.severity < 90).length,
    MEDIUM:   attacks.filter(a => a.severity >= 40 && a.severity < 70).length,
    LOW:      attacks.filter(a => a.severity < 40).length,
  };

  return (
    <div>
      {/* ── Sub-header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {(Object.entries(counts) as [string, number][]).map(([label, count]) => {
            const c = label === 'CRITICAL' ? '#ff003c' : label === 'HIGH' ? '#ff6600' : label === 'MEDIUM' ? '#ffaa00' : '#00ff88';
            return (
              <span key={label} style={{ color: c, fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}>
                {label}: <span style={{ color: 'var(--text-1)' }}>{count}</span>
              </span>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
          <span style={{
            display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
            background: connected ? '#00ff88' : '#ffaa00',
            boxShadow: `0 0 6px ${connected ? '#00ff88' : '#ffaa00'}`,
            animation: 'pulse-glow 1.5s ease-in-out infinite',
          }} />
          <span style={{ color: connected ? '#00ff88' : '#ffaa00', fontFamily: 'JetBrains Mono, monospace' }}>
            {connected ? '🛡 NOWHERE LIVE' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {['Time', 'Source IP', 'Country', 'Protocol', 'Attack Type', 'Method & Path', 'Severity', 'Status'].map(h => (
                <th key={h} style={{
                  textAlign: 'left', padding: '8px 12px 12px',
                  fontSize: '10px', color: 'var(--text-3)',
                  textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {attacks.slice(0, 15).map((atk, idx) => {
              const color = sevColor(atk.severity);
              const isNewest = idx === 0;
              const proto = PROTO_STYLE[atk.protocol] ?? DEFAULT_PROTO;
              const isExpanded = expanded === atk.id;

              return (
                <React.Fragment key={atk.id}>
                  <tr
                    onClick={() => setExpanded(isExpanded ? null : atk.id)}
                    style={{
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                      background: isNewest
                        ? `rgba(${atk.severity >= 80 ? '255,0,60' : '0,255,136'},0.04)`
                        : isExpanded ? 'rgba(0,212,255,0.04)' : 'transparent',
                      transition: 'background 1s ease',
                      cursor: 'pointer',
                    }}
                  >
                    {/* Time */}
                    <td style={{ padding: '11px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                      {isNewest && (
                        <span style={{
                          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                          background: color, marginRight: 6, boxShadow: `0 0 6px ${color}`,
                          animation: 'pulse-glow 1s ease-in-out infinite',
                        }} />
                      )}
                      {new Date(atk.timestamp).toLocaleTimeString([], { hour12: false })}
                    </td>

                    {/* IP */}
                    <td style={{ padding: '11px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#00d4ff', whiteSpace: 'nowrap' }}>
                      {atk.source_ip}
                    </td>

                    {/* Country */}
                    <td style={{ padding: '11px 12px', fontSize: '12px', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {atk.geo_country || '—'}
                    </td>

                    {/* Protocol */}
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px',
                        borderRadius: '5px', fontSize: '10px', fontWeight: 700,
                        fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.06em',
                        background: proto.bg, color: proto.color, border: `1px solid ${proto.border}`,
                      }}>{atk.protocol}</span>
                    </td>

                    {/* Attack Type */}
                    <td style={{ padding: '11px 12px', fontSize: '13px', color: 'var(--text-1)', fontWeight: 500, whiteSpace: 'nowrap' }}>
                      {atk.attack_type}
                    </td>

                    {/* Method + Path */}
                    <td style={{ padding: '11px 12px', fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: 'var(--text-3)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: '#ffaa00', marginRight: 4 }}>{atk.method}</span>
                      {atk.path}
                    </td>

                    {/* Severity bar */}
                    <td style={{ padding: '11px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '70px', height: '4px', background: 'rgba(255,255,255,0.07)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${atk.severity}%`, background: color, boxShadow: `0 0 6px ${color}`, borderRadius: 2, transition: 'width 0.4s ease' }} />
                        </div>
                        <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700, color, minWidth: '26px' }}>{atk.severity}</span>
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '11px 12px' }}>
                      <span style={{
                        display: 'inline-block', padding: '2px 10px',
                        borderRadius: '4px', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em',
                        background: `${color}18`, color, border: `1px solid ${color}40`,
                      }}>
                        {atk.blocked ? '🚫 BLOCKED' : sevLabel(atk.severity)}
                      </span>
                    </td>
                  </tr>

                  {/* Expandable payload row */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={8} style={{ padding: '0 12px 12px', background: 'rgba(0,212,255,0.03)', borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
                        <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.4)', borderRadius: '8px', borderLeft: `3px solid ${color}` }}>
                          <div style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-3)' }}>
                            Signatures: <span style={{ color: color }}>{(atk.signatures || []).join(' · ') || 'N/A'}</span>
                          </div>
                          {atk.user_agent && (
                            <div style={{ marginBottom: '6px', fontSize: '11px', color: 'var(--text-3)' }}>
                              User-Agent: <span style={{ color: 'var(--text-2)', fontFamily: 'JetBrains Mono, monospace' }}>{atk.user_agent}</span>
                            </div>
                          )}
                          <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#ffaa00', wordBreak: 'break-all' }}>
                            {atk.payload}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {attacks.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-3)', fontSize: '13px' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🛡️</div>
            No attacks detected yet — waiting for traffic on the Nowhere Esports server
          </div>
        )}
      </div>
    </div>
  );
};

export default AttacksTable;
