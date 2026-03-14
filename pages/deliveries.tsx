import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useDark } from "../context/DarkMode";

const RED = "#A42A04";
type Delivery = {
  id: number; delivery_date: string; meal_type: string; status: string;
  customer_name: string; customer_phone: string; customer_address: string;
  dish_name: string; plan_type: string; porter_order_id: string;
  rider_name: string; rider_phone: string;
};
const SC: Record<string, { color: string; next: string; nextLabel: string }> = {
  pending:          { color: "#f59e0b", next: "preparing",        nextLabel: "Start Prep" },
  preparing:        { color: "#3b82f6", next: "ready",            nextLabel: "Mark Ready" },
  ready:            { color: "#8b5cf6", next: "out_for_delivery", nextLabel: "Dispatch" },
  out_for_delivery: { color: "#f97316", next: "delivered",        nextLabel: "Delivered" },
  delivered:        { color: "#10b981", next: "",                 nextLabel: "" },
  failed:           { color: "#ef4444", next: "",                 nextLabel: "" },
};
export default function DeliveriesPage() {
  const { dark } = useDark();
  const qc = useQueryClient();
  const [date, setDate] = useState(() => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); });
  const [mealFilter, setMealFilter] = useState("all");
  const card  = dark ? "#13151a" : "#ffffff";
  const text  = dark ? "#e8eaed" : "#1a1c21";
  const sub   = dark ? "#7a7f8e" : "#6b7280";
  const bdr   = dark ? "#1e2028" : "#e4e6ea";
  const hover = dark ? "#1a1c23" : "#f9fafb";
  const { data: deliveries = [], isLoading, refetch } = useQuery<Delivery[]>({
    queryKey: ["deliveries", date],
    queryFn: () => axios.get("/api/deliveries", { params: { date } }).then(r => r.data),
  });
  const genMut = useMutation({
    mutationFn: () => axios.post("/api/deliveries/generate?date=" + date),
    onSuccess: () => refetch(),
  });
  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      axios.patch("/api/deliveries/" + id + "/status", { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries", date] }),
  });
  const porterMut = useMutation({
    mutationFn: (id: number) => axios.post("/api/deliveries/" + id + "/porter"),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["deliveries", date] }),
  });
  const filtered = mealFilter === "all" ? deliveries : deliveries.filter(d => d.meal_type === mealFilter);
  const counts = {
    total: deliveries.length,
    lunch: deliveries.filter(d => d.meal_type === "lunch").length,
    dinner: deliveries.filter(d => d.meal_type === "dinner").length,
    pending: deliveries.filter(d => d.status === "pending").length,
    delivered: deliveries.filter(d => d.status === "delivered").length,
  };
  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: "4px" }}>Daily Deliveries</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: text }}>{counts.total} Deliveries</div>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid " + bdr, background: card, color: text, fontSize: "13px" }} />
          <button onClick={() => genMut.mutate()} disabled={genMut.isPending}
            style={{ padding: "8px 16px", borderRadius: "8px", background: RED, color: "#fff", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
            {genMut.isPending ? "Generating..." : "Generate"}
          </button>
          <button onClick={async () => {
            const token = localStorage.getItem("backendToken");
            const res = await fetch(`/api/raw-materials/export?date=${date}`, {
              headers: { Authorization: "Bearer " + token }
            });
            if (res.ok) {
              const blob = await res.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = `raw-materials-${date}.xlsx`; a.click();
            } else { alert("Export failed: " + res.status); }
          }}
            style={{ padding: "8px 16px", borderRadius: "8px", background: "#10b981", color: "#fff", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
            ⬇ XLSX
          </button>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total",     value: counts.total,     color: text },
          { label: "Lunch",     value: counts.lunch,     color: "#f59e0b" },
          { label: "Dinner",    value: counts.dinner,    color: "#8b5cf6" },
          { label: "Pending",   value: counts.pending,   color: "#f59e0b" },
          { label: "Delivered", value: counts.delivered, color: "#10b981" },
        ].map(s => (
          <div key={s.label} style={{ background: card, borderRadius: "12px", padding: "14px", border: "1px solid " + bdr, textAlign: "center" }}>
            <div style={{ fontSize: "10px", color: sub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{s.label}</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
        {["all", "lunch", "dinner"].map(m => (
          <button key={m} onClick={() => setMealFilter(m)}
            style={{ padding: "6px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
              background: mealFilter === m ? RED : card, color: mealFilter === m ? "#fff" : text }}>
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>
      <div style={{ background: card, borderRadius: "16px", border: "1px solid " + bdr, overflow: "auto" }}>
        {isLoading && <div style={{ padding: "40px", textAlign: "center", color: sub }}>Loading...</div>}
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: sub }}>
            No deliveries for {date}.<br />Click <b>Generate</b> to create from active subscriptions.
          </div>
        )}
        {filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filtered.map(d => {
              const sc = SC[d.status] || SC.pending;
              return (
                <div key={d.id} style={{ padding: "14px 16px", borderRadius: "12px", background: card, border: "1px solid " + bdr }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                    <div>
                      <div style={{ fontWeight: 600, color: text, fontSize: "14px" }}>{d.customer_name} <span style={{ color: sub, fontSize: "12px", fontWeight: 400 }}>#{d.id}</span></div>
                      <div style={{ fontSize: "12px", color: sub, marginTop: "2px" }}>{d.customer_phone}</div>
                      <div style={{ fontSize: "11px", color: sub, marginTop: "2px" }}>{d.customer_address}</div>
                    </div>
                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                      background: sc.color + "20", color: sc.color, textTransform: "capitalize", whiteSpace: "nowrap" }}>
                      {d.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "10px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                      background: d.meal_type === "lunch" ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.15)",
                      color: d.meal_type === "lunch" ? "#f59e0b" : "#8b5cf6", textTransform: "capitalize" }}>
                      {d.meal_type}
                    </span>
                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                      background: d.plan_type === "starter" ? "rgba(245,158,11,0.15)" : d.plan_type === "monthly" ? "rgba(16,185,129,0.15)" : "rgba(59,130,246,0.15)",
                      color: d.plan_type === "starter" ? "#f59e0b" : d.plan_type === "monthly" ? "#10b981" : "#3b82f6" }}>
                      {d.plan_type}
                    </span>
                    <span style={{ color: text, fontSize: "13px" }}>{d.dish_name || "—"}</span>
                    {d.rider_name && <span style={{ fontSize: "11px", color: sub }}>Rider: {d.rider_name}</span>}
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {sc.next && (
                      <button onClick={() => statusMut.mutate({ id: d.id, status: sc.next })}
                        style={{ padding: "6px 12px", borderRadius: "8px", background: sc.color, color: "#fff", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
                        {sc.nextLabel}
                      </button>
                    )}
                    {d.status === "ready" && !d.porter_order_id && (
                      <button onClick={() => porterMut.mutate(d.id)}
                        style={{ padding: "6px 12px", borderRadius: "8px", background: "#1e293b", color: "#fff", border: "none", cursor: "pointer", fontSize: "12px" }}>
                        Porter
                      </button>
                    )}
                    {d.porter_order_id && (
                      <span style={{ fontSize: "11px", color: sub }}>Porter ID: {d.porter_order_id.slice(0, 10)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
