import React from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useDark } from "../context/DarkMode";
import { AnalyticsChart } from "../components/AnalyticsChart";

const RED = "#A42A04";
const RED_SOFT = "rgba(164,42,4,0.1)";

type Summary = { revenue: any[]; prepTime: any[]; waste: any[] };

export default function Dashboard() {
  const { dark } = useDark();
  const card   = dark ? "#13151a" : "#ffffff";
  const text   = dark ? "#e8eaed" : "#1a1c21";
  const sub    = dark ? "#7a7f8e" : "#6b7280";
  const bdr    = dark ? "#1e2028" : "#e4e6ea";
  const rowBg  = dark ? "#1a1c23" : "#f4f5f7";

  const { data, isLoading } = useQuery<Summary>({
  queryKey: ["analyticsSummary"],
  queryFn: () => axios.get("/api/analytics/summary").then(r => r.data),
  });
  const { data: orders } = useQuery<any[]>({
  queryKey: ["orderStats"],
  queryFn: () => axios.get("/api/orders").then(r => r.data),
  });
  const { data: customers } = useQuery<any[]>({
  queryKey: ["customerStats"],
  queryFn: () => axios.get("/api/customers").then(r => r.data.data),
  });

  const totalRevenue   = data?.revenue.reduce((s, r) => s + Number(r.revenue), 0) || 0;
  const totalOrders    = orders?.length || 0;
  const totalCustomers = customers?.length || 0;
  const pendingOrders  = orders?.filter((o: any) => o.status === "pending").length || 0;

  const stats = [
    { label: "Total Revenue",  value: "Rs." + totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 }), icon: "bi-currency-rupee", change: "+12.5%", up: true,  color: "#10b981" },
    { label: "Total Orders",   value: totalOrders,    icon: "bi-list-check",      change: "+8.2%",  up: true,  color: RED },
    { label: "Customers",      value: totalCustomers, icon: "bi-people",          change: "+3.1%",  up: true,  color: "#3b82f6" },
    { label: "Pending Orders", value: pendingOrders,  icon: "bi-hourglass-split", change: "-2 today", up: false, color: "#f59e0b" },
  ];

  if (isLoading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", gap: "10px" }}>
      <div className="spinner-border spinner-border-sm" style={{ color: RED }} role="status" />
      <span style={{ color: sub, fontSize: "13px" }}>Loading dashboard...</span>
    </div>
  );

const revSeries   = data?.revenue.map(r  => ({ day: r.day, value: Number(r.revenue) }))   ?? [];
const prepSeries  = data?.prepTime.map(p => ({ day: p.day, value: Number(p.delivered) })) ?? [];
const wasteSeries = data?.waste.map(w => ({ day: w.day, value: Number(w.skip_rate) })) ?? [];

  return (
    <div>
      {/* Stat cards */}
      <div className="row g-3 mb-4">
        {stats.map(s => (
          <div className="col-6 col-xl-3" key={s.label}>
            <div style={{ background: card, borderRadius: "8px", padding: "16px", border: `1px solid ${bdr}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "10px", color: sub, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: "8px" }}>{s.label}</div>
                  <div style={{ fontSize: "22px", fontWeight: 700, color: text, letterSpacing: "-0.5px", lineHeight: 1 }}>{s.value}</div>
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <i className={"bi " + (s.up ? "bi-arrow-up-right" : "bi-arrow-down-right")} style={{ fontSize: "10px", color: s.up ? "#10b981" : "#ef4444" }}></i>
                    <span style={{ fontSize: "11px", color: s.up ? "#10b981" : "#ef4444", fontWeight: 600 }}>{s.change}</span>
                  </div>
                </div>
                <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <i className={"bi " + s.icon} style={{ fontSize: "16px", color: s.color }}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row g-3">
        <div className="col-12">
          <div style={{ background: card, borderRadius: "8px", padding: "18px", border: `1px solid ${bdr}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "4px" }}>Revenue</div>
            <div style={{ fontSize: "13px", color: text, marginBottom: "14px" }}>Last 30 days</div>
            <AnalyticsChart series={revSeries} title="" yLabel="INR" color="#10b981" />
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div style={{ background: card, borderRadius: "8px", padding: "18px", border: `1px solid ${bdr}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "4px" }}>Avg Prep Time</div>
            <div style={{ fontSize: "13px", color: text, marginBottom: "14px" }}>Delivered per day</div>
            <AnalyticsChart series={prepSeries} title="" yLabel="deliveries" color={RED} />
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div style={{ background: card, borderRadius: "8px", padding: "18px", border: `1px solid ${bdr}` }}>
            <div style={{ fontSize: "11px", fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: "1.2px", marginBottom: "4px" }}>Food Waste Cost</div>
            <div style={{ fontSize: "13px", color: text, marginBottom: "14px" }}>Daily skip rate (%)</div>
            <AnalyticsChart series={wasteSeries} title="" yLabel="%" color="#f59e0b" />
          </div>
        </div>
      </div>
    </div>
  );
}
