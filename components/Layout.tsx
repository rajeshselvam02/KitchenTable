import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useDark } from "../context/DarkMode";

const RED = "#A42A04";
const RED_SOFT = "rgba(164,42,4,0.12)";
const RED_MED  = "rgba(164,42,4,0.22)";

const NAV = [
  { label: "Dashboard",     href: "/",               icon: "bi-grid-1x2" },
  { label: "Analytics",     href: "/analytics",      icon: "bi-bar-chart-line" },
  { label: "Orders",        href: "/orders",         icon: "bi-list-check",   badge: "Live" },
  { label: "Deliveries",    href: "/deliveries",     icon: "bi-truck" },
  { label: "Menus",         href: "/menus",          icon: "bi-calendar-week" },
  { label: "Customers",     href: "/customers",      icon: "bi-people" },
  { label: "Subscriptions", href: "/subscriptions",icon: "bi-arrow-repeat" },
];

const TITLES: Record<string, { title: string; sub: string }> = {
  "/":                { title: "Dashboard",     sub: "Overview of your kitchen operations" },
  "/analytics":       { title: "Analytics",     sub: "Revenue, prep time and waste metrics" },
  "/orders":          { title: "Orders",        sub: "Live order management queue" },
  "/menus":           { title: "Menus",         sub: "Weekly meal planning calendar" },
  "/customers":       { title: "Customers",     sub: "Subscriber database" },
  "/deliveries":      { title: "Deliveries",    sub: "Daily delivery management" },
  "/subscriptions": { title: "Subscriptions", sub: "All subscription plans" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const { dark, toggle } = useDark();
  const offRef  = useRef<any>(null);
  const [time, setTime] = useState("");
  const [scrolled, setScrolled] = useState(false);

  const bg       = dark ? "#0c0e13" : "#f4f5f7";
  const sideBase = dark ? "#101216" : "#1a1c21";
  const topBg    = dark ? "#13151a" : "#ffffff";
  const topBdr   = dark ? "#1e2028" : "#e4e6ea";
  const cardBg   = dark ? "#13151a" : "#ffffff";
  const textPri  = dark ? "#e8eaed" : "#1a1c21";
  const textSec  = dark ? "#7a7f8e" : "#6b7280";
  const bdr      = dark ? "#1e2028" : "#e4e6ea";
  const inputBg  = dark ? "#1a1c23" : "#f4f5f7";

  useEffect(() => {
    const t = setInterval(() => setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  useEffect(() => {
    const hide = () => { if (offRef.current) offRef.current.hide(); };
    router.events.on("routeChangeStart", hide);
    return () => router.events.off("routeChangeStart", hide);
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("bootstrap").then(bs => {
        const el = document.getElementById("sidebarOffcanvas");
        if (el) offRef.current = new bs.Offcanvas(el);
      });
    }
  }, []);

  const page = TITLES[router.pathname] || { title: "KitchenTable", sub: "" };

  const SideInner = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Brand */}
      <div style={{ padding: "22px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: RED, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="bi bi-layers-fill" style={{ fontSize: "14px", color: "white" }}></i>
          </div>
          <div>
            <div style={{ fontSize: "15px", fontWeight: 700, color: "white", letterSpacing: "-0.2px" }}>KitchenTable</div>
            <div style={{ fontSize: "10px", color: "#4a4f5e", letterSpacing: "1.5px", textTransform: "uppercase" }}>Admin Console</div>
          </div>
        </div>
        <div style={{ marginTop: "12px", display: "inline-flex", alignItems: "center", gap: "5px", padding: "3px 8px", borderRadius: "4px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.15)" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#22c55e" }}></div>
          <span style={{ fontSize: "10px", color: "#22c55e", fontWeight: 600, letterSpacing: "0.5px" }}>ALL SYSTEMS LIVE</span>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        <div style={{ fontSize: "9px", color: "#3a3f50", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase", padding: "4px 10px 8px" }}>Navigation</div>
        {NAV.map(item => {
          const active = router.pathname === item.href;
          return (
            <Link href={item.href} key={item.href} style={{ textDecoration: "none", display: "block" }}>
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 10px", borderRadius: "6px", marginBottom: "2px", cursor: "pointer",
                background: active ? RED_SOFT : "transparent",
                borderLeft: active ? `3px solid ${RED}` : "3px solid transparent",
                transition: "all 0.15s",
              }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <i className={"bi " + item.icon} style={{ fontSize: "14px", color: active ? RED : "#4a4f5e", width: "16px" }}></i>
                  <span style={{ fontSize: "13px", fontWeight: active ? 600 : 400, color: active ? "#ffffff" : "#6b7585" }}>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "3px", background: RED_SOFT, color: RED, border: `1px solid ${RED_MED}`, letterSpacing: "0.5px" }}>{item.badge}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User card */}
      <div style={{ padding: "12px 10px 20px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
        <div style={{ padding: "10px 12px", borderRadius: "6px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "white", flexShrink: 0 }}>A</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: 600, color: "#c8cbd4" }}>Admin</div>
              <div style={{ fontSize: "10px", color: "#3a3f50", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{time}</div>
            </div>
            <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#22c55e", flexShrink: 0 }}></div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      <div style={{ display: "flex", minHeight: "100vh", background: bg, transition: "background 0.3s" }}>

        {/* Desktop sidebar */}
        <div className="d-none d-lg-flex" style={{ width: "220px", height: "100vh", position: "sticky", top: 0, background: sideBase, flexDirection: "column", flexShrink: 0, borderRight: "1px solid rgba(255,255,255,0.04)" }}>
          <SideInner />
        </div>

        {/* Mobile offcanvas */}
        <div className="offcanvas offcanvas-start d-lg-none" tabIndex={-1} id="sidebarOffcanvas" style={{ width: "220px", background: sideBase }}>
          <div className="offcanvas-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "12px" }}>
            <button type="button" className="btn-close btn-close-white ms-auto" data-bs-dismiss="offcanvas"></button>
          </div>
          <SideInner />
        </div>

        {/* Main */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Topbar */}
          <div style={{ background: topBg, borderBottom: `1px solid ${topBdr}`, height: "52px", padding: "0 20px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: scrolled ? "0 1px 8px rgba(0,0,0,0.12)" : "none", transition: "box-shadow 0.2s" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <button className="btn d-lg-none" data-bs-toggle="offcanvas" data-bs-target="#sidebarOffcanvas" style={{ padding: "6px 8px", border: `1px solid ${bdr}`, borderRadius: "6px", background: "transparent", lineHeight: 1 }}>
                <i className="bi bi-list" style={{ fontSize: "18px", color: textPri }}></i>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "12px", color: textSec }}>KitchenTable</span>
                <i className="bi bi-chevron-right" style={{ fontSize: "9px", color: textSec }}></i>
                <span style={{ fontSize: "13px", fontWeight: 600, color: textPri }}>{page.title}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button onClick={toggle} style={{ width: "32px", height: "32px", borderRadius: "6px", border: `1px solid ${bdr}`, background: inputBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <i className={"bi " + (dark ? "bi-sun" : "bi-moon")} style={{ fontSize: "13px", color: textSec }}></i>
              </button>
              <button style={{ width: "32px", height: "32px", borderRadius: "6px", border: `1px solid ${bdr}`, background: inputBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
                <i className="bi bi-bell" style={{ fontSize: "13px", color: textPri }}></i>
                <div style={{ position: "absolute", top: "5px", right: "5px", width: "6px", height: "6px", borderRadius: "50%", background: RED, border: "1.5px solid " + topBg }}></div>
              </button>
              <div style={{ width: "1px", height: "20px", background: bdr, margin: "0 2px" }}></div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <div style={{ width: "30px", height: "30px", borderRadius: "50%", background: RED, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: 700, color: "white" }}>A</div>
                <div className="d-none d-sm-block">
                  <div style={{ fontSize: "12px", fontWeight: 600, color: textPri, lineHeight: 1 }}>Admin</div>
                  <div style={{ fontSize: "10px", color: textSec }}>Owner</div>
                </div>
              </div>
            </div>
          </div>

          {/* Page header */}
          <div style={{ background: dark ? "#0e1015" : "#1a1c21", borderBottom: "1px solid rgba(255,255,255,0.04)", padding: "14px 24px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h1 style={{ fontSize: "18px", fontWeight: 700, color: "#e8eaed", margin: 0, letterSpacing: "-0.2px" }}>{page.title}</h1>
                <p style={{ fontSize: "11px", color: "#4a4f5e", margin: 0, marginTop: "2px" }}>{page.sub}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "11px", color: "#4a4f5e" }}>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                <span style={{ fontSize: "10px", fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: "4px", padding: "2px 7px", letterSpacing: "0.5px" }}>LIVE</span>
              </div>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: "20px" }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
