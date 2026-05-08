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
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [itemPrices, setItemPrices] = useState<Record<number, number>>({});

  const [form, setForm] = useState({
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

  const selectedItems = useMemo(
    () => items.filter((x) => selectedItemIds.includes(x.id)),
    [items, selectedItemIds]
  );

  const totalSalePrice = useMemo(
    () => selectedItemIds.reduce((sum, id) => sum + Number(itemPrices[id] || 0), 0),
    [selectedItemIds, itemPrices]
  );

  const toggleItem = (item: SaleOption) => {
    setSelectedItemIds((prev) => {
      if (prev.includes(item.id)) {
        return prev.filter((id) => id !== item.id);
      }
      return [...prev, item.id];
    });

    setItemPrices((prev) => ({
      ...prev,
      [item.id]: prev[item.id] ?? item.purchasePrice,
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedItemIds.length === 0) {
      alert("❌ Vui lòng tick chọn ít nhất 1 máy cần bán.");
      return;
    }

    const invalidItem = selectedItemIds.find((id) => !itemPrices[id] || itemPrices[id] <= 0);
    if (invalidItem) {
      alert("❌ Giá bán của từng máy phải lớn hơn 0.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/sales/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: selectedItemIds.map((id) => ({
            itemId: id,
            salePrice: Number(itemPrices[id]),
          })),
          collaboratorCommissionAmount: Number(form.collaboratorCommissionAmount || 0),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Tạo đơn thất bại");

      alert(`✅ Đã tạo đơn ${data.orderNo} với ${data.itemCount || selectedItemIds.length} máy`);
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
    <div style={{ maxWidth: 900, margin: "24px auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 8 }}>Tạo đơn bán hàng</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>Tick chọn một hoặc nhiều máy cho cùng một khách hàng.</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 14, border: "1px solid #e5e7eb", borderRadius: 12, padding: 16 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
            <b>Chọn máy cần bán *</b>
            <span style={{ color: "#475569", fontSize: 14 }}>
              Đã chọn: <b>{selectedItemIds.length}</b> máy | Tổng: <b>{totalSalePrice.toLocaleString("vi-VN")} đ</b>
            </span>
          </div>

          <div style={{ display: "grid", gap: 8, maxHeight: 420, overflow: "auto", border: "1px solid #e5e7eb", borderRadius: 10, padding: 8 }}>
            {items.length === 0 && <div style={{ color: "#64748b", padding: 10 }}>Chưa có máy nào ở trạng thái có thể bán.</div>}
            {items.map((item) => {
              const checked = selectedItemIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px 1fr 180px",
                    gap: 10,
                    alignItems: "center",
                    padding: 10,
                    border: checked ? "1px solid #2563eb" : "1px solid #e2e8f0",
                    borderRadius: 10,
                    background: checked ? "#eff6ff" : "#fff",
                  }}
                >
                  <input
                    aria-label={`Chọn máy ${item.internalCode}`}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleItem(item)}
                    style={{ width: 20, height: 20, cursor: "pointer" }}
                  />
                  <label onClick={() => toggleItem(item)} style={{ cursor: "pointer" }}>
                    <div style={{ fontWeight: 700 }}>{item.internalCode} | {item.model}</div>
                    <div style={{ color: "#64748b", fontSize: 13 }}>
                      NCC: {item.supplier} | Giá nhập: {item.purchasePrice.toLocaleString("vi-VN")} đ | Trạng thái: {item.currentStatus}
                    </div>
                  </label>
                  <input
                    style={inputStyle}
                    type="number"
                    min={1}
                    disabled={!checked}
                    value={itemPrices[item.id] || ""}
                    placeholder="Giá bán"
                    onChange={(e) => setItemPrices((p) => ({ ...p, [item.id]: Number(e.target.value) }))}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {selectedItems.length > 0 && (
          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 10, fontSize: 14 }}>
            Đơn này sẽ bán <b>{selectedItems.length}</b> máy cho cùng một khách hàng. Mỗi máy sẽ được lưu thành một dòng trong đơn bán hàng.
          </div>
        )}

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
