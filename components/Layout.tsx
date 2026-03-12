import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef, useState } from "react";
import { useDark } from "../context/DarkMode";

const NAV_ITEMS = [
  { label: "Dashboard",     href: "/",               icon: "bi-speedometer2",   badge: null },
  { label: "Analytics",     href: "/analytics",      icon: "bi-graph-up-arrow", badge: "Live" },
  { label: "Orders",        href: "/orders",          icon: "bi-box-seam",       badge: "12" },
  { label: "Menus",         href: "/menus",           icon: "bi-calendar3",      badge: null },
  { label: "Customers",     href: "/customers",       icon: "bi-people-fill",    badge: null },
  { label: "Subscriptions", href: "/subscriptions/1", icon: "bi-arrow-repeat",   badge: null },
];

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/":                { title: "Dashboard",     subtitle: "Welcome back, Admin 👋" },
  "/analytics":       { title: "Analytics",     subtitle: "Performance overview" },
  "/orders":          { title: "Orders",        subtitle: "Manage delivery pipeline" },
  "/menus":           { title: "Menus",         subtitle: "Weekly meal planning" },
  "/customers":       { title: "Customers",     subtitle: "Manage your subscribers" },
  "/subscriptions/1": { title: "Subscriptions", subtitle: "Subscription details" },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { dark, toggle } = useDark();
  const offcanvasRef = useRef<any>(null);
  const [time, setTime] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const handleRouteChange = () => { if (offcanvasRef.current) offcanvasRef.current.hide(); };
    router.events.on("routeChangeStart", handleRouteChange);
    return () => router.events.off("routeChangeStart", handleRouteChange);
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("bootstrap").then((bs) => {
        const el = document.getElementById("sidebarOffcanvas");
        if (el) offcanvasRef.current = new bs.Offcanvas(el);
      });
    }
  }, []);

  const pageInfo = PAGE_TITLES[router.pathname] || { title: "KitchenTable", subtitle: "Admin Panel" };
  const bg = dark ? "#0a0c14" : "#f1f3f5";
  const topbarBg = dark ? "#0f1117" : "white";
  const topbarBorder = dark ? "#1f2937" : "#e9ecef";
  const textPrimary = dark ? "#f9fafb" : "#111827";
  const textSecondary = dark ? "#9ca3af" : "#6b7280";
  const inputBg = dark ? "#1f2937" : "#f9fafb";
  const inputBorder = dark ? "#374151" : "#e9ecef";
  const subtitleBg = dark ? "#070910" : "#0a0c14";

  const SidebarContent = () => (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{ padding: "24px 20px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "linear-gradient(135deg, #fd7e14, #e85d04)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", boxShadow: "0 4px 12px rgba(253,126,20,0.4)" }}>🍽️</div>
          <div>
            <div style={{ fontSize: "17px", fontWeight: 800, color: "white", letterSpacing: "-0.3px", lineHeight: 1 }}>Kitchen<span style={{ color: "#fd7e14" }}>Table</span></div>
            <div style={{ fontSize: "9px", color: "#4b5563", textTransform: "uppercase", letterSpacing: "2px", marginTop: "2px" }}>Cloud Kitchen OS</div>
          </div>
        </div>
        <div style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "6px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", padding: "4px 10px", width: "fit-content" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#10b981", boxShadow: "0 0 6px #10b981", animation: "pulse 2s infinite" }}></div>
          <span style={{ fontSize: "10px", color: "#10b981", fontWeight: 600 }}>All systems live</span>
        </div>
      </div>

      <div style={{ padding: "0 20px 8px" }}>
        <span style={{ fontSize: "9px", color: "#374151", textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700 }}>Navigation</span>
      </div>

      <nav style={{ padding: "0 10px", flex: 1 }}>
        {NAV_ITEMS.map((item) => {
          const isActive = router.pathname === item.href;
          return (
            <Link href={item.href} key={item.href} style={{ textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", borderRadius: "10px", marginBottom: "3px", cursor: "pointer", transition: "all 0.2s ease", background: isActive ? "linear-gradient(135deg, rgba(253,126,20,0.15), rgba(253,126,20,0.05))" : "transparent", border: isActive ? "1px solid rgba(253,126,20,0.2)" : "1px solid transparent" }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ width: "30px", height: "30px", borderRadius: "8px", background: isActive ? "rgba(253,126,20,0.2)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <i className={`bi ${item.icon}`} style={{ fontSize: "14px", color: isActive ? "#fd7e14" : "#6b7280" }}></i>
                  </div>
                  <span style={{ fontSize: "13.5px", fontWeight: isActive ? 600 : 400, color: isActive ? "#ffffff" : "#9ca3af" }}>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "2px 7px", borderRadius: "20px", background: item.badge === "Live" ? "rgba(16,185,129,0.15)" : "rgba(253,126,20,0.15)", color: item.badge === "Live" ? "#10b981" : "#fd7e14", border: item.badge === "Live" ? "1px solid rgba(16,185,129,0.3)" : "1px solid rgba(253,126,20,0.3)" }}>{item.badge}</span>
                )}
                {isActive && <div style={{ width: "4px", height: "20px", borderRadius: "2px", background: "linear-gradient(180deg, #fd7e14, #e85d04)", boxShadow: "0 0 8px rgba(253,126,20,0.6)", marginLeft: "4px" }}></div>}
              </div>
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: "12px 12px 20px" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(253,126,20,0.15), rgba(220,53,69,0.1))", border: "1px solid rgba(253,126,20,0.2)", borderRadius: "12px", padding: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
            <div style={{ width: "34px", height: "34px", borderRadius: "50%", background: "linear-gradient(135deg, #fd7e14, #dc3545)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "white" }}>A</div>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "white" }}>Admin</div>
              <div style={{ fontSize: "10px", color: "#6b7280" }}>Kitchen Owner</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.2)", borderRadius: "8px", padding: "6px 10px" }}>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>🕐 {time}</span>
            <span style={{ fontSize: "11px", color: "#10b981", fontWeight: 600 }}>● Online</span>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.5;transform:scale(1.4)}}`}</style>
    </div>
  );

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      <div style={{ display: "flex", minHeight: "100vh", backgroundColor: bg, transition: "background 0.3s" }}>

        <div className="d-none d-lg-flex" style={{ width: "240px", minHeight: "100vh", background: "linear-gradient(180deg, #0a0c14 0%, #0f1117 100%)", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh", overflowY: "auto", borderRight: "1px solid rgba(255,255,255,0.04)", boxShadow: "4px 0 24px rgba(0,0,0,0.3)" }}>
          <SidebarContent />
        </div>

        <div className="offcanvas offcanvas-start d-lg-none" tabIndex={-1} id="sidebarOffcanvas" style={{ width: "240px", background: "linear-gradient(180deg, #0a0c14 0%, #0f1117 100%)" }}>
          <div className="offcanvas-header" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
          </div>
          <SidebarContent />
        </div>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <div style={{ backgroundColor: topbarBg, borderBottom: `1px solid ${topbarBorder}`, padding: "0 20px", height: "60px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100, boxShadow: scrolled ? "0 2px 12px rgba(0,0,0,0.08)" : "none", transition: "all 0.3s ease" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <button className="btn d-lg-none" data-bs-toggle="offcanvas" data-bs-target="#sidebarOffcanvas" style={{ padding: "7px 10px", border: `1px solid ${inputBorder}`, borderRadius: "10px", background: topbarBg }}>
                <i className="bi bi-list" style={{ fontSize: "20px", color: textPrimary }}></i>
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "12px", color: textSecondary }}>KitchenTable</span>
                <i className="bi bi-chevron-right" style={{ fontSize: "10px", color: textSecondary }}></i>
                <span style={{ fontSize: "14px", fontWeight: 700, color: textPrimary }}>{pageInfo.title}</span>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div className="d-none d-md-flex" style={{ alignItems: "center", gap: "8px", background: inputBg, border: `1px solid ${inputBorder}`, borderRadius: "10px", padding: "6px 12px" }}>
                <i className="bi bi-search" style={{ fontSize: "13px", color: textSecondary }}></i>
                <span style={{ fontSize: "13px", color: textSecondary }}>Search...</span>
                <span style={{ fontSize: "10px", color: textSecondary, border: `1px solid ${inputBorder}`, borderRadius: "4px", padding: "1px 5px", marginLeft: "4px" }}>⌘K</span>
              </div>

              <button onClick={toggle} title="Toggle dark mode" style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1px solid ${inputBorder}`, background: inputBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s" }}>
                <i className={`bi ${dark ? "bi-sun-fill" : "bi-moon-fill"}`} style={{ fontSize: "15px", color: dark ? "#fbbf24" : "#6b7280" }}></i>
              </button>

              <button style={{ width: "36px", height: "36px", borderRadius: "10px", border: `1px solid ${inputBorder}`, background: inputBg, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", position: "relative" }}>
                <i className="bi bi-bell" style={{ fontSize: "15px", color: textPrimary }}></i>
                <div style={{ position: "absolute", top: "6px", right: "6px", width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#ef4444", border: "1.5px solid " + topbarBg }}></div>
              </button>

              <div style={{ width: "1px", height: "24px", backgroundColor: inputBorder }}></div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <div style={{ width: "34px", height: "34px", borderRadius: "10px", background: "linear-gradient(135deg, #fd7e14, #dc3545)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: "white", boxShadow: "0 2px 8px rgba(253,126,20,0.3)" }}>A</div>
                <div className="d-none d-sm-block">
                  <div style={{ fontSize: "13px", fontWeight: 600, color: textPrimary, lineHeight: 1 }}>Admin</div>
                  <div style={{ fontSize: "10px", color: textSecondary }}>Owner</div>
                </div>
                <i className="bi bi-chevron-down d-none d-sm-block" style={{ fontSize: "10px", color: textSecondary }}></i>
              </div>
            </div>
          </div>

          <div style={{ background: subtitleBg, padding: "14px 24px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h1 style={{ fontSize: "20px", fontWeight: 800, color: "white", margin: 0 }}>{pageInfo.title}</h1>
                <p style={{ fontSize: "12px", color: "#6b7280", margin: 0, marginTop: "2px" }}>{pageInfo.subtitle}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "11px", color: "#4b5563" }}>{new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "#10b981", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "20px", padding: "2px 8px" }}>● Live</span>
              </div>
            </div>
          </div>

          <div style={{ flex: 1, padding: "20px", overflowY: "auto" }}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
