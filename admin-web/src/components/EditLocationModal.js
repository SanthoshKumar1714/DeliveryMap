import React, { useState } from 'react';
import { locationAPI } from '../utils/api';

export default function EditLocationModal({ location, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: location.name || '',
    unitNumber: location.unitNumber || '',
    houseNumber: location.houseNumber || '',
    notes: location.notes || '',
    customerPhones: (location.customerPhones || []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await locationAPI.update(location._id, {
        name: form.name,
        unitNumber: form.unitNumber || undefined,
        houseNumber: form.houseNumber || undefined,
        notes: form.notes || undefined,
        customerPhones: form.customerPhones
          ? form.customerPhones.split(',').map((p) => p.trim()).filter(Boolean)
          : [],
      });
      onSaved();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <form style={s.modal} onClick={(e) => e.stopPropagation()} onSubmit={handleSave}>
        <div style={s.header}>
          <div>
            <div style={s.title}>Edit location</div>
            <div style={s.coords}>{location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}</div>
          </div>
          <button type="button" onClick={onClose} style={s.closeBtn}>✕</button>
        </div>

        {location.status === 'active' && (
          <div style={s.notice}>
            If approval mode is on, saving will move this location back to Pending until re-approved.
          </div>
        )}

        <label style={s.label}>Name</label>
        <input style={s.input} value={form.name} onChange={set('name')} required />

        <div style={s.row2}>
          <div>
            <label style={s.label}>Unit number</label>
            <input style={s.input} value={form.unitNumber} onChange={set('unitNumber')} />
          </div>
          <div>
            <label style={s.label}>House number</label>
            <input style={s.input} value={form.houseNumber} onChange={set('houseNumber')} />
          </div>
        </div>

        <label style={s.label}>Customer phone(s)</label>
        <input
          style={{ ...s.input, fontFamily: 'var(--font-mono)' }}
          value={form.customerPhones}
          onChange={set('customerPhones')}
          placeholder="comma-separated, e.g. 9840012345, 9840099999"
        />

        <label style={s.label}>Notes</label>
        <textarea style={s.textarea} value={form.notes} onChange={set('notes')} rows={3} />

        {error && <div style={s.error}>{error}</div>}

        <div style={s.actions}>
          <button type="button" onClick={onClose} style={s.cancelBtn}>Cancel</button>
          <button type="submit" disabled={saving} style={s.saveBtn}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  );
}

const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(18,24,26,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 },
  modal: { background: 'var(--panel)', borderRadius: 14, padding: '24px 26px', width: 440, maxWidth: '100%', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 12px 32px rgba(18,24,26,0.25)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 17 },
  coords: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 },
  closeBtn: { background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 7, width: 28, height: 28, cursor: 'pointer', fontSize: 13, color: 'var(--ink-soft)' },
  notice: { fontSize: 12.5, background: 'var(--amber-soft)', color: '#8a5a13', borderRadius: 8, padding: '9px 12px', marginBottom: 16, lineHeight: 1.5 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', margin: '0 0 6px' },
  input: { width: '100%', padding: '9px 11px', marginBottom: 14, border: '1px solid var(--line)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-body)', background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px 11px', marginBottom: 6, border: '1px solid var(--line)', borderRadius: 8, fontSize: 13.5, fontFamily: 'var(--font-body)', background: 'var(--paper)', color: 'var(--ink)', boxSizing: 'border-box', resize: 'vertical' },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  error: { fontSize: 13, color: 'var(--brick)', background: 'var(--brick-soft)', borderRadius: 8, padding: '8px 10px', marginTop: 6, marginBottom: 4 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
  cancelBtn: { padding: '9px 16px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: 'var(--ink-soft)' },
  saveBtn: { padding: '9px 18px', background: 'var(--teal)', border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', color: '#fff' },
};