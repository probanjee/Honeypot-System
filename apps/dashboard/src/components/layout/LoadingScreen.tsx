/**
 * VIGILANCE — Proxy Radar Animation Loading Screen
 * High-fidelity tactical radar scanner inspired by Outframe / VytasB on Dribbble.
 * Features 360° rotating laser sweep, dynamic proxy targets with sonar pings,
 * concentric distance range rings, technical HUD telemetry, and smooth dissolve transition.
 */

import React, { useEffect, useState } from 'react';
import { Shield, Radio, Wifi, Server, CheckCircle2 } from 'lucide-react';

interface LoadingScreenProps {
  onLoaded?: () => void;
  minDurationMs?: number;
}

  interface ProxyNode {
    id: string;
    ip: string;
    region: string;
    rtt: string;
    angleDeg: number;
    radiusPercent: number;
    status: string;
  }

const PROXY_NODES: ProxyNode[] = [
  { id: 'PRX-01', ip: '198.51.100.42', region: 'US-EAST', rtt: '22ms', angleDeg: 38, radiusPercent: 68, status: 'LOCKED' },
  { id: 'PRX-02', ip: '185.220.101.5', region: 'EU-CENTRAL', rtt: '16ms', angleDeg: 125, radiusPercent: 48, status: 'ROUTED' },
  { id: 'PRX-03', ip: '103.251.167.2', region: 'AP-NORTHEAST', rtt: '68ms', angleDeg: 215, radiusPercent: 78, status: 'CONNECTED' },
  { id: 'PRX-04', ip: '45.154.255.89', region: 'EU-WEST', rtt: '14ms', angleDeg: 305, radiusPercent: 58, status: 'VERIFIED' },
  { id: 'PRX-05', ip: '149.202.160.1', region: 'FR-PARIS', rtt: '19ms', angleDeg: 172, radiusPercent: 86, status: 'ACTIVE' },
];

const BOOT_STAGES = [
  { percent: 22, label: 'SCANNING PROXY ENCLAVES & DECOY INTRANET...', icon: Wifi },
  { percent: 54, label: 'SYNCHRONIZING REAL-TIME KAFKA SSE EVENT BUS...', icon: Radio },
  { percent: 82, label: 'CORRELATING POSTGRESQL CANONICAL THREAT STORE...', icon: Server },
  { percent: 100, label: 'SPATIAL PROXY DEFENSE READY. ENTERING SOC...', icon: Shield },
];

export const LoadingScreen: React.FC<LoadingScreenProps> = ({
  onLoaded,
  minDurationMs = 2200,
}) => {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(15);
  const [activeBlipIndex, setActiveBlipIndex] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [isDestroyed, setIsDestroyed] = useState(false);

  useEffect(() => {
    // 1. Progress smooth ramp
    const intervalTime = 60;
    const totalSteps = minDurationMs / intervalTime;
    let currentStep = 0;

      const progressTimer = setInterval(() => {
        currentStep++;
        const currentPercent = Math.min(100, Math.round((currentStep / totalSteps) * 100));
        setProgress(currentPercent);

        // Map progress to stage index
        if (currentPercent >= 85) setStageIndex(3);
        else if (currentPercent >= 55) setStageIndex(2);
        else if (currentPercent >= 25) setStageIndex(1);
        else setStageIndex(0);

      if (currentStep >= totalSteps) {
        clearInterval(progressTimer);
        setIsFadingOut(true);

        const destroyTimer = setTimeout(() => {
          setIsDestroyed(true);
          if (onLoaded) onLoaded();
        }, 650);

        return () => clearTimeout(destroyTimer);
      }
    }, intervalTime);

    // 2. Cycle active highlighted proxy blip
    const blipInterval = setInterval(() => {
      setActiveBlipIndex((prev) => (prev + 1) % PROXY_NODES.length);
    }, 1100);

    return () => {
      clearInterval(progressTimer);
      clearInterval(blipInterval);
    };
  }, [minDurationMs, onLoaded]);

  if (isDestroyed) return null;

  const currentStage = BOOT_STAGES[stageIndex];
  const StageIcon = currentStage.icon;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse at 50% 40%, #0a1122 0%, #04060c 85%, #020306 100%)',
        backdropFilter: 'blur(40px)',
        WebkitBackdropFilter: 'blur(40px)',
        opacity: isFadingOut ? 0 : 1,
        transform: isFadingOut ? 'scale(1.02)' : 'scale(1)',
        transition: 'opacity 0.65s cubic-bezier(0.16, 1, 0.3, 1), transform 0.65s cubic-bezier(0.16, 1, 0.3, 1)',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Background Ambient Radial Glow */}
      <div
        style={{
          position: 'absolute',
          width: '560px',
          height: '560px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(37, 99, 235, 0.08) 50%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      {/* Background Dot Matrix Pattern */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(56, 189, 248, 0.12) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          opacity: 0.6,
          pointerEvents: 'none',
        }}
      />

      {/* Main Tactical Glass Viewport Box */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '28px 32px 32px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.01) 100%), rgba(9, 14, 26, 0.75)',
          backdropFilter: 'blur(36px) saturate(200%)',
          WebkitBackdropFilter: 'blur(36px) saturate(200%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderTop: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 30px 70px -15px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
          maxWidth: '560px',
          width: '92%',
        }}
      >
        {/* Specular Bevel Line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.8), transparent)',
          }}
        />

          {/* Top Tactical HUD Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              marginBottom: '20px',
              fontSize: '0.6875rem',
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#30d158',
                  boxShadow: '0 0 8px #30d158',
                  animation: 'hud-beacon-blink 1.2s infinite ease-in-out',
                  display: 'inline-block',
                }}
              />
              <span className="mono" style={{ fontWeight: 700, color: '#f8fafc', letterSpacing: '0.08em' }}>
                PROXY RADAR // VIGILANCE MESH
              </span>
            </div>

            <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: '#38bdf8' }}>FREQ: 9.42 GHz</span>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  background: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontWeight: 600,
                }}
              >
                5/5 LOCKED
              </span>
            </div>
          </div>

          {/* Central Proxy Radar Display (340px) */}
          <div
            style={{
              position: 'relative',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              boxShadow: '0 0 35px rgba(56, 189, 248, 0.25), inset 0 0 25px rgba(56, 189, 248, 0.1)',
              background: 'radial-gradient(circle at 50% 50%, rgba(13, 22, 42, 0.8) 0%, rgba(6, 10, 20, 0.95) 100%)',
              overflow: 'hidden',
            }}
          >
            {/* Compass Cardinal Degrees (N, E, S, W) */}
            <div style={{ position: 'absolute', top: '6px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.5625rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.1em' }} className="mono">000° N</div>
            <div style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.1em' }} className="mono">090° E</div>
            <div style={{ position: 'absolute', bottom: '6px', left: '50%', transform: 'translateX(-50%)', fontSize: '0.5625rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.1em' }} className="mono">180° S</div>
            <div style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.5625rem', color: '#38bdf8', fontWeight: 700, letterSpacing: '0.1em' }} className="mono">270° W</div>

            {/* Concentric Range Rings */}
            {/* Ring 1 (25% Range) */}
            <div
              style={{
                position: 'absolute',
                top: '37.5%',
                left: '37.5%',
                width: '25%',
                height: '25%',
                borderRadius: '50%',
                border: '1px dashed rgba(56, 189, 248, 0.2)',
                pointerEvents: 'none',
              }}
            />
            {/* Ring 2 (50% Range) */}
            <div
              style={{
                position: 'absolute',
                top: '25%',
                left: '25%',
                width: '50%',
                height: '50%',
                borderRadius: '50%',
                border: '1px solid rgba(56, 189, 248, 0.22)',
                pointerEvents: 'none',
              }}
            />
            {/* Ring 3 (75% Range) */}
            <div
              style={{
                position: 'absolute',
                top: '12.5%',
                left: '12.5%',
                width: '75%',
                height: '75%',
                borderRadius: '50%',
                border: '1px dashed rgba(56, 189, 248, 0.2)',
                pointerEvents: 'none',
              }}
            />
            {/* Ring 4 (100% Range Outer) */}
            <div
              style={{
                position: 'absolute',
                inset: '8px',
                borderRadius: '50%',
                border: '1px solid rgba(56, 189, 248, 0.28)',
                pointerEvents: 'none',
              }}
            />

            {/* Hairline Crosshairs (Axes) */}
            {/* Horizontal Axis */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: 0,
                right: 0,
                height: '1px',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            />
            {/* Vertical Axis */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: '50%',
                width: '1px',
                backgroundColor: 'rgba(56, 189, 248, 0.2)',
                transform: 'translateX(-50%)',
                pointerEvents: 'none',
              }}
            />

            {/* Diagonal 45-degree guideline */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '-20%',
                right: '-20%',
                height: '1px',
                borderTop: '1px dotted rgba(56, 189, 248, 0.1)',
                transform: 'rotate(45deg)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '-20%',
                right: '-20%',
                height: '1px',
                borderTop: '1px dotted rgba(56, 189, 248, 0.1)',
                transform: 'rotate(-45deg)',
                pointerEvents: 'none',
              }}
            />

            {/* Sonar Expanding Waves */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '160px',
                height: '160px',
                marginTop: '-80px',
                marginLeft: '-80px',
                borderRadius: '50%',
                border: '1.5px solid rgba(56, 189, 248, 0.55)',
                animation: 'radar-sonar-wave 2.8s linear infinite',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '160px',
                height: '160px',
                marginTop: '-80px',
                marginLeft: '-80px',
                borderRadius: '50%',
                border: '1.5px solid rgba(56, 189, 248, 0.45)',
                animation: 'radar-sonar-wave 2.8s linear infinite',
                animationDelay: '1.4s',
                pointerEvents: 'none',
              }}
            />

            {/* Continuous 360° Rotating Radar Beam Sweep */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                animation: 'radar-sweep-360 3.6s linear infinite',
                transformOrigin: 'center center',
                pointerEvents: 'none',
              }}
            >
              {/* Conic Trailing Gradient */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  background: 'conic-gradient(from 0deg at 50% 50%, rgba(56, 189, 248, 0.55) 0deg, rgba(56, 189, 248, 0.18) 35deg, rgba(14, 165, 233, 0.04) 65deg, transparent 85deg)',
                }}
              />
              {/* Leading Edge Razor Laser Line */}
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  width: '1.5px',
                  height: '50%',
                  backgroundColor: '#38bdf8',
                  boxShadow: '0 0 8px #38bdf8, 0 0 16px rgba(56, 189, 248, 0.9)',
                  transformOrigin: 'bottom center',
                }}
              />
            </div>

            {/* Animated Proxy Blips (Targets on Radar) */}
            {PROXY_NODES.map((node, idx) => {
              // Calculate polar coordinate position
              const angleRad = (node.angleDeg - 90) * (Math.PI / 180);
              const radiusPx = (node.radiusPercent / 100) * 140; // 140px max radius inside 320px container
              const x = 160 + radiusPx * Math.cos(angleRad);
              const y = 160 + radiusPx * Math.sin(angleRad);
              const isHighlighted = idx === activeBlipIndex;

              return (
                <div
                  key={node.id}
                  style={{
                    position: 'absolute',
                    top: `${y}px`,
                    left: `${x}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 20,
                    pointerEvents: 'none',
                  }}
                >
                  {/* Sonar Ping Rings */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: '50%',
                      width: '12px',
                      height: '12px',
                      marginTop: '-6px',
                      marginLeft: '-6px',
                      borderRadius: '50%',
                      border: '1.5px solid #38bdf8',
                      animation: 'node-sonar-ping 2s cubic-bezier(0, 0.2, 0.8, 1) infinite',
                      animationDelay: `${idx * 0.4}s`,
                    }}
                  />

                  {/* Target Blip Core Dot */}
                  <div
                    style={{
                      width: isHighlighted ? '10px' : '7px',
                      height: isHighlighted ? '10px' : '7px',
                      borderRadius: '50%',
                      backgroundColor: isHighlighted ? '#30d158' : '#38bdf8',
                      boxShadow: isHighlighted ? '0 0 14px #30d158' : '0 0 10px #38bdf8',
                      animation: 'node-blip-flash 1.6s ease-in-out infinite',
                      animationDelay: `${idx * 0.3}s`,
                      transition: 'all 0.3s ease',
                    }}
                  />

                  {/* Connected Proxy Data Chip (Tooltip) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: x > 160 ? '12px' : 'auto',
                      right: x > 160 ? 'auto' : '12px',
                      top: y > 160 ? '-22px' : '6px',
                      whiteSpace: 'nowrap',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: isHighlighted ? 'rgba(48, 209, 88, 0.18)' : 'rgba(15, 23, 42, 0.85)',
                      backdropFilter: 'blur(8px)',
                      border: isHighlighted ? '1px solid rgba(48, 209, 88, 0.5)' : '1px solid rgba(56, 189, 248, 0.3)',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontSize: '0.625rem',
                      transition: 'all 0.3s ease',
                    }}
                    className="mono"
                  >
                    <span style={{ color: isHighlighted ? '#30d158' : '#38bdf8', fontWeight: 700 }}>
                      {node.id}
                    </span>
                    <span style={{ color: '#cbd5e1' }}>{node.ip}</span>
                    <span style={{ color: isHighlighted ? '#30d158' : '#94a3b8' }}>
                      {node.rtt}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Central Radar Hub Reticle */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '24px',
                height: '24px',
                marginTop: '-12px',
                marginLeft: '-12px',
                borderRadius: '50%',
                background: 'radial-gradient(circle, #38bdf8 0%, rgba(56, 189, 248, 0.3) 60%, transparent 100%)',
                border: '1.5px solid rgba(255, 255, 255, 0.9)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 16px #38bdf8',
                zIndex: 30,
              }}
            >
                <div
              style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 0 6px #ffffff',
                }}
            />
            </div>
          </div>

            {/* Dynamic Status Readout & Liquid Glass Progress Bar */}
            <div style={{ width: '100%', marginTop: '24px' }}>
              {/* Stage Label & Percentage */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px',
                  fontSize: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <StageIcon size={15} color="#38bdf8" />
                  <span
                    className="mono"
                    style={{
                      color: '#e2e8f0',
                      letterSpacing: '0.04em',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                    }}
                  >
                    {currentStage.label}
                  </span>
                </div>

                <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {progress >= 100 ? (
                    <CheckCircle2 size={15} color="#30d158" />
                  ) : null}
                  <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.875rem' }}>
                    {progress}%
                  </span>
                </div>
              </div>

              {/* Liquid Glass Frosted Progress Bar */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '7px',
                  borderRadius: '9999px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  overflow: 'hidden',
                  boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.5)',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    borderRadius: '9999px',
                    background: 'linear-gradient(90deg, #0284c7 0%, #38bdf8 50%, #30d158 100%)',
                    boxShadow: '0 0 14px rgba(56, 189, 248, 0.75)',
                    transition: 'width 0.15s linear',
                    position: 'relative',
                  }}
                >
                  {/* Shimmer reflection */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.7), transparent)',
                      animation: 'glass-shimmer 1.6s infinite',
                    }}
                  />
                </div>
              </div>

              {/* Bottom Telemetry Metrics Footnote */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  fontSize: '0.6875rem',
                  color: '#64748b',
                }}
                className="mono"
              >
                <span>PROTOCOL: HONEYPOT-KAFKA-SSE</span>
                <span>SECURE PROXY ENCLAVE</span>
                <span>OS 27 // ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
        );
};
