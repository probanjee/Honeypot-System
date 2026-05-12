import React, { useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

const COLORS = ['#ff003c', '#ff6600', '#ffaa00', '#00d4ff', '#00ff88', '#7c3aed'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: 'rgba(10,10,20,0.95)', border: '1px solid rgba(0,212,255,0.2)',
        borderRadius: '8px', padding: '10px 14px', backdropFilter: 'blur(12px)',
        fontSize: '12px', color: '#fff',
      }}>
        <p style={{ marginBottom: '4px', color: 'var(--text-2)', fontSize: '11px' }}>{label || payload[0].payload.name}</p>
        {payload.map((p: any) => (
          <p key={p.name || p.dataKey} style={{ color: p.color || p.payload.fill || '#00d4ff' }}>
            Count: <strong>{p.value}</strong>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const SeverityPieChart = ({ stats }: { stats?: any }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // Fallback if no stats
  if (!stats) {
    return <div className="glass" style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)' }}>Awaiting server statistics...</div>;
  }

  // Map backend stats to Pie Chart format
  const severityData = [
    { name: 'Critical (90-100)', value: stats.critical_count || 0, color: '#ff003c' },
    { name: 'High (70-89)',      value: stats.high_count || 0,     color: '#ff6600' },
    { name: 'Medium (40-69)',    value: stats.medium_count || 0,   color: '#ffaa00' },
    { name: 'Low (0-39)',        value: stats.low_count || 0,      color: '#00ff88' },
  ].filter(d => d.value > 0); // Hide empty slices

  // Map backend top types to Bar Chart format
  const typeData = (stats.top_types || []).map((t: any, i: number) => ({
    name: t._id,
    count: t.count,
    fill: COLORS[i % COLORS.length],
  }));

  const total = stats.total_attacks || 0;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
      {/* Pie */}
      <div className="glass" style={{ padding: '24px' }}>
        <h3 style={{ fontWeight: 600, fontSize: '14px', marginBottom: '20px', color: 'var(--text-1)' }}>
          Severity Distribution (Real Data)
        </h3>
        {severityData.length === 0 ? (
          <div style={{ height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>No attacks logged yet</div>
        ) : (
          <div style={{ position: 'relative', height: '260px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={110}
                  paddingAngle={3}
                  dataKey="value"
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {severityData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      opacity={activeIndex === null || activeIndex === index ? 1 : 0.4}
                      stroke={activeIndex === index ? entry.color : 'none'}
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none',
            }}>
              <p style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-1)', lineHeight: 1 }}>{total}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '4px' }}>Total Attacks</p>
            </div>
          </div>
        )}
        {/* Legend */}
        {severityData.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '16px' }}>
            {severityData.map(d => (
              <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, display: 'inline-block' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{d.name}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 700, color: d.color, fontFamily: 'JetBrains Mono, monospace' }}>{d.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="glass" style={{ padding: '24px' }}>
        <h3 style={{ fontWeight: 600, fontSize: '14px', marginBottom: '20px', color: 'var(--text-1)' }}>
          Attack Type Breakdown (Real Data)
        </h3>
        {typeData.length === 0 ? (
          <div style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>No attacks logged yet</div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={typeData} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                stroke="#52525b"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                width={120}
                tick={{ fill: 'var(--text-2)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {typeData.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default SeverityPieChart;
