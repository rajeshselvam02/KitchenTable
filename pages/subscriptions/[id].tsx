import { useRouter } from "next/router";
import { useQuery } from "react-query";
import axios from "axios";
import { useDark } from "../../context/DarkMode";

const RED = "#A42A04";
interface Sub { id: string; plan_type: string; meal_type: string; start_date: string; end_date: string; status: string; auto_renew: boolean; }

export default function SubscriptionDetail() {
  const router = useRouter();
  const { id } = router.query as { id: string };
  const { dark } = useDark();
  const card = dark ? "#13151a" : "#ffffff";
  const text = dark ? "#e8eaed" : "#1a1c21";
  const sub  = dark ? "#7a7f8e" : "#6b7280";
  const bdr  = dark ? "#1e2028" : "#e4e6ea";

  const { data, isLoading } = useQuery(["sub", id], async () => (await axios.get("/api/subscriptions/" + id)).data.data as Sub, { enabled: !!id });

  if (isLoading) return <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "40px" }}><div className="spinner-border spinner-border-sm" style={{ color: RED }} /></div>;

  const statusColor: Record<string, string> = { active: "#10b981", inactive: "#6b7280", cancelled: "#ef4444", pending: "#f59e0b" };
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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
        <div>
          <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: "4px" }}>Subscription</div>
          <div style={{ fontSize: "22px", fontWeight: 700, color: text }}>#{data?.id}</div>
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 10px", borderRadius: "4px", textTransform: "uppercase", letterSpacing: "1px", color: statusColor[data?.status || ""] || "#6b7280", background: (statusColor[data?.status || ""] || "#6b7280") + "18", border: "1px solid " + ((statusColor[data?.status || ""] || "#6b7280") + "30") }}>{data?.status}</span>
      </div>

      <div className="row g-3">
        {fields.map(item => (
          <div className="col-12 col-sm-6 col-lg-4" key={item.label}>
            <div style={{ background: card, borderRadius: "8px", padding: "16px", border: `1px solid ${bdr}`, display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "6px", background: RED + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <i className={"bi " + item.icon} style={{ color: RED, fontSize: "15px" }}></i>
              </div>
              <div>
                <div style={{ fontSize: "10px", color: sub, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: text, marginTop: "2px" }}>{item.value || "—"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
