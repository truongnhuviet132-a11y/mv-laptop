"use client";

import { useEffect, useMemo, useState } from "react";
import NhapMayTab from "@/components/input/NhapMayTab";

type Tab = "nhap-may" | "sua-chua" | "bao-hanh" | "chi-phi-khac";
type Mode = "item" | "lot";

type SearchItem = {
  id: number;
  code: string;
  model: string;
  serial: string;
  customerName: string;
  customerPhone: string;
  saleDate: string | null;
  warrantyStatus: string;
};

type Supplier = { id: number; name: string };

const tabs: { key: Tab; label: string }[] = [
  { key: "nhap-may", label: "Nhập máy" },
  { key: "sua-chua", label: "Sửa chữa" },
  { key: "bao-hanh", label: "Bảo hành" },
  { key: "chi-phi-khac", label: "Chi phí khác" },
];

export default function InputPage() {
  const [tab, setTab] = useState<Tab>("nhap-may");

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = p.get("tab") as Tab | null;
    if (t && ["nhap-may", "sua-chua", "bao-hanh", "chi-phi-khac"].includes(t)) setTab(t);
  }, []);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              border: "1px solid #d1d5db",
              borderRadius: 10,
              padding: "10px 14px",
              fontWeight: 800,
              cursor: "pointer",
              background: tab === t.key ? "#dbeafe" : "#fff",
              color: tab === t.key ? "#1d4ed8" : "#111",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "nhap-may" && <NhapMayTab />}
      {tab === "sua-chua" && <RepairTab />}
      {tab === "bao-hanh" && <WarrantyTab />}
      {tab === "chi-phi-khac" && <OtherCostTab />}
    </div>
  );
}

function useDebouncedSearch(query: string) {
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setItems([]);
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/items/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setItems(data.items || []);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(t);
  }, [query]);

  return { items, loading };
}

function SelectedItemCard({ selected }: { selected: SearchItem | null }) {
  if (!selected) {
    return (
      <div style={{ border: "1px solid #fde68a", background: "#fffbeb", color: "#92400e", borderRadius: 10, padding: 10, fontWeight: 700 }}>
        ⚠️ Vui lòng chọn máy trước
      </div>
    );
  }

  return (
    <div style={{ border: "1px solid #bfdbfe", background: "#eff6ff", borderRadius: 10, padding: 10 }}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>[ĐANG CHỌN]</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 6, fontSize: 14 }}>
        <div><b>Model:</b> {selected.model}</div>
        <div><b>Mã máy:</b> {selected.code}</div>
        <div><b>Serial:</b> {selected.serial || "-"}</div>
        <div><b>Khách hàng:</b> {selected.customerName || "-"}</div>
        <div><b>Trạng thái BH:</b> {selected.warrantyStatus}</div>
      </div>
    </div>
  );
}

function SearchPicker({
  query,
  setQuery,
  selected,
  setSelected,
}: {
  query: string;
  setQuery: (v: string) => void;
  selected: SearchItem | null;
  setSelected: (v: SearchItem) => void;
}) {
  const { items, loading } = useDebouncedSearch(query);

  return (
    <section className="panel" style={{ padding: 14 }}>
      <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>Tìm máy</div>
      <input
        className="input-clean"
        placeholder="Tìm theo mã máy / serial / model / tên khách / số điện thoại"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        style={{ width: "100%", padding: "10px 12px" }}
      />
      <div className="small-note" style={{ marginTop: 6 }}>{loading ? "Đang tìm..." : query.trim() ? `${items.length} kết quả` : "Nhập từ khóa để tìm"}</div>

      {query.trim() && !loading && items.length === 0 ? <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 700 }}>Không có kết quả phù hợp.</div> : null}

      {!!items.length && (
        <div style={{ marginTop: 8, overflow: "auto", maxHeight: 320 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }} className="table-hover excel-grid">
            <thead>
              <tr>
                {["Mã máy", "Model", "Serial", "Khách hàng", "Ngày bán", "BH", ""].map((h) => (
                  <th key={h} style={{ border: "1px solid #cbd5e1", background: "#f8fafc", textAlign: "left", padding: "10px 8px", fontWeight: 800 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const active = selected?.id === i.id;
                return (
                  <tr key={i.id} style={{ background: active ? "#dbeafe" : "transparent" }}>
                    <td style={{ border: "1px solid #e2e8f0", padding: "10px 8px" }}>{i.code}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "10px 8px" }}>{i.model}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "10px 8px" }}>{i.serial || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "10px 8px" }}>{i.customerName || "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "10px 8px" }}>{i.saleDate ? new Date(i.saleDate).toLocaleDateString("vi-VN") : "-"}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "10px 8px" }}>{i.warrantyStatus}</td>
                    <td style={{ border: "1px solid #e2e8f0", padding: "10px 8px" }}><button className="primary-btn" onClick={() => setSelected(i)}>Chọn</button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RepairTab() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [repairDate, setRepairDate] = useState(new Date().toISOString().slice(0, 10));
  const [repairType, setRepairType] = useState("PIN");
  const [cost, setCost] = useState(0);
  const [note, setNote] = useState("");
  const [includeInCost, setIncludeInCost] = useState(true);
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [newId, setNewId] = useState<number | null>(null);

  const loadHistory = async (itemId?: number) => {
    if (!itemId) return setHistory([]);
    const res = await fetch(`/api/input/history?kind=repair&itemId=${itemId}`);
    const data = await res.json();
    setHistory(data.rows || []);
  };

  useEffect(() => {
    loadHistory(selected?.id);
  }, [selected?.id]);

  const save = async () => {
    setMsg("");
    if (!selected) return setMsg("❌ Chưa chọn máy.");

    const res = await fetch("/api/input/repair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: selected.id, repairDate, repairType, cost, note, includeInCost }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(`❌ ${data?.error || "Lỗi lưu"}`);

    setRepairType("PIN");
    setCost(0);
    setNote("");
    setIncludeInCost(true);
    setMsg("✅ Đã lưu thành công");
    setNewId(data?.id || null);
    loadHistory(selected.id);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <SearchPicker query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} />
      <SelectedItemCard selected={selected} />

      <section className="panel" style={{ padding: 12, opacity: selected ? 1 : 0.7 }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#0f172a" }}>Form sửa chữa</div>
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>Ngày sửa<input className="input-clean" disabled={!selected} type="date" value={repairDate} onChange={(e) => setRepairDate(e.target.value)} /></label>
          <label style={{ display: "grid", gap: 6 }}>Loại sửa<select className="input-clean" disabled={!selected} value={repairType} onChange={(e) => setRepairType(e.target.value)}><option>PIN</option><option>MÀN</option><option>MAIN</option><option>VỎ</option><option>BÀN PHÍM</option><option>KHÁC</option></select></label>
          <label style={{ display: "grid", gap: 6 }}>Chi phí<input className="input-clean" disabled={!selected} type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} /></label>
          <label style={{ display: "grid", gap: 6 }}>Ghi chú<input className="input-clean" disabled={!selected} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}><input type="checkbox" disabled={!selected} checked={includeInCost} onChange={(e) => setIncludeInCost(e.target.checked)} /> Tính vào giá vốn</label>
        <div style={{ marginTop: 12 }}><button className="primary-btn" disabled={!selected} onClick={save}>🛠️ LƯU SỬA CHỮA</button></div>
        {msg ? <div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div> : null}
      </section>

      <HistoryRepair rows={history} reload={() => loadHistory(selected?.id)} newId={newId} />
    </div>
  );
}

function HistoryRepair({ rows, reload, newId }: { rows: any[]; reload: () => void; newId: number | null }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<any>({});

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setDraft({ date: toInputDate(r.date), type: r.type, cost: r.cost, note: r.note || "" });
  };

  const saveEdit = async (id: number) => {
    await fetch("/api/input/history/manage", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "repair", id, ...draft }),
    });
    setEditingId(null);
    reload();
  };

  const remove = async (id: number) => {
    if (!confirm("Xóa dòng này?")) return;
    await fetch("/api/input/history/manage", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "repair", id }),
    });
    reload();
  };

  return (
    <section className="panel" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#0f172a" }}>[LỊCH SỬ]</div>
      {rows.length === 0 ? <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>Không có dữ liệu</div> : (
        <div style={{ overflow: "auto", maxHeight: 320 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }} className="table-hover excel-grid">
          <thead><tr>{["Ngày", "Loại sửa", "Chi phí", "Ghi chú", "Hành động"].map((h) => <th key={h} style={{ textAlign: "left", padding: "10px 8px", fontWeight: 800 }}>{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r: any, i: number) => {
              const editing = editingId === r.id;
              const justAdded = newId === r.id;
              return (
                <tr key={r.id} style={{ background: justAdded ? "#fef9c3" : i % 2 ? "#f8fafc" : "#fff" }}>
                  <td style={cell}>{editing ? <input className="input-clean" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /> : new Date(r.date).toLocaleDateString("vi-VN")}</td>
                  <td style={cell}>{editing ? <input className="input-clean" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} /> : r.type}</td>
                  <td style={cell}>{editing ? <input className="input-clean" type="number" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })} /> : `${new Intl.NumberFormat("vi-VN").format(r.cost)} đ`}</td>
                  <td style={cell}>{editing ? <input className="input-clean" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /> : (r.note || "-")}</td>
                  <td style={cell}>
                    {editing ? (
                      <div style={{ display: "flex", gap: 6 }}><button className="primary-btn" onClick={() => saveEdit(r.id)}>Lưu</button><button onClick={() => setEditingId(null)}>Hủy</button></div>
                    ) : (
                      <div style={{ display: "flex", gap: 6 }}><button onClick={() => startEdit(r)}>Sửa</button><button onClick={() => remove(r.id)}>Xóa</button></div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </section>
  );
}

function WarrantyTab() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [warrantyDate, setWarrantyDate] = useState(new Date().toISOString().slice(0, 10));
  const [issue, setIssue] = useState("");
  const [cost, setCost] = useState(0);
  const [payer, setPayer] = useState("SHOP");
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [newId, setNewId] = useState<number | null>(null);

  const loadHistory = async (itemId?: number) => {
    if (!itemId) return setHistory([]);
    const res = await fetch(`/api/input/history?kind=warranty&itemId=${itemId}`);
    const data = await res.json();
    setHistory(data.rows || []);
  };

  useEffect(() => { loadHistory(selected?.id); }, [selected?.id]);

  const save = async () => {
    setMsg("");
    if (!selected) return setMsg("❌ Chưa chọn máy.");
    if (!issue.trim()) return setMsg("❌ Vui lòng nhập lỗi bảo hành.");

    const res = await fetch("/api/input/warranty", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: selected.id, warrantyDate, issue, cost, payer, note }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(`❌ ${data?.error || "Lỗi lưu"}`);

    setIssue(""); setCost(0); setPayer("SHOP"); setNote("");
    setMsg("✅ Đã lưu thành công");
    setNewId(data?.id || null);
    loadHistory(selected.id);
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <SearchPicker query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} />
      <SelectedItemCard selected={selected} />

      <section className="panel" style={{ padding: 12, opacity: selected ? 1 : 0.7 }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#0f172a" }}>Form bảo hành</div>
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>Ngày bảo hành<input className="input-clean" disabled={!selected} type="date" value={warrantyDate} onChange={(e) => setWarrantyDate(e.target.value)} /></label>
          <label style={{ display: "grid", gap: 6 }}>Lỗi<input className="input-clean" disabled={!selected} value={issue} onChange={(e) => setIssue(e.target.value)} /></label>
          <label style={{ display: "grid", gap: 6 }}>Chi phí<input className="input-clean" disabled={!selected} type="number" min={0} value={cost} onChange={(e) => setCost(Number(e.target.value))} /></label>
          <label style={{ display: "grid", gap: 6 }}>Ai chịu<select className="input-clean" disabled={!selected} value={payer} onChange={(e) => setPayer(e.target.value)}><option value="SHOP">Shop</option><option value="NCC">NCC</option><option value="CHIA">Chia</option></select></label>
          <label style={{ display: "grid", gap: 6, gridColumn: "1 / -1" }}>Ghi chú<input className="input-clean" disabled={!selected} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <div style={{ marginTop: 12 }}><button className="primary-btn" disabled={!selected} onClick={save}>🧾 LƯU BẢO HÀNH</button></div>
        {msg ? <div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div> : null}
      </section>

      <HistoryWarranty rows={history} reload={() => loadHistory(selected?.id)} newId={newId} />
    </div>
  );
}

const cell: React.CSSProperties = { padding: "10px 8px", border: "1px solid #e2e8f0" };
const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n || 0)} đ`;
const toInputDate = (v: string | Date) => new Date(v).toISOString().slice(0, 10);

function HistoryWarranty({ rows, reload, newId }: { rows: any[]; reload: () => void; newId: number | null }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<any>({});

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setDraft({ date: toInputDate(r.date), issue: r.issue, cost: r.cost, payer: r.payer });
  };

  const saveEdit = async (id: number) => {
    await fetch("/api/input/history/manage", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "warranty", id, ...draft }) });
    setEditingId(null);
    reload();
  };

  const remove = async (id: number) => {
    if (!confirm("Xóa dòng này?")) return;
    await fetch("/api/input/history/manage", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "warranty", id }) });
    reload();
  };

  return (
    <section className="panel" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#0f172a" }}>[LỊCH SỬ]</div>
      {rows.length === 0 ? <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>Không có dữ liệu</div> : (
        <div style={{ overflow: "auto", maxHeight: 320 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }} className="table-hover excel-grid">
          <thead><tr>{["Ngày", "Lỗi", "Chi phí", "Ai chịu", "Hành động"].map((h) => <th key={h} style={{ ...cell, textAlign: "left", fontWeight: 800 }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r: any, i: number) => {
            const editing = editingId === r.id;
            return <tr key={r.id} style={{ background: newId === r.id ? "#fef9c3" : i % 2 ? "#f8fafc" : "#fff" }}>
              <td style={cell}>{editing ? <input className="input-clean" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /> : new Date(r.date).toLocaleDateString("vi-VN")}</td>
              <td style={cell}>{editing ? <input className="input-clean" value={draft.issue} onChange={(e) => setDraft({ ...draft, issue: e.target.value })} /> : r.issue}</td>
              <td style={cell}>{editing ? <input className="input-clean" type="number" value={draft.cost} onChange={(e) => setDraft({ ...draft, cost: Number(e.target.value) })} /> : money(r.cost)}</td>
              <td style={cell}>{editing ? <input className="input-clean" value={draft.payer} onChange={(e) => setDraft({ ...draft, payer: e.target.value })} /> : r.payer}</td>
              <td style={cell}>{editing ? <><button className="primary-btn" onClick={() => saveEdit(r.id)}>Lưu</button> <button className="action-btn" onClick={() => setEditingId(null)}>Hủy</button></> : <><button className="action-btn" onClick={() => startEdit(r)}>Sửa</button> <button className="action-btn action-btn-danger" onClick={() => remove(r.id)}>Xóa</button></>}</td>
            </tr>;
          })}</tbody>
        </table>
        </div>
      )}
    </section>
  );
}

function HistoryOther({ rows, mode, reload, newId }: { rows: any[]; mode: Mode; reload: () => void; newId: number | null }) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<any>({});

  const kind = mode === "item" ? "other-item" : "other-lot";

  const startEdit = (r: any) => {
    setEditingId(r.id);
    setDraft({ date: toInputDate(r.date), type: r.type, amount: r.amount });
  };

  const saveEdit = async (id: number) => {
    await fetch("/api/input/history/manage", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id, ...draft }) });
    setEditingId(null);
    reload();
  };

  const remove = async (id: number) => {
    if (!confirm("Xóa dòng này?")) return;
    await fetch("/api/input/history/manage", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, id }) });
    reload();
  };

  return (
    <section className="panel" style={{ padding: 12 }}>
      <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#0f172a" }}>[LỊCH SỬ]</div>
      {rows.length === 0 ? <div style={{ textAlign: "center", color: "#94a3b8", padding: 16 }}>Không có dữ liệu</div> : (
        <div style={{ overflow: "auto", maxHeight: 320 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }} className="table-hover excel-grid">
          <thead><tr>{["Ngày", "Loại chi phí", "Số tiền", "Hành động"].map((h) => <th key={h} style={{ ...cell, textAlign: "left", fontWeight: 800 }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((r: any, i: number) => {
            const editing = editingId === r.id;
            return <tr key={r.id} style={{ background: newId === r.id ? "#fef9c3" : i % 2 ? "#f8fafc" : "#fff" }}>
              <td style={cell}>{editing ? <input className="input-clean" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /> : new Date(r.date).toLocaleDateString("vi-VN")}</td>
              <td style={cell}>{editing ? <input className="input-clean" value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} /> : r.type}</td>
              <td style={cell}>{editing ? <input className="input-clean" type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: Number(e.target.value) })} /> : money(r.amount)}</td>
              <td style={cell}>{editing ? <><button className="primary-btn" onClick={() => saveEdit(r.id)}>Lưu</button> <button className="action-btn" onClick={() => setEditingId(null)}>Hủy</button></> : <><button className="action-btn" onClick={() => startEdit(r)}>Sửa</button> <button className="action-btn action-btn-danger" onClick={() => remove(r.id)}>Xóa</button></>}</td>
            </tr>;
          })}</tbody>
        </table>
        </div>
      )}
    </section>
  );
}

function OtherCostTab() {
  const [mode, setMode] = useState<Mode>("item");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SearchItem | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierId, setSupplierId] = useState(0);
  const [lotDate, setLotDate] = useState(new Date().toISOString().slice(0, 10));

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("VAN_CHUYEN");
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [includeInCost, setIncludeInCost] = useState(true);
  const [msg, setMsg] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [newId, setNewId] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/suppliers").then((r) => r.json()).then((d) => setSuppliers(d.suppliers || []));
  }, []);

  const loadHistory = async () => {
    const kind = mode === "item" ? "other-item" : "other-lot";
    const params = new URLSearchParams({ kind });
    if (mode === "item" && selected) params.set("itemId", String(selected.id));
    if (mode === "lot" && supplierId) params.set("supplierId", String(supplierId));
    const res = await fetch(`/api/input/history?${params.toString()}`);
    const data = await res.json();
    setHistory(data.rows || []);
  };

  useEffect(() => {
    loadHistory();
  }, [mode, selected?.id, supplierId]);

  const disabled = mode === "item" ? !selected : !supplierId || !lotDate;

  const save = async () => {
    setMsg("");
    if (disabled) return setMsg("❌ Thiếu ngữ cảnh (máy/lô).");

    const res = await fetch("/api/input/other-cost", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode,
        itemId: selected?.id,
        supplierId,
        lotDate,
        date,
        category,
        amount,
        note,
        includeInCost,
      }),
    });
    const data = await res.json();
    if (!res.ok) return setMsg(`❌ ${data?.error || "Lỗi lưu"}`);

    setAmount(0); setNote(""); setCategory("VAN_CHUYEN");
    setMsg("✅ Đã lưu thành công");
    setNewId(data?.id || null);
    loadHistory();
  };

  return (
    <div style={{ display: "grid", gap: 10 }}>
      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="primary-btn" onClick={() => setMode("item")} style={{ opacity: mode === "item" ? 1 : 0.7 }}>Gắn theo máy</button>
          <button className="primary-btn" onClick={() => setMode("lot")} style={{ opacity: mode === "lot" ? 1 : 0.7 }}>Gắn theo lô</button>
        </div>
      </section>

      {mode === "item" ? (
        <>
          <SearchPicker query={query} setQuery={setQuery} selected={selected} setSelected={setSelected} />
          <SelectedItemCard selected={selected} />
        </>
      ) : (
        <section className="panel" style={{ padding: 12 }}>
          <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10, color: "#0f172a" }}>[ĐANG CHỌN LÔ]</div>
          <div className="two-col" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>NCC
              <select className="input-clean" value={supplierId || ""} onChange={(e) => setSupplierId(Number(e.target.value))}>
                <option value="">-- Chọn NCC --</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6 }}>Ngày nhập lô<input className="input-clean" type="date" value={lotDate} onChange={(e) => setLotDate(e.target.value)} /></label>
          </div>
          {!supplierId ? <div style={{ marginTop: 8, color: "#92400e", fontWeight: 700 }}>⚠️ Vui lòng chọn NCC trước</div> : null}
        </section>
      )}

      <section className="panel" style={{ padding: 12, opacity: disabled ? 0.7 : 1 }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10, color: "#0f172a" }}>Form chi phí khác</div>
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 6 }}>Ngày<input className="input-clean" disabled={disabled} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label style={{ display: "grid", gap: 6 }}>Loại chi phí<select className="input-clean" disabled={disabled} value={category} onChange={(e) => setCategory(e.target.value)}><option value="VAN_CHUYEN">Vận chuyển</option><option value="PHU_KIEN">Phụ kiện</option><option value="SPA">SPA</option><option value="KHAC">Khác</option></select></label>
          <label style={{ display: "grid", gap: 6 }}>Số tiền<input className="input-clean" disabled={disabled} type="number" min={0} value={amount} onChange={(e) => setAmount(Number(e.target.value))} /></label>
          <label style={{ display: "grid", gap: 6 }}>Ghi chú<input className="input-clean" disabled={disabled} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}><input type="checkbox" disabled={disabled} checked={includeInCost} onChange={(e) => setIncludeInCost(e.target.checked)} /> Tính vào giá vốn</label>
        <div style={{ marginTop: 12 }}><button className="primary-btn" disabled={disabled} onClick={save}>💾 LƯU CHI PHÍ</button></div>
        {msg ? <div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div> : null}
      </section>

      <HistoryOther rows={history} mode={mode} reload={loadHistory} newId={newId} />
    </div>
  );
}
