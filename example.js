// node example.js — 用 KeyBox 真實方案示範 paywall-kit 核心
const createPaywall = require('./index');

// ① 唯一的方案定義（前後端共用這一份）
const paywall = createPaywall({
  tiers: [
    {
      id: 'free',
      name: '免費版',
      price: 0,
      features: { packages: 3, allTemplates: false, multiKeyword: false, apiAccess: false, whiteLabel: false },
    },
    {
      id: 'standard',
      name: '標準版',
      price: 299,
      originalPrice: 599, // 早鳥定錨
      features: { packages: -1, allTemplates: true, multiKeyword: true, apiAccess: false, whiteLabel: false }, // -1 = 無限
    },
    {
      id: 'premium',
      name: '專業版',
      price: 599,
      originalPrice: 1180,
      features: { packages: -1, allTemplates: true, multiKeyword: true, apiAccess: true, whiteLabel: true },
    },
  ],
});

// ② 功能閘門
console.log('free 能用多關鍵字?    ', paywall.can('free', 'multiKeyword'));      // false
console.log('standard 能用進階模板? ', paywall.can('standard', 'allTemplates')); // true

// ③ 配額壓力（免費版已用 3 個資料包）
console.log('free 資料包配額(已用3):', paywall.checkQuota('free', 'packages', 3));
// → { allowed:false, limit:3, remaining:0, unlimited:false, atLimit:true }

// ④ 升級路徑
console.log('free 的下一階:         ', paywall.nextTier('free'));   // standard
console.log('premium 是頂端?        ', paywall.isTop('premium'));   // true

// ⑤ 定價策略（原價→特價→折扣）
console.log('standard 定價:         ', paywall.pricing('standard'));
// → { price:299, originalPrice:599, discountPct:50, saved:300, isFree:false }

// ⑥ 功能比較表（直接餵給 UI 畫表）
console.log('比較表:', JSON.stringify(paywall.compare(['packages', 'allTemplates', 'multiKeyword', 'apiAccess']), null, 2));
