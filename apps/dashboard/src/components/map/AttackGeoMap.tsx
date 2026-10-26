/**
 * Geographic Attack Map (Phase 5)
 * Visualizes approximate GeoIP attack locations using Leaflet & CartoDB Dark Matter tiles.
 * Explicitly respects GeoIP limitations: only plots real non-private coordinates;
 * never fabricates fake locations.
 */

import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Globe, Info, MapPinOff } from 'lucide-react';
import type { AttackListItem } from '../../types/attacks';

interface AttackGeoMapProps {
  attacks: AttackListItem[];
  onSelectAttack?: (attack: AttackListItem) => void;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#06b6d4',
  INFORMATIONAL: '#3b82f6',
};

export const AttackGeoMap: React.FC<AttackGeoMapProps> = ({ attacks, onSelectAttack }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const [plottedCount, setPlottedCount] = useState<number>(0);

  // Filter valid geographic coordinates
  const validGeoAttacks = attacks.filter((a) => {
    if (a.is_private_ip) return false;
    if (a.geo_latitude === null || a.geo_longitude === null) return false;
    const lat = Number(a.geo_latitude);
    const lon = Number(a.geo_longitude);
    return !isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  });

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [20, 0],
        zoom: 2,
        minZoom: 2,
        maxZoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      // CartoDB Dark Matter tile basemap for SOC aesthetics
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map);

      const markersGroup = L.layerGroup().addTo(map);
      markersLayerRef.current = markersGroup;
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // 2. Plot Attack Circle Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = markersLayerRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();
    setPlottedCount(validGeoAttacks.length);

    const bounds = L.latLngBounds([]);

    validGeoAttacks.forEach((attack) => {
      const lat = Number(attack.geo_latitude);
      const lon = Number(attack.geo_longitude);
      const color = SEVERITY_COLORS[attack.severity_level] || '#38bdf8';
      const radius = Math.max(6, Math.min(14, 6 + (attack.severity_score / 100) * 8));

      const marker = L.circleMarker([lat, lon], {
        radius,
        fillColor: color,
        color: '#ffffff',
        weight: 1.5,
        opacity: 0.9,
        fillOpacity: 0.7,
      });

      // Custom Dark Theme Popup
      const popupHtml = `
        <div style="font-family: var(--font-sans); padding: 4px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 6px;">
            <span class="mono" style="font-weight: 700; color: #f8fafc; font-size: 0.875rem;">${attack.source_ip}</span>
            <span style="background: ${color}; color: #020617; font-weight: 700; font-size: 0.6875rem; padding: 2px 6px; border-radius: 4px;">
              ${attack.severity_level} (${attack.severity_score})
            </span>
          </div>
          <div style="font-size: 0.75rem; color: #94a3b8; line-height: 1.4;">
            <div><strong>Location:</strong> ${attack.geo_city}, ${attack.geo_country} (${attack.geo_country_code})</div>
            <div><strong>Category:</strong> ${attack.primary_category}</div>
            <div><strong>Target:</strong> ${attack.http_method} ${attack.request_path}</div>
            <div class="mono" style="font-size: 0.6875rem; color: #64748b; margin-top: 4px;">
              ${new Date(attack.timestamp).toUTCString()}
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      if (onSelectAttack) {
        marker.on('click', () => {
          onSelectAttack(attack);
        });
      }

      layerGroup.addLayer(marker);
      bounds.extend([lat, lon]);
    });

    // Auto-fit if points exist
    if (validGeoAttacks.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 6 });
    }
  }, [attacks, onSelectAttack]);

  return (
    <div className="soc-panel" style={{ marginBottom: '20px' }}>
      <div className="soc-panel-header">
        <div className="soc-panel-title">
          <Globe size={16} color="#38bdf8" />
          <span>Global Attack Surface</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            Plotted Locations: <strong>{plottedCount}</strong>
          </span>
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        {/* Map Canvas */}
        <div
          ref={mapContainerRef}
          style={{
            height: '340px',
            width: '100%',
            backgroundColor: '#07090e',
            borderBottomLeftRadius: 'var(--radius-lg)',
            borderBottomRightRadius: 'var(--radius-lg)',
          }}
        />

        {/* Empty state overlay when zero valid coordinates */}
        {plottedCount === 0 && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(7, 9, 14, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '20px',
              textAlign: 'center',
              zIndex: 500,
            }}
          >
            <MapPinOff size={32} color="var(--text-muted)" />
            <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              No Geographic Coordinates Available to Plot
            </h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', maxWidth: '440px' }}>
              Current attack events either originate from RFC 1918 / private addresses (which are intentionally excluded from public coordinates) or the GeoLite2 database is reported as UNAVAILABLE.
            </p>
          </div>
        )}
      </div>

      {/* GeoIP Methodology Disclaimer */}
      <div
        style={{
          padding: '10px 18px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.6875rem',
          color: 'var(--text-muted)',
        }}
      >
        <Info size={14} color="#38bdf8" style={{ flexShrink: 0 }} />
        <span>
          <strong>Operational Note:</strong> Plotted locations are approximate regional GeoIP resolutions derived from public routing tables. They do not represent exact physical locations of attacker systems. RFC 1918 private IPs are bypassed to prevent misleading geographic markers.
        </span>
      </div>
    </div>
  );
};
