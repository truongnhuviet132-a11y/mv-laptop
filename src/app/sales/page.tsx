"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AppSettings, DEFAULT_SETTINGS, getAppSettings } from "@/lib/appSettings";

type SaleOption = { id: number; internalCode: string; serialNumber?: string | null; model: string; supplier: string; purchasePrice: number; currentStatus: string };
type SaleLine = SaleOption & { salePrice: number; warrantyMonths: number; note?: string };
type Collaborator = { id: number; name: string };
type CustomerSuggestion = { id: number; name: string; phone?: string | null; address?: string | null };

const CUSTOM_CHANNEL = "__CUSTOM_CHANNEL__";
const money = (n: number) => `${new Intl.NumberFormat("vi-VN").format(n || 0)} đ`;

export default function SalesPage() {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SaleOption[]>([]);
  const [lines, setLines] = useState<SaleLine[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [msg, setMsg] = useState("");
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [amountCollected, setAmountCollected] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [customerSuggestOpen, setCustomerSuggestOpen] = useState(false);
  const [customerSuggestLoading, setCustomerSuggestLoading] = useState(false);
  const [saleChannel, setSaleChannel] = useState<string>("");
  const [customChannel, setCustomChannel] = useState("");
  const [saleChannels, setSaleChannels] = useState<string[]>(DEFAULT_SETTINGS.saleChannels);
  const [commission, setCommission] = useState(0);
  const [collaboratorName, setCollaboratorName] = useState("");
  const [defaultWarrantyMonths, setDefaultWarrantyMonths] = useState(1);
  const [paymentType, setPaymentType] = useState<"CASH" | "BANK_TRANSFER" | "COD">("CASH");
  const [freeShip, setFreeShip] = useState(true);
  const [freeShipCost, setFreeShipCost] = useState(50000);
  const [giftAccessory, setGiftAccessory] = useState(true);
  const [giftAccessoryCost, setGiftAccessoryCost] = useState(100000);
  const [otherExtraCost, setOtherExtraCost] = useState(0);
  const [note, setNote] = useState("");

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 980);
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
    setDefaultWarrantyMonths(s.defaultWarrantyMonths || 0);
    setPaymentType(s.defaultPaymentType || "CASH");
    setFreeShip((s.defaultShippingCost || 0) > 0);
    setFreeShipCost(s.defaultShippingCost || 0);
    setGiftAccessory((s.defaultAccessoryCost || 0) > 0);
    setGiftAccessoryCost(s.defaultAccessoryCost || 0);
    setOtherExtraCost(s.defaultOtherCost || 0);
    if (s.defaultSaleChannel && (s.saleChannels || []).includes(s.defaultSaleChannel)) setSaleChannel(s.defaultSaleChannel);
    else if (s.defaultSaleChannel) { setSaleChannel(CUSTOM_CHANNEL); setCustomChannel(s.defaultSaleChannel); }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        setPickerOpen(true);
        setTimeout(() => searchRef.current?.focus(), 0);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const loadSaleOptions = async (search = query) => {
    setItemsLoading(true);
    setItemsError("");
    try {
      const res = await fetch(`/api/sales/options?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Không tải được danh sách máy bán");
      setItems(data.items || []);
    } catch (e: unknown) {
      setItems([]);
      setItemsError(e instanceof Error ? e.message : "Không tải được danh sách máy bán");
    } finally {
      setItemsLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      if (!active) return;
      await loadSaleOptions(query);
    }, query ? 220 : 0);
    return () => { active = false; clearTimeout(t); };
  }, [query]);

  useEffect(() => {
    const search = customerPhone.trim() || customerName.trim();
    let active = true;
    const t = setTimeout(async () => {
      if (search.length < 2) {
        setCustomerSuggestions([]);
        setCustomerSuggestLoading(false);
        return;
      }
      setCustomerSuggestLoading(true);
      try {
        const res = await fetch(`/api/sales/customers?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        if (!active) return;
        setCustomerSuggestions(res.ok ? data.customers || [] : []);
      } catch {
        if (active) setCustomerSuggestions([]);
      } finally {
        if (active) setCustomerSuggestLoading(false);
      }
    }, 220);
    return () => { active = false; clearTimeout(t); };
  }, [customerName, customerPhone]);

  const selectCustomer = (customer: CustomerSuggestion) => {
    setCustomerName(customer.name || "");
    setCustomerPhone(customer.phone || "");
    setCustomerSuggestOpen(false);
  };

  const filteredItems = useMemo(() => items.filter((item) => !lines.some((line) => line.id === item.id)), [items, lines]);
  const subtotal = lines.reduce((sum, line) => sum + Number(line.salePrice || 0), 0);
  const extraCost = (freeShip ? freeShipCost : 0) + (giftAccessory ? giftAccessoryCost : 0) + otherExtraCost + commission;
  const paid = Math.max(0, Math.min(subtotal, Number(amountCollected || 0)));
  const remain = Math.max(0, subtotal - paid);
  const payStatus = remain === 0 ? "HOÀN THÀNH" : paymentType === "COD" ? "CHỜ ĐỐI SOÁT" : "CÒN NỢ";

  const addLine = (item: SaleOption) => {
    if (lines.some((line) => line.id === item.id)) return;
    setLines((prev) => [...prev, { ...item, salePrice: item.purchasePrice, warrantyMonths: defaultWarrantyMonths }]);
    setPickerOpen(false);
    setQuery("");
  };

  const updateLine = (id: number, patch: Partial<SaleLine>) => setLines((prev) => prev.map((line) => line.id === id ? { ...line, ...patch } : line));
  const removeLine = (id: number) => setLines((prev) => prev.filter((line) => line.id !== id));

  const resetAfterSave = async () => {
    setLines([]); setAmountCollected(0); setCustomerName(""); setCustomerPhone(""); setCommission(settings.defaultCommission || 0); setCollaboratorName(""); setDefaultWarrantyMonths(settings.defaultWarrantyMonths || 0); setPaymentType(settings.defaultPaymentType || "CASH"); setFreeShip((settings.defaultShippingCost || 0) > 0); setFreeShipCost(settings.defaultShippingCost || 0); setGiftAccessory((settings.defaultAccessoryCost || 0) > 0); setGiftAccessoryCost(settings.defaultAccessoryCost || 0); setOtherExtraCost(settings.defaultOtherCost || 0); setNote("");
    if (settings.defaultSaleChannel && saleChannels.includes(settings.defaultSaleChannel)) { setSaleChannel(settings.defaultSaleChannel); setCustomChannel(""); }
    else if (settings.defaultSaleChannel) { setSaleChannel(CUSTOM_CHANNEL); setCustomChannel(settings.defaultSaleChannel); }
    else { setSaleChannel(""); setCustomChannel(""); }
    await loadSaleOptions("");
  };

  const save = async () => {
    if (!lines.length) return setMsg("Vui lòng chọn ít nhất 1 máy cần bán");
    if (lines.some((line) => !line.salePrice || line.salePrice <= 0)) return setMsg("Giá bán từng máy phải lớn hơn 0");
    if (!saleChannel) return setMsg("Vui lòng chọn kênh bán");
    if (saleChannel === CUSTOM_CHANNEL && !customChannel.trim()) return setMsg("Nhập tên kênh bán mới");
    if (commission > 0 && !collaboratorName.trim()) return setMsg("Có hoa hồng thì phải chọn CTV nhận");
    const finalChannel = saleChannel === CUSTOM_CHANNEL ? customChannel.trim() : saleChannel;
    const extraNote = [freeShip ? `Free ship: ${freeShipCost}` : "", giftAccessory ? `Tặng phụ kiện: ${giftAccessoryCost}` : "", otherExtraCost > 0 ? `Chi phí khác: ${otherExtraCost}` : ""].filter(Boolean).join(" | ");
    setLoading(true); setMsg("");
    try {
      const res = await fetch("/api/sales/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        items: lines.map((line) => ({ itemId: line.id, salePrice: Number(line.salePrice), warrantyMonths: Number(line.warrantyMonths || 0) })),
        saleDate, amountCollected: paid, paymentType, paymentMethod: paymentType === "CASH" ? "CASH" : paymentType === "BANK_TRANSFER" ? "BANK_TRANSFER" : "DEBT", customerName, customerPhone, saleChannel: finalChannel, collaboratorName: collaboratorName || undefined, collaboratorCommissionAmount: commission, note: [extraNote, note].filter(Boolean).join(" | "),
      }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Lưu thất bại");
      setMsg(`✅ Đã lưu đơn ${data.orderNo} (${data.itemCount || lines.length} máy)`);
      await resetAfterSave();
    } catch (e: unknown) { setMsg(`❌ ${e instanceof Error ? e.message : "Có lỗi"}`); }
    finally { setLoading(false); }
  };

  return <div style={{ display: "grid", gap: 12 }}>
    <section className="panel" style={{ padding: 12, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1.35fr 1fr .9fr", gap: 12, alignItems: "start" }}>
      <div style={{ position: "relative" }}>
        <label style={{ ...lab, gap: 6 }}>Hàng hóa <span style={{ fontWeight: 500, color: "#64748b" }}>Bấm F3 hoặc gõ mã / serial / model</span></label>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input ref={searchRef} className="input-clean" value={query} onFocus={() => setPickerOpen(true)} onChange={(e) => { setQuery(e.target.value); setPickerOpen(true); }} placeholder="F3 - Tìm hàng hóa" style={{ flex: 1, fontSize: 16 }} />
          <button className="primary-btn" type="button" onClick={() => { setPickerOpen(true); loadSaleOptions(query); }}>Tìm</button>
        </div>
        <div style={{ marginTop: 6, color: itemsError ? "#b91c1c" : "#64748b", fontSize: 13 }}>{itemsError ? `⚠️ ${itemsError}` : itemsLoading ? "Đang tải danh sách máy..." : `Có ${filteredItems.length} máy có thể chọn`}</div>
        {pickerOpen ? <div style={pickerBox}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}><b>Danh sách hàng hóa</b><button className="action-btn" onClick={() => setPickerOpen(false)}>Đóng</button></div>
          <div style={{ maxHeight: 360, overflow: "auto" }}>
            <table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead><tr>{["Mã/Serial", "Model", "NCC", "Giá nhập", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>{filteredItems.map((x) => <tr key={x.id} onDoubleClick={() => addLine(x)}><td style={td}><b>{x.internalCode}</b><br/><span style={{ color: "#64748b" }}>{x.serialNumber || "Không serial"}</span></td><td style={td}>{x.model}</td><td style={td}>{x.supplier}</td><td style={td}>{money(x.purchasePrice)}</td><td style={td}><button className="primary-btn" onClick={() => addLine(x)}>Chọn</button></td></tr>)}{!filteredItems.length ? <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={5}>{itemsLoading ? "Đang tải..." : "Không có máy phù hợp"}</td></tr> : null}</tbody>
            </table>
          </div>
          <div className="small-note" style={{ marginTop: 8 }}>Mẹo: double click vào dòng để chọn nhanh.</div>
        </div> : null}
      </div>

      <div className="panel" style={{ padding: 12, background: "#f8fafc", position: "relative" }}><div style={{ fontWeight: 900, marginBottom: 8 }}>Khách hàng & kênh</div><div style={{ display: "grid", gap: 8 }}><input className="input-clean" placeholder="Tên khách hàng" value={customerName} onFocus={() => setCustomerSuggestOpen(true)} onChange={(e) => { setCustomerName(e.target.value); setCustomerSuggestOpen(true); }} /><input className="input-clean" placeholder="Số điện thoại" value={customerPhone} onFocus={() => setCustomerSuggestOpen(true)} onChange={(e) => { setCustomerPhone(e.target.value); setCustomerSuggestOpen(true); }} />{customerSuggestOpen && (customerName.trim().length >= 2 || customerPhone.trim().length >= 2) ? <div style={customerSuggestBox}>{customerSuggestLoading ? <div style={customerSuggestEmpty}>Đang tìm khách hàng...</div> : customerSuggestions.length ? customerSuggestions.map((c) => <button key={c.id} type="button" style={customerSuggestItem} onMouseDown={(e) => { e.preventDefault(); selectCustomer(c); }}><b>{c.name}</b><span style={{ color: "#64748b" }}>{c.phone || "Chưa có SĐT"}{c.address ? ` • ${c.address}` : ""}</span></button>) : <div style={customerSuggestEmpty}>Không thấy khách cũ phù hợp</div>}</div> : null}<select className="input-clean" value={saleChannel} onChange={(e) => setSaleChannel(e.target.value)}><option value="">Chọn kênh bán</option>{saleChannels.map((c) => <option key={c} value={c}>{c}</option>)}<option value={CUSTOM_CHANNEL}>Khác, thêm mới</option></select>{saleChannel === CUSTOM_CHANNEL ? <input className="input-clean" placeholder="Tên kênh mới" value={customChannel} onChange={(e) => setCustomChannel(e.target.value)} /> : null}<input className="input-clean" type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} /></div></div>
      <div className="panel" style={{ padding: 12, background: "#f8fafc" }}><div style={{ fontWeight: 900, marginBottom: 8 }}>Thanh toán</div><div style={{ display: "grid", gap: 8 }}><select className="input-clean" value={paymentType} onChange={(e) => setPaymentType(e.target.value as "CASH" | "BANK_TRANSFER" | "COD")}><option value="CASH">Tiền mặt</option><option value="BANK_TRANSFER">Chuyển khoản</option><option value="COD">COD</option></select><input className="input-clean" type="number" placeholder="Đã thu" value={amountCollected} onChange={(e) => setAmountCollected(Number(e.target.value))} /><input className="input-clean" type="number" placeholder="Hoa hồng" value={commission} onChange={(e) => setCommission(Number(e.target.value))} /><select className="input-clean" disabled={commission <= 0} value={collaboratorName} onChange={(e) => setCollaboratorName(e.target.value)}><option value="">{commission > 0 ? "Chọn CTV" : "Không áp dụng CTV"}</option>{collaborators.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div></div>
    </section>

    <section className="panel" style={{ padding: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}><div style={{ fontWeight: 900, fontSize: 18 }}>Hàng hóa đã chọn</div><div style={{ color: "#64748b" }}>Tổng số lượng: <b>{lines.length}</b></div></div>
      <div style={{ overflowX: "auto" }}><table className="excel-grid table-hover" style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}><thead><tr>{["#", "Mã máy", "Serial", "Model / NCC", "Giá nhập", "Giá bán", "BH", "Lãi tạm", ""].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead><tbody>{lines.map((line, idx) => <tr key={line.id}><td style={td}>{idx + 1}</td><td style={td}>{line.internalCode}</td><td style={td}>{line.serialNumber || "-"}</td><td style={td}><b>{line.model}</b><br/><span style={{ color: "#64748b" }}>{line.supplier}</span></td><td style={td}>{money(line.purchasePrice)}</td><td style={td}><input className="input-clean" type="number" value={line.salePrice} onChange={(e) => updateLine(line.id, { salePrice: Number(e.target.value) })} style={{ width: 140 }} /></td><td style={td}><input className="input-clean" type="number" min={0} value={line.warrantyMonths} onChange={(e) => updateLine(line.id, { warrantyMonths: Number(e.target.value) })} style={{ width: 70 }} /></td><td style={td}><span className={`status-badge ${line.salePrice - line.purchasePrice >= 0 ? "status-good" : "status-bad"}`}>{money(line.salePrice - line.purchasePrice)}</span></td><td style={td}><button className="action-btn action-btn-danger" onClick={() => removeLine(line.id)}>Xóa</button></td></tr>)}{!lines.length ? <tr><td style={{ ...td, textAlign: "center", color: "#64748b" }} colSpan={9}>Chưa chọn hàng hóa. Bấm F3 hoặc nhập ô Hàng hóa để chọn máy.</td></tr> : null}</tbody></table></div>
    </section>

    <section className="panel" style={{ padding: 12, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 360px", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3,1fr)", gap: 8 }}><label style={lab}><span><input type="checkbox" checked={freeShip} onChange={(e) => setFreeShip(e.target.checked)} /> Free ship</span><input className="input-clean" disabled={!freeShip} type="number" value={freeShipCost} onChange={(e) => setFreeShipCost(Number(e.target.value))} /></label><label style={lab}><span><input type="checkbox" checked={giftAccessory} onChange={(e) => setGiftAccessory(e.target.checked)} /> Tặng phụ kiện</span><input className="input-clean" disabled={!giftAccessory} type="number" value={giftAccessoryCost} onChange={(e) => setGiftAccessoryCost(Number(e.target.value))} /></label><label style={lab}>Chi phí khác<input className="input-clean" type="number" value={otherExtraCost} onChange={(e) => setOtherExtraCost(Number(e.target.value))} /></label><label style={{ ...lab, gridColumn: "1 / -1" }}>Ghi chú đơn hàng<textarea className="input-clean" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label></div>
      <div className="panel" style={{ padding: 14, background: "#ecfeff", borderColor: "#bae6fd" }}><Summary label="Tổng tiền hàng" value={money(subtotal)} /><Summary label="Chi phí phát sinh" value={money(extraCost)} muted /><Summary label="Khách đã trả" value={money(paid)} /><Summary label="Khách còn lại" value={money(remain)} danger={remain > 0} /><div style={{ marginTop: 10 }}><span style={{ padding: "6px 10px", borderRadius: 999, fontWeight: 800, background: payStatus === "HOÀN THÀNH" ? "#dcfce7" : payStatus === "CHỜ ĐỐI SOÁT" ? "#fef9c3" : "#fee2e2", color: payStatus === "HOÀN THÀNH" ? "#166534" : payStatus === "CHỜ ĐỐI SOÁT" ? "#92400e" : "#b91c1c" }}>{payStatus}</span></div><button className="primary-btn" style={{ width: "100%", marginTop: 14, fontSize: 16 }} disabled={!lines.length || loading} onClick={save}>{loading ? "Đang lưu..." : "THANH TOÁN / LƯU ĐƠN"}</button>{msg ? <div style={{ marginTop: 8, fontWeight: 700 }}>{msg}</div> : null}</div>
    </section>
  </div>;
}

function Summary({ label, value, muted, danger }: { label: string; value: string; muted?: boolean; danger?: boolean }) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid #dbeafe" }}><span style={{ color: muted ? "#64748b" : "#0f172a", fontWeight: 700 }}>{label}</span><b style={{ color: danger ? "#b91c1c" : "#0f172a", fontSize: 18 }}>{value}</b></div>; }

const lab: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 700, color: "#334155" };
const th: React.CSSProperties = { textAlign: "left", padding: "10px 8px", background: "#e5e7eb", fontWeight: 800, border: "1px solid #cbd5e1", whiteSpace: "nowrap" };
const td: React.CSSProperties = { padding: "9px 8px", border: "1px solid #e2e8f0", verticalAlign: "middle" };
const pickerBox: React.CSSProperties = { position: "absolute", top: 82, left: 0, right: 0, zIndex: 20, background: "#fff", border: "1px solid #93c5fd", boxShadow: "0 20px 45px rgba(15, 23, 42, .18)", borderRadius: 12, padding: 12 };
const customerSuggestBox: React.CSSProperties = { position: "absolute", top: 104, left: 12, right: 12, zIndex: 25, display: "grid", gap: 4, background: "#fff", border: "1px solid #93c5fd", boxShadow: "0 18px 35px rgba(15, 23, 42, .16)", borderRadius: 10, padding: 8, maxHeight: 240, overflow: "auto" };
const customerSuggestItem: React.CSSProperties = { display: "grid", gap: 3, textAlign: "left", border: 0, background: "#fff", borderRadius: 8, padding: "8px 10px", cursor: "pointer", font: "inherit" };
const customerSuggestEmpty: React.CSSProperties = { padding: "8px 10px", color: "#64748b", fontSize: 13 };
