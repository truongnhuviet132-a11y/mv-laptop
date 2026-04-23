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

export default function AppHeader() {
  const pathname = usePathname();
  const [isMobile, setIsMobile] = useState(false);
  if (pathname === "/login") return null;

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <header style={{ borderBottom: "1px solid #e5e7eb", background: "#fff", position: "sticky", top: 0, zIndex: 10 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "10px 16px", display: "flex", gap: 16, alignItems: "center" }}>
        <Link href="/dashboard" style={{ fontWeight: 800, textDecoration: "none", color: "#111827" }}>MV</Link>
        <nav style={{ display: "flex", gap: 8, flexWrap: isMobile ? "nowrap" : "wrap", overflowX: isMobile ? "auto" : "visible", WebkitOverflowScrolling: "touch", paddingBottom: isMobile ? 4 : 0 }}>
          {nav.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} className={`app-nav-link ${active ? "active" : ""}`} style={{ whiteSpace: "nowrap", minHeight: 42, display: "inline-flex", alignItems: "center" }}>
                {item.label}
              </Link>
            );
          })}
        </nav>
        {!isMobile ? <div style={{ marginLeft: "auto", fontSize: 13, color: "#6b7280" }}>User: Admin</div> : null}
      </div>
    </header>
  );
}
