// paywall.config.ts — 你專案唯一的方案定義來源（前後端都 import 這個）
// 改這份 config = 改整套付費牆（方案頁、升級卡、閘門、配額）。
import createPaywall from "paywall-kit"; // 或相對路徑 import 內嵌的 index.js

// features 的 key 自訂；boolean=有無，number=配額上限（-1=無限）
export const paywall = createPaywall({
  tiers: [
    {
      id: "free",
      name: "免費版",
      price: 0,
      tagline: "先試試水溫",
      features: { packages: 3, allTemplates: false, multiKeyword: false, apiAccess: false, whiteLabel: false },
    },
    {
      id: "standard",
      name: "標準版",
      price: 299,
      originalPrice: 599, // 早鳥定錨原價（劃線用；實際扣款一律以後端/金流的 price 為準）
      tagline: "個人創作者首選",
      highlight: true, // 方案頁「最受歡迎」高亮
      features: { packages: -1, allTemplates: true, multiKeyword: true, apiAccess: false, whiteLabel: false },
    },
    {
      id: "premium",
      name: "專業版",
      price: 599,
      originalPrice: 1180,
      tagline: "專業變現 / 團隊",
      features: { packages: -1, allTemplates: true, multiKeyword: true, apiAccess: true, whiteLabel: true },
    },
  ],
});

// 功能顯示文案（比較表/升級卡用）。key 對應 features
export const FEATURE_LABELS: Record<string, string> = {
  packages: "資料包數量",
  allTemplates: "全部進階模板",
  multiKeyword: "多關鍵字解鎖規則",
  apiAccess: "API 整合",
  whiteLabel: "白標（隱藏品牌）",
};

// 配額型欄位的顯示（number 值怎麼呈現）。回傳字串或 null（null 走預設打勾/叉）
export const quotaDisplay: Record<string, (v: number) => string> = {
  packages: (v) => (v === -1 ? "無限" : `${v} 個`),
};

// 限時活動文案（方案頁橫幅）
export const PROMO_BANNER = "🔥 早鳥限時 5 折 · 恢復原價前把握機會";
