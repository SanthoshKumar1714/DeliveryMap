import React, { useState, useEffect } from 'react';
import { editRequestAPI } from '../utils/api';
import { PageHeader, StatusBar, EmptyState, Btn } from './ui';

function DiffRow({ label, before, after }) {
  const changed = String(before ?? '') !== String(after ?? '');
  if (!changed) return null;
  return (
    <div style={s.diffRow}>
      <span style={s.diffLabel}>{label}</span>
      <span style={s.diffBefore}>{before || '—'}</span>
      <span style={s.diffArrow}>→</span>
      <span style={s.diffAfter}>{after || '—'}</span>
    </div>
  );
}

export default function EditRequestsTab() {
  const [requests, setRequests] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const res = await editRequestAPI.getPending();
    setRequests(res.data);
  };

  const approve = async (id) => { await editRequestAPI.approve(id); load(); };
  const reject = async (id) => {
    const reason = prompt('Rejection reason:');
    await editRequestAPI.reject(id, reason || '');
    load();
  };

  const deleteCount = requests.filter((r) => r.requestType === 'delete').length;
  const editCount = requests.length - deleteCount;

  return (
    <div>
      <PageHeader
        title="Edit requests"
        subtitle="Changes and delete requests submitted by delivery partners, awaiting your review."
        stats={[
          { label: 'Edits', value: editCount, color: 'var(--teal)' },
          { label: 'Deletes', value: deleteCount, color: 'var(--brick)' },
          { label: 'Total pending', value: requests.length, color: 'var(--amber)' },
        ]}
      />

      {requests.length === 0 ? (
        <EmptyState icon="✎" title="No pending edit requests" />
      ) : (
        <div style={s.list}>
          {requests.map((r) => {
            const loc = r.locationId;
            const isDelete = r.requestType === 'delete';
            return (
              <div key={r._id} style={s.card}>
                <StatusBar status={isDelete ? 'rejected' : 'pending'} />
                <div style={s.cardBody}>
                  <div style={s.top}>
                    <div style={s.topLeft}>
                      <span style={s.locName}>{loc?.name || 'Unknown location'}</span>
                      <span style={isDelete ? s.typeDelete : s.typeEdit}>
                        {isDelete ? 'Delete request' : 'Edit request'}
                      </span>
                    </div>
                    <span style={s.by}>by {r.requestedByName}</span>
                  </div>

                  {!isDelete && loc && (
                    <div style={s.diffBlock}>
                      <DiffRow label="Name" before={loc.name} after={r.proposedChanges?.name} />
                      <DiffRow label="Notes" before={loc.notes} after={r.proposedChanges?.notes} />
                      <DiffRow label="Unit" before={loc.unitNumber} after={r.proposedChanges?.unitNumber} />
                      <DiffRow label="House no." before={loc.houseNumber} after={r.proposedChanges?.houseNumber} />
                    </div>
                  )}

                  {isDelete && loc && (
                    <div style={s.deletePreview}>{loc.lat?.toFixed(5)}, {loc.lng?.toFixed(5)}</div>
                  )}

                  {r.reason && <div style={s.reason}>"{r.reason}"</div>}

                  <div style={s.actions}>
                    <Btn variant="approve" onClick={() => approve(r._id)}>✓ Approve</Btn>
                    <Btn variant="reject" onClick={() => reject(r._id)}>✕ Reject</Btn>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const s = {
  list: { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 640 },
  card: { display: 'flex', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  cardBody: { padding: '16px 18px', flex: 1 },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 },
  topLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  locName: { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 14.5 },
  typeEdit: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--teal-soft)', color: 'var(--teal-deep)', textTransform: 'uppercase', letterSpacing: '0.02em' },
  typeDelete: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'var(--brick-soft)', color: 'var(--brick)', textTransform: 'uppercase', letterSpacing: '0.02em' },
  by: { fontSize: 12, color: 'var(--ink-soft)' },
  diffBlock: { background: 'var(--paper)', borderRadius: 8, padding: '2px 12px' },
  diffRow: { display: 'grid', gridTemplateColumns: '80px 1fr 20px 1fr', alignItems: 'center', gap: 6, fontSize: 13, padding: '7px 0', borderBottom: '1px solid var(--line)' },
  diffLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--ink-soft)', fontWeight: 600 },
  diffBefore: { color: 'var(--brick)', textDecoration: 'line-through', opacity: 0.7 },
  diffArrow: { color: 'var(--ink-soft)', textAlign: 'center' },
  diffAfter: { color: 'var(--teal-deep)', fontWeight: 600 },
  deletePreview: { fontFamily: 'var(--font-mono)', fontSize: 12.5, color: 'var(--ink-soft)', background: 'var(--paper)', borderRadius: 8, padding: '8px 12px' },
  reason: { fontSize: 12.5, color: 'var(--ink-soft)', fontStyle: 'italic', marginTop: 10 },
  actions: { display: 'flex', gap: 8, marginTop: 14 },
};