// PricingPage.tsx — 銷售型方案頁模板（原價劃線→早鳥特價→限時→功能比較表）
// 資料全由 paywall.config 驅動；只需接一個 onCheckout(tierId)。
// 依賴：shadcn Button/Badge/Card + lucide-react + Tailwind。強制淺色（不吃深色主題變量）。
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, X, Flame, Crown } from "lucide-react";
import { paywall, FEATURE_LABELS, quotaDisplay, PROMO_BANNER } from "./paywall.config";

interface PricingPageProps {
  currentTier?: string;                 // 標記「目前方案」
  onCheckout: (tierId: string) => void; // 導去你的結帳流程
}

const cell = (feature: string, v: boolean | number) => {
  if (typeof v === "number") {
    const disp = quotaDisplay[feature]?.(v) ?? (v === -1 ? "無限" : String(v));
    return <span className="text-sm font-medium text-slate-700">{disp}</span>;
  }
  return v ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-4 h-4 text-slate-300 mx-auto" />;
};

export function PricingPage({ currentTier, onCheckout }: PricingPageProps) {
  const tiers = paywall.allTiers();
  const comparison = paywall.compare(Object.keys(FEATURE_LABELS));

  return (
    <div className="min-h-screen py-10 px-4" style={{ backgroundColor: "#F8F7F5" }}>
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-2 rounded-full text-sm font-semibold">
            <Flame className="w-4 h-4" /> {PROMO_BANNER}
          </div>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-3">選擇你的方案</h1>
          <p className="text-lg text-slate-600">升級解鎖進階功能，讓你的產品真正變現</p>
        </div>

        {/* 方案卡 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {tiers.map((t: any) => {
            const isCurrent = t.id === currentTier;
            return (
              <Card
                key={t.id}
                className={`relative bg-white ${
                  t.highlight ? "border-2 border-green-500 shadow-xl shadow-green-200/40 md:-translate-y-2" : "border-slate-200 shadow-sm"
                }`}
              >
                {t.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-green-500 text-white border-0 px-3 py-1">🔥 最受歡迎</Badge>
                  </div>
                )}
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold text-slate-700 mb-1">{t.name}</h3>
                  <p className="text-sm text-slate-500 mb-4">{t.tagline || ""}</p>

                  <div className="mb-5">
                    {t.isFree ? (
                      <div className="text-3xl font-bold text-slate-800">免費</div>
                    ) : (
                      <>
                        <div className="flex items-center gap-2">
                          {t.originalPrice && <span className="text-sm text-slate-400 line-through">NT${t.originalPrice}</span>}
                          {t.discountPct > 0 && <Badge className="bg-red-100 text-red-600 border-0 text-xs">省 {t.discountPct}%</Badge>}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-4xl font-bold text-green-600">NT${t.price}</span>
                          <span className="text-slate-500">/ 月</span>
                        </div>
                        {t.originalPrice && (
                          <p className="text-xs text-red-500 mt-1 font-medium">⏰ 早鳥價，活動後恢復 NT${t.originalPrice}</p>
                        )}
                      </>
                    )}
                  </div>

                  {isCurrent ? (
                    <Button variant="outline" className="w-full bg-white border-slate-300 text-slate-500" disabled>目前方案</Button>
                  ) : t.isFree ? (
                    <Button variant="outline" className="w-full bg-white border-slate-300 text-slate-600" onClick={() => onCheckout(t.id)}>選擇免費版</Button>
                  ) : (
                    <Button className={`w-full ${t.highlight ? "bg-green-500 hover:bg-green-600 text-white" : "bg-purple-600 hover:bg-purple-700 text-white"}`} onClick={() => onCheckout(t.id)}>
                      立即升級{t.name}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* 功能比較表 */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left text-sm font-semibold text-slate-600 p-4">功能</th>
                  {comparison.tiers.map((t: any) => (
                    <th key={t.id} className="text-center text-sm font-semibold text-slate-600 p-4">{t.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.rows.map((row: any, i: number) => (
                  <tr key={row.feature} className={i % 2 ? "bg-slate-50/50" : ""}>
                    <td className="text-sm text-slate-700 p-4">{FEATURE_LABELS[row.feature] || row.feature}</td>
                    {comparison.tiers.map((t: any) => (
                      <td key={t.id} className="text-center p-4">{cell(row.feature, row.values[t.id])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="text-center mt-12">
          <Button size="lg" className="bg-green-500 hover:bg-green-600 text-white px-8" onClick={() => onCheckout(paywall.nextTier(currentTier || "free") || "standard")}>
            <Crown className="w-4 h-4 mr-2" /> 立即升級，鎖定早鳥價
          </Button>
          <p className="text-xs text-slate-400 pt-3">活動結束後恢復原價，現有訂閱不受影響</p>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;
