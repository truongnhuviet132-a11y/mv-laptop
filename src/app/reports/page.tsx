"use client";

import { useEffect, useMemo, useState } from "react";
import { getAppSettings, saveAppSettings } from "@/lib/appSettings";

type Row = {
  month: string;
  modelId: number;
  model: string;
  supplierId: number;
  supplier: string;
  importedQty: number;
  soldQty: number;
  avgPurchase: number;
  avgRepair: number;
  avgSale: number;
  avgCommission: number;
  avgWarranty: number;
  avgProfitPerItem: number;
  totalNetProfit: number;
  repairRate: number;
  warrantyRate: number;
  avgDaysInStock: number;
  profitPerDay: number;
};

type SortKey = keyof Row | "errorRate" | "suggestion";

type ReportFilterState = {
  month: string;
  model: string;
  supplier: string;
  profitMin: number;
  profitMax: number;
  errorMax: number;
  cfgProfitGood: number;
  cfgProfitBad: number;
  cfgErrorGood: number;
  cfgErrorBad: number;
  cfgTurnoverGood: number;
};

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(Math.round(n || 0))} đ`;
const pct = (n: number) => `${Number(n || 0).toFixed(2)}%`;
const REPORT_FILTER_STORAGE_KEY = "mv-laptop:reports:filters:v1";
const DEFAULT_FILTERS: ReportFilterState = { month: "", model: "ALL", supplier: "ALL", profitMin: 0, profitMax: 999999999, errorMax: 100, cfgProfitGood: 2000000, cfgProfitBad: 1000000, cfgErrorGood: 25, cfgErrorBad: 50, cfgTurnoverGood: 14 };
const safeNumber = (v: unknown, fallback: number) => { const n = Number(v); return Number.isFinite(n) ? n : fallback; };
function readSavedFilters(): Partial<ReportFilterState> {
  if (typeof window === "undefined") return {};
  const saved: Partial<ReportFilterState> = {};
  try { const raw = window.localStorage.getItem(REPORT_FILTER_STORAGE_KEY); if (raw) Object.assign(saved, JSON.parse(raw)); } catch {}
  const q = new URLSearchParams(window.location.search);
  if (q.get("month")) saved.month = q.get("month") || undefined;
  if (q.get("model")) saved.model = q.get("model") || "ALL";
  if (q.get("supplier")) saved.supplier = q.get("supplier") || "ALL";
  if (q.get("profitMin") != null) saved.profitMin = safeNumber(q.get("profitMin"), DEFAULT_FILTERS.profitMin);
  if (q.get("profitMax") != null) saved.profitMax = safeNumber(q.get("profitMax"), DEFAULT_FILTERS.profitMax);
  if (q.get("errorMax") != null) saved.errorMax = safeNumber(q.get("errorMax"), DEFAULT_FILTERS.errorMax);
  if (q.get("cfgProfitGood") != null) saved.cfgProfitGood = safeNumber(q.get("cfgProfitGood"), DEFAULT_FILTERS.cfgProfitGood);
  if (q.get("cfgProfitBad") != null) saved.cfgProfitBad = safeNumber(q.get("cfgProfitBad"), DEFAULT_FILTERS.cfgProfitBad);
  if (q.get("cfgErrorGood") != null) saved.cfgErrorGood = safeNumber(q.get("cfgErrorGood"), DEFAULT_FILTERS.cfgErrorGood);
  if (q.get("cfgErrorBad") != null) saved.cfgErrorBad = safeNumber(q.get("cfgErrorBad"), DEFAULT_FILTERS.cfgErrorBad);
  if (q.get("cfgTurnoverGood") != null) saved.cfgTurnoverGood = safeNumber(q.get("cfgTurnoverGood"), DEFAULT_FILTERS.cfgTurnoverGood);
  return saved;
}
function persistFilters(filters: ReportFilterState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REPORT_FILTER_STORAGE_KEY, JSON.stringify(filters));
  const q = new URLSearchParams(window.location.search);
  q.set("month", filters.month); q.set("model", filters.model); q.set("supplier", filters.supplier);
  q.set("profitMin", String(filters.profitMin)); q.set("profitMax", String(filters.profitMax)); q.set("errorMax", String(filters.errorMax));
  q.set("cfgProfitGood", String(filters.cfgProfitGood)); q.set("cfgProfitBad", String(filters.cfgProfitBad));
  q.set("cfgErrorGood", String(filters.cfgErrorGood)); q.set("cfgErrorBad", String(filters.cfgErrorBad)); q.set("cfgTurnoverGood", String(filters.cfgTurnoverGood));
  window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
}

function suggestion(row: Row, cfg: { profitGood: number; profitBad: number; errorGood: number; errorBad: number }) {
  const errorRate = row.repairRate + row.warrantyRate;
  if (row.avgProfitPerItem >= cfg.profitGood && errorRate <= cfg.errorGood) return "NÊN NHẬP";
  if (row.avgProfitPerItem < cfg.profitBad || errorRate >= cfg.errorBad) return "KHÔNG NÊN";
  return "CÂN NHẮC";
}

function profitTone(v: number, cfg: { profitGood: number; profitBad: number }) {
  if (v < cfg.profitBad) return { bg: "#fef2f2", color: "#b91c1c" };
  if (v < cfg.profitGood) return { bg: "#fef9c3", color: "#92400e" };
  return { bg: "#ecfdf5", color: "#166534" };
}

function suggestionTone(v: string) {
  if (v === "NÊN NHẬP") return { row: "#ecfdf5", badgeBg: "#dcfce7", badgeColor: "#166534", badgeText: "🟢 NÊN" };
  if (v === "KHÔNG NÊN") return { row: "#fef2f2", badgeBg: "#fee2e2", badgeColor: "#b91c1c", badgeText: "🔴 KHÔNG NÊN" };
  return { row: "#fefce8", badgeBg: "#fef9c3", badgeColor: "#92400e", badgeText: "🟡 CÂN NHẮC" };
}

export default function ReportsPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [month, setMonth] = useState("2026-03");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const [draftModel, setDraftModel] = useState("ALL");
  const [draftSupplier, setDraftSupplier] = useState("ALL");
  const [draftProfitMin, setDraftProfitMin] = useState(0);
  const [draftProfitMax, setDraftProfitMax] = useState(999999999);
  const [draftErrorMax, setDraftErrorMax] = useState(100);

  const [model, setModel] = useState("ALL");
  const [supplier, setSupplier] = useState("ALL");
  const [profitMin, setProfitMin] = useState(0);
  const [profitMax, setProfitMax] = useState(999999999);
  const [errorMax, setErrorMax] = useState(100);

  const [sortKey, setSortKey] = useState<SortKey>("totalNetProfit");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [cfgProfitGood, setCfgProfitGood] = useState(2000000);
  const [cfgProfitBad, setCfgProfitBad] = useState(1000000);
  const [cfgErrorGood, setCfgErrorGood] = useState(25);
  const [cfgErrorBad, setCfgErrorBad] = useState(50);
  const [cfgTurnoverGood, setCfgTurnoverGood] = useState(14);

  const [selected, setSelected] = useState<Row | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [hydratedFilters, setHydratedFilters] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const s = getAppSettings();
    const nowMonth = new Date().toISOString().slice(0, 7);
    const saved = readSavedFilters();
    const restored: ReportFilterState = {
      month: saved.month || nowMonth,
      model: saved.model || DEFAULT_FILTERS.model,
      supplier: saved.supplier || DEFAULT_FILTERS.supplier,
      profitMin: safeNumber(saved.profitMin, DEFAULT_FILTERS.profitMin),
      profitMax: safeNumber(saved.profitMax, DEFAULT_FILTERS.profitMax),
      errorMax: safeNumber(saved.errorMax, DEFAULT_FILTERS.errorMax),
      cfgProfitGood: safeNumber(saved.cfgProfitGood, s.reportProfitGood),
      cfgProfitBad: safeNumber(saved.cfgProfitBad, s.reportProfitBad),
      cfgErrorGood: safeNumber(saved.cfgErrorGood, s.reportErrorGood),
      cfgErrorBad: safeNumber(saved.cfgErrorBad, s.reportErrorBad),
      cfgTurnoverGood: safeNumber(saved.cfgTurnoverGood, s.reportTurnoverGood),
    };
    setMonth(restored.month);
    setDraftModel(restored.model);
    setDraftSupplier(restored.supplier);
    setDraftProfitMin(restored.profitMin);
    setDraftProfitMax(restored.profitMax);
    setDraftErrorMax(restored.errorMax);
    setModel(restored.model);
    setSupplier(restored.supplier);
    setProfitMin(restored.profitMin);
    setProfitMax(restored.profitMax);
    setErrorMax(restored.errorMax);
    setCfgProfitGood(restored.cfgProfitGood);
    setCfgProfitBad(restored.cfgProfitBad);
    setCfgErrorGood(restored.cfgErrorGood);
    setCfgErrorBad(restored.cfgErrorBad);
    setCfgTurnoverGood(restored.cfgTurnoverGood);
    setHydratedFilters(true);
  }, []);

  useEffect(() => {
    if (!hydratedFilters) return;
    persistFilters({ month, model, supplier, profitMin, profitMax, errorMax, cfgProfitGood, cfgProfitBad, cfgErrorGood, cfgErrorBad, cfgTurnoverGood });
  }, [month, model, supplier, profitMin, profitMax, errorMax, cfgProfitGood, cfgProfitBad, cfgErrorGood, cfgErrorBad, cfgTurnoverGood, hydratedFilters]);

  useEffect(() => {
    if (!hydratedFilters) return;
    const load = async () => {
      setLoading(true);
      const res = await fetch(`/api/reports/model-supplier-performance?month=${month}`);
      const data = await res.json();
      setRows(data.rows || []);
      setLoading(false);
      setSelected(null);
      setShowDetail(false);
      setDetail(null);
    };
    load();
  }, [month, hydratedFilters]);

  const modelOptions = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((r) => r.model)))], [rows]);
  const supplierOptions = useMemo(() => ["ALL", ...Array.from(new Set(rows.map((r) => r.supplier)))], [rows]);

  const filtered = useMemo(() => rows.filter((r) => {
    const errorRate = r.repairRate + r.warrantyRate;
    if (model !== "ALL" && r.model !== model) return false;
    if (supplier !== "ALL" && r.supplier !== supplier) return false;
    if (r.avgProfitPerItem < profitMin || r.avgProfitPerItem > profitMax) return false;
    if (errorRate > errorMax) return false;
    return true;
  }), [rows, model, supplier, profitMin, profitMax, errorMax]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      const av = sortKey === "errorRate" ? a.repairRate + a.warrantyRate : sortKey === "suggestion" ? suggestion(a, { profitGood: cfgProfitGood, profitBad: cfgProfitBad, errorGood: cfgErrorGood, errorBad: cfgErrorBad }) : (a as any)[sortKey];
      const bv = sortKey === "errorRate" ? b.repairRate + b.warrantyRate : sortKey === "suggestion" ? suggestion(b, { profitGood: cfgProfitGood, profitBad: cfgProfitBad, errorGood: cfgErrorGood, errorBad: cfgErrorBad }) : (b as any)[sortKey];
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [filtered, sortKey, sortDir, cfgProfitGood, cfgProfitBad, cfgErrorGood, cfgErrorBad]);

  const onSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  const topModel = sorted.reduce((best, x) => {
    if (!best) return x;
    const eb = best.repairRate + best.warrantyRate;
    const ex = x.repairRate + x.warrantyRate;
    const scoreB = best.avgProfitPerItem - eb * 25000;
    const scoreX = x.avgProfitPerItem - ex * 25000;
    return scoreX > scoreB ? x : best;
  }, null as Row | null);
  const topSupplier = sorted.reduce((best, x) => (!best || x.totalNetProfit > best.totalNetProfit ? x : best), null as Row | null);
  const avoidModel = sorted.reduce((worst, x) => {
    if (!worst) return x;
    const ew = worst.repairRate + worst.warrantyRate;
    const ex = x.repairRate + x.warrantyRate;
    const scoreW = ew * 30000 - worst.avgProfitPerItem;
    const scoreX = ex * 30000 - x.avgProfitPerItem;
    return scoreX > scoreW ? x : worst;
  }, null as Row | null);

  const chartProfitRows = useMemo(() => [...sorted].sort((a, b) => (b.profitPerDay || 0) - (a.profitPerDay || 0)), [sorted]);

  const costRows = sorted.map((r) => ({
     label: `${r.model} / ${r.supplier}`,
     purchase: r.avgPurchase * r.importedQty,
     repair: r.avgRepair * r.importedQty,
     warranty: r.avgWarranty * r.soldQty,
     commission: r.avgCommission * r.soldQty,
   }));

  const chartCostRows = useMemo(() => [...costRows].sort((a, b) => (b.purchase + b.repair + b.warranty + b.commission) - (a.purchase + a.repair + a.warranty + a.commission)), [costRows]);
  const maxProfitPerDay = Math.max(1, ...chartProfitRows.map((r) => r.profitPerDay || 0));


  const applyFilters = () => {
    const nextFilters: ReportFilterState = { month, model: draftModel, supplier: draftSupplier, profitMin: draftProfitMin, profitMax: draftProfitMax, errorMax: draftErrorMax, cfgProfitGood, cfgProfitBad, cfgErrorGood, cfgErrorBad, cfgTurnoverGood };
    setModel(nextFilters.model);
    setSupplier(nextFilters.supplier);
    setProfitMin(nextFilters.profitMin);
    setProfitMax(nextFilters.profitMax);
    setErrorMax(nextFilters.errorMax);
    persistFilters(nextFilters);
    const s = getAppSettings();
    saveAppSettings({ ...s, reportProfitGood: cfgProfitGood, reportProfitBad: cfgProfitBad, reportErrorGood: cfgErrorGood, reportErrorBad: cfgErrorBad, reportTurnoverGood: cfgTurnoverGood });
  };

  const resetFilters = () => {
    setDraftModel("ALL");
    setDraftSupplier("ALL");
    setDraftProfitMin(0);
    setDraftProfitMax(999999999);
    setDraftErrorMax(100);
    setModel("ALL");
    setSupplier("ALL");
    setProfitMin(0);
    setProfitMax(999999999);
    setErrorMax(100);
    setCfgProfitGood(DEFAULT_FILTERS.cfgProfitGood);
    setCfgProfitBad(DEFAULT_FILTERS.cfgProfitBad);
    setCfgErrorGood(DEFAULT_FILTERS.cfgErrorGood);
    setCfgErrorBad(DEFAULT_FILTERS.cfgErrorBad);
    setCfgTurnoverGood(DEFAULT_FILTERS.cfgTurnoverGood);
    persistFilters({ ...DEFAULT_FILTERS, month });
    const s = getAppSettings();
    saveAppSettings({ ...s, reportProfitGood: DEFAULT_FILTERS.cfgProfitGood, reportProfitBad: DEFAULT_FILTERS.cfgProfitBad, reportErrorGood: DEFAULT_FILTERS.cfgErrorGood, reportErrorBad: DEFAULT_FILTERS.cfgErrorBad, reportTurnoverGood: DEFAULT_FILTERS.cfgTurnoverGood });
  };

  const loadDetail = async () => {
    if (!selected) return;
    setShowDetail(true);
    setDetail(null);
    const q = new URLSearchParams({ month, modelId: String(selected.modelId), supplierId: String(selected.supplierId) });
    const res = await fetch(`/api/reports/model-supplier-detail?${q.toString()}`);
    const data = await res.json();
    setDetail(data);
  };

  const headers: Array<[SortKey, string]> = [
    ["model", "Model"], ["supplier", "NCC"], ["importedQty", "SL nhập"], ["soldQty", "SL bán"], ["avgPurchase", "Giá nhập TB"],
    ["avgRepair", "Chi phí sửa TB"], ["avgWarranty", "Chi phí bảo hành TB"], ["avgSale", "Giá bán TB"], ["avgProfitPerItem", "Lãi TB/máy"],
    ["totalNetProfit", "Tổng lãi"], ["errorRate", "Tỷ lệ lỗi"], ["avgDaysInStock", "Vòng quay (ngày tồn)"], ["suggestion", "Gợi ý nhập"],
  ];

  const sortIcon = (k: SortKey) => (sortKey !== k ? "↕" : sortDir === "asc" ? "↑" : "↓");

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 10 }}>
        <QuickBox title="Model tốt nhất" value={topModel ? topModel.model : "-"} sub={topModel ? `${money(topModel.avgProfitPerItem)} / máy` : "Không có dữ liệu"} tone="good" />
        <QuickBox title="NCC tốt nhất" value={topSupplier ? topSupplier.supplier : "-"} sub={topSupplier ? `Tổng lãi ${money(topSupplier.totalNetProfit)}` : "Không có dữ liệu"} tone="good" />
        <QuickBox title="Model nên tránh" value={avoidModel ? avoidModel.model : "-"} sub={avoidModel ? `${money(avoidModel.avgProfitPerItem)} / máy` : "Không có dữ liệu"} tone="bad" />
      </section>

      <section className="panel" style={{ padding: 14, boxShadow: "0 6px 16px rgba(15,23,42,0.06)" }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>Bộ lọc quyết định nhập hàng</div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(6,minmax(0,1fr))", gap: 8 }}>
          <label style={lab}>Tháng<input className="input-clean" type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></label>
          <label style={lab}>Model<select className="input-clean" value={draftModel} onChange={(e) => setDraftModel(e.target.value)}>{modelOptions.map((x) => <option key={x} value={x}>{x === "ALL" ? "Tất cả" : x}</option>)}</select></label>
          <label style={lab}>NCC<select className="input-clean" value={draftSupplier} onChange={(e) => setDraftSupplier(e.target.value)}>{supplierOptions.map((x) => <option key={x} value={x}>{x === "ALL" ? "Tất cả" : x}</option>)}</select></label>
          <label style={lab}>Lãi từ<input className="input-clean" type="number" value={draftProfitMin} onChange={(e) => setDraftProfitMin(Number(e.target.value || 0))} /></label>
          <label style={lab}>Lãi đến<input className="input-clean" type="number" value={draftProfitMax} onChange={(e) => setDraftProfitMax(Number(e.target.value || 0))} /></label>
          <label style={lab}>Tỷ lệ lỗi tối đa (%)<input className="input-clean" type="number" value={draftErrorMax} onChange={(e) => setDraftErrorMax(Number(e.target.value || 0))} /></label>
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(5,minmax(0,1fr))", gap: 8 }}>
          <label style={lab}>Ngưỡng lãi tốt<input className="input-clean" type="number" value={cfgProfitGood} onChange={(e) => setCfgProfitGood(Number(e.target.value || 0))} /></label>
          <label style={lab}>Ngưỡng lãi thấp<input className="input-clean" type="number" value={cfgProfitBad} onChange={(e) => setCfgProfitBad(Number(e.target.value || 0))} /></label>
          <label style={lab}>Ngưỡng lỗi tốt (%)<input className="input-clean" type="number" value={cfgErrorGood} onChange={(e) => setCfgErrorGood(Number(e.target.value || 0))} /></label>
          <label style={lab}>Ngưỡng lỗi xấu (%)<input className="input-clean" type="number" value={cfgErrorBad} onChange={(e) => setCfgErrorBad(Number(e.target.value || 0))} /></label>
          <label style={lab}>Ngưỡng vòng quay tốt (ngày)<input className="input-clean" type="number" value={cfgTurnoverGood} onChange={(e) => setCfgTurnoverGood(Number(e.target.value || 0))} /></label>
        </div>
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button className="primary-btn" onClick={applyFilters}>ÁP DỤNG</button>
          <button className="action-btn" onClick={resetFilters}>RESET</button>
        </div>
      </section>

      <section className="panel" style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>Bảng Model + NCC {loading ? "(đang tải...)" : ""}</div>
        {!sorted.length ? (
          <div style={{ textAlign: "center", color: "#64748b", padding: "24px 8px" }}>Chưa có dữ liệu. Hãy chọn tháng hoặc nhập liệu trước.</div>
        ) : (
          <div style={{ overflow: "auto", maxHeight: 440 }}>
            <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {headers.map(([k, t]) => (
                    <th key={k} style={th} onClick={() => onSort(k)}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {t}
                        <span style={{ fontSize: 12, color: sortKey === k ? "#1d4ed8" : "#64748b", fontWeight: 900 }}>{sortIcon(k)}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r, i) => {
                  const errorRate = Number((r.repairRate + r.warrantyRate).toFixed(2));
                  const sg = suggestion(r, { profitGood: cfgProfitGood, profitBad: cfgProfitBad, errorGood: cfgErrorGood, errorBad: cfgErrorBad });
                  const p = profitTone(r.avgProfitPerItem, { profitGood: cfgProfitGood, profitBad: cfgProfitBad });
                  const selectedRow = selected && selected.modelId === r.modelId && selected.supplierId === r.supplierId;
                  const sgTone = suggestionTone(sg);
                  return (
                    <tr
                      key={`${r.modelId}-${r.supplierId}`}
                      onClick={() => { setSelected(r); setShowDetail(false); }}
                      style={{
                        background: selectedRow ? "#dbeafe" : sgTone.row,
                        boxShadow: selectedRow ? "inset 0 0 0 2px #60a5fa" : "none",
                        cursor: "pointer",
                      }}
                    >
                      <td style={td}>{r.model}</td>
                      <td style={td}>{r.supplier}</td>
                      <td style={td}>{r.importedQty}</td>
                      <td style={td}>{r.soldQty}</td>
                      <td style={td}>{money(r.avgPurchase)}</td>
                      <td style={td}>{money(r.avgRepair)}</td>
                      <td style={td}>{money(r.avgWarranty)}</td>
                      <td style={td}>{money(r.avgSale)}</td>
                      <td title={`Lãi = Giá bán TB - Giá nhập TB - Chi phí sửa TB - Chi phí BH TB - Hoa hồng TB\n= ${money(r.avgSale)} - ${money(r.avgPurchase)} - ${money(r.avgRepair)} - ${money(r.avgWarranty)} - ${money(r.avgCommission)}`} style={{ ...td, background: p.bg, color: p.color, fontWeight: 800 }}>{money(r.avgProfitPerItem)}</td>
                      <td style={td}>{money(r.totalNetProfit)}</td>
                      <td style={{ ...td, background: errorRate > cfgErrorBad ? "#fef9c3" : undefined }}>{pct(errorRate)}</td>
                      <td style={{ ...td, background: r.avgDaysInStock <= cfgTurnoverGood ? "#ecfdf5" : undefined }}>{r.avgDaysInStock.toFixed(2)}</td>
                      <td style={td}><span style={{ display: "inline-block", padding: "4px 8px", borderRadius: 999, fontWeight: 800, background: sgTone.badgeBg, color: sgTone.badgeColor }}>{sgTone.badgeText}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Biểu đồ lãi theo Model + NCC (profit/day)</div>
          {chartProfitRows.slice(0, 12).map((r, idx) => (
            <div key={`${r.modelId}-${r.supplierId}`} style={{ marginBottom: 8, border: idx === 0 ? "1px solid #22c55e" : "1px solid transparent", borderRadius: 8, padding: idx === 0 ? 6 : 0, background: idx === 0 ? "#f0fdf4" : "transparent" }}>
              <div style={{ fontSize: 13, marginBottom: 3 }}>{r.model} / {r.supplier} - {money(r.profitPerDay || 0)}/ngày</div>
              <div style={{ height: 10, borderRadius: 999, background: "#e5e7eb" }}>
                <div style={{ height: "100%", width: `${Math.max(4, Math.round(((r.profitPerDay || 0) / maxProfitPerDay) * 100))}%`, borderRadius: 999, background: "#16a34a" }} />
              </div>
            </div>
          ))}
        </div>

        <div className="panel" style={{ padding: 12 }}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Cơ cấu chi phí (stack)</div>
          {chartCostRows.slice(0, 12).map((x, i) => {
            const total = Math.max(1, x.purchase + x.repair + x.warranty + x.commission);
            return (
              <div key={`${x.label}-${i}`} style={{ marginBottom: 8, border: i === 0 ? "1px solid #64748b" : "1px solid transparent", borderRadius: 8, padding: i === 0 ? 6 : 0, background: i === 0 ? "#f8fafc" : "transparent" }}>
                <div style={{ fontSize: 13, marginBottom: 3 }}>{x.label}</div>
                <div style={{ display: "flex", height: 10, borderRadius: 999, overflow: "hidden", background: "#e5e7eb" }}>
                  <div style={{ width: `${Math.round((x.purchase / total) * 100)}%`, background: "#64748b" }} />
                  <div style={{ width: `${Math.round((x.repair / total) * 100)}%`, background: "#f59e0b" }} />
                  <div style={{ width: `${Math.round((x.warranty / total) * 100)}%`, background: "#ef4444" }} />
                  <div style={{ width: `${Math.round((x.commission / total) * 100)}%`, background: "#7c3aed" }} />
                </div>
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12, color: "#334155", marginTop: 6 }}>
            <span>■ Nhập</span><span style={{ color: "#f59e0b" }}>■ Sửa</span><span style={{ color: "#ef4444" }}>■ Bảo hành</span><span style={{ color: "#7c3aed" }}>■ Hoa hồng</span>
          </div>
        </div>
      </section>

      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontWeight: 900, fontSize: 20 }}>Drill down</div>
          <button className="primary-btn" disabled={!selected} onClick={loadDetail}>Xem chi tiết máy</button>
        </div>
        {!selected ? (
          <div style={{ color: "#64748b" }}>Chọn 1 dòng trong bảng để bật drill down.</div>
        ) : showDetail && !detail ? (
          <div>Đang tải chi tiết...</div>
        ) : showDetail && detail ? (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ overflow: "auto" }}>
              <div style={sub}>Danh sách máy</div>
              <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr>{["Mã", "Serial", "Ngày nhập", "Ngày bán", "Giá nhập", "Giá bán", "Lãi", "Trạng thái", "Timeline"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>{detail.items.map((x: any) => {
                  const p = profitTone(x.netProfit || 0, { profitGood: cfgProfitGood, profitBad: cfgProfitBad });
                  const rCount = (detail.repairs || []).filter((r: any) => r.itemId === x.id).length;
                  const wCount = (detail.warranties || []).filter((w: any) => w.itemId === x.id).length;
                  return <tr key={x.id}>
                    <td style={td}>{x.code}</td>
                    <td style={td}>{x.serial || "-"}</td>
                    <td style={td}>{x.purchaseDate}</td>
                    <td style={td}>{x.soldAt || "-"}</td>
                    <td style={td}>{money(x.purchasePrice)}</td>
                    <td style={td}>{x.salePrice ? money(x.salePrice) : "-"}</td>
                    <td style={{ ...td, background: x.netProfit != null ? p.bg : undefined, color: x.netProfit != null ? p.color : undefined, fontWeight: 800 }}>{x.netProfit != null ? money(x.netProfit) : "-"}</td>
                    <td style={td}>{x.status}</td>
                    <td style={td}>Nhập {x.purchaseDate} → Sửa {rCount} lần → {x.soldAt ? `Bán ${x.soldAt}` : "Chưa bán"} → BH {wCount} lần</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              <div style={{ overflow: "auto" }}>
                <div style={sub}>Sửa chữa</div>
                <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr>{["Mã máy", "Ngày", "Loại", "Chi phí", "Ghi chú"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>{detail.repairs.map((x: any) => <tr key={x.id}><td style={td}>{x.itemCode}</td><td style={td}>{x.date}</td><td style={td}>{x.type}</td><td style={td}>{money(x.totalCost)}</td><td style={td}>{x.note || "-"}</td></tr>)}</tbody>
                </table>
              </div>
              <div style={{ overflow: "auto" }}>
                <div style={sub}>Bảo hành</div>
                <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                  <thead><tr>{["Mã máy", "Ngày", "Lỗi", "Chi phí", "Ai chịu"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                  <tbody>{detail.warranties.map((x: any) => <tr key={x.id}><td style={td}>{x.itemCode}</td><td style={td}>{x.date}</td><td style={td}>{x.issue}</td><td style={td}>{money(x.shopShareAmount)}</td><td style={td}>{x.payer || "-"}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: "#64748b" }}>Nhấn “Xem chi tiết máy” để mở dữ liệu chi tiết.</div>
        )}
      </section>
    </div>
  );
}

function QuickBox({ title, value, sub, tone }: { title: string; value: string; sub: string; tone: "good" | "bad" }) {
  return (
    <div className="panel" style={{ padding: 12, borderColor: tone === "good" ? "#bbf7d0" : "#fecaca", background: tone === "good" ? "#f0fdf4" : "#fef2f2" }}>
      <div style={{ fontSize: 13, color: "#475569", marginBottom: 6 }}>{title}</div>
      <div style={{ fontWeight: 900, fontSize: 20, color: tone === "good" ? "#166534" : "#b91c1c" }}>{value}</div>
      <div style={{ fontSize: 13, marginTop: 4, color: "#334155" }}>{sub}</div>
    </div>
  );
}

const lab: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 700, color: "#334155", fontSize: 13 };
const sub: React.CSSProperties = { fontWeight: 800, marginBottom: 8 };
const th: React.CSSProperties = { textAlign: "left", padding: "9px 8px", background: "#e5e7eb", fontWeight: 800, border: "1px solid #cbd5e1", whiteSpace: "nowrap", cursor: "pointer" };
const td: React.CSSProperties = { padding: "9px 8px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" };
