"use client";

import { useEffect, useState } from "react";
import { AppSettings, DEFAULT_SETTINGS, getAppSettings, saveAppSettings } from "@/lib/appSettings";

const ADD_CHANNEL = "__ADD_CHANNEL__";
const DELETE_CHANNEL = "__DELETE_CHANNEL__";

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setSettings(getAppSettings());
  }, []);

  const setField = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const onSave = () => {
    saveAppSettings(settings);
    setMsg("✅ Đã lưu cài đặt mặc định. Chỉ áp dụng cho đơn mới tạo sau thời điểm này.");
  };

  const addChannel = () => {
    const name = (window.prompt("Nhập tên kênh bán mới:", "") || "").trim();
    if (!name) return;
    if (settings.saleChannels.some((x) => x.toLowerCase() === name.toLowerCase())) {
      setMsg("⚠️ Kênh bán này đã tồn tại.");
      return;
    }
    setSettings((prev) => ({ ...prev, saleChannels: [...prev.saleChannels, name], defaultSaleChannel: name }));
    setMsg("✅ Đã thêm kênh bán mới.");
  };

  const removeChannel = (name: string) => {
    if (!name) {
      setMsg("⚠️ Hãy chọn kênh mặc định trước để xóa nhanh.");
      return;
    }
    if (!window.confirm(`Xóa kênh bán \"${name}\"?`)) return;
    setSettings((prev) => ({
      ...prev,
      saleChannels: prev.saleChannels.filter((x) => x !== name),
      defaultSaleChannel: prev.defaultSaleChannel === name ? "" : prev.defaultSaleChannel,
    }));
    setMsg("✅ Đã xóa kênh bán.");
  };

  const onChangeDefaultChannel = (value: string) => {
    if (value === ADD_CHANNEL) return addChannel();
    if (value === DELETE_CHANNEL) return removeChannel(settings.defaultSaleChannel);
    setField("defaultSaleChannel", value);
    setMsg("");
  };

  return (
    <div style={{ display: "grid", gap: 14, maxWidth: 980 }}>
      <h1 style={{ margin: 0 }}>Settings</h1>

      <section style={card}>
        <h3 style={title}>Cài đặt chi phí mặc định</h3>
        <div style={grid4}>
          <VndInput label="Phí vận chuyển mặc định" value={settings.defaultShippingCost} onChange={(v) => setField("defaultShippingCost", v)} />
          <VndInput label="Giá trị phụ kiện mặc định" value={settings.defaultAccessoryCost} onChange={(v) => setField("defaultAccessoryCost", v)} />
          <VndInput label="Hoa hồng mặc định" value={settings.defaultCommission} onChange={(v) => setField("defaultCommission", v)} />
          <VndInput label="Chi phí khác mặc định" value={settings.defaultOtherCost} onChange={(v) => setField("defaultOtherCost", v)} />
        </div>
      </section>

      <section style={card}>
        <h3 style={title}>Cài đặt bán hàng mặc định</h3>
        <div style={grid3}>
          <label style={lab}>Bảo hành mặc định (tháng)
            <input className="input-clean" type="number" min={0} value={settings.defaultWarrantyMonths} onChange={(e) => setField("defaultWarrantyMonths", Number(e.target.value || 0))} />
            <span style={helper}>&nbsp;</span>
          </label>
          <label style={lab}>Kênh bán mặc định
            <select className="input-clean" value={settings.defaultSaleChannel} onChange={(e) => onChangeDefaultChannel(e.target.value)}>
              <option value="">(Không đặt mặc định)</option>
              <option value={ADD_CHANNEL}>+ Thêm kênh bán ngay trong sổ xuống...</option>
              <option value={DELETE_CHANNEL}>🗑 Xóa kênh mặc định đang chọn</option>
              {settings.saleChannels.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
            <span style={helper}>&nbsp;</span>
          </label>
          <label style={lab}>Hình thức thanh toán mặc định
            <select className="input-clean" value={settings.defaultPaymentType} onChange={(e) => setField("defaultPaymentType", e.target.value as AppSettings["defaultPaymentType"])}>
              <option value="CASH">Tiền mặt</option>
              <option value="BANK_TRANSFER">Chuyển khoản</option>
              <option value="COD">COD</option>
            </select>
            <span style={helper}>&nbsp;</span>
          </label>
        </div>
      </section>

      <section style={card}>
        <h3 style={title}>Cài đặt báo cáo</h3>
        <div style={grid3}>
          <VndInput label="Ngưỡng lãi tốt" value={settings.reportProfitGood} onChange={(v) => setField("reportProfitGood", v)} />
          <VndInput label="Ngưỡng lãi thấp" value={settings.reportProfitBad} onChange={(v) => setField("reportProfitBad", v)} />
          <label style={lab}>Ngưỡng lỗi tốt (%)
            <input className="input-clean" type="number" value={settings.reportErrorGood} onChange={(e) => setField("reportErrorGood", Number(e.target.value || 0))} />
            <span style={helper}>&nbsp;</span>
          </label>
          <label style={lab}>Ngưỡng lỗi xấu (%)
            <input className="input-clean" type="number" value={settings.reportErrorBad} onChange={(e) => setField("reportErrorBad", Number(e.target.value || 0))} />
            <span style={helper}>&nbsp;</span>
          </label>
          <label style={lab}>Ngưỡng vòng quay tốt (ngày)
            <input className="input-clean" type="number" value={settings.reportTurnoverGood} onChange={(e) => setField("reportTurnoverGood", Number(e.target.value || 0))} />
            <span style={helper}>&nbsp;</span>
          </label>
          <label style={lab}>Kỳ mặc định cho dashboard
            <select className="input-clean" value={settings.dashboardDefaultRange} onChange={(e) => setField("dashboardDefaultRange", e.target.value as AppSettings["dashboardDefaultRange"])}>
              <option value="4W">4 tuần gần nhất</option>
              <option value="8W">8 tuần gần nhất</option>
              <option value="12W">12 tuần gần nhất</option>
            </select>
            <span style={helper}>Dashboard sẽ tự lấy kỳ này làm mặc định khi mở trang.</span>
          </label>
        </div>
      </section>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button className="primary-btn" style={{ minWidth: 160, minHeight: 42, fontWeight: 800 }} onClick={onSave}>Lưu cài đặt</button>
        {msg ? <span style={{ color: "#166534", fontWeight: 700 }}>{msg}</span> : null}
      </div>
    </div>
  );
}

function VndInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label style={lab}>
      {label}
      <input className="input-clean" inputMode="numeric" value={formatPlain(value)} onChange={(e) => onChange(parseVnd(e.target.value))} />
      <span style={{ color: "#64748b", fontSize: 12 }}>{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(value || 0)}</span>
    </label>
  );
}

function parseVnd(text: string) {
  const digits = (text || "").replace(/\D/g, "");
  return Number(digits || 0);
}

function formatPlain(v: number) {
  return new Intl.NumberFormat("vi-VN").format(v || 0);
}

const title: React.CSSProperties = { margin: "0 0 12px 0", fontWeight: 900 };
const card: React.CSSProperties = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: 14, boxShadow: "0 6px 16px rgba(15,23,42,0.05)" };
const lab: React.CSSProperties = { display: "grid", gap: 6, fontWeight: 700, color: "#334155" };
const helper: React.CSSProperties = { color: "#64748b", fontSize: 12, minHeight: 18, lineHeight: "18px" };
const grid4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10 };
const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, alignItems: "start" };
