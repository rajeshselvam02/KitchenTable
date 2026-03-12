import { useEffect, useState } from "react";
import dayjs from "dayjs";
import axios from "axios";
import { useDark } from "../context/DarkMode";

const RED = "#A42A04";
type Dish    = { id: number; name: string; cost_per_serving: number };
type DayMenu = { id: number; dish: Dish; portion: "regular" | "large" };
type Props   = { startDate: Date; days: number };

export const MenuCalendar: React.FC<Props> = ({ startDate, days }) => {
  const { dark } = useDark();
  const card  = dark ? "#13151a" : "#ffffff";
  const text  = dark ? "#e8eaed" : "#1a1c21";
  const sub   = dark ? "#7a7f8e" : "#6b7280";
  const bdr   = dark ? "#1e2028" : "#e4e6ea";
  const hdr   = dark ? "#0e1015" : "#f4f5f7";

  const [menus, setMenus]     = useState<Record<string, DayMenu[]>>({});
  const [modal, setModal]     = useState(false);
  const [selDay, setSelDay]   = useState("");
  const [dishes, setDishes]   = useState<Dish[]>([]);
  const [selDish, setSelDish] = useState<number | null>(null);
  const [portion, setPortion] = useState<"regular"|"large">("regular");

  const load = async () => {
    const end = dayjs(startDate).add(days - 1, "day").toDate();
    const res = await axios.get("/api/menus", { params: { start: dayjs(startDate).format("YYYY-MM-DD"), end: dayjs(end).format("YYYY-MM-DD") } });
    const g: Record<string, DayMenu[]> = {};
    for (const item of res.data) { const d = item.day.slice(0,10); if (!g[d]) g[d]=[]; g[d].push(item); }
    setMenus(g);
  };

  useEffect(() => { load(); axios.get("/api/dishes").then(r => setDishes(r.data)); }, [startDate]);

  const handleAdd = async () => {
    if (!selDish) return;
    await axios.post("/api/menus", { day: selDay, dish_id: selDish, portion });
    setModal(false); setSelDish(null); setPortion("regular"); load();
  };

  const dates = Array.from({ length: days }, (_, i) => dayjs(startDate).add(i, "day"));

  return (
    <>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${days}, minmax(130px, 1fr))`, gap: "8px", minWidth: `${days * 138}px` }}>
          {dates.map(date => {
            const key     = date.format("YYYY-MM-DD");
            const isToday = key === dayjs().format("YYYY-MM-DD");
            const items   = menus[key] || [];
            return (
              <div key={key} style={{ background: card, borderRadius: "8px", border: `1px solid ${isToday ? RED + "60" : bdr}`, overflow: "hidden" }}>
                {/* Day header */}
                <div style={{ padding: "10px 12px", background: isToday ? RED + "18" : hdr, borderBottom: `1px solid ${isToday ? RED + "30" : bdr}` }}>
                  <div style={{ fontSize: "10px", fontWeight: 700, color: isToday ? RED : sub, textTransform: "uppercase", letterSpacing: "1.5px" }}>{date.format("ddd")}</div>
                  <div style={{ fontSize: "20px", fontWeight: 700, color: isToday ? RED : text, lineHeight: 1.1 }}>{date.format("D")}</div>
                  <div style={{ fontSize: "10px", color: sub }}>{date.format("MMM YYYY")}</div>
                </div>
                {/* Items */}
                <div style={{ padding: "8px", display: "flex", flexDirection: "column", gap: "5px", minHeight: "70px" }}>
                  {items.map(m => (
                    <div key={m.id} style={{ background: RED + "0f", border: `1px solid ${RED}28`, borderRadius: "4px", padding: "5px 8px" }}>
                      <div style={{ fontSize: "11px", fontWeight: 600, color: text }}>{m.dish.name}</div>
                      <div style={{ fontSize: "10px", color: RED, textTransform: "capitalize", marginTop: "1px" }}>{m.portion}</div>
                    </div>
                  ))}
                  <button onClick={() => { setSelDay(key); setModal(true); }} style={{
                    padding: "5px", borderRadius: "4px", fontSize: "11px", border: `1px dashed ${bdr}`,
                    background: "transparent", color: sub, cursor: "pointer", marginTop: items.length ? "2px" : "0",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = RED; (e.currentTarget as HTMLElement).style.color = RED; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = bdr; (e.currentTarget as HTMLElement).style.color = sub; }}>
                    + Add dish
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ background: card, borderRadius: "10px", padding: "22px", width: "100%", maxWidth: "380px", border: `1px solid ${bdr}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600 }}>Add dish to menu</div>
                <div style={{ fontSize: "15px", fontWeight: 700, color: text, marginTop: "2px" }}>{selDay}</div>
              </div>
              <button onClick={() => setModal(false)} style={{ background: "none", border: "none", fontSize: "18px", color: sub, cursor: "pointer", lineHeight: 1 }}>x</button>
            </div>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: sub, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>Dish</label>
              <select value={selDish || ""} onChange={e => setSelDish(Number(e.target.value))} style={{ width: "100%", padding: "9px 10px", borderRadius: "6px", border: `1px solid ${bdr}`, background: dark ? "#1a1c23" : "#f4f5f7", color: text, fontSize: "13px" }}>
                <option value="">Select a dish...</option>
                {dishes.map(d => <option key={d.id} value={d.id}>{d.name} — Rs.{d.cost_per_serving}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: "18px" }}>
              <label style={{ fontSize: "11px", fontWeight: 600, color: sub, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>Portion</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {["regular", "large"].map(p => (
                  <button key={p} onClick={() => setPortion(p as any)} style={{ flex: 1, padding: "7px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, cursor: "pointer", textTransform: "capitalize", border: `1px solid ${portion === p ? RED : bdr}`, background: portion === p ? RED + "18" : "transparent", color: portion === p ? RED : sub, transition: "all 0.15s" }}>{p}</button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => setModal(false)} style={{ flex: 1, padding: "9px", borderRadius: "6px", border: `1px solid ${bdr}`, background: "transparent", color: sub, fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>Cancel</button>
              <button onClick={handleAdd} disabled={!selDish} style={{ flex: 1, padding: "9px", borderRadius: "6px", border: "none", background: selDish ? RED : "#374151", color: "white", fontWeight: 600, cursor: selDish ? "pointer" : "not-allowed", fontSize: "13px" }}>Add to Menu</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
