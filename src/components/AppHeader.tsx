"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/input", label: "Nhập hàng" },
  { href: "/sales", label: "Bán hàng" },
  { href: "/cod-reconcile", label: "Đối soát COD" },
  { href: "/inventory", label: "Tồn hàng" },
  { href: "/reports", label: "Báo cáo" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
];

type Me = { username: string; fullName: string; role: string } | null;

export default function AppHeader() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  const [me, setMe] = useState<Me>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setMe(d.user || null)).catch(() => setMe(null));
  }, [pathname]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (pathname === "/login") return null;

  return (
    <header style={{ borderBottom: "1px solid #bae6fd", background: "linear-gradient(90deg, #f0f9ff, #ffffff)", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 4px 16px rgba(2, 132, 199, .06)" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 16px", display: "flex", gap: 16, alignItems: "center" }}>
        <Link href="/dashboard" style={{ fontWeight: 900, textDecoration: "none", color: "#0369a1", background: "#e0f2fe", border: "1px solid #7dd3fc", borderRadius: 12, padding: "8px 10px" }}>MV</Link>
        <nav style={{ display: "flex", gap: 8, flexWrap: isMobile ? "nowrap" : "wrap", overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch", paddingBottom: isMobile ? 4 : 0 }}>
          {nav.map((item) => {
            const active = item.href === "/sales" ? pathname.startsWith("/sales") || pathname.startsWith("/dashboard/sales") : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`app-nav-link ${active ? "active" : ""}`} style={{ whiteSpace: "nowrap", minHeight: 42, display: "inline-flex", alignItems: "center" }}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        {!isMobile ? <div style={{ marginLeft: "auto", fontSize: 13, color: "#6b7280", display: "flex", gap: 8, alignItems: "center" }}>
          <span>User: {me ? `${me.fullName} (${me.role})` : "Chưa đăng nhập"}</span>
          {me ? <button onClick={logout} style={{ border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}>Thoát</button> : <Link href="/login">Đăng nhập</Link>}
        </div> : null}
      </div>
    </header>
  );
}
