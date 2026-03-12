import { useEffect, useState } from "react";
import axios from "axios";
import { useDark } from "../context/DarkMode";

const RED = "#A42A04";

type Order = { id: number; customer_name: string; dish_name: string; quantity: number; status: string; total_price: number; created_at: string; };

const STATUS: Record<string, { label: string; color: string; bg: string; next: string; nextLabel: string }> = {
  pending:   { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  next: "preparing", nextLabel: "Start Prep" },
  preparing: { label: "Preparing", color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  next: "ready",     nextLabel: "Mark Ready" },
  ready:     { label: "Ready",     color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  next: "delivered", nextLabel: "Deliver" },
  delivered: { label: "Delivered", color: "#10b981", bg: "rgba(16,185,129,0.1)",  next: "",          nextLabel: "" },
};

export default function OrdersPage() {
  const { dark } = useDark();
  const card    = dark ? "#13151a" : "#ffffff";
  const text    = dark ? "#e8eaed" : "#1a1c21";
  const sub     = dark ? "#7a7f8e" : "#6b7280";
  const bdr     = dark ? "#1e2028" : "#e4e6ea";
  const hdr     = dark ? "#0e1015" : "#f4f5f7";
  const hover   = dark ? "#1a1c23" : "#f9fafb";

  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/orders").then(r => { setOrders(r.data); setLoading(false); });
  }, []);

  const update = async (id: number, next: string) => {
    await axios.patch("/api/orders/" + id, { status: next });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next } : o));
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const counts   = { all: orders.length, pending: 0, preparing: 0, ready: 0, delivered: 0 };
  orders.forEach(o => { if (o.status in counts) (counts as any)[o.status]++; });

  const statCards = [
    { key: "pending",   label: "Pending",   icon: "bi-clock",        color: "#f59e0b" },
    { key: "preparing", label: "Preparing", icon: "bi-fire",         color: "#3b82f6" },
    { key: "ready",     label: "Ready",     icon: "bi-check2-circle",color: "#8b5cf6" },
    { key: "delivered", label: "Delivered", icon: "bi-bag-check",    color: "#10b981" },
  ];

  return (
    <div>
      {/* Stat row */}
      <div className="row g-3 mb-4">
        {statCards.map(s => (
          <div className="col-6 col-md-3" key={s.key}>
            <div style={{ background: card, borderRadius: "8px", padding: "14px 16px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "34px", height: "34px", borderRadius: "6px", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={"bi " + s.icon} style={{ fontSize: "15px", color: s.color }}></i>
              </div>
              <div>
                <div style={{ fontSize: "20px", fontWeight: 700, color: text, lineHeight: 1 }}>{(counts as any)[s.key]}</div>
                <div style={{ fontSize: "10px", color: sub, textTransform: "uppercase", letterSpacing: "1px", marginTop: "2px" }}>{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div style={{ background: card, borderRadius: "8px", border: `1px solid ${bdr}` }}>
        {/* Table toolbar */}
        <div style={{ padding: "14px 16px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: text }}>Order Queue</span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            {["all", "pending", "preparing", "ready", "delivered"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, cursor: "pointer",
                border: `1px solid ${filter === f ? RED : bdr}`,
                background: filter === f ? RED : "transparent",
                color: filter === f ? "white" : sub,
                textTransform: "capitalize", transition: "all 0.15s",
              }}>
                {f} {f !== "all" && <span style={{ opacity: 0.7 }}>({(counts as any)[f]})</span>}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "48px", gap: "10px" }}>
            <div className="spinner-border spinner-border-sm" style={{ color: RED }} />
            <span style={{ color: sub, fontSize: "13px" }}>Loading orders...</span>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: hdr }}>
                  {["ID", "Customer", "Dish", "Qty", "Status", "Date", "Action"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: "10px", fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: "1.2px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: "center", padding: "40px", color: sub, fontSize: "13px" }}>No orders in this category</td></tr>
                )}
                {filtered.map(o => {
                  const s = STATUS[o.status] || STATUS.delivered;
                  return (
                    <tr key={o.id} style={{ borderTop: `1px solid ${bdr}` }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hover}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td style={{ padding: "11px 14px", fontSize: "12px", color: sub, fontFamily: "monospace" }}>#{o.id}</td>
                      <td style={{ padding: "11px 14px", fontSize: "13px", fontWeight: 500, color: text }}>{o.customer_name || "—"}</td>
                      <td style={{ padding: "11px 14px", fontSize: "13px", color: text }}>{o.dish_name || "—"}</td>
                      <td style={{ padding: "11px 14px", fontSize: "13px", fontWeight: 600, color: text }}>{o.quantity}</td>
                      <td style={{ padding: "11px 14px" }}>
                        <span style={{ display: "inline-block", padding: "3px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                      </td>
                      <td style={{ padding: "11px 14px", fontSize: "12px", color: sub, whiteSpace: "nowrap" }}>
                        {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                      <td style={{ padding: "11px 14px" }}>
                        {s.next && (
                          <button onClick={() => update(o.id, s.next)} style={{ padding: "5px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: 600, background: RED, color: "white", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                            {s.nextLabel}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
