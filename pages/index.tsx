import { useQuery } from "react-query";
import axios from "axios";
import { AnalyticsChart } from "../components/AnalyticsChart";
import { useDark } from "../context/DarkMode";

type RevenuePoint = { day: string; revenue: number };
type PrepPoint    = { day: string; avgPrepSecs: number };
type WastePoint   = { day: string; wasteCost: number };
type Summary = { revenue: RevenuePoint[]; prepTime: PrepPoint[]; waste: WastePoint[] };

export default function Dashboard() {
  const { dark } = useDark();
  const card = dark ? "#111827" : "white";
  const text = dark ? "#f9fafb" : "#111827";
  const sub  = dark ? "#9ca3af" : "#6b7280";
  const bdr  = dark ? "#1f2937" : "#e9ecef";

  const { data, isLoading } = useQuery<Summary>("analyticsSummary", async () => {
    const res = await axios.get("/api/analytics/summary");
    return res.data;
  });

  const { data: ordersData } = useQuery("orderStats", async () => {
    const res = await axios.get("/api/orders");
    return res.data as any[];
  });

  const { data: customersData } = useQuery("customerStats", async () => {
    const res = await axios.get("/api/customers");
    return res.data as any[];
  });

  const totalRevenue   = data?.revenue.reduce((s, r) => s + Number(r.revenue), 0) || 0;
  const totalOrders    = ordersData?.length || 0;
  const totalCustomers = customersData?.length || 0;
  const pendingOrders  = ordersData?.filter((o: any) => o.status === "pending").length || 0;

  const stats = [
    { label: "Total Revenue",  value: `₹${totalRevenue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`, icon: "bi-currency-rupee", color: "#10b981", bg: "rgba(16,185,129,0.1)",  change: "+12.5%", up: true  },
    { label: "Total Orders",   value: totalOrders,    icon: "bi-box-seam",        color: "#fd7e14", bg: "rgba(253,126,20,0.1)",  change: "+8.2%",  up: true  },
    { label: "Customers",      value: totalCustomers, icon: "bi-people-fill",     color: "#3b82f6", bg: "rgba(59,130,246,0.1)",  change: "+3.1%",  up: true  },
    { label: "Pending Orders", value: pendingOrders,  icon: "bi-hourglass-split", color: "#f59e0b", bg: "rgba(245,158,11,0.1)",  change: "-2 today", up: false },
  ];

  if (isLoading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-warning" role="status" />
      <p className="mt-2" style={{ color: sub }}>Loading dashboard...</p>
    </div>
  );

  const revSeries   = data!.revenue.map(r  => ({ day: r.day, value: Number(r.revenue) }));
  const prepSeries  = data!.prepTime.map(p => ({ day: p.day, value: Number(p.avgPrepSecs) }));
  const wasteSeries = data!.waste.map(w    => ({ day: w.day, value: Number(w.wasteCost) }));

  return (
    <div>
      <div className="row g-3 mb-4">
        {stats.map((s) => (
          <div className="col-6 col-lg-3" key={s.label}>
            <div style={{ background: card, borderRadius: "16px", padding: "16px", border: `1px solid ${bdr}`, boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)", transition: "all 0.3s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px" }}>{s.label}</div>
                  <div style={{ fontSize: "22px", fontWeight: 800, color: text, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "4px" }}>
                    <i className={`bi ${s.up ? "bi-arrow-up-right" : "bi-arrow-down-right"}`} style={{ fontSize: "11px", color: s.up ? "#10b981" : "#ef4444" }}></i>
                    <span style={{ fontSize: "11px", color: s.up ? "#10b981" : "#ef4444", fontWeight: 600 }}>{s.change}</span>
                  </div>
                </div>
                <div style={{ width: "42px", height: "42px", borderRadius: "12px", background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <i className={`bi ${s.icon}`} style={{ fontSize: "20px", color: s.color }}></i>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row g-3">
        <div className="col-12">
          <div style={{ background: card, borderRadius: "16px", padding: "20px", border: `1px solid ${bdr}`, boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h6 style={{ color: text, fontWeight: 700, marginBottom: "16px" }}>📈 Revenue (last 30 days)</h6>
            <AnalyticsChart series={revSeries} title="" yLabel="USD" color="#10b981" />
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div style={{ background: card, borderRadius: "16px", padding: "20px", border: `1px solid ${bdr}`, boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h6 style={{ color: text, fontWeight: 700, marginBottom: "16px" }}>⏱️ Average Prep Time</h6>
            <AnalyticsChart series={prepSeries} title="" yLabel="seconds" color="#f59e0b" />
          </div>
        </div>
        <div className="col-12 col-md-6">
          <div style={{ background: card, borderRadius: "16px", padding: "20px", border: `1px solid ${bdr}`, boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h6 style={{ color: text, fontWeight: 700, marginBottom: "16px" }}>🗑️ Food Waste Cost</h6>
            <AnalyticsChart series={wasteSeries} title="" yLabel="USD" color="#ef4444" />
          </div>
        </div>
      </div>
    </div>
  );
}
