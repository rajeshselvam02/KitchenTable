import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useDark } from "../context/DarkMode";

const RED = "#A42A04";
type Customer = { id: number; name: string; email: string; phone: string; address: string; };

export default function Customers() {
  const { dark } = useDark();
  const card  = dark ? "#13151a" : "#ffffff";
  const text  = dark ? "#e8eaed" : "#1a1c21";
  const sub   = dark ? "#7a7f8e" : "#6b7280";
  const bdr   = dark ? "#1e2028" : "#e4e6ea";
  const hdr   = dark ? "#0e1015" : "#f4f5f7";
  const hover = dark ? "#1a1c23" : "#f9fafb";

  const { data, isLoading, isError } = useQuery<Customer[]>({
  queryKey: ["customers"],
  queryFn: () => axios.get("/api/customers").then(r => r.data.data),});

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>Total</div>
          <div style={{ fontSize: "24px", fontWeight: 700, color: text }}>{data?.length || 0} Customers</div>
        </div>
        <button style={{ padding: "8px 14px", borderRadius: "6px", background: RED, color: "white", border: "none", fontWeight: 600, fontSize: "12px", cursor: "pointer", letterSpacing: "0.3px" }}>
          Add Customer
        </button>
      </div>

      {isLoading && <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "40px", justifyContent: "center" }}><div className="spinner-border spinner-border-sm" style={{ color: RED }} /><span style={{ color: sub, fontSize: "13px" }}>Loading...</span></div>}
      {isError   && <div className="alert alert-danger" style={{ fontSize: "13px" }}>Failed to load customers.</div>}

      {data && (
        <div style={{ background: card, borderRadius: "8px", border: `1px solid ${bdr}` }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: hdr }}>
                  {["#", "Name", "Email", "Phone", "Address"].map(h => (
                    <th key={h} style={{ padding: "10px 14px", fontSize: "10px", fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: "1.2px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px", color: sub, fontSize: "13px" }}>No customers yet.</td></tr>}
                {data.map(c => (
                  <tr key={c.id} style={{ borderTop: `1px solid ${bdr}` }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = hover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <td style={{ padding: "11px 14px", fontSize: "12px", color: sub }}>{c.id}</td>
                    <td style={{ padding: "11px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", fontWeight: 700, color: "white", flexShrink: 0 }}>{c.name?.charAt(0).toUpperCase()}</div>
                        <span style={{ fontSize: "13px", fontWeight: 500, color: text }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "11px 14px", fontSize: "13px", color: sub }}>{c.email}</td>
                    <td style={{ padding: "11px 14px", fontSize: "13px", color: text }}>{c.phone || "—"}</td>
                    <td style={{ padding: "11px 14px", fontSize: "13px", color: text }}>{c.address || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
