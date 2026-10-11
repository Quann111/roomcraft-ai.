import React, { useState } from "react";
import { Link } from "./router";
import { t } from "./i18n";
import { PLANS } from "./data";

export function PricingTable() {
  const [yearly, setYearly] = useState(true);
  return (
    <div>
      <div className="mb-6 flex justify-center gap-2 text-sm">
        <button onClick={() => setYearly(false)} className={`rounded-full border px-4 py-1 ${!yearly ? "bg-black text-white" : "bg-white"}`}>{t("Monthly", "Hàng tháng")}</button>
        <button onClick={() => setYearly(true)} className={`rounded-full border px-4 py-1 ${yearly ? "bg-black text-white" : "bg-white"}`}>{t("Yearly", "Hàng năm")}</button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.id} className={`relative rounded-2xl border bg-white p-6 ${p.popular ? "border-2 border-black" : ""}`}>
            {p.popular && <span className="absolute -top-3 left-6 rounded-full bg-black px-3 py-0.5 text-xs text-white">{t("Most popular", "Phổ biến nhất")}</span>}
            <h3 className="text-xl font-semibold">{p.name}</h3>
            <p className="mt-3"><span className="text-4xl font-bold">${yearly ? p.yearly : p.monthly}</span><span className="text-neutral-500">/{t("mo", "tháng")}</span></p>
            <ul className="mt-4 space-y-2 text-sm text-neutral-700">
              <li>✓ {p.credits.toLocaleString()} {t("credits / month", "credit / tháng")}</li>
              <li>✓ {p.styles} {t("styles & spaces", "phong cách & không gian")}</li>
              <li>✓ {t("Virtual staging, declutter, material swap", "Bài trí ảo, dọn đồ, đổi vật liệu")}</li>
              <li>✓ {t("Commercial use", "Sử dụng thương mại")}</li>
            </ul>
            <Link to="/register" className={`mt-6 block rounded-lg py-2.5 text-center ${p.popular ? "bg-black text-white" : "border"}`}>{t("Start free", "Dùng thử miễn phí")}</Link>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-xs text-neutral-500">
        {t("Paid checkout is not live yet — every account gets free daily credits meanwhile. Prices shown are a preview.", "Thanh toán chưa mở — hiện mọi tài khoản đều nhận credit miễn phí mỗi ngày. Giá hiển thị là bản xem trước.")}
      </p>
    </div>
  );
}

export function PricingPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-14">
      <h1 className="mb-2 text-center text-4xl font-bold">{t("Simple, credit-based pricing", "Bảng giá theo credit đơn giản")}</h1>
      <p className="mb-8 text-center text-neutral-500">{t("1K image = 1 credit · 2K = 2 · 4K = 3. Failed generations are refunded.", "Ảnh 1K = 1 credit · 2K = 2 · 4K = 3. Tạo lỗi sẽ được hoàn credit.")}</p>
      <PricingTable />
    </section>
  );
}
