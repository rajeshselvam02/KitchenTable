import { useEffect, useState } from "react";
import axios from "axios";
import { useDark } from "../context/DarkMode";

type Order = { id: number; customer_id: number; dish_id: number; quantity: number; status: string; total_price: number; created_at: string; };

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; next: string; nextLabel: string; nextColor: string }> = {
  pending:   { color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  icon: "bi-clock",        next: "preparing", nextLabel: "Start",   nextColor: "#fd7e14" },
  preparing: { color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  icon: "bi-fire",         next: "ready",     nextLabel: "Ready",   nextColor: "#3b82f6" },
  ready:     { color: "#8b5cf6", bg: "rgba(139,92,246,0.1)",  icon: "bi-check-circle", next: "delivered", nextLabel: "Deliver", nextColor: "#8b5cf6" },
  delivered: { color: "#10b981", bg: "rgba(16,185,129,0.1)",  icon: "bi-bag-check",    next: "",          nextLabel: "",        nextColor: "" },
};

export default function OrdersPage() {
  const { dark } = useDark();
  const card     = dark ? "#111827" : "white";
  const text     = dark ? "#f9fafb" : "#111827";
  const sub      = dark ? "#9ca3af" : "#6b7280";
  const bdr      = dark ? "#1f2937" : "#e9ecef";
  const rowHover = dark ? "#1f2937" : "#f9fafb";

  const [orders, setOrders]   = useState<Order[]>([]);
  const [filter, setFilter]   = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/orders").then(r => { setOrders(r.data); setLoading(false); });
  }, []);

  const updateStatus = async (id: number, next: string) => {
    await axios.patch(`/api/orders/${id}`, { status: next });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status: next } : o));
  };

  const filtered = filter === "all" ? orders : orders.filter(o => o.status === filter);
  const counts   = {
    all: orders.length,
    pending:   orders.filter(o => o.status === "pending").length,
    preparing: orders.filter(o => o.status === "preparing").length,
    ready:     orders.filter(o => o.status === "ready").length,
    delivered: orders.filter(o => o.status === "delivered").length,
  };

  return (
    <div>
      <div className="row g-3 mb-4">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => (
          <div className="col-6 col-md-3" key={status}>
            <div style={{ background: card, borderRadius: "14px", padding: "14px", border: `1px solid ${bdr}`, boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: cfg.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={`bi ${cfg.icon}`} style={{ color: cfg.color, fontSize: "16px" }}></i>
                </div>
                <div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: text, lineHeight: 1 }}>{counts[status as keyof typeof counts]}</div>
                  <div style={{ fontSize: "11px", color: sub, textTransform: "capitalize" }}>{status}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ background: card, borderRadius: "16px", border: `1px solid ${bdr}`, overflow: "hidden", boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${bdr}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
          <h6 style={{ margin: 0, fontWeight: 700, color: text }}>Live Order Queue</h6>
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {["all", "pending", "preparing", "ready", "delivered"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{ padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: filter === f ? "none" : `1px solid ${bdr}`, background: filter === f ? "#fd7e14" : "transparent", color: filter === f ? "white" : sub, cursor: "pointer", textTransform: "capitalize", transition: "all 0.2s" }}>
                {f} {f !== "all" && <span style={{ opacity: 0.7 }}>({counts[f as keyof typeof counts]})</span>}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-warning" /></div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: dark ? "#0f1117" : "#f9fafb" }}>
                  {["#", "Customer", "Dish", "Qty", "Amount", "Status", "Date", "Action"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", fontSize: "11px", fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: "1px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: "center", padding: "40px", color: sub }}>No orders found</td></tr>
                )}
                {filtered.map(o => {
                  const cfg = STATUS_CONFIG[o.status] || STATUS_CONFIG.delivered;
                  return (
                    <tr key={o.id} style={{ borderTop: `1px solid ${bdr}`, transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = rowHover}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: sub }}>#{o.id}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "linear-gradient(135deg, #fd7e14, #dc3545)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "white", flexShrink: 0 }}>{o.customer_name || `#${o.customer_id}`}</div>
                          <span style={{ fontSize: "13px", fontWeight: 500, color: text }}>Customer {o.customer_name || `#${o.customer_id}`}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", color: text }}>{o.dish_name || `Dish #${o.dish_id}`}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: text }}>{o.quantity}</td>
                      <td style={{ padding: "12px 16px", fontSize: "13px", fontWeight: 600, color: "#10b981" }}>₹{o.total_price ? Number(o.total_price).toFixed(2) : '—'}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, background: cfg.bg, color: cfg.color }}>
                          <i className={`bi ${cfg.icon}`}></i> {o.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: "12px", color: sub, whiteSpace: "nowrap" }}>
                        {new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {cfg.next && (
                          <button onClick={() => updateStatus(o.id, cfg.next)} style={{ padding: "5px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, background: cfg.nextColor, color: "white", border: "none", cursor: "pointer", transition: "opacity 0.2s", whiteSpace: "nowrap" }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = "0.85"}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = "1"}>
                            {cfg.nextLabel}
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
