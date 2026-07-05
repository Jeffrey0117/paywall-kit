# paywall-kit 🧱💰

**SaaS 變現漏斗，套下去就有整套付費牆。** 一份方案定義 → 驅動功能閘門、用量配額、升級路徑、原價→特價折扣計算（零依賴核心），外加銷售型方案頁 / 後台升級誘導卡 / 免費版上限 DB trigger（React + Supabase 模板）。

金流本體不在這個 kit（那是 [payuni-embed-kit](https://github.com/Jeffrey0117/payuni-embed-kit) + [PayGate](https://github.com/Jeffrey0117/PayGate) 的事）。paywall-kit 管的是**金流以外的整條變現 UX 與 gate 邏輯**——你把 checkout 動作注入即可。

## 為什麼

做 SaaS 每次都要重寫：方案頁、升級誘導、免費版限制、前端擋一次後端再擋一次。這 kit 把它變成「改一份 config」。前後端 import 同一份定義 → 前端擋是體驗、後端擋是牆，兩邊邏輯不會漂。

## 安裝

```bash
npm i github:Jeffrey0117/paywall-kit   # 或直接複製 index.js（零依賴，可內嵌）
```

## 核心（零依賴，前後端共用）

```js
const createPaywall = require('paywall-kit');

const paywall = createPaywall({
  tiers: [
    { id: 'free',     name: '免費版', price: 0,
      features: { packages: 3,  multiKeyword: false, apiAccess: false } },
    { id: 'standard', name: '標準版', price: 299, originalPrice: 599,
      features: { packages: -1, multiKeyword: true,  apiAccess: false } }, // -1 = 無限
    { id: 'premium',  name: '專業版', price: 599, originalPrice: 1180,
      features: { packages: -1, multiKeyword: true,  apiAccess: true  } },
  ],
});

paywall.can('free', 'multiKeyword')          // false — 布林功能閘門
paywall.checkQuota('free', 'packages', 3)     // { allowed:false, limit:3, remaining:0, atLimit:true }
paywall.nextTier('free')                      // 'standard' — 升級階梯
paywall.isTop('premium')                      // true
paywall.pricing('standard')                   // { price:299, originalPrice:599, discountPct:50, saved:300 }
paywall.compare(['packages','apiAccess'])     // 功能比較表資料（餵給 UI）
paywall.allTiers()                            // 全部 tier + pricing 展開（畫方案卡）
```

`node example.js` 有完整可跑範例。

### API

| 方法 | 回傳 | 用途 |
|------|------|------|
| `can(tier, feature)` | boolean | 布林功能是否開放（配額欄位 >0 也算有） |
| `checkQuota(tier, feature, used)` | `{allowed, limit, remaining, unlimited, atLimit}` | 配額型功能剩餘量 |
| `nextTier(tier)` | string \| null | 升級階梯下一階 |
| `isTop(tier)` | boolean | 是否最高階 |
| `pricing(tier)` | `{price, originalPrice, discountPct, saved, isFree}` | 定價策略計算 |
| `compare(features?)` | `{tiers, rows}` | 功能比較表資料 |
| `tier(id)` / `allTiers()` | tier(+pricing) | UI 直接用 |

features 值：`true`/`false` = 有/無；`number` = 配額上限（`-1` 或 `Infinity` = 無限）。

## UI 模板（templates/，React + shadcn + Tailwind）

複製 `templates/` 到你的專案，改 `paywall.config.ts` 一份就換整套。依賴 shadcn 的 `Button`/`Card`/`Badge` + `lucide-react` + Tailwind。

| 檔案 | 是什麼 |
|------|--------|
| `paywall.config.ts` | **唯一方案定義**（tiers + 功能文案 + 活動橫幅）。前後端都 import 這個 |
| `PricingPage.tsx` | 銷售型方案頁：限時橫幅、原價劃線→早鳥特價→折扣 badge、方案卡、功能比較表。接 `onCheckout(tierId)` |
| `UpgradePromo.tsx` | 後台升級誘導卡：用量壓力條（X/limit）、下一階解鎖清單、早鳥價、CTA。接 `onUpgrade(targetTier)` |
| `quota-limit.trigger.sql` | 免費版上限的 Postgres/Supabase trigger 範本（後端硬牆） |

### 方案頁

```tsx
import { PricingPage } from '@/paywall/PricingPage';
import { useNavigate } from 'react-router-dom';

<PricingPage
  currentTier={userTier}
  onCheckout={(tier) => navigate(`/checkout?tier=${tier}`)} // 你的金流結帳流程
/>
```

### 後台升級卡

```tsx
import { UpgradePromo } from '@/paywall/UpgradePromo';

<UpgradePromo
  tier={userTier}
  usage={{ packages: myPackages.length }}
  quotaFeature="packages"                       // 顯示 X/上限 壓力條
  onUpgrade={() => navigate('/pricing')}
/>
```

## 後端硬牆（防繞過前端）

前端擋只是體驗，有心人直接打 API 就繞過。真正的限制放資料庫：

1. 開 `templates/quota-limit.trigger.sql`，替換 `{{RESOURCE_TABLE}}` / `{{OWNER_COLUMN}}` / `{{FREE_LIMIT}}`，在 Supabase SQL Editor 執行。
2. 免費版 insert 超額 → DB `RAISE EXCEPTION 'FREE_QUOTA_LIMIT_REACHED'`（不管前端、直接 API、curl 都擋）。
3. 前端 insert 失敗時偵測 `error.message.includes('FREE_QUOTA_LIMIT_REACHED')` → 導向 `/pricing`。

## 與金流搭配

```
paywall-kit（方案定義 / gate / 方案頁 / 升級卡 / DB 硬牆）
   └─ onCheckout(tierId) ─▶ 你的結帳頁 ─▶ payuni-embed-kit（免跳轉刷卡）
                                        └▶ PayGate（訂閱帳本 / webhook / 到期降級）
```

`price` 是單一價格來源；`originalPrice` 只是行銷定錨（劃線用），實際扣款金額一律由後端/金流決定，前端改不了。

## License

MIT © Jeffrey0117
