"use client";

import { useEffect, useState } from "react";
import { AppSettings, DEFAULT_SETTINGS, getAppSettings } from "@/lib/appSettings";

type SaleOption = {
  id: number;
  internalCode: string;
  serialNumber?: string | null;
  model: string;
  supplier: string;
  purchasePrice: number;
  currentStatus: string;
};

type Collaborator = { id: number; name: string };

const CUSTOM_CHANNEL = "__CUSTOM_CHANNEL__";

const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n || 0)} đ`;

export default function SalesPage() {
  const [isMobile, setIsMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SaleOption[]>([]);
  const [selected, setSelected] = useState<SaleOption | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [salePrice, setSalePrice] = useState(0);
  const [amountCollected, setAmountCollected] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [saleChannel, setSaleChannel] = useState<string>("");
  const [customChannel, setCustomChannel] = useState("");
  const [saleChannels, setSaleChannels] = useState<string[]>(DEFAULT_SETTINGS.saleChannels);

  const [commission, setCommission] = useState(0);
  const [collaboratorName, setCollaboratorName] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState(1);
  const [paymentType, setPaymentType] = useState<"CASH" | "BANK_TRANSFER" | "COD">("CASH");
  const [freeShip, setFreeShip] = useState(true);
  const [freeShipCost, setFreeShipCost] = useState(50000);
  const [giftAccessory, setGiftAccessory] = useState(true);
  const [giftAccessoryCost, setGiftAccessoryCost] = useState(100000);
  const [otherExtraCost, setOtherExtraCost] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 900);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    fetch("/api/collaborators").then((r) => r.json()).then((d) => setCollaborators(d.collaborators || [])).catch(() => setCollaborators([]));

    const s = getAppSettings();
    setSettings(s);
    setSaleChannels(s.saleChannels?.length ? s.saleChannels : DEFAULT_SETTINGS.saleChannels);
    setCommission(s.defaultCommission || 0);
    setWarrantyMonths(s.defaultWarrantyMonths || 0);
    setPaymentType(s.defaultPaymentType || "CASH");
    setFreeShip((s.defaultShippingCost || 0) > 0);
    setFreeShipCost(s.defaultShippingCost || 0);
    setGiftAccessory((s.defaultAccessoryCost || 0) > 0);
    setGiftAccessoryCost(s.defaultAccessoryCost || 0);
    setOtherExtraCost(s.defaultOtherCost || 0);

    if (s.defaultSaleChannel && (s.saleChannels || []).includes(s.defaultSaleChannel)) {
      setSaleChannel(s.defaultSaleChannel);
      setCustomChannel("");
    } else if (s.defaultSaleChannel) {
      setSaleChannel(CUSTOM_CHANNEL);
      setCustomChannel(s.defaultSaleChannel);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      const res = await fetch(`/api/sales/options?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setItems(data.items || []);
    }, 220);
    return () => clearTimeout(t);
  }, [query]);

  const disabled = !selected;
  const total = Math.max(0, Number(salePrice || 0));
  const paid = Math.max(0, Math.min(total, Number(amountCollected || 0)));
  const remain = Math.max(0, total - paid);
  const payStatus = remain === 0 ? "HOÀN THÀNH" : paymentType === "COD" ? "CHỜ ĐỐI SOÁT" : "CÒN NỢ";

  const save = async () => {
    if (!selected) return;
    if (!salePrice || salePrice <= 0) return setMsg("Giá bán không hợp lệ");
    if (!saleChannel) return setMsg("Vui lòng chọn kênh bán");
    if (saleChannel === CUSTOM_CHANNEL && !customChannel.trim()) return setMsg("Nhập tên kênh bán mới");
    if (commission > 0 && !collaboratorName.trim()) return setMsg("Có hoa hồng thì phải chọn CTV nhận");

    const finalChannel = saleChannel === CUSTOM_CHANNEL ? customChannel.trim() : saleChannel;
    const extraNote = [
      freeShip ? `Free ship: ${freeShipCost}` : "",
      giftAccessory ? `Tặng phụ kiện: ${giftAccessoryCost}` : "",
      otherExtraCost > 0 ? `Chi phí khác: ${otherExtraCost}` : "",
    ].filter(Boolean).join(" | ");
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/sales/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: selected.id,
          saleDate,
          salePrice: total,
          amountCollected: paid,
          paymentType,
          paymentMethod: paymentType === "CASH" ? "CASH" : paymentType === "BANK_TRANSFER" ? "BANK_TRANSFER" : "DEBT",
          customerName,
          customerPhone,
          saleChannel: finalChannel,
          collaboratorName: collaboratorName || undefined,
          collaboratorCommissionAmount: commission,
          warrantyMonths,
          note: [extraNote, note].filter(Boolean).join(" | "),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Lưu thất bại");
      setMsg(`✅ Đã lưu đơn ${data.orderNo}`);

      setSelected(null);
      setSalePrice(0);
      setAmountCollected(0);
      setCustomerName("");
      setCustomerPhone("");
      setCommission(settings.defaultCommission || 0);
      setCollaboratorName("");
      setWarrantyMonths(settings.defaultWarrantyMonths || 0);
      setPaymentType(settings.defaultPaymentType || "CASH");
      setFreeShip((settings.defaultShippingCost || 0) > 0);
      setFreeShipCost(settings.defaultShippingCost || 0);
      setGiftAccessory((settings.defaultAccessoryCost || 0) > 0);
      setGiftAccessoryCost(settings.defaultAccessoryCost || 0);
      setOtherExtraCost(settings.defaultOtherCost || 0);

      if (settings.defaultSaleChannel && saleChannels.includes(settings.defaultSaleChannel)) {
        setSaleChannel(settings.defaultSaleChannel);
        setCustomChannel("");
      } else if (settings.defaultSaleChannel) {
        setSaleChannel(CUSTOM_CHANNEL);
        setCustomChannel(settings.defaultSaleChannel);
      } else {
        setSaleChannel("");
        setCustomChannel("");
      }
      setNote("");

      const refetch = await fetch(`/api/sales/options?q=${encodeURIComponent(query)}`);
      const d2 = await refetch.json();
      setItems(d2.items || []);
    } catch (e: any) {
      setMsg(`❌ ${e?.message || "Có lỗi"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <section className="panel" style={{ padding: 14 }}>
        <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>
          Tìm máy để bán (mã / serial / model)
          <input className="input-clean" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="VD: MV-..., serial..., Latitude..." />
        </label>
        <div style={{ marginTop: 10, overflow: "auto", maxHeight: 280 }}>
          <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead><tr>{["Mã máy", "Serial", "Model", "NCC", "Giá nhập", "Trạng thái", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {items.map((x, i) => (
                <tr key={x.id} style={{ background: selected?.id === x.id ? "#dbeafe" : i % 2 ? "#f8fafc" : "#fff" }}>
                  <td style={td}>{x.internalCode}</td><td style={td}>{x.serialNumber || "-"}</td><td style={td}>{x.model}</td><td style={td}>{x.supplier}</td>
                  <td style={td}>{money(x.purchasePrice)}</td><td style={td}>{x.currentStatus}</td><td style={td}><button className="primary-btn" onClick={() => setSelected(x)}>Chọn</button></td>
                </tr>
              ))}
              {!items.length && <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={7}>Không có máy phù hợp</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel" style={{ padding: 14, background: "#eff6ff", borderColor: "#bfdbfe" }}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 10 }}>[ĐANG CHỌN]</div>
        {!selected ? <div style={{ color: "#64748b" }}>Chưa chọn máy</div> : <div>{selected.internalCode} | {selected.model} | {selected.serialNumber || "Không serial"} | Giá nhập: <b>{money(selected.purchasePrice)}</b></div>}
      </section>

      <section className="panel" style={{ padding: 14, opacity: disabled ? 0.75 : 1 }}>
        <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 10 }}>Form bán hàng</div>
        <div style={{ display: "grid", gap: 18 }}>
          <section className="panel" style={{ padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>THÔNG TIN CHÍNH</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 10 }}>
          <label style={lab}>Ngày bán<input className="input-clean" disabled={disabled} type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></label>
          <label style={lab}>Giá bán<input className="input-clean" disabled={disabled} type="number" value={salePrice} onChange={(e) => setSalePrice(Number(e.target.value))} /></label>
          <label style={lab}>Đã thu<input className="input-clean" disabled={disabled} type="number" value={amountCollected} onChange={(e) => setAmountCollected(Number(e.target.value))} /></label>
            </div>
          </section>

          <section className="panel" style={{ padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>KHÁCH HÀNG & KÊNH</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(2,minmax(0,1fr))", gap: 10 }}>
              <label style={lab}>Kênh bán<select className="input-clean" disabled={disabled} value={saleChannel} onChange={(e) => setSaleChannel(e.target.value)}><option value="">Chọn kênh bán</option>{saleChannels.map((c) => <option key={c} value={c}>{c}</option>)}<option value={CUSTOM_CHANNEL}>Khác, thêm mới</option></select></label>
              <label style={lab}>Thanh toán<select className="input-clean" disabled={disabled} value={paymentType} onChange={(e) => setPaymentType(e.target.value as any)}><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option><option value="COD">COD</option></select></label>
              {saleChannel === CUSTOM_CHANNEL ? <label style={lab}>Tên kênh mới<input className="input-clean" disabled={disabled} value={customChannel} onChange={(e) => setCustomChannel(e.target.value)} /></label> : <div />}
              <label style={lab}>Khách hàng<input className="input-clean" disabled={disabled} value={customerName} onChange={(e) => setCustomerName(e.target.value)} /></label>
              <label style={lab}>Số điện thoại<input className="input-clean" disabled={disabled} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} /></label>
              <label style={lab}>Bảo hành (tháng)<input className="input-clean" disabled={disabled} type="number" min={0} value={warrantyMonths} onChange={(e) => setWarrantyMonths(Number(e.target.value))} /></label>
            </div>
          </section>

          <section className="panel" style={{ padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>CHI PHÍ & PHÁT SINH</div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,minmax(0,1fr))", gap: 10 }}>
          <label style={lab}>Hoa hồng<input className="input-clean" disabled={disabled} type="number" value={commission} onChange={(e) => setCommission(Number(e.target.value))} /></label>
          <label style={lab}>Chi cho CTV<select className="input-clean" disabled={disabled || commission <= 0} value={collaboratorName} onChange={(e) => setCollaboratorName(e.target.value)}><option value="">{commission > 0 ? "Chọn CTV" : "Không áp dụng"}</option>{collaborators.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></label>
          <label style={lab}><span><input type="checkbox" disabled={disabled} checked={freeShip} onChange={(e) => setFreeShip(e.target.checked)} /> Free ship</span><input className="input-clean" disabled={disabled || !freeShip} type="number" value={freeShipCost} onChange={(e) => setFreeShipCost(Number(e.target.value))} /></label>
          <label style={lab}><span><input type="checkbox" disabled={disabled} checked={giftAccessory} onChange={(e) => setGiftAccessory(e.target.checked)} /> Tặng phụ kiện</span><input className="input-clean" disabled={disabled || !giftAccessory} type="number" value={giftAccessoryCost} onChange={(e) => setGiftAccessoryCost(Number(e.target.value))} /></label>
          <label style={lab}>Chi phí khác<input className="input-clean" disabled={disabled} type="number" value={otherExtraCost} onChange={(e) => setOtherExtraCost(Number(e.target.value))} /></label>
            </div>
          </section>

          <section className="panel" style={{ padding: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 8 }}>GHI CHÚ</div>
            <label style={{ ...lab, gridColumn: "1 / -1" }}>
              <textarea className="input-clean" disabled={disabled} rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
          </section>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: isMobile ? "repeat(2,minmax(0,1fr))" : "repeat(4,minmax(0,1fr))", gap: 8 }}>
          <div className="panel" style={{ padding: 12, background: "#ecfeff", borderColor: "#bae6fd" }}><div style={metaLabel}>Tổng đơn</div><div style={{ ...metaValue, fontSize: 22 }}>{money(total)}</div></div>
          <div className="panel" style={{ padding: 12, background: "#dbeafe", borderColor: "#93c5fd" }}><div style={metaLabel}>Đã thu</div><div style={{ ...metaValue, fontSize: 22, color: "#1e40af" }}>{money(paid)}</div></div>
          <div className="panel" style={{ padding: 12, background: "#fef2f2", borderColor: "#fecaca" }}><div style={metaLabel}>Còn lại</div><div style={{ ...metaValue, fontSize: 22, color: "#b91c1c" }}>{money(remain)}</div></div>
          <div className="panel" style={{ padding: 12 }}><div style={metaLabel}>Trạng thái</div><div style={{ marginTop: 6 }}><span style={{ padding: "6px 10px", borderRadius: 999, fontWeight: 800, background: payStatus === "HOÀN THÀNH" ? "#dcfce7" : payStatus === "CHỜ ĐỐI SOÁT" ? "#fef9c3" : "#fee2e2", color: payStatus === "HOÀN THÀNH" ? "#166534" : payStatus === "CHỜ ĐỐI SOÁT" ? "#92400e" : "#b91c1c" }}>{payStatus}</span></div></div>
        </div>

        <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}><button className="primary-btn" style={{ minHeight: 44, padding: "10px 20px", fontWeight: 800 }} disabled={disabled || loading} onClick={save}>{loading ? "Đang lưu..." : "LƯU BÁN HÀNG"}</button></div>
        {msg ? <div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div> : null}
      </section>
    </div>
  );
}

const lab: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 700, color: "#334155" };
const th: React.CSSProperties = { textAlign: "left", padding: "12px 10px", background: "#e5e7eb", fontWeight: 800, border: "1px solid #cbd5e1" };
const td: React.CSSProperties = { padding: "12px 10px", border: "1px solid #e2e8f0" };
const metaLabel: React.CSSProperties = { fontSize: 12, color: "#64748b", fontWeight: 700 };
const metaValue: React.CSSProperties = { fontSize: 18, fontWeight: 900, color: "#0f172a" };
