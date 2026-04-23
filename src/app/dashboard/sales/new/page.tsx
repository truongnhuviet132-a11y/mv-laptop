"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type SaleOption = {
  id: number;
  internalCode: string;
  model: string;
  supplier: string;
  purchasePrice: number;
  currentStatus: string;
};

export default function NewSalePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<SaleOption[]>([]);

  const [form, setForm] = useState({
    itemId: "",
    salePrice: 0,
    paymentMethod: "CASH",
    customerName: "",
    customerPhone: "",
    collaboratorName: "",
    collaboratorCommissionAmount: 0,
    note: "",
  });

  useEffect(() => {
    fetch("/api/sales/options")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, []);

  const selectedItem = useMemo(
    () => items.find((x) => String(x.id) === form.itemId),
    [items, form.itemId]
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.itemId) {
      alert("❌ Vui lòng chọn máy cần bán.");
      return;
    }
    if (!form.salePrice || form.salePrice <= 0) {
      alert("❌ Giá bán phải lớn hơn 0.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sales/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          itemId: Number(form.itemId),
          salePrice: Number(form.salePrice),
          collaboratorCommissionAmount: Number(form.collaboratorCommissionAmount || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Tạo đơn thất bại");

      alert(`✅ Đã tạo đơn ${data.orderNo}`);
      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      alert(`❌ ${err instanceof Error ? err.message : "Có lỗi xảy ra"}`);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    marginTop: 6,
    padding: "10px 12px",
    border: "1px solid #d0d7de",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: 760, margin: "24px auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Tạo đơn bán hàng</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>Chọn máy có thể bán và lưu đơn nhanh.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <label>
          Chọn máy cần bán *
          <select
            style={inputStyle}
            value={form.itemId}
            onChange={(e) => setForm((p) => ({ ...p, itemId: e.target.value }))}
            required
          >
            <option value="">-- Chọn máy --</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.internalCode} | {i.model} | {i.supplier}
              </option>
            ))}
          </select>
        </label>

        {selectedItem && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, fontSize: 14 }}>
            Giá nhập: <b>{selectedItem.purchasePrice.toLocaleString("vi-VN")} đ</b> | Trạng thái: <b>{selectedItem.currentStatus}</b>
          </div>
        )}

        <label>
          Giá bán *
          <input style={inputStyle} type="number" min={1} value={form.salePrice} onChange={(e) => setForm((p) => ({ ...p, salePrice: Number(e.target.value) }))} required />
        </label>

        <label>
          Phương thức thanh toán *
          <select style={inputStyle} value={form.paymentMethod} onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}>
            <option value="CASH">Tiền mặt</option>
            <option value="BANK_TRANSFER">Chuyển khoản</option>
            <option value="DEBT">Công nợ</option>
            <option value="MIXED">Hỗn hợp</option>
          </select>
        </label>

        <label>Tên khách hàng<input style={inputStyle} value={form.customerName} onChange={(e) => setForm((p) => ({ ...p, customerName: e.target.value }))} /></label>
        <label>SĐT khách hàng<input style={inputStyle} value={form.customerPhone} onChange={(e) => setForm((p) => ({ ...p, customerPhone: e.target.value }))} /></label>
        <label>Tên cộng tác viên<input style={inputStyle} value={form.collaboratorName} onChange={(e) => setForm((p) => ({ ...p, collaboratorName: e.target.value }))} /></label>
        <label>Hoa hồng CTV<input style={inputStyle} type="number" min={0} value={form.collaboratorCommissionAmount} onChange={(e) => setForm((p) => ({ ...p, collaboratorCommissionAmount: Number(e.target.value) }))} /></label>
        <label>Ghi chú<textarea style={inputStyle} rows={3} value={form.note} onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} /></label>

        <div style={{ display: "flex", gap: 10 }}>
          <button type="submit" disabled={loading} style={{ background: "#2563eb", color: "#fff", border: "none", borderRadius: 8, padding: "10px 14px", cursor: "pointer", fontWeight: 600 }}>
            {loading ? "Đang lưu..." : "✅ Lưu đơn bán"}
          </button>
          <button type="button" onClick={() => router.push("/dashboard")} style={{ background: "#fff", border: "1px solid #d1d5db", borderRadius: 8, padding: "10px 14px", cursor: "pointer" }}>
            Quay lại
          </button>
        </div>
      </form>
    </div>
  );
}
