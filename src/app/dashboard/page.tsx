"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAppSettings } from "@/lib/appSettings";

type Row = { modelId: number; model: string; supplierId: number; supplier: string; sold: number; buy: number; repair: number; sale: number; profit: number; profitDay: number; suggestion: string };
type FilterOption = { id: number; name: string };
type Summary = {
  kpi: { monthlyProfit: number; soldCount: number; avgProfit: number; stockCount: number; inventoryCapital: number; cashOnHand: number; ownerTotalExpense: number; totalRevenue?: number; totalCost?: number; avgDaysInStock?: number };
  filters: { models: FilterOption[]; suppliers: FilterOption[] };
  rows: Row[];
  costStructure: { purchase: number; repair: number; warranty: number; commission: number };
  saleChannels: { name: string; profit: number; color: string }[];
};

const emptySummary: Summary = {
  kpi: { monthlyProfit: 0, soldCount: 0, avgProfit: 0, stockCount: 0, inventoryCapital: 0, cashOnHand: 0, ownerTotalExpense: 0 },
  filters: { models: [], suppliers: [] },
  rows: [],
  costStructure: { purchase: 0, repair: 0, warranty: 0, commission: 0 },
  saleChannels: [],
};

const vnd = (n: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(n || 0);

export default function DashboardPage() {
  const [rangePreset, setRangePreset] = useState<"4W" | "8W" | "12W">("4W");
  const [model, setModel] = useState("ALL");
  const [supplier, setSupplier] = useState("ALL");
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError("");
    const q = new URLSearchParams({ range: rangePreset, model, supplier });
    fetch(`/api/dashboard/summary?${q.toString()}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        setSummary({ ...emptySummary, ...data, kpi: { ...emptySummary.kpi, ...(data.kpi || {}) }, filters: { ...emptySummary.filters, ...(data.filters || {}) }, costStructure: { ...emptySummary.costStructure, ...(data.costStructure || {}) } });
      })
      .catch((e) => { if (e.name !== "AbortError") setError("Không tải được dữ liệu dashboard"); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });
    return () => ctrl.abort();
  }, [rangePreset, model, supplier]);

  const range = useMemo(() => {
    const dayCount = rangePreset === "8W" ? 56 : rangePreset === "12W" ? 84 : 28;
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (dayCount - 1));
    return `${start.toLocaleDateString("vi-VN")} - ${end.toLocaleDateString("vi-VN")}`;
  }, [rangePreset]);

  const hasData = summary.rows.length > 0 || summary.kpi.soldCount > 0;

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
          <select style={input} value={model} onChange={(e) => setModel(e.target.value)}><option value="ALL">Model: Tất cả</option>{summary.filters.models.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <select style={input} value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="ALL">NCC: Tất cả</option>{summary.filters.suppliers.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
          <Link href="/sales" className="primary-btn" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Tạo đơn bán hàng</Link>
        </div>
      </section>

      {error ? <div style={{ ...box, color: "#b91c1c", background: "#fef2f2" }}>⚠️ {error}</div> : null}

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(auto-fit,minmax(220px,1fr))", gap: isMobile ? 12 : 10 }}>
        <Kpi title="Tổng lãi theo kỳ" value={vnd(summary.kpi.monthlyProfit)} tone="green" isMobile={isMobile} />
        <Kpi title="Tổng máy bán" value={`${summary.kpi.soldCount} máy`} tone="blue" isMobile={isMobile} />
        <Kpi title="Lãi TB/máy" value={vnd(summary.kpi.avgProfit)} tone="green" isMobile={isMobile} />
        <Kpi title="Tồn kho" value={`${summary.kpi.stockCount} máy`} tone="amber" isMobile={isMobile} />
      </section>

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fit,minmax(220px,1fr))", gap: isMobile ? 12 : 10 }}>
        <Kpi title="Vốn đang nằm tiền hàng" value={vnd(summary.kpi.inventoryCapital)} tone="blue" isMobile={isMobile} />
        <Kpi title="Tiền mặt / quỹ hiện có" value={vnd(summary.kpi.cashOnHand)} tone="green" isMobile={isMobile} />
        <Kpi title="Tổng chi về chủ" value={vnd(summary.kpi.ownerTotalExpense)} tone="amber" isMobile={isMobile} />
      </section>
      <div className="small-note" style={{ marginTop: -6 }}>
        {loading ? "Đang tải dữ liệu dashboard..." : hasData ? `Dữ liệu bán hàng/NCC đang tính theo kỳ ${range}.` : "Chưa có dữ liệu bán hàng trong kỳ đã chọn."}
      </div>

      <section style={box}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Hiệu quả theo Model + Nhà cung cấp</div>
        <div style={{ overflowX: "auto" }}>
          <table className="table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr>{["Model", "Nhà cung cấp", "Số máy bán", "Giá nhập TB", "Chi phí sửa TB", "Giá bán TB", "Lãi TB", "Lãi / ngày", "Khuyến nghị nhập"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {summary.rows.map((r) => (
                <tr key={`${r.modelId}-${r.supplierId}`}>
                  <td style={td}><Link href={`/dashboard/detail?model=${encodeURIComponent(r.model)}&supplier=${encodeURIComponent(r.supplier)}`}>{r.model}</Link></td>
                  <td style={td}>{r.supplier}</td><td style={td}>{r.sold}</td><td style={td}>{vnd(r.buy)}</td><td style={td}>{vnd(r.repair)}</td><td style={td}>{vnd(r.sale)}</td>
                  <td style={td}><span className={`status-badge ${r.profit >= 2200000 ? "status-good" : r.profit >= 1800000 ? "status-warn" : "status-bad"}`}>{vnd(r.profit)}</span></td>
                  <td style={td}>{vnd(r.profitDay)}</td><td style={td}><span className={`status-badge ${r.suggestion === "NÊN" ? "status-good" : r.suggestion === "CÂN NHẮC" ? "status-warn" : "status-bad"}`}>{r.suggestion}</span></td>
                </tr>
              ))}
              {!summary.rows.length ? <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={9}>{loading ? "Đang tải..." : "Chưa có dữ liệu hiệu quả model + nhà cung cấp"}</td></tr> : null}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
        <div style={box}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Biểu đồ lãi theo Model + NCC</div>
          {summary.rows.length ? <BarRows rows={summary.rows.slice(0, 8)} /> : <div style={{ color: "#64748b" }}>Chưa có dữ liệu để hiển thị biểu đồ.</div>}
        </div>
        <div style={box}>
          <div style={{ fontWeight: 700, marginBottom: 10 }}>Cơ cấu chi phí</div>
          <CostBars data={summary.costStructure} />
        </div>
      </section>

      <section style={box}>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Lợi nhuận theo kênh bán hàng</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "240px 1fr", gap: 16, alignItems: "center" }}>
          <ChannelPie data={summary.saleChannels} />
          <div style={{ display: "grid", gap: 8 }}>
            {summary.saleChannels.map((c) => <div key={c.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 10 }}><span style={{ width: 12, height: 12, borderRadius: 999, background: c.color, display: "inline-block" }} /><div style={{ flex: 1, fontWeight: 600 }}>{c.name}</div><div style={{ fontWeight: 800 }}>{vnd(c.profit)}</div></div>)}
            {!summary.saleChannels.length ? <div style={{ color: "#64748b" }}>Chưa có dữ liệu lợi nhuận theo kênh bán hàng.</div> : null}
            <div className="small-note">Kênh bán lấy từ đơn bán hàng trong phần Bán hàng.</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Kpi({ title, value, tone, isMobile }: { title: string; value: string; tone: "green" | "blue" | "amber"; isMobile?: boolean }) {
  const bg = tone === "green" ? "#ecfdf5" : tone === "blue" ? "#eff6ff" : "#fffbeb";
  const color = tone === "green" ? "#166534" : tone === "blue" ? "#1d4ed8" : "#92400e";
  return <div style={{ ...box, background: bg, borderColor: "#e2e8f0" }}><div style={{ color: "#6b7280", fontSize: isMobile ? 14 : 13, marginBottom: 6 }}>{title}</div><div style={{ fontSize: isMobile ? 30 : 34, lineHeight: 1.15, fontWeight: 900, color }}>{value}</div></div>;
}

function BarRows({ rows }: { rows: Row[] }) {
  const max = Math.max(1, ...rows.map((r) => Math.abs(r.profit)));
  return <div style={{ display: "grid", gap: 8 }}>{rows.map((r) => <div key={`${r.modelId}-${r.supplierId}`}><div style={{ fontSize: 13, marginBottom: 3 }}>{r.model} / {r.supplier} - {vnd(r.profit)}</div><div style={{ height: 12, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}><div style={{ width: `${Math.round((Math.abs(r.profit) / max) * 100)}%`, height: "100%", background: r.profit >= 0 ? "#22c55e" : "#ef4444" }} /></div></div>)}</div>;
}

function CostBars({ data }: { data: Summary["costStructure"] }) {
  const rows = [{ label: "Giá nhập", value: data.purchase, color: "#3b82f6" }, { label: "Sửa chữa", value: data.repair, color: "#f59e0b" }, { label: "Bảo hành", value: data.warranty, color: "#ef4444" }, { label: "Hoa hồng", value: data.commission, color: "#8b5cf6" }];
  const total = rows.reduce((s, x) => s + x.value, 0);
  if (!total) return <div style={{ color: "#64748b" }}>Chưa có dữ liệu để hiển thị cơ cấu chi phí.</div>;
  return <div style={{ display: "grid", gap: 8 }}>{rows.map((x) => <div key={x.label}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span>{x.label}</span><b>{vnd(x.value)}</b></div><div style={{ height: 12, borderRadius: 999, background: "#e5e7eb", overflow: "hidden" }}><div style={{ width: `${Math.round((x.value / total) * 100)}%`, height: "100%", background: x.color }} /></div></div>)}</div>;
}

function ChannelPie({ data }: { data: { name: string; profit: number; color: string }[] }) {
  const total = data.reduce((s, x) => s + Math.max(0, x.profit), 0);
  if (!total) return <div style={{ display: "grid", placeItems: "center" }}><div style={{ width: 200, height: 200, borderRadius: "50%", background: "#f1f5f9", display: "grid", placeItems: "center", color: "#64748b", textAlign: "center", padding: 16 }}>Chưa có dữ liệu</div></div>;
  const segments = data.reduce((parts, x) => {
    const safeProfit = Math.max(0, x.profit);
    const previous = parts.total;
    const next = previous + safeProfit;
    return { total: next, values: [...parts.values, `${x.color} ${(previous / total) * 360}deg ${(next / total) * 360}deg`] };
  }, { total: 0, values: [] as string[] }).values.join(", ");
  return <div style={{ display: "grid", placeItems: "center" }}><div style={{ width: 200, height: 200, borderRadius: "50%", background: `conic-gradient(${segments})`, position: "relative" }}><div style={{ position: "absolute", inset: 44, borderRadius: "50%", background: "#fff", display: "grid", placeItems: "center", textAlign: "center" }}><div><div style={{ fontSize: 12, color: "#64748b" }}>Tổng lợi nhuận</div><div style={{ fontWeight: 900 }}>{vnd(total)}</div></div></div></div></div>;
}

const box: React.CSSProperties = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 };
const input: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 10px", background: "#fff" };
const th: React.CSSProperties = { textAlign: "left", padding: "8px 6px", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "8px 6px", borderBottom: "1px solid #f3f4f6" };
