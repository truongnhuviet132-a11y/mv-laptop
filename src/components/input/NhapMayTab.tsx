"use client";

import { useMemo, useRef, useState } from "react";

type GridRow = {
  id: string;
  checked: boolean;
  itemCode: string;
  model: string;
  quantity: number;
  serial: string;
  cpu: string;
  ram: string;
  ssd: string;
  screen: string;
  battery: string;
  condition: string;
  processCost: number;
  note: string;
};

const cellStyle: React.CSSProperties = {
  width: "100%",
  border: "1px solid #94a3b8",
  borderRadius: 0,
  padding: "6px 8px",
  fontSize: 13,
  background: "#fff",
};

const miniHead: React.CSSProperties = { border: "1px solid #cbd5e1", background: "#f8fafc", padding: "8px 10px", fontWeight: 700, width: 120 };
const miniCell: React.CSSProperties = { border: "1px solid #cbd5e1", padding: "8px 10px" };

function createRow(seed?: Partial<GridRow>): GridRow {
  return {
    id: `${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    checked: false,
    itemCode: "",
    model: "",
    quantity: 1,
    serial: "",
    cpu: "",
    ram: "",
    ssd: "",
    screen: "",
    battery: "",
    condition: "",
    processCost: 0,
    note: "",
    ...seed,
  };
}

export default function NhapMayTab() {
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [supplierName, setSupplierName] = useState("");
  const [operatorName, setOperatorName] = useState("Admin");
  const [batchNote, setBatchNote] = useState("");
  const [quickModel, setQuickModel] = useState("");
  const [quickCount, setQuickCount] = useState(20);
  const [defaultCpu, setDefaultCpu] = useState("");
  const [defaultRam, setDefaultRam] = useState("");
  const [defaultSsd, setDefaultSsd] = useState("");
  const [defaultScreen, setDefaultScreen] = useState("");
  const [batchImportCost, setBatchImportCost] = useState(0);

  const [rows, setRows] = useState<GridRow[]>([createRow()]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pastePanel, setPastePanel] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const tableRef = useRef<HTMLTableElement | null>(null);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.itemCode, r.model, r.serial, r.cpu, r.ram, r.ssd, r.screen, r.battery, r.condition, r.note].join(" ").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totalProcessCost = useMemo(() => rows.reduce((sum, r) => sum + (Number.isFinite(r.processCost) ? r.processCost : 0), 0), [rows]);
  const totalLotCost = Number(batchImportCost || 0) + totalProcessCost;
  const totalQty = useMemo(() => rows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0), [rows]);
  const avgPerMachineAll = totalQty > 0 ? totalLotCost / totalQty : 0;

  const totalLines = rows.length;

  const updateRow = (id: string, patch: Partial<GridRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const addRow = () =>
    setRows((prev) => [...prev, createRow({ model: quickModel || "", cpu: defaultCpu, ram: defaultRam, ssd: defaultSsd, screen: defaultScreen })]);

  const generateRowsFromHeader = () => {
    const model = quickModel.trim();
    const count = Math.max(1, Number(quickCount) || 1);
    if (!model) {
      setError("Vui lòng nhập loại máy ở phần tạo nhanh.");
      return;
    }
    setError("");
    const generated = Array.from({ length: count }, (_, i) =>
      createRow({ itemCode: String(i + 1), model, cpu: defaultCpu, ram: defaultRam, ssd: defaultSsd, screen: defaultScreen, condition: "" })
    );
    setRows(generated);
    setSuccess(`Đã tạo sẵn ${count} dòng cho model ${model}.`);
  };

  const duplicateSelected = () => {
    const selected = rows.filter((r) => r.checked);
    if (!selected.length) return;
    const clones = selected.map((r) => createRow({ ...r, checked: false }));
    setRows((prev) => [...prev, ...clones]);
  };

  const deleteSelected = () => {
    const remain = rows.filter((r) => !r.checked);
    setRows(remain.length ? remain : [createRow()]);
  };

  const parsePaste = () => {
    const text = pasteText.trim();
    if (!text) return;

    const parsed = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const cols = line.split("\t");
        return createRow({
          itemCode: cols[0] || "",
          model: cols[1] || "",
          quantity: Number(cols[2] || 1),
          serial: cols[3] || "",
          cpu: cols[4] || "",
          ram: cols[5] || "",
          ssd: cols[6] || "",
          screen: cols[7] || "",
          battery: cols[8] || "",
          condition: cols[9] || "",
          processCost: Number(cols[10] || 0),
          note: cols[11] || "",
        });
      });

    if (parsed.length) setRows((prev) => [...prev, ...parsed]);
    setPasteText("");
    setPastePanel(false);
  };

  const onKeyDownCell = (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colSelector: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const nextRow = rowIndex + 1;
      if (nextRow >= rows.length) {
        addRow();
        setTimeout(() => {
          const next = tableRef.current?.querySelector<HTMLInputElement>(`[data-row='${rows.length}'][data-col='${colSelector}']`);
          next?.focus();
        }, 0);
      } else {
        const next = tableRef.current?.querySelector<HTMLInputElement>(`[data-row='${nextRow}'][data-col='${colSelector}']`);
        next?.focus();
      }
    }
  };

  const saveBatch = async () => {
    setError("");
    setSuccess("");

    if (!supplierName.trim()) return setError("Vui lòng nhập NCC.");
    if (!purchaseDate) return setError("Vui lòng chọn ngày nhập.");

    const validRows = rows.filter((r) => r.model.trim());
    if (!validRows.length) return setError("Cần ít nhất 1 dòng có model.");

    setLoading(true);
    try {
      const lotQty = validRows.reduce((s, r) => s + Math.max(1, Number(r.quantity || 1)), 0);
      const lotProcess = validRows.reduce((s, r) => s + Number(r.processCost || 0), 0);
      const lotTotal = Number(batchImportCost || 0) + lotProcess;
      const lotAvg = lotQty > 0 ? Math.round(lotTotal / lotQty) : 0;

      const lines = validRows.map((r) => {
        const qty = Math.max(1, Number(r.quantity || 1));
        const totalCost = Number(r.processCost || 0);
        return {
          model: r.model,
          quantity: qty,
          purchasePrice: lotAvg,
          hasSerial: Boolean(r.serial.trim()),
          serialsText: r.serial.trim(),
          note: [
            r.note,
            `code:${r.itemCode}`,
            `cpu:${r.cpu}`,
            `ram:${r.ram}`,
            `ssd:${r.ssd}`,
            `man:${r.screen}`,
            `pin:${r.battery}`,
            `tinhtrang:${r.condition}`,
            `xuly:${totalCost}`,
            `giaTBLo:${lotAvg}`,
          ]
            .filter(Boolean)
            .join(" | "),
        };
      });

      const res = await fetch("/api/quick-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierName,
          purchaseDate,
          batchNote: [batchNote, `NguoiNhap:${operatorName}`].filter(Boolean).join(" | "),
          lines,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Lưu thất bại");
      setSuccess(`Đã tạo ${data.createdItemCount} item thành công. IDs: ${data.itemIds?.join(", ")}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12, background: "#f3f4f6", padding: 12, borderRadius: 12 }}>
      <section className="panel" style={{ padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 10 }}>Header Context</div>
        <div className="two-col" style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }}>
          <label style={{ display: "grid", gap: 4 }}>Ngày nhập<input className="input-clean" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} /></label>
          <label style={{ display: "grid", gap: 4 }}>NCC<input className="input-clean" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="Nhà cung cấp" /></label>
          <label style={{ display: "grid", gap: 4 }}>Người nhập<input className="input-clean" value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="Người nhập" /></label>
          <label style={{ display: "grid", gap: 4 }}>Ghi chú lô<input className="input-clean" value={batchNote} onChange={(e) => setBatchNote(e.target.value)} placeholder="Ghi chú" /></label>
        </div>

        <div style={{ marginTop: 10, borderTop: "1px dashed #cbd5e1", paddingTop: 10 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Tạo nhanh nhiều dòng</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
              <tbody>
                <tr>
                  <td style={miniHead}>Loại máy</td>
                  <td style={miniCell}><input className="input-clean" value={quickModel} onChange={(e) => setQuickModel(e.target.value)} placeholder="VD: Dell 5300" /></td>
                  <td style={miniHead}>Số lượng máy</td>
                  <td style={miniCell}><input className="input-clean" type="number" min={1} value={quickCount} onChange={(e) => setQuickCount(Number(e.target.value))} /></td>
                  <td style={miniHead}>CPU</td>
                  <td style={miniCell}><input className="input-clean" value={defaultCpu} onChange={(e) => setDefaultCpu(e.target.value)} placeholder="VD: i5-8365U" /></td>
                  <td style={miniHead}>RAM</td>
                  <td style={miniCell}><input className="input-clean" value={defaultRam} onChange={(e) => setDefaultRam(e.target.value)} placeholder="VD: 8GB" /></td>
                </tr>
                <tr>
                  <td style={miniHead}>SSD</td>
                  <td style={miniCell}><input className="input-clean" value={defaultSsd} onChange={(e) => setDefaultSsd(e.target.value)} placeholder="VD: 256GB" /></td>
                  <td style={miniHead}>Màn</td>
                  <td style={miniCell}><input className="input-clean" value={defaultScreen} onChange={(e) => setDefaultScreen(e.target.value)} placeholder="VD: FHD 14" /></td>
                  <td style={miniHead}>Tiền nhập lô</td>
                  <td style={miniCell}><input className="input-clean" type="number" min={0} value={batchImportCost} onChange={(e) => setBatchImportCost(Number(e.target.value))} placeholder="Tổng tiền nhập lô" /></td>
                  <td style={miniHead}>Thao tác</td>
                  <td style={miniCell}><button className="primary-btn" style={{ minWidth: 220 }} onClick={generateRowsFromHeader}>Xác nhận tạo {Math.max(1, Number(quickCount) || 1)} dòng</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <button className="primary-btn" onClick={addRow}>+ Thêm 1 dòng thủ công</button>
          </div>
        </div>
      </section>

      <section className="panel" style={{ padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
          <button className="primary-btn" onClick={addRow}>Thêm dòng (thủ công)</button>
          <button className="primary-btn" onClick={duplicateSelected}>Duplicate</button>
          <button className="primary-btn" onClick={deleteSelected}>Xóa</button>
          <button className="primary-btn" onClick={() => setPastePanel((v) => !v)}>Paste Excel</button>
          <input className="input-clean" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm kiếm..." style={{ width: 260 }} />
        </div>

        {pastePanel && (
          <div style={{ border: "1px solid #dbeafe", background: "#eff6ff", borderRadius: 8, padding: 8, marginBottom: 10 }}>
            <div className="small-note">Paste dữ liệu từ Excel theo cột hiện tại.</div>
            <textarea className="input-clean" style={{ width: "100%", minHeight: 100, marginTop: 6 }} value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
            <div style={{ marginTop: 6 }}><button className="primary-btn" onClick={parsePaste}>Nhập vào bảng</button></div>
          </div>
        )}

        <div style={{ overflowX: "auto", border: "2px solid #94a3b8", borderRadius: 10, background: "#fff" }}>
          <table ref={tableRef} className="table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#0f3a68", color: "#fff" }}>
                {["✓", "Mã máy", "Model", "SL", "Serial", "CPU", "RAM", "SSD", "Màn", "Pin", "Tình trạng", "Xử lý (tổng tiền)", "Giá TB / máy", "Ghi chú"].map((h) => (
                  <th key={h} style={{ border: "1px solid #1e4d7e", padding: "8px 6px", textAlign: "left", whiteSpace: "nowrap", fontWeight: 800 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r, rowIndex) => {
                const striped = rowIndex % 2 === 1;
                const editing = editingRowId === r.id;
                return (
                  <tr key={r.id} style={{ background: editing ? "#fef9c3" : striped ? "#f8fafc" : "#fff" }}>
                    <td style={{ border: "1px solid #cbd5e1", padding: 6, textAlign: "center" }}><input type="checkbox" checked={r.checked} onChange={(e) => updateRow(r.id, { checked: e.target.checked })} /></td>
                    <Cell value={r.itemCode} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { itemCode: v })} rowIndex={rowIndex} col="itemCode" onKeyDown={onKeyDownCell} />
                    <Cell value={r.model} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { model: v })} rowIndex={rowIndex} col="model" onKeyDown={onKeyDownCell} />
                    <td style={{ border: "1px solid #cbd5e1", padding: 6 }}><input data-row={rowIndex} data-col="quantity" style={cellStyle} type="number" min={1} value={r.quantity} onFocus={() => setEditingRowId(r.id)} onChange={(e) => updateRow(r.id, { quantity: Number(e.target.value) })} onKeyDown={(e) => onKeyDownCell(e, rowIndex, "quantity")} /></td>
                    <Cell value={r.serial} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { serial: v })} rowIndex={rowIndex} col="serial" onKeyDown={onKeyDownCell} />
                    <Cell value={r.cpu} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { cpu: v })} rowIndex={rowIndex} col="cpu" onKeyDown={onKeyDownCell} />
                    <Cell value={r.ram} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { ram: v })} rowIndex={rowIndex} col="ram" onKeyDown={onKeyDownCell} />
                    <Cell value={r.ssd} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { ssd: v })} rowIndex={rowIndex} col="ssd" onKeyDown={onKeyDownCell} />
                    <Cell value={r.screen} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { screen: v })} rowIndex={rowIndex} col="screen" onKeyDown={onKeyDownCell} />
                    <Cell value={r.battery} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { battery: v })} rowIndex={rowIndex} col="battery" onKeyDown={onKeyDownCell} />
                    <Cell value={r.condition} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { condition: v })} rowIndex={rowIndex} col="condition" onKeyDown={onKeyDownCell} />
                    <td style={{ border: "1px solid #cbd5e1", padding: 6 }}><input data-row={rowIndex} data-col="processCost" style={cellStyle} type="number" value={r.processCost} onFocus={() => setEditingRowId(r.id)} onChange={(e) => updateRow(r.id, { processCost: Number(e.target.value) })} onKeyDown={(e) => onKeyDownCell(e, rowIndex, "processCost")} /></td>
                    <td style={{ border: "1px solid #cbd5e1", padding: 6 }}><input style={{ ...cellStyle, background: "#f8fafc" }} readOnly value={new Intl.NumberFormat("vi-VN").format((r.processCost || 0) / Math.max(1, r.quantity || 1))} /></td>
                    <Cell value={r.note} onFocus={() => setEditingRowId(r.id)} onChange={(v) => updateRow(r.id, { note: v })} rowIndex={rowIndex} col="note" onKeyDown={onKeyDownCell} />
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <div className="small-note">Tổng số dòng: <b>{totalLines}</b> | Tổng SL: <b>{totalQty}</b> | Tiền nhập lô: <b>{new Intl.NumberFormat("vi-VN").format(batchImportCost)} đ</b> | Tổng xử lý từng con: <b>{new Intl.NumberFormat("vi-VN").format(totalProcessCost)} đ</b> | Tổng lô: <b>{new Intl.NumberFormat("vi-VN").format(totalLotCost)} đ</b> | Giá TB/con: <b>{new Intl.NumberFormat("vi-VN").format(avgPerMachineAll)} đ</b></div>
          <button className="primary-btn" onClick={saveBatch} disabled={loading}>{loading ? "Đang lưu..." : "LƯU"}</button>
        </div>

        {error ? <div style={{ marginTop: 8, color: "#b91c1c", fontWeight: 700 }}>❌ {error}</div> : null}
        {success ? <div style={{ marginTop: 8, color: "#166534", fontWeight: 700 }}>✅ {success}</div> : null}
      </section>
    </div>
  );
}

function Cell({ value, onChange, onFocus, rowIndex, col, onKeyDown }: { value: string; onChange: (v: string) => void; onFocus: () => void; rowIndex: number; col: string; onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colSelector: string) => void; }) {
  return (
    <td style={{ border: "1px solid #cbd5e1", padding: 6 }}>
      <input data-row={rowIndex} data-col={col} style={cellStyle} value={value} onFocus={onFocus} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => onKeyDown(e, rowIndex, col)} />
    </td>
  );
}
