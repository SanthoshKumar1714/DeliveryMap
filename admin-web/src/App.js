import React, { useState } from 'react';
import { isLoggedIn, getPartner, logout } from './utils/auth';
import LoginScreen from './components/LoginScreen';
import PartnersTab from './components/PartnersTab';
import LocationsTab from './components/LocationsTab';
import EditRequestsTab from './components/EditRequestsTab';
import SettingsTab from './components/SettingsTab';
import LiveMapTab from './components/LiveMapTab';

const NAV = [
  { key: 'locations', label: 'Locations', icon: '📍' },
    { key: 'live-map', label: 'Live map', icon: '🛰' },
  { key: 'partners', label: 'Partners', icon: '👥' },
  { key: 'edit-requests', label: 'Edit requests', icon: '✎' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

export default function App() {
  const [partner, setPartner] = useState(isLoggedIn() ? getPartner() : null);
  const [tab, setTab] = useState('locations');

  if (!partner) return <LoginScreen onLogin={setPartner} />;

  const handleLogout = () => {
    logout();
    setPartner(null);
  };

  return (
    <div style={s.shell}>
      <aside style={s.sidebar}>
        <div style={s.brand}>
          <span style={s.brandMark}>DropMap</span>
          <span style={s.brandSub}>Dispatch console</span>
        </div>

        <nav style={s.nav}>
          {NAV.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              style={s.navItem(tab === item.key)}
            >
              <span style={s.navIcon}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div style={s.sidebarFooter}>
          <div style={s.avatar}>{partner.name?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={s.who}>{partner.name}</div>
            <div style={s.role}>{partner.role.replace('_', ' ')}</div>
          </div>
          <button onClick={handleLogout} style={s.logoutBtn} title="Sign out">⏻</button>
        </div>
      </aside>

      <main style={s.content}>
        {tab === 'locations' && <LocationsTab />}
        {tab === 'live-map' && <LiveMapTab />}
        {tab === 'partners' && <PartnersTab />}
        {tab === 'edit-requests' && <EditRequestsTab />}
        {tab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
}

const s = {
  shell: { display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh', background: 'var(--paper)' },
  sidebar: { background: 'var(--sidebar)', display: 'flex', flexDirection: 'column', padding: '24px 16px' },
  brand: { padding: '4px 10px 28px' },
  brandMark: { display: 'block', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: '-0.01em' },
  brandSub: { display: 'block', fontSize: 12, color: '#7d9088', marginTop: 2 },
  nav: { display: 'flex', flexDirection: 'column', gap: 3, flex: 1 },
  navItem: (active) => ({
    display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
    background: active ? '#1c3129' : 'transparent',
    color: active ? '#fff' : '#a7b8b0',
    border: 'none', borderRadius: 8, padding: '10px 12px',
    fontSize: 14, fontWeight: 500, cursor: 'pointer',
    borderLeft: active ? '3px solid var(--teal)' : '3px solid transparent',
  }),
  navIcon: { fontSize: 15, width: 18, textAlign: 'center' },
  sidebarFooter: { display: 'flex', alignItems: 'center', gap: 10, borderTop: '1px solid var(--sidebar-line)', paddingTop: 16, marginTop: 12 },
  avatar: { width: 32, height: 32, borderRadius: '50%', background: 'var(--teal)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, flexShrink: 0 },
  who: { fontSize: 13, fontWeight: 600, color: '#eef3f0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  role: { fontSize: 11, color: '#7d9088', textTransform: 'capitalize' },
  logoutBtn: { background: 'transparent', border: '1px solid var(--sidebar-line)', color: '#a7b8b0', borderRadius: 7, width: 30, height: 30, cursor: 'pointer', fontSize: 14 },
  content: { padding: '32px 40px', overflowY: 'auto' },
};