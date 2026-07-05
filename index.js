// ============================================================================
// paywall-kit — SaaS 變現漏斗的零依賴核心
// ----------------------------------------------------------------------------
// 純邏輯，無 React / 無 DB / 無金流依賴（那些是 UI，見 templates/）。
// 你把「方案定義」注入，kit 回傳一組 gate / 配額 / 升級路徑 / 定價策略 函式。
// 前後端共用同一份定義 → 前端擋是體驗、後端擋是牆，兩邊邏輯一致不會漂。
//
//   const paywall = createPaywall({ tiers: [...] })
//   paywall.can('free', 'multiKeyword')          // → false
//   paywall.checkQuota('free', 'packages', 3)     // → { allowed:false, limit:3, ... }
//   paywall.nextTier('free')                      // → 'standard'
//   paywall.pricing('standard')                   // → { price, originalPrice, discountPct, ... }
//   paywall.compare(['packages','multiKeyword'])  // → 功能比較表資料
// ============================================================================

/**
 * @typedef {Object} Tier
 * @property {string}  id           - 'free' | 'standard' | 'premium' …（順序即升級階梯）
 * @property {string}  name         - 顯示名稱
 * @property {number}  price        - 實際扣款金額（單一價格來源，UI 只顯示）
 * @property {number} [originalPrice] - 行銷定錨原價（劃線用，可選）
 * @property {Object<string, boolean|number>} features
 *           功能表。boolean = 有/無；number = 配額上限（-1 或 Infinity = 無限）。
 */

const UNLIMITED = -1;

function createPaywall(opts = {}) {
  const tiers = Array.isArray(opts.tiers) ? opts.tiers : [];
  if (tiers.length === 0) throw new Error('paywall-kit: opts.tiers 不可為空');

  const byId = new Map(tiers.map((t) => [t.id, t]));
  const order = tiers.map((t) => t.id); // 階梯順序

  const tierOf = (id) => byId.get(id) || tiers[0];
  const featVal = (tierId, feature) => {
    const f = tierOf(tierId).features || {};
    return Object.prototype.hasOwnProperty.call(f, feature) ? f[feature] : false;
  };
  const isUnlimited = (v) => v === UNLIMITED || v === Infinity;

  return {
    UNLIMITED,

    /** 布林功能是否開放（配額型欄位視為「上限>0 即算有」）。 */
    can(tierId, feature) {
      const v = featVal(tierId, feature);
      if (typeof v === 'number') return isUnlimited(v) || v > 0;
      return !!v;
    },

    /**
     * 配額檢查。currentCount = 目前已用量。
     * @returns {{allowed:boolean, limit:number, remaining:number, unlimited:boolean, atLimit:boolean}}
     */
    checkQuota(tierId, feature, currentCount = 0) {
      const raw = featVal(tierId, feature);
      const limit = typeof raw === 'number' ? raw : raw ? UNLIMITED : 0;
      if (isUnlimited(limit)) {
        return { allowed: true, limit: UNLIMITED, remaining: Infinity, unlimited: true, atLimit: false };
      }
      const remaining = Math.max(0, limit - currentCount);
      return {
        allowed: currentCount < limit,
        limit,
        remaining,
        unlimited: false,
        atLimit: currentCount >= limit,
      };
    },

    /** 升級階梯上的下一階；已在頂端回 null。 */
    nextTier(tierId) {
      const i = order.indexOf(tierId);
      if (i === -1) return order[1] || null; // 未知 tier 當最低階，往上推
      return i < order.length - 1 ? order[i + 1] : null;
    },

    /** tierId 是否為最高階。 */
    isTop(tierId) {
      return order.indexOf(tierId) === order.length - 1;
    },

    /**
     * 定價策略：算出原價、特價、折扣%、省多少。原價只是行銷定錨。
     * @returns {{price:number, originalPrice:number|null, discountPct:number, saved:number, isFree:boolean}}
     */
    pricing(tierId) {
      const t = tierOf(tierId);
      const price = t.price || 0;
      const original = typeof t.originalPrice === 'number' && t.originalPrice > price ? t.originalPrice : null;
      const discountPct = original ? Math.round((1 - price / original) * 100) : 0;
      return {
        price,
        originalPrice: original,
        discountPct,
        saved: original ? original - price : 0,
        isFree: price === 0,
      };
    },

    /**
     * 產生功能比較表資料（給 UI 畫表）。
     * @param {string[]} [features] - 要比較的功能 key；省略則取所有 tier 出現過的聯集。
     * @returns {{tiers:Tier[], rows:{feature:string, values:Object<string, boolean|number>}[]}}
     */
    compare(features) {
      const keys = features && features.length
        ? features
        : [...new Set(tiers.flatMap((t) => Object.keys(t.features || {})))];
      const rows = keys.map((feature) => ({
        feature,
        values: Object.fromEntries(tiers.map((t) => [t.id, featVal(t.id, feature)])),
      }));
      return { tiers, rows };
    },

    /** 取單一 tier 定義（含 pricing 展開），給 UI 直接用。 */
    tier(tierId) {
      const t = tierOf(tierId);
      return { ...t, ...this.pricing(tierId), next: this.nextTier(tierId) };
    },

    /** 全部 tier（依階梯順序），各自展開 pricing。 */
    allTiers() {
      return order.map((id) => this.tier(id));
    },

    /**
     * 取某 tier 所有「配額型」欄位的上限（number 型 features）。
     * 給後端付款開通時一次寫進 UserQuota.max* 之類的欄位（多維配額專案，如圖床 upimg）。
     * @returns {Object<string, number>}  例如 { maxUploadPerDay:80, maxStorage:524288000 }
     */
    quotasOf(tierId) {
      const f = tierOf(tierId).features || {};
      const out = {};
      for (const [k, v] of Object.entries(f)) if (typeof v === 'number') out[k] = v;
      return out;
    },

    /**
     * 批次檢查多個配額維度（每日上傳/月上傳/儲存/圖片數…一次算完）。
     * @param {string} tierId
     * @param {Object<string, number>} usage  各維度目前用量，例如 { maxUploadPerDay: 30, maxStorage: 12345 }
     * @returns {Object<string, {limit:number, used:number, remaining:number, unlimited:boolean, atLimit:boolean, allowed:boolean}>}
     */
    checkQuotas(tierId, usage = {}) {
      const out = {};
      for (const feature of Object.keys(this.quotasOf(tierId))) {
        const used = usage[feature] || 0;
        out[feature] = { used, ...this.checkQuota(tierId, feature, used) };
      }
      return out;
    },
  };
}

module.exports = createPaywall;
module.exports.createPaywall = createPaywall;
module.exports.UNLIMITED = UNLIMITED;
