import { useRouter } from "next/router";
import { useQuery } from "react-query";
import axios from "axios";
import { useDark } from "../../context/DarkMode";

interface Subscription {
  id: string; plan_type: string; meal_type: string;
  start_date: string; end_date: string; status: string; auto_renew: boolean;
}

export default function SubscriptionDetail() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { dark } = useDark();
  const card = dark ? "#111827" : "white";
  const text = dark ? "#f9fafb" : "#111827";
  const sub  = dark ? "#9ca3af" : "#6b7280";
  const bdr  = dark ? "#1f2937" : "#e9ecef";

  const { data, isLoading, error } = useQuery(
    ["subscription", id],
    async () => { const res = await axios.get("/api/subscriptions/" + id); return res.data.data as Subscription; },
    { enabled: !!id }
  );

  if (isLoading) return <div className="text-center py-5"><div className="spinner-border text-warning" /></div>;
  if (error) return <div className="alert alert-danger">Failed to load subscription.</div>;

  const statusColor: Record<string, string> = { active: "success", inactive: "secondary", cancelled: "danger", pending: "warning" };

  const fields = [
    { label: "Plan Type",  value: data?.plan_type,               icon: "bi-star" },
    { label: "Meal Type",  value: data?.meal_type,               icon: "bi-egg-fried" },
    { label: "Start Date", value: data?.start_date?.slice(0,10), icon: "bi-calendar-check" },
    { label: "End Date",   value: data?.end_date?.slice(0,10),   icon: "bi-calendar-x" },
    { label: "Auto Renew", value: data?.auto_renew ? "Yes" : "No", icon: "bi-arrow-repeat" },
    { label: "Status",     value: data?.status,                  icon: "bi-activity" },
  ];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 style={{ color: text, fontWeight: 800, margin: 0 }}>Subscription #{data?.id}</h2>
        <span className={"badge bg-" + (statusColor[data?.status || ""] || "secondary") + " fs-6"}>{data?.status}</span>
      </div>
      <div className="row g-3">
        {fields.map((item) => (
          <div className="col-12 col-sm-6 col-lg-4" key={item.label}>
            <div style={{ background: card, borderRadius: "14px", padding: "16px", border: "1px solid " + bdr, boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 8px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "42px", height: "42px", borderRadius: "10px", background: "rgba(253,126,20,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={"bi " + item.icon} style={{ color: "#fd7e14", fontSize: "18px" }}></i>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1px" }}>{item.label}</div>
                <div style={{ fontSize: "15px", fontWeight: 600, color: text }}>{item.value || "—"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
