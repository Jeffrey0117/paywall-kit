// UpgradePromo.tsx — 後台升級誘導卡（用量壓力條 + 解鎖清單 + CTA）
// 依 tier 動態變臉：最低階=用量壓力+解鎖清單、中間階=推更高階、最高階=感謝。
// 依賴：shadcn Button/Badge/Card + lucide-react + Tailwind。用主題變量（適合放深色後台）。
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, Crown, Zap, Sparkles, ArrowRight } from "lucide-react";
import { paywall, FEATURE_LABELS } from "./paywall.config";

interface UpgradePromoProps {
  tier: string;
  /** 配額型功能的目前用量，例如 { packages: 3 } */
  usage?: Record<string, number>;
  /** 點 CTA 導去哪（通常是 /pricing）。傳 tierId 方便你決定目標 */
  onUpgrade: (targetTier: string) => void;
  /** 主要壓力用的配額欄位 key（顯示 X/limit 壓力條）。省略則不顯示壓力條 */
  quotaFeature?: string;
}

export function UpgradePromo({ tier, usage = {}, onUpgrade, quotaFeature }: UpgradePromoProps) {
  const next = paywall.nextTier(tier);

  // 最高階：只感謝
  if (!next) {
    return (
      <Card className="mb-6 border-2 border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-transparent">
        <CardContent className="flex items-center gap-3 p-6">
          <Crown className="w-6 h-6 text-purple-500 shrink-0" />
          <div>
            <p className="font-semibold text-foreground">{paywall.tier(tier).name}會員</p>
            <p className="text-sm text-muted-foreground">你已解鎖所有功能，感謝訂閱 🎉</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const nextTier = paywall.tier(next);

  // 找出下一階「多解鎖」的功能（本階沒有、下一階有）
  const unlocks = paywall.compare(Object.keys(FEATURE_LABELS)).rows
    .filter((r: any) => !booly(r.values[tier]) && booly(r.values[next]))
    .map((r: any) => FEATURE_LABELS[r.feature] || r.feature);

  // 壓力條
  const q = quotaFeature ? paywall.checkQuota(tier, quotaFeature, usage[quotaFeature] || 0) : null;
  const used = quotaFeature ? usage[quotaFeature] || 0 : 0;

  return (
    <Card className="mb-6 border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 via-transparent to-transparent overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-slate-400" />
          <span className="font-semibold text-foreground">{paywall.tier(tier).name}</span>
          {nextTier.discountPct > 0 && (
            <Badge className="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300 border-0 text-xs ml-auto">
              🔥 早鳥限時 {100 - nextTier.discountPct === 50 ? "5 折" : `省 ${nextTier.discountPct}%`}
            </Badge>
          )}
        </div>

        {q && !q.unlimited && (
          <div className="mb-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-muted-foreground">{FEATURE_LABELS[quotaFeature!] || quotaFeature}用量</span>
              <span className={`font-semibold ${q.atLimit ? "text-red-500" : "text-foreground"}`}>{used} / {q.limit}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div className={`h-full rounded-full transition-all ${q.atLimit ? "bg-red-500" : "bg-green-500"}`} style={{ width: `${Math.min(100, (used / q.limit) * 100)}%` }} />
            </div>
            <p className={`text-xs mt-1.5 ${q.atLimit ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
              {q.atLimit ? `⚠️ 已達上限，升級${nextTier.name}即可解除限制` : `還可使用 ${q.remaining} 個`}
            </p>
          </div>
        )}

        {unlocks.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
            {unlocks.map((f: string) => (
              <div key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="w-3.5 h-3.5 text-green-500 shrink-0" /> {f}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-baseline gap-2">
            {nextTier.originalPrice && <span className="text-sm text-slate-400 line-through">NT${nextTier.originalPrice}</span>}
            <span className="text-2xl font-bold text-green-600">NT${nextTier.price}</span>
            <span className="text-sm text-muted-foreground">/ 月起</span>
          </div>
          <Button onClick={() => onUpgrade(next)} className="gradient-magic gap-2 w-full sm:w-auto">
            <Zap className="w-4 h-4" /> 查看方案並升級 <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// 配額 number>0 或 -1 都算「有」；boolean 照原值
function booly(v: boolean | number) {
  if (typeof v === "number") return v === -1 || v > 0;
  return !!v;
}

export default UpgradePromo;
