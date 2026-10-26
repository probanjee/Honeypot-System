/**
 * Forensic Attack Detail Modal (Phase 5)
 * Deep-dive panel displaying complete incident metadata, matched detection signatures,
 * GeoIP attributes, and forensic evidence tracking.
 */

import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldAlert,
  Server,
  Globe,
  Database,
  AlertOctagon,
} from 'lucide-react';
import type { AttackDetail, AttackListItem } from '../../types/attacks';
import { vigilanceApi } from '../../services/api';

interface AttackDetailModalProps {
  attack: AttackListItem | null;
  onClose: () => void;
}

export const AttackDetailModal: React.FC<AttackDetailModalProps> = ({ attack, onClose }) => {
  const [detail, setDetail] = useState<AttackDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!attack) {
      setDetail(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    vigilanceApi
      .getAttackDetail(attack.id)
      .then((data) => {
        if (isMounted) setDetail(data);
      })
      .catch((err) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to fetch detailed record');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [attack]);

  if (!attack) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="soc-panel"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 0 1px var(--border-strong)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="soc-panel-header"
          style={{
            background: 'var(--bg-surface-elevated)',
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={20} color="#38bdf8" />
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.02em' }}>
                INCIDENT DETAIL FORENSICS
              </h3>
              <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                UUID: {attack.id}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className={`badge-severity ${attack.severity_level}`}>
              {attack.severity_level} ({attack.severity_score}/100)
            </span>
            <button
              onClick={onClose}
              className="soc-btn"
              style={{ padding: '6px', borderRadius: '50%' }}
              title="Close modal"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: 'var(--severity-critical)',
                fontSize: '0.8125rem',
              }}
            >
              Error retrieving detailed attributes: {error}
            </div>
          )}

          {/* Section 1: Network & Origin Metadata */}
          <div>
            <h4
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Server size={14} color="#38bdf8" />
              <span>Network & Ingress Telemetry</span>
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '12px',
                padding: '14px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Source IP Address:</span>
                <p className="mono" style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '2px' }}>
                  {attack.source_ip}:{attack.source_port}
                  {attack.is_private_ip && (
                    <span
                      style={{
                        marginLeft: '8px',
                        fontSize: '0.625rem',
                        padding: '1px 5px',
                        borderRadius: '2px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      RFC1918 Private
                    </span>
                  )}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Target Honeypot Ingress:</span>
                <p className="mono" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#38bdf8', marginTop: '2px' }}>
                  {attack.http_method} {attack.request_path}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Detection Timestamp:</span>
                <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {new Date(attack.timestamp).toUTCString()}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Canonical Ingestion Time:</span>
                <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {new Date(attack.ingested_at).toUTCString()}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: GeoIP Location Attributes */}
          <div>
            <h4
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Globe size={14} color="#10b981" />
              <span>GeoIP Routing Intelligence</span>
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
                padding: '14px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Country / Region:</span>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '2px' }}>
                  {attack.geo_country} ({attack.geo_country_code || 'XX'})
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>City:</span>
                <p style={{ fontSize: '0.8125rem', fontWeight: 600, marginTop: '2px' }}>{attack.geo_city || 'Unknown'}</p>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Approximate Coordinates:</span>
                <p className="mono" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                  {attack.geo_latitude !== null && attack.geo_longitude !== null
                    ? `${Number(attack.geo_latitude).toFixed(4)}°, ${Number(attack.geo_longitude).toFixed(4)}°`
                    : 'Coordinates unavailable'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>GeoIP Status:</span>
                <p className="mono" style={{ fontSize: '0.75rem', fontWeight: 600, marginTop: '2px', color: attack.geoip_status === 'ENRICHED' ? '#10b981' : 'var(--text-muted)' }}>
                  {attack.geoip_status}
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Matched Signature Rules */}
          <div>
            <h4
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <AlertOctagon size={14} color="var(--severity-high)" />
              <span>
                Detection Rules Triggered (
                {detail?.signatures?.length ??
                  (detail?.detection_summary?.matched_rule_count ?? 1)}
                )
              </span>
            </h4>

            {loading && !detail ? (
              <div style={{ padding: '14px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                Loading signature associations...
              </div>
            ) : detail?.signatures && detail.signatures.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {detail.signatures.map((sig) => (
                  <div
                    key={sig.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="mono" style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8' }}>
                          {sig.signature_id}
                        </span>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{sig.rule_name}</span>
                      </div>
                      <span className="mono" style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        Category: {sig.category}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Weight:</span>
                      <span className="mono" style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--severity-high)' }}>
                        +{sig.weight}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  padding: '12px 14px',
                  background: 'var(--bg-surface-elevated)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)',
                }}
              >
                Primary Vector: <strong className="mono">{attack.primary_category}</strong> (Score:{' '}
                {attack.severity_score})
              </div>
            )}
          </div>

          {/* Section 4: Forensic Reference & Evidence */}
          <div>
            <h4
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Database size={14} color="#a855f7" />
              <span>Forensic Evidence System of Record</span>
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '12px',
                padding: '14px',
                background: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>MongoDB Forensic Raw ID:</span>
                <p className="mono" style={{ fontSize: '0.75rem', color: '#a855f7', marginTop: '2px' }}>
                  {detail?.mongo_raw_id || 'Forensic Dump ID Pending'}
                </p>
              </div>

              <div>
                <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Schema Contract Version:</span>
                <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {detail?.schema_version || '1.0.0'}
                </p>
              </div>

              {detail?.user_agent && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Ingress User-Agent:</span>
                  <p className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px', wordBreak: 'break-all' }}>
                    {detail.user_agent}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--bg-surface-elevated)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            borderBottomLeftRadius: 'var(--radius-lg)',
            borderBottomRightRadius: 'var(--radius-lg)',
          }}
        >
          <button onClick={onClose} className="soc-btn">
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
