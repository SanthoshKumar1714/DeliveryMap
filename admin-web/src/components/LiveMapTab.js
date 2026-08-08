import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { partnerAPI } from '../utils/api';
import { PageHeader, EmptyState, Btn } from './ui';

const SHOP_LAT = 12.96;
const SHOP_LNG = 80.22;

// Thresholds tuned around the 30s mobile ping cycle:
// green = within normal cycle + margin, yellow = a few missed cycles (network hiccup),
// red = long enough that the partner is probably offline or the app is closed.
const FRESH_MINUTES = 2;
const STALE_MINUTES = 10;

const pinIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.2);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const freshIcon = pinIcon('#0f7a6c');   // green
const staleIcon = pinIcon('#c67c1e');   // yellow/amber
const offlineIcon = pinIcon('#c0392b'); // red

function minutesAgo(dateStr, currentTime) {
  if (!dateStr) return null;
  const diffMs = currentTime - new Date(dateStr).getTime();
  return Math.round(diffMs / 60000);
}

function getFreshnessLevel(mins) {
  if (mins === null) return 'offline';
  if (mins <= FRESH_MINUTES) return 'fresh';
  if (mins <= STALE_MINUTES) return 'stale';
  return 'offline';
}

function getIcon(level) {
  if (level === 'fresh') return freshIcon;
  if (level === 'stale') return staleIcon;
  return offlineIcon;
}

function formatAge(mins) {
  if (mins === null) return 'No location yet';
  if (mins === 0) return 'Just now';
  if (mins === 1) return '1 min ago';
  return `${mins} min ago`;
}

export default function LiveMapTab() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now()); // forces re-render so ages update live

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await partnerAPI.getLocations();
      setPartners(res.data);
      setLastFetched(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Recompute "X min ago" every 15s without re-fetching from the server —
  // otherwise a dot showing "2 min ago" silently becomes wrong the moment
  // a minute ticks over, with no visual change until the next manual refresh.
  useEffect(() => {
    const tick = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(tick);
  }, []);

  const withLocation = partners.filter((p) => p.lastLocation?.lat);

 const withFreshness = withLocation.map((p) => {
  const mins = minutesAgo(p.lastLocation.updatedAt, nowTick);
  return { ...p, _mins: mins, _level: getFreshnessLevel(mins) };
});

  const freshCount = withFreshness.filter((p) => p._level === 'fresh').length;
  const staleCount = withFreshness.filter((p) => p._level === 'stale').length;
  const offlineCount = withFreshness.filter((p) => p._level === 'offline').length;

  return (
    <div>
      <PageHeader
        title="Live map"
        subtitle="Delivery partner positions, reported every 30 seconds while the app is open."
        stats={[
          { label: 'Reporting', value: withLocation.length, color: 'var(--teal)' },
          { label: 'Live (≤2m)', value: freshCount, color: '#0f7a6c' },
          { label: 'Delayed', value: staleCount, color: '#c67c1e' },
          { label: 'Offline (10m+)', value: offlineCount, color: '#c0392b' },
        ]}
      />

      <div style={s.toolbar}>
        <Btn variant="primary" onClick={load} disabled={loading}>
          {loading ? 'Refreshing…' : '↻ Refresh'}
        </Btn>
        {lastFetched && (
          <span style={s.lastFetched}>
            Last refreshed {lastFetched.toLocaleTimeString()}
          </span>
        )}
      </div>

      {withLocation.length === 0 ? (
        <EmptyState
          icon="🛰"
          title="No partners are reporting a location yet"
          subtitle="Positions appear here once a delivery partner opens the mobile app."
        />
      ) : null}

      <div style={s.mapWrap}>
        <MapContainer
          center={[SHOP_LAT, SHOP_LNG]}
          zoom={12}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; OpenStreetMap contributors &copy; CARTO'
          />
          {withFreshness.map((p) => (
            <Marker
              key={p._id}
              position={[p.lastLocation.lat, p.lastLocation.lng]}
              icon={getIcon(p._level)}
            >
              <Popup>
                <strong>{p.name}</strong> ({p.role.replace('_', ' ')})
                <br />
                {formatAge(p._mins)}
                {p._level === 'offline' && (
                  <>
                    <br />
                    <span style={{ color: '#c0392b', fontSize: 12 }}>⚠ Likely offline or app closed</span>
                  </>
                )}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {withLocation.length > 0 && (
        <div style={s.legend}>
          <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#0f7a6c' }} /> Live (≤2 min)</span>
          <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#c67c1e' }} /> Delayed (2–10 min)</span>
          <span style={s.legendItem}><span style={{ ...s.legendDot, background: '#c0392b' }} /> Offline (10+ min)</span>
        </div>
      )}
    </div>
  );
}

const s = {
  toolbar: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
  lastFetched: { fontSize: 12.5, color: 'var(--ink-soft)' },
  mapWrap: { height: '65vh', minHeight: 420, borderRadius: 'var(--radius)', overflow: 'hidden', border: '1px solid var(--line)' },
  legend: { display: 'flex', gap: 18, marginTop: 12, fontSize: 12.5, color: 'var(--ink-soft)' },
  legendItem: { display: 'flex', alignItems: 'center', gap: 6 },
  legendDot: { width: 9, height: 9, borderRadius: '50%', display: 'inline-block' },
};