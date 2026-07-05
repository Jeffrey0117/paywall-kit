// CheckoutPage.tsx — 獨立結帳頁模板（訂單明細 + 帳單資訊 + 刷卡插槽）
// 不是彈窗！訂閱付款該有正式結帳頁。版面由 paywall.config 驅動，刷卡元件由各專案金流注入。
// 依賴：shadcn Button/Input/Label/Card/Separator + lucide-react + Tailwind。強制淺色。
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { paywall } from "./paywall.config";

export interface Billing {
  name: string;
  email: string;
}

interface CheckoutPageProps {
  tierId: string;
  /** 帳單預填（通常帶入登入者暱稱/Email） */
  defaults?: Partial<Billing>;
  /** 功能清單（顯示在訂單明細）；省略則不顯示 */
  features?: string[];
  /** 返回上一頁 */
  onBack?: () => void;
  /**
   * 刷卡區塊 render prop —— 帳單填妥後才給刷卡元件。
   * 各專案在這裡塞自己的金流站內刷卡元件（payuni-embed / stripe…）。
   */
  renderPayment: (billing: Billing) => ReactNode;
}

export function CheckoutPage({ tierId, defaults, features, onBack, renderPayment }: CheckoutPageProps) {
  const t: any = paywall.tier(tierId);
  const [name, setName] = useState(defaults?.name || "");
  const [email, setEmail] = useState(defaults?.email || "");

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: "#F8F7F5" }}>
      <div className="max-w-5xl mx-auto">
        {onBack && (
          <Button variant="ghost" onClick={onBack} className="mb-6 gap-2 text-slate-600 hover:bg-slate-100 hover:text-slate-800">
            <ArrowLeft className="w-4 h-4" /> 返回
          </Button>
        )}
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 mb-8">確認訂閱</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 左：訂單明細 */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">訂單明細</h2>
                {/* 方案名獨立一行 —— 別把價錢塞在名字旁邊，會擠 */}
                <div className="text-xl font-bold text-slate-800 tracking-tight">{t.name}</div>
                {t.tagline && <p className="text-sm text-slate-500 mt-1">{t.tagline}</p>}
                <p className="text-sm text-slate-500 mt-1 mb-4">每月自動續訂，可隨時取消</p>
                {features && features.length > 0 && (
                  <>
                    <Separator className="my-4 bg-slate-200" />
                    <ul className="space-y-2 mb-4">
                      {features.map((f) => (
                        <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                          <Check className="w-4 h-4 text-green-500 shrink-0" /> {f}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
                <Separator className="my-4 bg-slate-200" />
                {/* 價錢只出現這一次（本次應付）：原價劃線收斂 → 特價當主角 → 折扣/現省一條在下 */}
                <div className="flex items-baseline justify-between">
                  <span className="font-semibold text-slate-800">本次應付</span>
                  <div className="flex items-baseline whitespace-nowrap">
                    {t.originalPrice && <span className="text-sm text-slate-400 line-through mr-2">NT${t.originalPrice}</span>}
                    <span className="text-[1.7rem] leading-none font-extrabold text-green-600 tracking-tight">NT${t.price}</span>
                    <span className="text-sm text-slate-500 ml-1.5">/ 月</span>
                  </div>
                </div>
                {t.discountPct > 0 && (
                  <div className="mt-3 inline-block text-xs font-bold text-green-700 bg-green-50 rounded-full px-3 py-1">
                    早鳥優惠 -{t.discountPct}%　·　現省 NT${t.saved}
                  </div>
                )}
              </CardContent>
            </Card>
            <p className="flex items-center gap-2 text-xs text-slate-500 px-2">
              <ShieldCheck className="w-4 h-4 shrink-0" /> 卡號由金流加密處理，本站不會接觸您的完整卡號
            </p>
          </div>

          {/* 右：帳單資訊 + 刷卡 */}
          <div className="lg:col-span-3">
            <Card className="bg-white border-slate-200 shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">帳單資訊</h2>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="billing-name" className="text-sm text-slate-700">姓名 / 抬頭</Label>
                      <Input id="billing-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="王小明" maxLength={50}
                        className="mt-1.5 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
                    </div>
                    <div>
                      <Label htmlFor="billing-email" className="text-sm text-slate-700">電子郵件（收據寄送）</Label>
                      <Input id="billing-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                        className="mt-1.5 bg-white border-slate-300 text-slate-800 placeholder:text-slate-400" />
                    </div>
                  </div>
                </div>
                <Separator className="bg-slate-200" />
                <div>
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">信用卡付款</h2>
                  {renderPayment({ name, email })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CheckoutPage;
