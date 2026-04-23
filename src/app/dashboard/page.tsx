"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAppSettings } from "@/lib/appSettings";

const rows: { model: string; supplier: string; sold: number; buy: number; repair: number; sale: number; profit: number; profitDay: number; suggestion: string }[] = [];

const vnd = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n);

const kpi = {
  monthlyProfit: 0,
  soldCount: 0,
  avgProfit: 0,
  stockCount: 0,
  inventoryCapital: 0,
  cashOnHand: 0,
  ownerTotalExpense: 0,
};

const saleChannels: { name: string; profit: number; color: string }[] = [];

export default function DashboardPage() {
  const [rangePreset, setRangePreset] = useState<"4W" | "8W" | "12W">("4W");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const s = getAppSettings();
    setRangePreset(s.dashboardDefaultRange || "4W");
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const range = useMemo(() => {
    const dayCount = rangePreset === "8W" ? 56 : rangePreset === "12W" ? 84 : 28;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (dayCount - 1));
    return `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`;
  }, [rangePreset]);

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <section style={box}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select style={input} value={rangePreset} onChange={(e) => setRangePreset(e.target.value as "4W" | "8W" | "12W") }>
            <option value="4W">4 tuần gần nhất</option>
            <option value="8W">8 tuần gần nhất</option>
            <option value="12W">12 tuần gần nhất</option>
          </select>
          <input style={input} readOnly value={`Phạm vi: ${range}`} />
          <select style={input}><option>Model: Tất cả</option><option>Dell 5300</option><option>HP 840 G7</option></select>
          <select style={input}><option>NCC: Tất cả</option><option>NCC A</option><option>NCC B</option></select>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(220px,1fr))", gap: isMobile ? 12 : 10 }}>
        <Kpi title="Tổng lãi tháng" value={vnd(kpi.monthlyProfit)} tone="green" isMobile={isMobile} />
        <Kpi title="Tổng máy bán" value={`${kpi.soldCount} máy`} tone="blue" isMobile={isMobile} />
        <Kpi title="Lãi TB/máy" value={vnd(kpi.avgProfit)} tone="green" isMobile={isMobile} />
        <Kpi title="Tồn kho" value={`${kpi.stockCount} máy`} tone="amber" isMobile={isMobile} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(220px,1fr))", gap: isMobile ? 12 : 10 }}>
        <Kpi title="Vốn đang nằm tiền hàng" value={vnd(kpi.inventoryCapital)} tone="blue" isMobile={isMobile} />
        <Kpi title="Tiền mặt / quỹ hiện có" value={vnd(kpi.cashOnHand)} tone="green" isMobile={isMobile} />
        <Kpi title="Tổng chi về chủ" value={vnd(kpi.ownerTotalExpense)} tone="amber" isMobile={isMobile} />
      </section>
      <div className="small-note" style={{ marginTop: -6 }}>
        Chưa có dữ liệu dashboard. Nhập hàng / bán hàng để bắt đầu.
      </div>

      <section style={box}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Hiệu quả theo Model + Nhà cung cấp</div>
        <div style={{ overflowX: "auto" }}>
          <table className="table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr>
                {["Model", "Nhà cung cấp", "Số máy bán", "Giá nhập TB", "Chi phí sửa TB", "Giá bán TB", "Lãi TB", "Lãi / ngày", "Khuyến nghị nhập"].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={idx}>
                  <td style={td}><Link href={`/dashboard/detail?model=${encodeURIComponent(r.model)}&supplier=${encodeURIComponent(r.supplier)}`}>{r.model}</Link></td>
                  <td style={td}>{r.supplier}</td>
                  <td style={td}>{r.sold}</td>
                  <td style={td}>{vnd(r.buy)}</td>
                  <td style={td}>{vnd(r.repair)}</td>
                  <td style={td}>{vnd(r.sale)}</td>
                  <td style={td}><span className={`status-badge ${r.profit >= 2200000 ? "status-good" : r.profit >= 1800000 ? "status-warn" : "status-bad"}`}>{vnd(r.profit)}</span></td>
                  <td style={td}>{vnd(r.profitDay)}</td>
                  <td style={td}><span className={`status-badge ${r.suggestion === "NÊN" ? "status-good" : "status-bad"}`}>{r.suggestion}</span></td>
                </tr>
              ))}
              {!rows.length ? <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={9}>Chưa có dữ liệu hiệu quả model + nhà cung cấp</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
        <div style={box}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Biểu đồ lãi theo Model + NCC</div>
          <FakeBar label="Dell 5300 - NCC A" width="62%" color="#22c55e" />
          <FakeBar label="Dell 5300 - NCC B" width="74%" color="#16a34a" />
          <FakeBar label="HP 840 G7 - NCC C" width="68%" color="#22c55e" />
        </div>
        <div style={box}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Cơ cấu chi phí</div>
          <Stack label="Nhập" pct={65} color="#ef4444" />
          <Stack label="Sửa" pct={20} color="#f87171" />
          <Stack label="Bảo hành" pct={15} color="#fca5a5" />
        </div>
      </section>

      <section style={box}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Lợi nhuận theo kênh bán hàng</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "240px 1fr", gap: 16, alignItems: "center" }}>
          <ChannelPie data={saleChannels} />
          <div style={{ display: "grid", gap: 8 }}>
            {saleChannels.map((c) => (
              <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 10 }}>
                <span style={{ width: 12, height: 12, borderRadius: 999, background: c.color, display: "inline-block" }} />
                <div style={{ flex: 1, fontWeight: 600 }}>{c.name}</div>
                <div style={{ fontWeight: 800 }}>{vnd(c.profit)}</div>
              </div>
            ))}
            {!saleChannels.length ? <div style={{ color: "#64748b" }}>Chưa có dữ liệu lợi nhuận theo kênh bán hàng.</div> : null}
            <div className="small-note">Kênh bán sẽ mở rộng thêm sau (TikTok, Website, Sàn TMĐT...)</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ title, value, tone, isMobile }: { title: string; value: string; tone: "green" | "blue" | "amber"; isMobile?: boolean }) {
  const bg = tone === "green" ? "#ecfdf5" : tone === "blue" ? "#eff6ff" : "#fffbeb";
  const color = tone === "green" ? "#166534" : tone === "blue" ? "#1d4ed8" : "#92400e";
  return (
    <div style={{ ...box, background: bg, borderColor: "#e2e8f0" }}>
      <div style={{ color: "#6b7280", fontSize: isMobile ? 14 : 13, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: isMobile ? 30 : 34, lineHeight: 1.15, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

function FakeBar({ label, width, color }: { label: string; width: string; color: string }) {
  return <div style={{ marginBottom: 8 }}><div style={{ fontSize: 13, marginBottom: 4 }}>{label}</div><div style={{ height: 10, borderRadius: 999, background: "#e5e7eb" }}><div style={{ width, height: "100%", background: color, borderRadius: 999 }} /></div></div>;
}

function Stack({ label, pct, color }: { label: string; pct: number; color: string }) {
  return <div style={{ marginBottom: 8 }}><div style={{ fontSize: 13, marginBottom: 4 }}>{label} ({pct}%)</div><div style={{ height: 10, borderRadius: 999, background: "#fee2e2" }}><div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 999 }} /></div></div>;
}

function ChannelPie({ data }: { data: { name: string; profit: number; color: string }[] }) {
  const total = data.reduce((s, x) => s + x.profit, 0);
  let acc = 0;
  const segments = data
    .map((x) => {
      const start = (acc / total) * 360;
      acc += x.profit;
      const end = (acc / total) * 360;
      return `${x.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <div style={{ display: "grid", placeItems: "center" }}>
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: "50%",
          background: `conic-gradient(${segments})`,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 44,
            borderRadius: "50%",
            background: "#fff",
            display: "grid",
            placeItems: "center",
            textAlign: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Tổng lợi nhuận</div>
            <div style={{ fontWeight: 900 }}>{vnd(total)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 };
const input: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", background: "#fff" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid #f3f4f6" };
