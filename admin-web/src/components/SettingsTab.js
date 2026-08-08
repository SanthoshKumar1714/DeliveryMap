import React, { useState, useEffect } from 'react';
import { settingsAPI } from '../utils/api';
import { PageHeader } from './ui';

export default function SettingsTab() {
  const [approvalMode, setApprovalMode] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    settingsAPI.getApprovalMode().then((res) => setApprovalMode(res.data.approvalMode));
  }, []);

  const toggle = async () => {
    setBusy(true);
    try {
      const res = await settingsAPI.toggleApprovalMode();
      setApprovalMode(res.data.approvalMode);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" subtitle="Global rules that apply across the DropMap app." />

      <div style={s.card}>
        <div style={s.row}>
          <div>
            <div style={s.title}>Approval mode</div>
            <div style={s.desc}>
              When on, new locations and edits from regular delivery partners require admin
              sign-off before going live. Admin and head delivery partner changes are never
              affected.
            </div>
          </div>
          {approvalMode === null ? (
            <span style={{ color: 'var(--ink-soft)', fontSize: 13 }}>…</span>
          ) : (
            <button onClick={toggle} disabled={busy} style={s.switch(approvalMode)}>
              <span style={s.knob(approvalMode)} />
            </button>
          )}
        </div>
        {approvalMode !== null && (
          <div style={s.state(approvalMode)}>
            {approvalMode ? '🟢 Approval mode is ON' : '⚪ Approval mode is OFF'}
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  card: { maxWidth: 560, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', padding: '20px 22px' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 },
  title: { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 15, marginBottom: 6 },
  desc: { fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.5, maxWidth: 380 },
  switch: (on) => ({
    width: 44, height: 25, borderRadius: 999, border: 'none',
    background: on ? 'var(--teal)' : '#d8dcd9', position: 'relative', cursor: 'pointer', flexShrink: 0,
  }),
  knob: (on) => ({
    position: 'absolute', top: 3, left: on ? 22 : 3, width: 19, height: 19, borderRadius: '50%',
    background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)', transition: 'left 0.15s ease',
  }),
  state: (on) => ({
    marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)',
    fontSize: 12.5, fontWeight: 600, color: on ? 'var(--teal-deep)' : 'var(--ink-soft)',
  }),
};