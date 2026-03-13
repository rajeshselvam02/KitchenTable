import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/router";
import { useDark } from "../../context/DarkMode";

const RED = "#A42A04";

type Sub = {
  id: number; plan_type: string; meal_type: string;
  start_date: string; end_date: string; status: string;
  customer_name: string; customer_phone: string; customer_email: string;
  whatsapp_number: string; plan_price: number; auto_renew: boolean;
};

type Stats = {
  active: string; starter: string; weekly: string; monthly: string;
  new_today: string; new_this_week: string; new_this_month: string;
};

export default function SubscriptionsPage() {
  const { dark } = useDark();
  const router = useRouter();
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const card = dark ? "#13151a" : "#ffffff";
  const text = dark ? "#e8eaed" : "#1a1c21";
  const sub  = dark ? "#7a7f8e" : "#6b7280";
  const bdr  = dark ? "#1e2028" : "#e4e6ea";
  const hover= dark ? "#1a1c23" : "#f9fafb";

  const { data: stats } = useQuery<Stats>({
    queryKey: ["sub-stats"],
    queryFn: () => axios.get("/api/subscriptions/stats").then(r => r.data),
  });

  const { data, isLoading, isError } = useQuery<{ data: Sub[]; pagination: any }>({
    queryKey: ["subscriptions", planFilter, statusFilter],
    queryFn: () => axios.get("/api/subscriptions", {
      params: { plan: planFilter || undefined, status: statusFilter || undefined }
    }).then(r => r.data),
  });

  const planColor: Record<string, string> = {
    starter: "#f59e0b", weekly: "#3b82f6", monthly: "#10b981"
  };
  const statusColor: Record<string, string> = {
    active: "#10b981", inactive: "#6b7280", cancelled: "#ef4444", pending: "#f59e0b"
  };

  const statCards = [
    { label: "Active", value: stats?.active || "0", color: "#10b981" },
    { label: "New Today", value: stats?.new_today || "0", color: RED },
    { label: "This Week", value: stats?.new_this_week || "0", color: "#3b82f6" },
    { label: "This Month", value: stats?.new_this_month || "0", color: "#8b5cf6" },
    { label: "Starter", value: stats?.starter || "0", color: "#f59e0b" },
    { label: "Weekly", value: stats?.weekly || "0", color: "#3b82f6" },
    { label: "Monthly", value: stats?.monthly || "0", color: "#10b981" },
  ];

  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: "4px" }}>Subscriptions</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: text }}>{stats?.active || 0} Active Subscribers</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {statCards.map(s => (
          <div key={s.label} style={{ background: card, borderRadius: "12px", padding: "16px", border: `1px solid ${bdr}` }}>
            <div style={{ fontSize: "10px", color: sub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>{s.label}</div>
            <div style={{ fontSize: "24px", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
        {["", "starter", "weekly", "monthly"].map(p => (
          <button key={p} onClick={() => setPlanFilter(p)}
            style={{ padding: "6px 14px", borderRadius: "20px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: 500,
              background: planFilter === p ? RED : card, color: planFilter === p ? "#fff" : text }}>
            {p === "" ? "All Plans" : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
        <div style={{ width: "1px", background: bdr }} />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{ padding: "7px 14px", borderRadius: "20px", border: "1px solid " + bdr, background: card,
            color: text, fontSize: "13px", fontWeight: 500, cursor: "pointer", outline: "none" }}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div style={{ background: card, borderRadius: "16px", border: `1px solid ${bdr}`, overflow: "hidden" }}>
        {isLoading && <div style={{ padding: "40px", textAlign: "center", color: sub }}>Loading...</div>}
        {isError && <div style={{ padding: "20px", color: "#ef4444" }}>Failed to load subscriptions.</div>}
        {data?.data && (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: dark ? "#0e1015" : "#f4f5f7" }}>
                {["#", "Customer", "Plan", "Meals", "Period", "Price", "Status"].map(h => (
                  <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "0.8px", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.data.map((s) => (
                <tr key={s.id} onClick={() => router.push(`/subscriptions/${s.id}`)}
                  style={{ borderTop: `1px solid ${bdr}`, cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget.style.background = hover)}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "14px 16px", color: sub, fontSize: "13px" }}>{s.id}</td>
                  <td style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 600, color: text, fontSize: "14px" }}>{s.customer_name}</div>
                    <div style={{ fontSize: "12px", color: sub }}>{s.whatsapp_number || s.customer_phone}</div>
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                      background: `${planColor[s.plan_type]}20`, color: planColor[s.plan_type] }}>
                      {s.plan_type}
                    </span>
                  </td>
                  <td style={{ padding: "14px 16px", color: text, fontSize: "13px", textTransform: "capitalize" }}>{s.meal_type}</td>
                  <td style={{ padding: "14px 16px", fontSize: "12px", color: sub }}>
                    
                  </td>
                  <td style={{ padding: "14px 16px", color: text, fontSize: "13px" }}>
                    {s.plan_price ? `₹${s.plan_price}` : "—"}
                  </td>
                  <td style={{ padding: "14px 16px" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 600,
                      background: `${statusColor[s.status]}20`, color: statusColor[s.status] }}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {data.data.length === 0 && (
                <tr><td colSpan={7} style={{ padding: "40px", textAlign: "center", color: sub }}>No subscriptions found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
