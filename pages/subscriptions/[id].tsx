import { useRouter } from "next/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useDark } from "../../context/DarkMode";

type Sub = {
  id: number; plan_type: string; meal_type: string; food_type: string;
  start_date: string; end_date: string; status: string; plan_price: number;
  auto_renew: boolean; customer_name: string; customer_phone: string;
  customer_email: string; whatsapp_number: string; meals_per_sitting: number;
  discount_pct: number;
};
type Delivery = {
  id: number; delivery_date: string; meal_type: string; status: string;
  dish_name: string; skipped_at: string; skip_reason: string; customer_comment: string;
};

const PLAN_COLORS: Record<string, string> = {
  starter: "#f59e0b", weekly: "#3b82f6", monthly: "#10b981", custom: "#8b5cf6"
};
const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", inactive: "#6b7280", cancelled: "#ef4444"
};

export default function SubscriptionDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { dark } = useDark();
  const qc = useQueryClient();

  const card  = dark ? "#13151a" : "#ffffff";
  const text  = dark ? "#e8eaed" : "#1a1c21";
  const sub   = dark ? "#7a7f8e" : "#6b7280";
  const bdr   = dark ? "#1e2028" : "#e4e6ea";
  const bg    = dark ? "#0e1015" : "#f4f5f7";

  const { data: subscription, isLoading } = useQuery<Sub>({
    queryKey: ["subscription", id],
    queryFn: () => axios.get("/api/subscriptions/" + id).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: deliveries = [] } = useQuery<Delivery[]>({
    queryKey: ["sub-deliveries", id],
    queryFn: () => axios.get("/api/deliveries", { params: { subscription_id: id } }).then(r => r.data),
    enabled: !!id,
  });

  const statusMut = useMutation({
    mutationFn: (status: string) => axios.patch("/api/subscriptions/" + id + "/status", { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subscription", id] }),
  });

  const skipMut = useMutation({
    mutationFn: ({ did, comment }: { did: number; comment: string }) =>
      axios.post("/api/deliveries/" + did + "/skip", { reason: "admin_override", comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sub-deliveries", id] }),
  });

  if (isLoading) return <div style={{ color: text, padding: "40px" }}>Loading...</div>;
  if (!subscription) return <div style={{ color: text, padding: "40px" }}>Not found</div>;

  const planColor = PLAN_COLORS[subscription.plan_type] || "#6b7280";
  const statusColor = STATUS_COLORS[subscription.status] || "#6b7280";

  const skippedCount = deliveries.filter(d => d.status === "skipped").length;
  const deliveredCount = deliveries.filter(d => d.status === "delivered").length;
  const totalDays = Math.ceil((new Date(subscription.end_date).getTime() - new Date(subscription.start_date).getTime()) / 86400000);
  const daysLeft = Math.max(0, Math.ceil((new Date(subscription.end_date).getTime() - Date.now()) / 86400000));

  return (
    <div>
      {/* Back */}
      <button onClick={() => router.push("/subscriptions")}
        style={{ background: "none", border: "none", color: sub, cursor: "pointer", fontSize: "13px", marginBottom: "16px", padding: 0 }}>
        ← Back to Subscriptions
      </button>

      {/* Header */}
      <div style={{ background: card, borderRadius: "16px", border: "1px solid " + bdr, padding: "24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>Subscription #{subscription.id}</div>
            <div style={{ fontSize: "22px", fontWeight: 700, color: text }}>{subscription.customer_name}</div>
            <div style={{ fontSize: "13px", color: sub, marginTop: "2px" }}>{subscription.phone} · {subscription.email}</div>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <span style={{ padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, background: planColor + "20", color: planColor }}>
              {subscription.plan_type}
            </span>
            <span style={{ padding: "4px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: 600, background: statusColor + "20", color: statusColor }}>
              {subscription.status}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px", marginTop: "20px" }}>
          {[
            { label: "Plan Price",  value: "₹" + parseFloat(subscription.plan_price).toLocaleString(), color: text },
            { label: "Days Left",   value: daysLeft + " days",            color: daysLeft < 5 ? "#ef4444" : "#10b981" },
            { label: "Delivered",   value: deliveredCount,                color: "#10b981" },
            { label: "Skipped",     value: skippedCount,                  color: skippedCount > 0 ? "#f59e0b" : sub },
          ].map(s => (
            <div key={s.label} style={{ background: bg, borderRadius: "10px", padding: "12px", textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: sub, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>{s.label}</div>
              <div style={{ fontSize: "18px", fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px", marginTop: "16px", fontSize: "13px" }}>
          {[
            ["Meal Type",   subscription.meal_type],
            ["Food Type",   subscription.food_type || "veg"],
            ["Start Date",  subscription.start_date?.slice(0, 10)],
            ["End Date",    subscription.end_date?.slice(0, 10)],
            ["Total Days",  totalDays + " days"],
            ["Auto Renew",  subscription.auto_renew ? "Yes" : "No"],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: bg, borderRadius: "8px" }}>
              <span style={{ color: sub, fontSize: "12px", flexShrink: 0 }}>{label}</span>
              <span style={{ color: text, fontWeight: 600, fontSize: "13px", textTransform: "capitalize", textAlign: "right" }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "8px", marginTop: "16px", flexDirection: "row" }}>
          {subscription.status === "active" && (
            <button onClick={() => statusMut.mutate("inactive")}
              style={{ padding: "8px 16px", borderRadius: "8px", background: "#f59e0b20", color: "#f59e0b", border: "1px solid #f59e0b50", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
              Pause Subscription
            </button>
          )}
          {subscription.status === "inactive" && (
            <button onClick={() => statusMut.mutate("active")}
              style={{ padding: "8px 16px", borderRadius: "8px", background: "#10b98120", color: "#10b981", border: "1px solid #10b98150", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
              Resume Subscription
            </button>
          )}
          {subscription.status !== "cancelled" && (
            <button onClick={() => { if (confirm("Cancel this subscription?")) statusMut.mutate("cancelled"); }}
              style={{ padding: "8px 16px", borderRadius: "8px", background: "#ef444420", color: "#ef4444", border: "1px solid #ef444450", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}>
              Cancel Subscription
            </button>
          )}
        </div>
      </div>

      {/* Delivery history */}
      <div style={{ background: card, borderRadius: "16px", border: "1px solid " + bdr, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid " + bdr }}>
          <div style={{ fontSize: "13px", fontWeight: 700, color: text }}>Delivery History</div>
          <div style={{ fontSize: "12px", color: sub }}>{deliveries.length} total deliveries</div>
        </div>
        {deliveries.length === 0 && (
          <div style={{ padding: "40px", textAlign: "center", color: sub }}>No deliveries yet</div>
        )}
        {deliveries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {deliveries.map((d: Delivery) => {
              const sc: Record<string, string> = {
                pending: "#f59e0b", preparing: "#3b82f6", ready: "#8b5cf6",
                out_for_delivery: "#f97316", delivered: "#10b981",
                skipped: "#6b7280", failed: "#ef4444", auto_confirmed: "#10b981"
              };
              return (
                <div key={d.id} style={{ padding: "12px 16px", borderRadius: "10px", background: bg, border: "1px solid " + bdr }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <span style={{ color: sub, fontSize: "12px" }}>{d.delivery_date?.slice(0, 10)}</span>
                    <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600,
                      background: sc[d.status] + "20", color: sc[d.status], textTransform: "capitalize" }}>
                      {d.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: "10px", fontSize: "11px", fontWeight: 600,
                      background: d.meal_type === "lunch" ? "rgba(245,158,11,0.15)" : "rgba(139,92,246,0.15)",
                      color: d.meal_type === "lunch" ? "#f59e0b" : "#8b5cf6", textTransform: "capitalize" }}>
                      {d.meal_type}
                    </span>
                    <span style={{ color: text, fontSize: "13px", fontWeight: 500 }}>{d.dish_name || "—"}</span>
                  </div>
                  {d.customer_comment && <div style={{ color: sub, fontSize: "12px", marginTop: "6px" }}>{d.customer_comment}</div>}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
