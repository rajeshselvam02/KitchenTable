import { useQuery } from "react-query";
import axios from "axios";
import { useDark } from "../context/DarkMode";

type Customer = { id: number; name: string; email: string; phone: string; address: string; };

export default function Customers() {
  const { dark } = useDark();
  const card     = dark ? "#111827" : "white";
  const text     = dark ? "#f9fafb" : "#111827";
  const sub      = dark ? "#9ca3af" : "#6b7280";
  const bdr      = dark ? "#1f2937" : "#e9ecef";
  const rowHover = dark ? "#1f2937" : "#f9fafb";
  const theadBg  = dark ? "#0f1117" : "#f9fafb";

  const { data, isLoading, isError } = useQuery<Customer[]>("customers", async () => {
    const res = await axios.get("/api/customers");
    return res.data;
  });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ fontWeight: 800, color: text, margin: 0 }}>Customers</h2>
        <button style={{ padding: "8px 16px", borderRadius: "10px", background: "#fd7e14", color: "white", border: "none", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>
          + Add Customer
        </button>
      </div>

      {isLoading && <div className="text-center py-5"><div className="spinner-border text-warning" /></div>}
      {isError   && <div className="alert alert-danger">Failed to load customers.</div>}

      {data && (
        <div style={{ background: card, borderRadius: "16px", border: "1px solid " + bdr, overflow: "hidden", boxShadow: dark ? "0 4px 20px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.06)" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: theadBg }}>
                  {["#", "Name", "Email", "Phone", "Address"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", fontSize: "11px", fontWeight: 700, color: sub, textTransform: "uppercase", letterSpacing: "1px", textAlign: "left" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.length === 0 && <tr><td colSpan={5} style={{ textAlign: "center", padding: "40px", color: sub }}>No customers found.</td></tr>}
                {data.map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid " + bdr, transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = rowHover}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <td style={{ padding: "12px 16px", color: sub, fontSize: "13px" }}>{c.id}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #fd7e14, #dc3545)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "white", flexShrink: 0 }}>
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 600, color: text }}>{c.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: sub }}>{c.email}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: text }}>{c.phone || "—"}</td>
                    <td style={{ padding: "12px 16px", fontSize: "13px", color: text }}>{c.address || "—"}</td>
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
