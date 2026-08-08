import React, { useState, useEffect } from "react";
import { partnerAPI } from "../utils/api";
import { PageHeader, StatusBar, StatusChip, EmptyState, Btn } from "./ui";

const ROLES = ["delivery", "head_delivery", "admin"];

export default function PartnersTab() {
  const [partners, setPartners] = useState([]);
  const [subTab, setSubTab] = useState("pending");

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    const res = await partnerAPI.getAll();
    setPartners(res.data);
  };

  const approve = async (id) => {
    await partnerAPI.approve(id);
    loadAll();
  };
  const reject = async (id) => {
    await partnerAPI.reject(id);
    loadAll();
  };
  const setRole = async (id, role) => {
    await partnerAPI.setRole(id, role);
    loadAll();
  };
  const remove = async (id, name) => {
    if (window.confirm(`Remove ${name}?`)) {
      try {
        await partnerAPI.delete(id);
        loadAll();
      } catch (err) {
        const data = err.response?.data;
        if (data?.canDisableInstead) {
          const disableInstead = window.confirm(
            `${data.error}\n\nDisable ${name} instead? This blocks their login but keeps all their data.`,
          );
          if (disableInstead) {
            await partnerAPI.disable(id);
            loadAll();
          }
        } else {
          alert(data?.error || "Failed to remove partner");
        }
      }
    }
  };
  const disable = async (id, name) => {
    if (
      window.confirm(
        `Disable ${name}'s access? They won't be able to log in, but their data stays intact.`,
      )
    ) {
      await partnerAPI.disable(id);
      loadAll();
    }
  };
  const enable = async (id) => {
    await partnerAPI.enable(id);
    loadAll();
  };
  const pending = partners.filter((p) => p.status === "pending");
  const approved = partners.filter(
    (p) => p.status === "approved" && !p.disabled,
  );
  const disabled = partners.filter((p) => p.disabled);
  const admins = partners.filter((p) => p.role === "admin").length;
  const shown = subTab === "pending" ? pending : partners;

  return (
    <div>
      <PageHeader
        title="Partners"
        subtitle="Approve delivery partner sign-ups and manage roles."
        stats={[
          { label: "Pending", value: pending.length, color: "var(--amber)" },
          { label: "Approved", value: approved.length, color: "var(--teal)" },
          { label: 'Disabled', value: disabled.length, color: 'var(--ink-soft)' },
          { label: "Admins", value: admins },
          { label: "Total", value: partners.length },
        ]}
      />

      <div style={s.tabs}>
        <button
          onClick={() => setSubTab("pending")}
          style={s.tabBtn(subTab === "pending")}
        >
          Pending{" "}
          {pending.length > 0 && (
            <span style={s.tabBadge}>{pending.length}</span>
          )}
        </button>
        <button
          onClick={() => setSubTab("all")}
          style={s.tabBtn(subTab === "all")}
        >
          All partners
        </button>
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon="👥"
          title={
            subTab === "pending"
              ? "No pending registrations"
              : "No partners yet"
          }
          subtitle={
            subTab === "pending" ? "New sign-ups will show up here." : undefined
          }
        />
      ) : (
        <div style={s.list}>
        {shown.map((p) => (
  <div key={p._id} style={{ ...s.row, ...(p.disabled ? s.rowDisabled : {}) }}>
    <StatusBar status={p.disabled ? 'rejected' : p.status === 'approved' ? 'active' : p.status} />
    <div style={s.rowBody}>
      <div style={s.avatar}>{p.name?.[0]?.toUpperCase()}</div>
      <div style={s.info}>
        <div style={s.name}>{p.name}</div>
        <div style={s.phone}>{p.phone}</div>
      </div>
      {p.disabled ? (
        <span style={s.disabledPill}>🚫 Disabled</span>
      ) : (
        <StatusChip status={p.status === 'approved' ? 'active' : p.status} />
      )}
      <div style={s.roleSlot}>
        {p.status === 'approved' && !p.disabled ? (
          <select value={p.role} onChange={(e) => setRole(p._id, e.target.value)} style={s.select}>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        ) : (
          <span style={s.rolePill}>{p.role.replace('_', ' ')}</span>
        )}
      </div>
      <div style={s.actions}>
        {p.status === 'pending' ? (
          <>
            <Btn variant="approve" onClick={() => approve(p._id)}>✓ Approve</Btn>
            <Btn variant="reject" onClick={() => reject(p._id)}>✕ Reject</Btn>
          </>
        ) : p.disabled ? (
          <Btn variant="approve" onClick={() => enable(p._id)}>Re-enable</Btn>
        ) : (
          <>
            <Btn variant="reject" onClick={() => disable(p._id, p.name)}>Disable</Btn>
            <Btn variant="reject" onClick={() => remove(p._id, p.name)}>Remove</Btn>
          </>
        )}
      </div>
    </div>
  </div>
))}
        </div>
      )}
    </div>
  );
}

const s = {
  tabs: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
    borderBottom: "1px solid var(--line)",
  },
  tabBtn: (active) => ({
    background: "none",
    border: "none",
    padding: "8px 4px 10px",
    marginRight: 22,
    fontSize: 13.5,
    fontWeight: 600,
    color: active ? "var(--ink)" : "var(--ink-soft)",
    cursor: "pointer",
    borderBottom: active ? "2px solid var(--teal)" : "2px solid transparent",
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "var(--font-body)",
  }),
  tabBadge: {
    background: "var(--amber-soft)",
    color: "var(--amber)",
    fontSize: 11,
    fontWeight: 700,
    padding: "1px 6px",
    borderRadius: 999,
  },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  row: {
    display: "flex",
    background: "var(--panel)",
    border: "1px solid var(--line)",
    borderRadius: "var(--radius)",
    overflow: "hidden",
  },
  rowBody: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "13px 18px",
    flex: 1,
    flexWrap: "wrap",
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    background: "var(--teal-soft)",
    color: "var(--teal-deep)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--font-display)",
    fontWeight: 600,
    fontSize: 14,
    flexShrink: 0,
  },
  info: { minWidth: 140 },
  name: { fontWeight: 600, fontSize: 14 },
  phone: {
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--ink-soft)",
    marginTop: 1,
  },
  roleSlot: { marginLeft: "auto" },
  select: {
    fontFamily: "var(--font-body)",
    fontSize: 12.5,
    fontWeight: 600,
    padding: "6px 9px",
    borderRadius: 7,
    border: "1px solid var(--line)",
    background: "var(--paper)",
    textTransform: "capitalize",
  },
  rolePill: {
    fontSize: 11.5,
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: 999,
    background: "#eef1ef",
    color: "var(--ink-soft)",
    border: "1px solid var(--line)",
    textTransform: "capitalize",
  },
  actions: { display: "flex", gap: 8 },
  rowDisabled: { opacity: 0.55 },
disabledPill: { fontSize: 11.5, fontWeight: 600, padding: '3px 9px', borderRadius: 999, background: '#fdecea', color: '#c0392b', border: '1px solid #f3c6c1' },
};
