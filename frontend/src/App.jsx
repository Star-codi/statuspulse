import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

const STATUS_CONFIG = {
  operational: { label: "Operational",  color: "#22c55e", dot: "●" },
  degraded:    { label: "Degraded",     color: "#f59e0b", dot: "●" },
  down:        { label: "Down",         color: "#ef4444", dot: "●" },
};

const SEVERITY_COLOR = {
  minor:    "#f59e0b",
  major:    "#f97316",
  critical: "#ef4444",
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.operational;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 10px", borderRadius: 20,
      background: cfg.color + "18", color: cfg.color,
      fontSize: 12, fontWeight: 600, fontFamily: "monospace"
    }}>
      <span style={{ fontSize: 8 }}>{cfg.dot}</span>
      {cfg.label}
    </span>
  );
}

function OverallBanner({ services }) {
  const hasDown     = services.some(s => s.status === "down");
  const hasDegraded = services.some(s => s.status === "degraded");
  const allGood     = !hasDown && !hasDegraded;

  const cfg = hasDown
    ? { msg: "Major outage detected", color: "#ef4444", bg: "#ef444410" }
    : hasDegraded
    ? { msg: "Some services are degraded", color: "#f59e0b", bg: "#f59e0b10" }
    : { msg: "All systems operational", color: "#22c55e", bg: "#22c55e10" };

  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.color}30`,
      borderRadius: 12, padding: "18px 24px",
      display: "flex", alignItems: "center", gap: 12, marginBottom: 32
    }}>
      <span style={{ fontSize: 22 }}>{hasDown ? "🔴" : hasDegraded ? "🟡" : "🟢"}</span>
      <div>
        <div style={{ color: cfg.color, fontWeight: 700, fontSize: 16 }}>{cfg.msg}</div>
        <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 2 }}>
          Last checked: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ svc, onStatusChange }) {
  const [changing, setChanging] = useState(false);

  const cycle = async () => {
    const next = { operational: "degraded", degraded: "down", down: "operational" };
    setChanging(true);
    await fetch(`${API}/api/services/${svc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next[svc.status] })
    });
    onStatusChange();
    setChanging(false);
  };

  return (
    <div style={{
      background: "#1e293b", borderRadius: 10, padding: "16px 20px",
      display: "flex", justifyContent: "space-between", alignItems: "center",
      border: "1px solid #334155", transition: "border-color 0.2s"
    }}>
      <div>
        <div style={{ fontWeight: 600, color: "#f1f5f9", fontSize: 15 }}>{svc.name}</div>
        <div style={{ color: "#64748b", fontSize: 11, marginTop: 3 }}>
          Updated {new Date(svc.updated).toLocaleString()}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StatusBadge status={svc.status} />
        <button onClick={cycle} disabled={changing} style={{
          background: "#334155", border: "none", color: "#94a3b8",
          borderRadius: 6, padding: "5px 10px", cursor: "pointer",
          fontSize: 11
        }}>
          {changing ? "..." : "Toggle"}
        </button>
      </div>
    </div>
  );
}

function IncidentForm({ services, onCreated }) {
  const [form, setForm] = useState({ service_id: "", title: "", description: "", severity: "minor" });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!form.service_id || !form.title) return;
    setLoading(true);
    await fetch(`${API}/api/incidents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, service_id: parseInt(form.service_id) })
    });
    setForm({ service_id: "", title: "", description: "", severity: "minor" });
    onCreated();
    setLoading(false);
  };

  const inp = { background: "#1e293b", border: "1px solid #334155", borderRadius: 8,
    color: "#f1f5f9", padding: "10px 14px", fontSize: 13, width: "100%", boxSizing: "border-box" };

  return (
    <div style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 12, padding: 24, marginBottom: 32 }}>
      <div style={{ color: "#94a3b8", fontWeight: 700, fontSize: 13, letterSpacing: 1, marginBottom: 16 }}>
        REPORT INCIDENT
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        <select value={form.service_id} onChange={e => setForm(f => ({...f, service_id: e.target.value}))} style={inp}>
          <option value="">Select service...</option>
          {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={form.severity} onChange={e => setForm(f => ({...f, severity: e.target.value}))} style={inp}>
          <option value="minor">Minor</option>
          <option value="major">Major</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <input placeholder="Incident title..." value={form.title}
        onChange={e => setForm(f => ({...f, title: e.target.value}))}
        style={{ ...inp, marginBottom: 12 }} />
      <textarea placeholder="Description (optional)..." value={form.description}
        onChange={e => setForm(f => ({...f, description: e.target.value}))}
        rows={2} style={{ ...inp, resize: "vertical", marginBottom: 12 }} />
      <button onClick={submit} disabled={loading || !form.title || !form.service_id} style={{
        background: "#6366f1", color: "#fff", border: "none", borderRadius: 8,
        padding: "10px 20px", fontWeight: 600, cursor: "pointer", fontSize: 13
      }}>
        {loading ? "Reporting..." : "Report Incident"}
      </button>
    </div>
  );
}

function IncidentRow({ inc, services }) {
  const svc = services.find(s => s.id === inc.service_id);
  const sev = inc.severity;
  return (
    <div style={{
      background: "#1e293b", borderRadius: 10, padding: "14px 20px",
      border: `1px solid ${SEVERITY_COLOR[sev]}30`, marginBottom: 8
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{
            background: SEVERITY_COLOR[sev] + "20", color: SEVERITY_COLOR[sev],
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
            marginRight: 8, textTransform: "uppercase", fontFamily: "monospace"
          }}>{sev}</span>
          <span style={{ color: "#f1f5f9", fontWeight: 600, fontSize: 14 }}>{inc.title}</span>
        </div>
        <span style={{
          color: inc.status === "resolved" ? "#22c55e" : "#f59e0b",
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          fontFamily: "monospace"
        }}>{inc.status}</span>
      </div>
      <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
        {svc?.name} · {new Date(inc.created_at).toLocaleString()}
        {inc.description && <span> · {inc.description}</span>}
      </div>
    </div>
  );
}

export default function App() {
  const [services,  setServices]  = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [tab, setTab]             = useState("status");

  const load = useCallback(async () => {
    const [s, i] = await Promise.all([
      fetch(`${API}/api/services`).then(r => r.json()),
      fetch(`${API}/api/incidents`).then(r => r.json()),
    ]);
    setServices(s);
    setIncidents(i);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 15000); // auto-refresh every 15s
    return () => clearInterval(t);
  }, [load]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0f1e",
      fontFamily: "'Inter', system-ui, sans-serif", color: "#f1f5f9"
    }}>
      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1e293b", padding: "0 40px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        height: 60, background: "#0d1526"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>⚡</span>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5, color: "#fff" }}>
            Status<span style={{ color: "#6366f1" }}>Pulse</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["status", "incidents"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              background: tab === t ? "#1e293b" : "transparent",
              border: "none", color: tab === t ? "#f1f5f9" : "#64748b",
              padding: "6px 16px", borderRadius: 8, cursor: "pointer",
              fontWeight: 600, fontSize: 13, textTransform: "capitalize"
            }}>{t}</button>
          ))}
        </div>
        <div style={{ color: "#334155", fontSize: 11, fontFamily: "monospace" }}>
          auto-refresh 15s
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "40px 24px" }}>
        {tab === "status" && (
          <>
            <OverallBanner services={services} />
            <div style={{ color: "#64748b", fontWeight: 700, fontSize: 12,
              letterSpacing: 1, marginBottom: 12 }}>SERVICES ({services.length})</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {services.map(s => (
                <ServiceCard key={s.id} svc={s} onStatusChange={load} />
              ))}
            </div>
          </>
        )}

        {tab === "incidents" && (
          <>
            <IncidentForm services={services} onCreated={load} />
            <div style={{ color: "#64748b", fontWeight: 700, fontSize: 12,
              letterSpacing: 1, marginBottom: 12 }}>INCIDENT HISTORY ({incidents.length})</div>
            {incidents.length === 0
              ? <div style={{ color: "#334155", textAlign: "center", padding: 40 }}>No incidents reported yet</div>
              : incidents.map(i => <IncidentRow key={i.id} inc={i} services={services} />)
            }
          </>
        )}
      </div>
    </div>
  );
}
