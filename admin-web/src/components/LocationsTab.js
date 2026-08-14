import React, { useState, useEffect } from 'react';
import { locationAPI } from '../utils/api';
import { PageHeader, StatusBar, StatusChip, EmptyState, Btn } from './ui';
import EditLocationModal from './EditLocationModal';

export default function LocationsTab() {
  const [pending, setPending] = useState([]);
  const [allLocations, setAllLocations] = useState([]);
  const [tab, setTab] = useState('pending');
  const [editing, setEditing] = useState(null);
  
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadPending();
    loadAll();
  }, []);

  const loadPending = async () => {
    const res = await locationAPI.getPending();
    setPending(res.data);
  };

  const loadAll = async () => {
    const res = await locationAPI.getAll({ lat: 12.96, lng: 80.22, radius: 30 });
    setAllLocations(res.data);
  };

  const approve = async (id) => { await locationAPI.approve(id); loadPending(); loadAll(); };
  const reject = async (id) => {
    const reason = prompt('Rejection reason:');
    if (reason) { await locationAPI.reject(id, reason); loadPending(); }
  };
  const deleteLocation = async (id) => {
    if (window.confirm('Delete this location permanently?')) { await locationAPI.delete(id); loadAll(); }
  };
  const handleSaved = () => { setEditing(null); loadPending(); loadAll(); };

  const activeCount = allLocations.filter((l) => l.status === 'active').length;
  const rejectedCount = allLocations.filter((l) => l.status === 'rejected').length;
  const baseList = tab === 'pending' ? pending : allLocations;

const shown = search.trim()
  ? baseList.filter((loc) => {
      const q = search.trim().toLowerCase();
      return (
        loc.name?.toLowerCase().includes(q) ||
        loc.type?.toLowerCase().includes(q) ||
        loc.unitNumber?.toLowerCase?.().includes(q) ||
        loc.houseNumber?.toLowerCase?.().includes(q) ||
        loc.notes?.toLowerCase().includes(q) ||
        loc.customerPhones?.some((p) => p.includes(q))
      );
    })
  : baseList;

  return (
    <div>
      <PageHeader
        title="Locations"
        subtitle="Delivery points on the map — approve new drops or edit existing ones directly."
        stats={[
          { label: 'Pending', value: pending.length, color: 'var(--amber)' },
          { label: 'Active', value: activeCount, color: 'var(--teal)' },
          { label: 'Rejected', value: rejectedCount, color: 'var(--brick)' },
          { label: 'Total', value: allLocations.length },
        ]}
      />

      <div style={s.tabs}>
        <button onClick={() => setTab('pending')} style={s.tabBtn(tab === 'pending')}>
          Pending {pending.length > 0 && <span style={s.tabBadge}>{pending.length}</span>}
        </button>
        <button onClick={() => setTab('all')} style={s.tabBtn(tab === 'all')}>
          All locations
        </button>
      </div>

      <div style={s.searchWrap}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, type, unit, house no. or phone…"
          style={s.searchInput}
        />
        {search && (
          <button onClick={() => setSearch('')} style={s.searchClear} title="Clear search">✕</button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon="📍"
          title={
            search
              ? 'No locations match your search'
              : tab === 'pending' ? 'No locations awaiting approval' : 'No locations yet'
          }
          subtitle={
            search
              ? 'Try a different name, unit, or phone number.'
              : tab === 'pending' ? 'New drop points will show up here for review.' : undefined
          }
        />
      ) : (
        <div style={s.grid}>
          {shown.map((loc) => (
            <div key={loc._id} style={s.card}>
              <StatusBar status={loc.status} />
              <div style={s.cardBody}>
                <div style={s.cardTop}>
                  <div>
                    <div style={s.name}>{loc.name}</div>
                    <div style={s.type}>{loc.type}</div>
                  </div>
                  <StatusChip status={loc.status} />
                </div>

                <div style={s.rows}>
                  <div style={s.row}>
                    <span style={s.rowLabel}>Coords</span>
                    <span style={s.mono}>{loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</span>
                  </div>
                  {loc.unitNumber && (
                    <div style={s.row}><span style={s.rowLabel}>Unit</span><span>{loc.unitNumber}</span></div>
                  )}
                  {loc.houseNumber && (
                    <div style={s.row}><span style={s.rowLabel}>House no.</span><span>{loc.houseNumber}</span></div>
                  )}
                  {loc.customerPhones?.length > 0 && (
                    <div style={s.row}>
                      <span style={s.rowLabel}>Phone</span>
                      <span style={s.mono}>{loc.customerPhones.join(', ')}</span>
                    </div>
                  )}
                </div>

                {loc.notes && <div style={s.notes}>{loc.notes}</div>}

                <div style={s.actions}>
                  {loc.status === 'pending' ? (
                    <>
                      <Btn variant="approve" onClick={() => approve(loc._id)}>✓ Approve</Btn>
                      <Btn variant="reject" onClick={() => reject(loc._id)}>✕ Reject</Btn>
                      <Btn variant="neutral" onClick={() => setEditing(loc)}>Edit</Btn>
                    </>
                  ) : (
                    <>
                      <Btn variant="neutral" onClick={() => setEditing(loc)}>Edit</Btn>
                      <Btn variant="reject" onClick={() => deleteLocation(loc._id)}>Delete</Btn>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditLocationModal location={editing} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}

const s = {
  tabs: { display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--line)' },
  tabBtn: (active) => ({
    background: 'none', border: 'none', padding: '8px 4px 10px', marginRight: 22,
    fontSize: 13.5, fontWeight: 600, color: active ? 'var(--ink)' : 'var(--ink-soft)',
    cursor: 'pointer', borderBottom: active ? '2px solid var(--teal)' : '2px solid transparent',
    display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-body)',
  }),
  tabBadge: { background: 'var(--amber-soft)', color: 'var(--amber)', fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 999 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 },
  card: { display: 'flex', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  cardBody: { padding: '16px 18px', flex: 1, minWidth: 0 },
  cardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  name: { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15 },
  type: { fontSize: 11.5, color: 'var(--ink-soft)', textTransform: 'capitalize', marginTop: 1 },
  rows: { borderTop: '1px solid var(--line)', paddingTop: 8 },
  row: { display: 'flex', gap: 8, fontSize: 13, padding: '4px 0' },
  rowLabel: { color: 'var(--ink-soft)', minWidth: 70, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.02em', paddingTop: 1 },
  mono: { fontFamily: 'var(--font-mono)', fontSize: 12.5 },
  notes: { fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic', marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--line)' },
  actions: { display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' },searchWrap: { position: 'relative', marginBottom: 18, maxWidth: 420 },
  searchInput: {
    width: '100%', padding: '9px 34px 9px 12px', fontSize: 13.5,
    border: '1px solid var(--line)', borderRadius: 8, background: 'var(--panel)',
    color: 'var(--ink)', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box',
  },
  searchClear: {
    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13,
  },
};