"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function QuickInputPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    supplierName: "",
    brand: "",
    modelName: "",
    quantity: 1,
    purchasePrice: 0,
    purchaseDate: new Date().toISOString().slice(0, 10),
    note: "",
  });

  const onChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        name === "quantity" || name === "purchasePrice" ? Number(value) : value,
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/quick-input", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Lưu dữ liệu thất bại");

      alert(`✅ Đã tạo ${data.createdItemCount} máy thành công`);
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) {
      alert(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 720, margin: "20px auto", padding: 16, fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ marginBottom: 12 }}>Nhập dữ liệu nhanh</h1>
      <p style={{ color: "#666", marginBottom: 16 }}>Tạo nhanh máy nhập kho (NEW_IMPORTED).</p>

      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label>Nhà cung cấp *<input name="supplierName" value={form.supplierName} onChange={onChange} required /></label>
        <label>Hãng *<input name="brand" value={form.brand} onChange={onChange} placeholder="VD: Apple" required /></label>
        <label>Model *<input name="modelName" value={form.modelName} onChange={onChange} placeholder="VD: MacBook Pro 14 M1" required /></label>
        <label>Số lượng *<input name="quantity" type="number" min={1} value={form.quantity} onChange={onChange} required /></label>
        <label>Giá nhập / máy *<input name="purchasePrice" type="number" min={0} value={form.purchasePrice} onChange={onChange} required /></label>
        <label>Ngày nhập *<input name="purchaseDate" type="date" value={form.purchaseDate} onChange={onChange} required /></label>
        <label>Ghi chú<textarea name="note" value={form.note} onChange={onChange} rows={3} /></label>

        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" disabled={loading}>{loading ? "Đang lưu..." : "Lưu dữ liệu"}</button>
          <button type="button" onClick={() => router.push("/dashboard")}>Quay lại dashboard</button>
        </div>
      </form>
    </div>
  );
}