import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import axios from 'axios';

interface Subscription {
  id: string;
  plan_type: string;
  meal_type: string;
  start_date: string;
  end_date: string;
  status: string;
  auto_renew: boolean;
}

const fetchSubscription = async (id: string): Promise<Subscription> => {
  const res = await axios.get(`/api/subscriptions/${id}`);
  return res.data.data;
};

export default function SubscriptionDetail() {
  const router = useRouter();
  const { id } = router.query as { id: string };

  const { data, isLoading, error } = useQuery(
    ['subscription', id],
    () => fetchSubscription(id),
    { enabled: !!id }
  );

  if (isLoading) return (
    <div className="text-center py-5">
      <div className="spinner-border text-warning" role="status" />
      <p className="mt-2 text-muted">Loading subscription...</p>
    </div>
  );

  if (error) return (
    <div className="alert alert-danger">Failed to load subscription.</div>
  );

  const statusColor: Record<string, string> = {
    active: "success", inactive: "secondary", cancelled: "danger", pending: "warning"
  };
  const badge = statusColor[data?.status || ""] || "secondary";

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="fw-bold mb-0">Subscription #{data?.id}</h2>
        <span className={`badge bg-${badge} fs-6`}>{data?.status}</span>
      </div>

      <div className="row g-3">
        {[
          { label: "Plan Type",   value: data?.plan_type,  icon: "bi-star" },
          { label: "Meal Type",   value: data?.meal_type,  icon: "bi-egg-fried" },
          { label: "Start Date",  value: data?.start_date?.slice(0,10), icon: "bi-calendar-check" },
          { label: "End Date",    value: data?.end_date?.slice(0,10),   icon: "bi-calendar-x" },
          { label: "Auto Renew",  value: data?.auto_renew ? "Yes" : "No", icon: "bi-arrow-repeat" },
          { label: "Status",      value: data?.status,     icon: "bi-activity" },
        ].map((item) => (
          <div className="col-12 col-sm-6 col-lg-4" key={item.label}>
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body d-flex align-items-center gap-3">
                <div style={{
                  width: "42px", height: "42px", borderRadius: "10px",
                  background: "linear-gradient(135deg, rgba(253,126,20,0.15), rgba(253,126,20,0.05))",
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                }}>
                  <i className={`bi ${item.icon}`} style={{ color: "#fd7e14", fontSize: "18px" }}></i>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px" }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: 600, color: "#111827" }}>
                    {item.value || "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
