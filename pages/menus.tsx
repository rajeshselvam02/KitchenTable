import { MenuCalendar } from "../components/MenuCalendar";
import { useDark } from "../context/DarkMode";
import { startOfWeek } from "date-fns";

export default function MenusPage() {
  const { dark } = useDark();
  const text = dark ? "#e8eaed" : "#1a1c21";
  const sub  = dark ? "#7a7f8e" : "#6b7280";
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  return (
    <div>
      <div style={{ marginBottom: "18px" }}>
        <div style={{ fontSize: "11px", color: sub, textTransform: "uppercase", letterSpacing: "1.2px", fontWeight: 600, marginBottom: "4px" }}>Week of {monday.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</div>
        <div style={{ fontSize: "22px", fontWeight: 700, color: text }}>Weekly Menu Builder</div>
      </div>
      <MenuCalendar startDate={monday} days={7} />
    </div>
  );
}
