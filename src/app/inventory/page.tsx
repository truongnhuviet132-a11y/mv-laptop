"use client";

import { useEffect, useMemo, useState } from "react";

type Row = {
  id: number;
  code: string;
  model: string;
  supplier: string;
  serial?: string | null;
  purchaseDate: string;
  purchasePrice: number;
  processingCost: number;
  currentCost: number;
  daysInStock: number;
  status: string;
  note: string;
};

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n || 0)} đ`;

export default function InventoryPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);

  const [model, setModel] = useState("ALL");
  const [supplier, setSupplier] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [minDays, setMinDays] = useState(0);
  const [minCost, setMinCost] = useState(0);
  const [maxCost, setMaxCost] = useState(999999999);
  const [sortBy, setSortBy] = useState("daysInStock");
  const [sortDir, setSortDir] = useState("desc");

  const [selected, setSelected] = useState<Row | null>(null);
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const load = async () => {
    const q = new URLSearchParams({ model, supplier, status, minDays: String(minDays), minCost: String(minCost), maxCost: String(maxCost), sortBy, sortDir });
    const res = await fetch(`/api/inventory/list?${q.toString()}`);
    const data = await res.json();
    setRows(data.rows || []);
    setModels(data.filters?.models || []);
    setSuppliers(data.filters?.suppliers || []);
    setStatuses(data.filters?.statuses || []);
  };

  useEffect(() => { load(); }, [model, supplier, status, minDays, minCost, maxCost, sortBy, sortDir]);

  const loadDetail = async (id: number) => {
    const res = await fetch(`/api/inventory/detail?id=${id}`);
    const data = await res.json();
    setDetail(data);
  };

  const staleDays = 45;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section className="panel" style={{ padding: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(7,minmax(0,1fr))", gap: 8 }}>
          <label style={lab}>Model<select className="input-clean" value={model} onChange={(e) => setModel(e.target.value)}><option value="ALL">Tất cả</option>{models.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label style={lab}>NCC<select className="input-clean" value={supplier} onChange={(e) => setSupplier(e.target.value)}><option value="ALL">Tất cả</option>{suppliers.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label style={lab}>Trạng thái<select className="input-clean" value={status} onChange={(e) => setStatus(e.target.value)}><option value="ALL">Tất cả</option>{statuses.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label style={lab}>Số ngày tồn từ<input className="input-clean" type="number" value={minDays} onChange={(e) => setMinDays(Number(e.target.value || 0))} /></label>
          <label style={lab}>Giá vốn từ<input className="input-clean" type="number" value={minCost} onChange={(e) => setMinCost(Number(e.target.value || 0))} /></label>
          <label style={lab}>Giá vốn đến<input className="input-clean" type="number" value={maxCost} onChange={(e) => setMaxCost(Number(e.target.value || 0))} /></label>
          <label style={lab}>Sort<select className="input-clean" value={`${sortBy}:${sortDir}`} onChange={(e) => { const [sb, sd] = e.target.value.split(":"); setSortBy(sb); setSortDir(sd); }}>
            <option value="daysInStock:desc">Ngày tồn giảm dần</option><option value="daysInStock:asc">Ngày tồn tăng dần</option>
            <option value="currentCost:desc">Giá vốn giảm dần</option><option value="currentCost:asc">Giá vốn tăng dần</option>
            <option value="model:asc">Model A-Z</option><option value="model:desc">Model Z-A</option>
          </select></label>
        </div>
      </section>

      <section className="panel" style={{ padding: 12 }}>
        <div style={{ overflow: "auto", maxHeight: 460 }}>
          <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr>{["Mã máy", "Model", "Serial", "Ngày nhập", "Giá nhập", "Tổng chi phí xử lý", "Giá vốn hiện tại", "Số ngày tồn", "Trạng thái", "Ghi chú"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} onClick={() => { setSelected(r); loadDetail(r.id); }} style={{ cursor: "pointer", background: selected?.id === r.id ? "#dbeafe" : r.daysInStock >= staleDays ? "#fef2f2" : i % 2 ? "#f8fafc" : "#fff" }}>
                  <td style={td}>{r.code}</td>
                  <td style={td}>{r.model}</td>
                  <td style={td}>{r.serial || "-"}</td>
                  <td style={td}>{r.purchaseDate}</td>
                  <td style={td}>{money(r.purchasePrice)}</td>
                  <td style={td}>{money(r.processingCost)}</td>
                  <td style={{ ...td, fontWeight: 800 }}>{money(r.currentCost)}</td>
                  <td style={{ ...td, color: r.daysInStock >= staleDays ? "#b91c1c" : "#334155", fontWeight: r.daysInStock >= staleDays ? 800 : 500 }}>{r.daysInStock}</td>
                  <td style={td}>{r.status}</td>
                  <td style={td}>{r.note || "-"}</td>
                </tr>
              ))}
              {!rows.length && <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={10}>Không có dữ liệu tồn kho</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ padding: 12 }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 8 }}>Chi tiết máy tồn kho</div>
        {!selected ? <div style={{ color: "#64748b" }}>Click 1 dòng để xem chi tiết.</div> : !detail ? <div>Đang tải...</div> : (
          <div style={{ display: "grid", gap: 10 }}>
            <div><b>{detail.item.code}</b> | {detail.item.model} | {detail.item.serial || "-"} | NCC: {detail.item.supplier}</div>
            <div style={{ overflow: "auto" }}>
              <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead><tr>{["Ngày", "Loại", "Số tiền", "Ghi chú"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {(detail.repairs || []).map((x: any) => <tr key={x.id}><td style={td}>{x.date}</td><td style={td}>{x.type}</td><td style={td}>{money(x.amount)}</td><td style={td}>{x.note || "-"}</td></tr>)}
                  {!(detail.repairs || []).length && <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={4}>Chưa có lịch sử sửa chữa/chi phí</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

const lab: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 700, color: "#334155" };
const th: React.CSSProperties = { textAlign: "left", padding: "9px 8px", background: "#e5e7eb", fontWeight: 800, border: "1px solid #cbd5e1" };
const td: React.CSSProperties = { padding: "9px 8px", border: "1px solid #e2e8f0" };
