"use client";

import { useEffect, useState } from "react";

type Row = {
  id: number;
  code: string;
  customer: string;
  salePrice: number;
  paid: number;
  remain: number;
  status: string;
};

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n || 0)} đ`;

export default function CodReconcilePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [checked, setChecked] = useState<number[]>([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await fetch("/api/sales/cod-reconcile");
    const data = await res.json();
    setRows(data.rows || []);
    setChecked([]);
  };

  useEffect(() => { load(); }, []);

  const toggle = (id: number) => {
    setChecked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const confirm = async () => {
    if (!checked.length) return;
    setLoading(true);
    setMsg("");
    const res = await fetch("/api/sales/cod-reconcile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: checked }),
    });
    const data = await res.json();
    setLoading(false);
    if (res.ok) {
      setMsg(`✅ Đã xác nhận ${data.updated} đơn`);
      load();
    } else {
      setMsg(`❌ ${data?.error || "Lỗi đối soát"}`);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section className="panel" style={{ padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button className="primary-btn" disabled={!checked.length || loading} onClick={confirm}>{loading ? "Đang xử lý..." : "Xác nhận đã nhận tiền"}</button>
        </div>
        <div style={{ marginTop: 10, overflow: "auto", maxHeight: 520 }}>
          <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr>{["", "Mã máy", "Khách hàng", "Giá bán", "Đã thu", "Còn lại", "Trạng thái"].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id} style={{ background: i % 2 ? "#f8fafc" : "#fff" }}>
                  <td style={td}><input type="checkbox" checked={checked.includes(r.id)} onChange={() => toggle(r.id)} /></td>
                  <td style={td}>{r.code}</td>
                  <td style={td}>{r.customer}</td>
                  <td style={td}>{money(r.salePrice)}</td>
                  <td style={td}>{money(r.paid)}</td>
                  <td style={{ ...td, color: r.remain > 0 ? "#92400e" : "#166534", fontWeight: 800 }}>{money(r.remain)}</td>
                  <td style={td}><span style={{ background: "#fef9c3", color: "#92400e", padding: "4px 8px", borderRadius: 999, fontWeight: 700 }}>CHỜ ĐỐI SOÁT</span></td>
                </tr>
              ))}
              {!rows.length && <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={7}>Không có đơn chờ đối soát</td></tr>}
            </tbody>
          </table>
        </div>
        {msg ? <div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div> : null}
      </section>
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "12px 10px", background: "#e5e7eb", fontWeight: 800, border: "1px solid #cbd5e1" };
const td: React.CSSProperties = { padding: "12px 10px", border: "1px solid #e2e8f0" };
