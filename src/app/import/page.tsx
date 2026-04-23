"use client";

import { useMemo, useState } from "react";

const modules = ["IMPORT NCC", "IMPORT MODEL", "IMPORT MÁY", "IMPORT REPAIR", "IMPORT WARRANTY"];

export default function ImportPage() {
  const [selected, setSelected] = useState(modules[0]);
  const [fileName, setFileName] = useState("Chưa chọn file");
  const [fileSize, setFileSize] = useState(0);
  const [previewRows, setPreviewRows] = useState<string[]>([]);

  const stats = useMemo(() => {
    const ok = Math.max(0, previewRows.length - Math.floor(previewRows.length * 0.2));
    const error = Math.floor(previewRows.length * 0.2);
    return { ok, error };
  }, [previewRows]);

  const parsed = useMemo(() => {
    if (!previewRows.length) return { headers: [] as string[], rows: [] as string[][] };
    const rows = previewRows.map((x) => x.split(",").map((c) => c.trim()));
    return { headers: rows[0] || [], rows: rows.slice(1, 11) };
  }, [previewRows]);

  const onFile = async (file?: File) => {
    if (!file) return;
    setFileName(file.name);
    setFileSize(file.size);
    const txt = await file.text();
    const lines = txt.split(/\r?\n/).filter(Boolean).slice(0, 12);
    setPreviewRows(lines);
  };

  const resetFile = () => {
    setFileName("Chưa chọn file");
    setFileSize(0);
    setPreviewRows([]);
  };

  const downloadSample = () => {
    const csv = "ma,ten,ghi_chu\nA01,Du lieu mau,Import test\nA02,Du lieu mau 2,Import test";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "import-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <section className="panel" style={{ padding: 14 }}>
        <h1 style={{ margin: 0, fontWeight: 900, fontSize: 28, color: "#0f172a" }}>Nhập dữ liệu</h1>
        <div style={{ color: "#64748b", marginTop: 4 }}>Chọn loại dữ liệu cần nhập, tải file lên, xem trước và xác nhận.</div>
      </section>

      <section className="panel" style={{ padding: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {modules.map((m) => (
          <button
            key={m}
            onClick={() => setSelected(m)}
            style={{
              ...btn,
              minHeight: 40,
              fontWeight: 800,
              padding: "10px 14px",
              background: m === selected ? "#2563eb" : "#fff",
              color: m === selected ? "#fff" : "#0f172a",
              borderColor: m === selected ? "#1d4ed8" : "#d1d5db",
            }}
          >
            {m}
          </button>
        ))}
      </section>

      <section className="panel" style={{ padding: 14 }}>
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            onFile(e.dataTransfer.files?.[0]);
          }}
          style={{ border: "2px dashed #94a3b8", borderRadius: 12, padding: 26, textAlign: "center", background: "#fff" }}
        >
          <div style={{ fontSize: 24, marginBottom: 6 }}>📤</div>
          <div style={{ fontWeight: 800, fontSize: 18 }}>Kéo thả file vào đây</div>
          <div style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>hoặc bấm để chọn file</div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
            <label style={{ display: "inline-block", ...btn, background: "#2563eb", color: "#fff", cursor: "pointer", minHeight: 38 }}>
              Chọn file
              <input type="file" hidden onChange={(e) => onFile(e.target.files?.[0])} />
            </label>
            <button style={{ ...btn, minHeight: 38 }} onClick={downloadSample}>Tải file mẫu</button>
            {previewRows.length > 0 ? <button style={{ ...btn, minHeight: 38 }} onClick={resetFile}>Đổi file</button> : null}
          </div>
          <div style={{ marginTop: 10, fontSize: 13, color: "#334155" }}>
            File: <b>{fileName}</b>{fileSize > 0 ? ` (${(fileSize / 1024).toFixed(1)} KB)` : ""}
          </div>
        </div>
      </section>

      <section className="panel" style={{ padding: 14, display: "grid", gap: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 18 }}>Xem trước dữ liệu</div>
        {!previewRows.length ? (
          <div style={{ border: "1px dashed #cbd5e1", borderRadius: 10, padding: 24, textAlign: "center", color: "#64748b" }}>Chưa có dữ liệu xem trước</div>
        ) : (
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 10, overflow: "auto" }}>
            <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr>
                  {parsed.headers.map((h, i) => <th key={`${h}-${i}`} style={th}>{h || `Cột ${i + 1}`}</th>)}
                </tr>
              </thead>
              <tbody>
                {parsed.rows.map((r, i) => (
                  <tr key={i}>{r.map((c, j) => <td key={j} style={td}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
          <button style={btn}>Xem trước</button>
          <button className="primary-btn" style={{ minHeight: 40, padding: "10px 16px" }}>Nhập dữ liệu</button>
          <button style={btn} onClick={resetFile}>Xóa file</button>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Stat label="Thành công" value={stats.ok} good icon="✅" />
        <Stat label="Lỗi" value={stats.error} icon="⚠️" error={stats.error > 0} />
      </section>

      {stats.error > 0 ? (
        <section className="panel" style={{ padding: 12, display: "flex", justifyContent: "flex-end" }}>
          <button style={btn}>Xem chi tiết lỗi</button>
        </section>
      ) : null}
    </div>
  );
}

function Stat({ label, value, good, icon, error }: { label: string; value: number; good?: boolean; icon: string; error?: boolean }) {
  return (
    <div className="panel" style={{ minWidth: 120, background: good ? "#ecfdf5" : "#fef2f2", borderColor: good ? "#bbf7d0" : "#fecaca", padding: 14, minHeight: 96 }}>
      <div style={{ color: "#64748b", display: "flex", gap: 6, alignItems: "center", fontWeight: 700 }}>{icon} {label}</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: good ? "#166534" : "#991b1b", lineHeight: 1.1, marginTop: 4 }}>{value}</div>
      {error ? <div style={{ fontSize: 12, color: "#b91c1c", marginTop: 4 }}>Có dữ liệu lỗi cần kiểm tra</div> : null}
    </div>
  );
}

const th: React.CSSProperties = { textAlign: "left", padding: "9px 8px", background: "#e5e7eb", fontWeight: 800, border: "1px solid #cbd5e1", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 8px", border: "1px solid #e2e8f0", whiteSpace: "nowrap" };
const btn: React.CSSProperties = { border: "1px solid #d1d5db", borderRadius: 8, padding: "8px 12px", background: "#fff", fontWeight: 600, cursor: "pointer" };
