import React, { useState, useEffect, useRef } from 'react';
import { Globe } from 'lucide-react';
import type { RealAttack } from '../../../hooks/useHoneypotStream';

const COUNTRY_COORDS: Record<string, { lat: number; lon: number }> = {
  'US': { lat: 37.09, lon: -95.71 },
  'United States': { lat: 37.09, lon: -95.71 },
  'RU': { lat: 61.52, lon: 105.31 },
  'Russia': { lat: 61.52, lon: 105.31 },
  'CN': { lat: 35.86, lon: 104.19 },
  'China': { lat: 35.86, lon: 104.19 },
  'BR': { lat: -14.23, lon: -51.92 },
  'Brazil': { lat: -14.23, lon: -51.92 },
  'IN': { lat: 20.59, lon: 78.96 },
  'India': { lat: 20.59, lon: 78.96 },
  'DE': { lat: 51.16, lon: 10.45 },
  'Germany': { lat: 51.16, lon: 10.45 },
  'GB': { lat: 55.37, lon: -3.43 },
  'UK': { lat: 55.37, lon: -3.43 },
  'FR': { lat: 46.22, lon: 2.21 },
  'France': { lat: 46.22, lon: 2.21 },
  'NL': { lat: 52.13, lon: 5.29 },
  'Netherlands': { lat: 52.13, lon: 5.29 },
  'Local': { lat: 37.77, lon: -122.41 }, // Default local to SF
};

// Equirectangular projection
function geoToXY(lat: number, lon: number, w: number, h: number) {
  const x = ((lon + 180) / 360) * w;
  const y = ((90 - lat) / 180) * h;
  return { x, y };
}

function sevColor(s: number) {
  if (s >= 90) return '#ff003c';
  if (s >= 70) return '#ff6600';
  if (s >= 40) return '#ffaa00';
  return '#00ff88';
}

interface Props {
  attacks?: RealAttack[];
}

const ThreatMap = ({ attacks = [] }: Props) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selected, setSelected] = useState<RealAttack | null>(null);
  const [animated, setAnimated] = useState<Record<string, boolean>>({});
  const W = 900, H = 450;

  // Whenever a new attack arrives, trigger its animation
  const prevCount = useRef(0);
  useEffect(() => {
    if (attacks.length > prevCount.current && attacks.length > 0) {
      const newest = attacks[0];
      setAnimated(prev => ({ ...prev, [newest.id]: true }));
      setTimeout(() => setAnimated(prev => ({ ...prev, [newest.id]: false })), 1200);
    }
    prevCount.current = attacks.length;
  }, [attacks]);

  // Extract unique threat sources from recent attacks for the info cards
  const sourcesMap = new Map<string, RealAttack>();
  attacks.forEach(a => {
    if (!sourcesMap.has(a.source_ip)) sourcesMap.set(a.source_ip, a);
  });
  const uniqueSources = Array.from(sourcesMap.values()).slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }}>
      {/* Map */}
      <div className="glass" style={{ padding: '20px', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Globe size={16} style={{ color: '#00d4ff' }} />
            <h3 style={{ fontWeight: 600, fontSize: '14px' }}>Global Threat Origin Map (Real Data)</h3>
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
            {[['Critical', '#ff003c'], ['High', '#ff6600'], ['Medium', '#ffaa00'], ['Low', '#00ff88']].map(([label, color]) => (
              <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-2)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color as string, display: 'inline-block' }} />
                {label}
              </span>
            ))}
          </div>
        </div>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', borderRadius: '8px', background: 'rgba(0,0,0,0.4)' }}
        >
          {/* Graticule grid */}
          {[-60, -30, 0, 30, 60].map(lat => {
            const { y } = geoToXY(lat, 0, W, H);
            return <line key={lat} x1={0} y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />;
          })}
          {[-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150].map(lon => {
            const { x } = geoToXY(0, lon, W, H);
            return <line key={lon} x1={x} y1={0} x2={x} y2={H} stroke="rgba(255,255,255,0.04)" strokeWidth={0.5} />;
          })}
          {/* Equator */}
          <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="rgba(0,212,255,0.15)" strokeWidth={1} strokeDasharray="4 4" />

          {/* World Map Overlay */}
          <image 
            href="https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg" 
            x="0" y="-30" width={W} height={H+60} 
            opacity={0.15} 
            style={{ filter: 'invert(1) sepia(1) hue-rotate(180deg) saturate(3)' }} 
            preserveAspectRatio="none"
          />

          {/* Attack points */}
          {attacks.map(attack => {
            // resolve country coords, or default to center
            let coords = { lat: 0, lon: 0 };
            if (attack.geo_lat !== undefined && attack.geo_lon !== undefined && (attack.geo_lat !== 0 || attack.geo_lon !== 0)) {
                coords = { lat: attack.geo_lat, lon: attack.geo_lon };
            } else {
                coords = COUNTRY_COORDS[attack.geo_country] || { lat: 0, lon: 0 };
            }
            
            const { x, y } = geoToXY(coords.lat, coords.lon, W, H);
            const isSelected = selected?.id === attack.id;
            const isPulsing = animated[attack.id];
            const color = sevColor(attack.severity);
            const r = attack.severity >= 80 ? 7 : attack.severity >= 60 ? 5.5 : 4;

            return (
              <g key={attack.id} onClick={() => setSelected(isSelected ? null : attack)} style={{ cursor: 'pointer' }}>
                {/* Pulse rings */}
                {isPulsing && (
                  <>
                    <circle cx={x} cy={y} r={r * 3} fill="none" stroke={color} strokeWidth={1} opacity={0.3}>
                      <animate attributeName="r" from={r} to={r * 5} dur="1.2s" repeatCount="1" />
                      <animate attributeName="opacity" from={0.4} to={0} dur="1.2s" repeatCount="1" />
                    </circle>
                    <circle cx={x} cy={y} r={r * 2} fill="none" stroke={color} strokeWidth={0.8} opacity={0.5}>
                      <animate attributeName="r" from={r} to={r * 3} dur="0.8s" repeatCount="1" />
                      <animate attributeName="opacity" from={0.6} to={0} dur="0.8s" repeatCount="1" />
                    </circle>
                  </>
                )}
                {/* Core dot */}
                <circle
                  cx={x} cy={y} r={r}
                  fill={color}
                  opacity={isSelected ? 1 : 0.85}
                  stroke={isSelected ? '#fff' : color}
                  strokeWidth={isSelected ? 2 : 0.5}
                  filter={`drop-shadow(0 0 4px ${color})`}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Info cards (Real Sources) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px', overflowY: 'auto' }}>
        {uniqueSources.length === 0 && (
           <div style={{ color: 'var(--text-3)', fontSize: '12px', padding: '10px' }}>Waiting for incoming attacks...</div>
        )}
        {uniqueSources.map(source => {
          const color = sevColor(source.severity);
          return (
            <div
              key={source.source_ip}
              onClick={() => setSelected(selected?.id === source.id ? null : source)}
              className="glass"
              style={{
                padding: '16px', cursor: 'pointer',
                borderColor: selected?.id === source.id ? 'rgba(0,212,255,0.4)' : 'var(--border)',
                background: selected?.id === source.id ? 'rgba(0,212,255,0.05)' : 'var(--bg-card)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', color: '#00d4ff', fontSize: '12px' }}>{source.source_ip}</span>
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
                  background: `${color}20`, color: color, border: `1px solid ${color}50`,
                }}>
                  {source.severity}
                </span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '4px' }}>📍 {source.geo_country || 'Unknown'}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-1)', fontWeight: 500 }}>{source.attack_type}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThreatMap;
