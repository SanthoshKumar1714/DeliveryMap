import React from 'react';

export function PageHeader({ title, subtitle, stats }) {
  return (
    <div style={s.header}>
      <div style={s.headerTop}>
        <div>
          <h1 style={s.title}>{title}</h1>
          {subtitle && <p style={s.subtitle}>{subtitle}</p>}
        </div>
      </div>
      {stats && stats.length > 0 && (
        <div style={s.statStrip}>
          {stats.map((stat) => (
            <div key={stat.label} style={s.statCell}>
              <div style={{ ...s.statValue, color: stat.color || 'var(--ink)' }}>{stat.value}</div>
              <div style={s.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusBar({ status }) {
  const color = STATUS_COLORS[status] || '#c9c4b6';
  return <div style={{ ...s.statusBar, background: color }} />;
}

export function StatusChip({ status }) {
  const map = {
    pending: { bg: 'var(--amber-soft)', fg: 'var(--amber)', label: 'Pending' },
    active: { bg: 'var(--teal-soft)', fg: 'var(--teal)', label: 'Active' },
    approved: { bg: 'var(--teal-soft)', fg: 'var(--teal)', label: 'Approved' },
    rejected: { bg: 'var(--brick-soft)', fg: 'var(--brick)', label: 'Rejected' },
  };
  const c = map[status] || { bg: '#eee', fg: '#666', label: status };
  return <span style={{ ...s.chip, background: c.bg, color: c.fg }}>{c.label}</span>;
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div style={s.empty}>
      <div style={s.emptyIcon}>{icon}</div>
      <div style={s.emptyTitle}>{title}</div>
      {subtitle && <div style={s.emptySub}>{subtitle}</div>}
    </div>
  );
}

export function Btn({ children, onClick, variant = 'neutral', disabled, title }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title} style={s.btn(variant, disabled)}>
      {children}
    </button>
  );
}

const STATUS_COLORS = {
  pending: 'var(--amber)',
  active: 'var(--teal)',
  approved: 'var(--teal)',
  rejected: 'var(--brick)',
};

const s = {
  header: { marginBottom: 26 },
  headerTop: { marginBottom: 18 },
  title: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, margin: '0 0 4px', letterSpacing: '-0.01em' },
  subtitle: { margin: 0, fontSize: 13.5, color: 'var(--ink-soft)' },
  statStrip: { display: 'flex', gap: 0, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 'var(--radius)', overflow: 'hidden' },
  statCell: { flex: 1, padding: '14px 20px', borderRight: '1px solid var(--line)' },
  statValue: { fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 22 },
  statLabel: { fontSize: 11.5, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: 2 },
  statusBar: { width: 4, alignSelf: 'stretch', borderRadius: 3, flexShrink: 0 },
  chip: { display: 'inline-block', fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 999, textTransform: 'uppercase', letterSpacing: '0.02em' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', background: 'var(--panel)', border: '1px dashed var(--line)', borderRadius: 'var(--radius)', color: 'var(--ink-soft)' },
  emptyIcon: { fontSize: 30, marginBottom: 10, opacity: 0.5 },
  emptyTitle: { fontWeight: 600, color: 'var(--ink)', fontSize: 14.5 },
  emptySub: { fontSize: 13, marginTop: 4 },
  btn: (variant, disabled) => {
    const variants = {
      neutral: { bg: 'var(--panel)', fg: 'var(--ink)', border: 'var(--line)' },
      approve: { bg: 'var(--teal-soft)', fg: 'var(--teal-deep)', border: '#bfe0d7' },
      reject: { bg: 'var(--brick-soft)', fg: 'var(--brick)', border: '#f0c9c2' },
      primary: { bg: 'var(--teal)', fg: '#fff', border: 'var(--teal)' },
    };
    const v = variants[variant];
    return {
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: v.bg, color: v.fg, border: `1px solid ${v.border}`,
      borderRadius: 7, padding: '7px 13px', fontSize: 12.5, fontWeight: 600,
      cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1,
      fontFamily: 'var(--font-body)',
    };
  },
};