export type AppSettings = {
  saleChannels: string[];
  dashboardDefaultRange: "4W" | "8W" | "12W";
  defaultShippingCost: number;
  defaultAccessoryCost: number;
  defaultCommission: number;
  defaultOtherCost: number;
  defaultWarrantyMonths: number;
  defaultSaleChannel: string;
  defaultPaymentType: "CASH" | "BANK_TRANSFER" | "COD";
  reportProfitGood: number;
  reportProfitBad: number;
  reportErrorGood: number;
  reportErrorBad: number;
  reportTurnoverGood: number;
  reportDefaultMonthMode: "CURRENT" | "FIXED";
  reportDefaultMonth: string;
};

const currentMonth = new Date().toISOString().slice(0, 7);

export const DEFAULT_SETTINGS: AppSettings = {
  saleChannels: ["Facebook cá nhân", "Facebook Ads", "Khách quen", "Cửa hàng"],
  dashboardDefaultRange: "4W",
  defaultShippingCost: 50000,
  defaultAccessoryCost: 100000,
  defaultCommission: 0,
  defaultOtherCost: 0,
  defaultWarrantyMonths: 1,
  defaultSaleChannel: "",
  defaultPaymentType: "CASH",
  reportProfitGood: 2000000,
  reportProfitBad: 1000000,
  reportErrorGood: 25,
  reportErrorBad: 50,
  reportTurnoverGood: 14,
  reportDefaultMonthMode: "CURRENT",
  reportDefaultMonth: currentMonth,
};

const STORAGE_KEY = "mvLaptop.app.settings.v1";

export function getAppSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    merged.saleChannels = Array.isArray(merged.saleChannels)
      ? merged.saleChannels
          .map((x: unknown) => String(x || "").trim())
          .filter(Boolean)
      : DEFAULT_SETTINGS.saleChannels;
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAppSettings(settings: AppSettings) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
