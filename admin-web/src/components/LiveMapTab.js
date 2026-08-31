import React, { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { partnerAPI } from "../utils/api";
import { PageHeader, EmptyState, Btn } from "./ui";

const SHOP_LAT = 12.96;
const SHOP_LNG = 80.22;

// Thresholds tuned around the 30s mobile ping cycle:
// green = within normal cycle + margin, yellow = a few missed cycles (network hiccup),
// red = long enough that the partner is probably offline or the app is closed.
const FRESH_MINUTES = 2;
const STALE_MINUTES = 10;

// Tight radius — only counts as "together" for true overlaps (same building/doorstep).
const CLUSTER_RADIUS_METERS = 18;

function minutesAgo(dateStr, currentTime) {
  if (!dateStr) return null;
  const diffMs = currentTime - new Date(dateStr).getTime();
  return Math.round(diffMs / 60000);
}

function getFreshnessLevel(mins) {
  if (mins === null) return "offline";
  if (mins <= FRESH_MINUTES) return "fresh";
  if (mins <= STALE_MINUTES) return "stale";
  return "offline";
}

function levelColor(level) {
  if (level === "fresh") return "#0f7a6c";
  if (level === "stale") return "#c67c1e";
  return "#c0392b";
}

function formatAge(mins) {
  if (mins === null) return "No location yet";
  if (mins === 0) return "Just now";
  if (mins === 1) return "1 min ago";
  return `${mins} min ago`;
}

// Haversine distance in meters between two lat/lng points.
function distanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Groups partners into clusters using simple proximity — anyone within
// CLUSTER_RADIUS_METERS of an existing cluster's first member joins it.
// O(n^2) but fine at this scale (<50 partners).
function clusterPartners(partners) {
  const clusters = [];
  const used = new Array(partners.length).fill(false);

  for (let i = 0; i < partners.length; i++) {
    if (used[i]) continue;
    const group = [partners[i]];
    used[i] = true;
    const anchor = partners[i];

    for (let j = i + 1; j < partners.length; j++) {
      if (used[j]) continue;
      const d = distanceMeters(
        anchor.lastLocation.lat,
        anchor.lastLocation.lng,
        partners[j].lastLocation.lat,
        partners[j].lastLocation.lng,
      );
      if (d <= CLUSTER_RADIUS_METERS) {
        group.push(partners[j]);
        used[j] = true;
      }
    }
    clusters.push(group);
  }
  return clusters;
}

// Worst-case color: if anyone in the group is offline show red, else amber if
// anyone is stale, else green. This is the more useful dispatch signal —
// "something here needs attention" beats an averaged/blended color.
function worstLevel(group) {
  if (group.some((p) => p._level === "offline")) return "offline";
  if (group.some((p) => p._level === "stale")) return "stale";
  return "fresh";
}

function singleIcon(partner) {
  const color = levelColor(partner._level);
  const safeName = String(partner.name || "").replace(/</g, "&lt;");
  return L.divIcon({
    className: "",
    html: `
      <div style="display:flex;align-items:center;gap:5px;transform:translateX(-1px);">
        <div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,0.2);flex-shrink:0;"></div>
        <span style="background:#fff;padding:1px 6px;border-radius:5px;font-size:11px;font-weight:600;color:#1f2d27;box-shadow:0 1px 3px rgba(0,0,0,0.25);white-space:nowrap;font-family:sans-serif;">${safeName}</span>
      </div>
    `,
    iconSize: [120, 20],
    iconAnchor: [7, 10],
  });
}

function clusterIcon(group) {
  const color = levelColor(worstLevel(group));
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:26px;height:26px;">
        <div style="width:26px;height:26px;border-radius:50%;background:${color};border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;">
          <span style="color:#fff;font-weight:700;font-size:12px;font-family:sans-serif;">${group.length}</span>
        </div>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
}

export default function LiveMapTab() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastFetched, setLastFetched] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const [dialogGroup, setDialogGroup] = useState(null); // array of partners shown in the dialog

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

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const tick = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(tick);
  }, []);

  const withLocation = partners.filter((p) => p.lastLocation?.lat);

  const withFreshness = withLocation.map((p) => {
    const mins = minutesAgo(p.lastLocation.updatedAt, nowTick);
    return { ...p, _mins: mins, _level: getFreshnessLevel(mins) };
  });

  const freshCount = withFreshness.filter((p) => p._level === "fresh").length;
  const staleCount = withFreshness.filter((p) => p._level === "stale").length;
  const offlineCount = withFreshness.filter(
    (p) => p._level === "offline",
  ).length;

  const clusters = clusterPartners(withFreshness);

  return (
    <div>
      <PageHeader
        title="Live map"
        subtitle="Delivery partner positions, reported every 30 seconds while the app is open."
        stats={[
          {
            label: "Reporting",
            value: withLocation.length,
            color: "var(--teal)",
          },
          { label: "Live (≤2m)", value: freshCount, color: "#0f7a6c" },
          { label: "Delayed", value: staleCount, color: "#c67c1e" },
          { label: "Offline (10m+)", value: offlineCount, color: "#c0392b" },
        ]}
      />

      <div style={s.toolbar}>
        <Btn variant="primary" onClick={load} disabled={loading}>
          {loading ? "Refreshing…" : "↻ Refresh"}
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
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png?key=cb1_2mx8_1_436f037eb65455ff4e556be9"
  attribution='&copy; OpenStreetMap contributors &copy; CARTO'
/>
          {clusters.map((group) => {
            const isCluster = group.length > 1;
            const anchor = group[0];
            return (
              <Marker
                key={anchor._id}
                position={[anchor.lastLocation.lat, anchor.lastLocation.lng]}
                icon={isCluster ? clusterIcon(group) : singleIcon(anchor)}
                eventHandlers={{ click: () => setDialogGroup(group) }}
              />
            );
          })}
        </MapContainer>
      </div>

      {withLocation.length > 0 && (
        <div style={s.legend}>
          <span style={s.legendItem}>
            <span style={{ ...s.legendDot, background: "#0f7a6c" }} /> Live (≤2
            min)
          </span>
          <span style={s.legendItem}>
            <span style={{ ...s.legendDot, background: "#c67c1e" }} /> Delayed
            (2–10 min)
          </span>
          <span style={s.legendItem}>
            <span style={{ ...s.legendDot, background: "#c0392b" }} /> Offline
            (10+ min)
          </span>
        </div>
      )}

      {dialogGroup && (
        <PartnerDialog
          group={dialogGroup}
          onClose={() => setDialogGroup(null)}
        />
      )}
    </div>
  );
}

// Eye-catching custom dialog — replaces the default Leaflet Popup for both
// single partners and clusters, so the click experience is consistent and
// on-brand instead of the plain white Leaflet box.
function PartnerDialog({ group, onClose }) {
  const isCluster = group.length > 1;

  return (
    <div style={ds.overlay} onClick={onClose}>
      <div style={ds.card} onClick={(e) => e.stopPropagation()}>
        <div style={ds.header}>
          <div>
            <div style={ds.headerTitle}>
              {isCluster ? `${group.length} partners here` : group[0].name}
            </div>
            {isCluster && <div style={ds.headerSub}>Overlapping positions</div>}
          </div>
          <button onClick={onClose} style={ds.closeBtn}>
            ✕
          </button>
        </div>

        <div style={ds.list}>
          {group.map((p) => (
            <div key={p._id} style={ds.row}>
              <div style={{ ...ds.dot, background: levelColor(p._level) }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={ds.name}>{p.name}</div>
                <div style={ds.meta}>
                  {p.role.replace("_", " ")} · {formatAge(p._mins)}
                </div>
              </div>
              {p._level === "offline" && <span style={ds.warn}>⚠ offline</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s = {
  toolbar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  lastFetched: { fontSize: 12.5, color: "var(--ink-soft)" },
  mapWrap: {
    height: "65vh",
    minHeight: 420,
    borderRadius: "var(--radius)",
    overflow: "hidden",
    border: "1px solid var(--line)",
  },
  legend: {
    display: "flex",
    gap: 18,
    marginTop: 12,
    fontSize: 12.5,
    color: "var(--ink-soft)",
  },
  legendItem: { display: "flex", alignItems: "center", gap: 6 },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: "50%",
    display: "inline-block",
  },
};

// Dialog styles — deliberately distinct from the rest of the app chrome:
// dark header band + accent bar, so it reads as a "live status" popup rather
// than a generic modal.
const ds = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 26, 21, 0.55)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  card: {
    width: 340,
    maxWidth: "90vw",
    maxHeight: "70vh",
    overflow: "hidden",
    background: "#fff",
    borderRadius: 14,
    boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
    border: "1px solid rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 18px",
    background: "linear-gradient(135deg, #12261f, #1c3129)",
    borderBottom: "3px solid var(--teal, #0f7a6c)",
  },
  headerTitle: {
    color: "#fff",
    fontWeight: 700,
    fontSize: 15,
    fontFamily: "sans-serif",
  },
  headerSub: { color: "#9fb3ab", fontSize: 11.5, marginTop: 2 },
  closeBtn: {
    background: "rgba(255,255,255,0.12)",
    border: "none",
    color: "#fff",
    width: 26,
    height: 26,
    borderRadius: 7,
    cursor: "pointer",
    fontSize: 13,
  },
  list: { overflowY: "auto", padding: "6px 0" },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 18px",
    borderBottom: "1px solid #f0f2f0",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    flexShrink: 0,
    boxShadow: "0 0 0 3px rgba(0,0,0,0.04)",
  },
  name: {
    fontWeight: 600,
    fontSize: 13.5,
    color: "#1f2d27",
    fontFamily: "sans-serif",
  },
  meta: {
    fontSize: 11.5,
    color: "#6b7d74",
    textTransform: "capitalize",
    marginTop: 1,
  },
  warn: { fontSize: 10.5, color: "#c0392b", fontWeight: 600, flexShrink: 0 },
};
