import { Figure } from "./Figure";
import { useAuth } from "./auth";
import React, { useState } from "react";
import { Link } from "./router";
import { t } from "./i18n";
import { PLANS } from "./data";

export function PricingTable() {
  const [yearly, setYearly] = useState(true);
  const { me } = useAuth();
  return (
    <div>
      <div className="billing" style={{ marginTop: 0 }}>
        <span style={{ fontWeight: !yearly ? 700 : 400, color: !yearly ? "var(--ink)" : undefined }}>{t("MONTHLY", "HÀNG THÁNG")}</span>
        <button className={`toggle ${yearly ? "" : "monthly"}`} onClick={() => setYearly(!yearly)} aria-label={t("Toggle yearly billing", "Chuyển sang thanh toán theo năm")} />
        <span style={{ fontWeight: yearly ? 700 : 400, color: yearly ? "var(--ink)" : undefined }}>{t("YEARLY", "HÀNG NĂM")}</span>
        <span className="save">{t("Save more", "Tiết kiệm hơn")}</span>
      </div>
      <div className="price-grid">
        {PLANS.map((p) => (
          <article key={p.id} className={`price-card${p.popular ? " popular" : ""}`}>
            {p.popular && <div className="popular-badge">{t("Most popular", "Phổ biến nhất")}</div>}
            <h3>{p.name.toUpperCase()}</h3>
            <div className="price">${yearly ? p.yearly : p.monthly}<small>/{t("mo", "tháng")}</small></div>
            <p>{p.credits.toLocaleString()} {t("credits / month", "credit / tháng")}</p>
            <Link to={"/app"} className="btn small">{me ? t("Open dashboard", "Mở dashboard") : t("Start free", "Dùng thử miễn phí")}</Link>
            <div className="included">
              <strong>{t("What's included", "Bao gồm")}</strong>
              <ul>
                <li>{p.credits.toLocaleString()} {t("credits / month", "credit / tháng")}</li>
                <li>{p.styles} {t("styles & spaces", "phong cách & không gian")}</li>
                <li>{t("Virtual staging, declutter, material swap", "Bài trí ảo, dọn đồ, đổi vật liệu")}</li>
                <li>{t("Commercial use", "Sử dụng thương mại")}</li>
              </ul>
            </div>
          </article>
        ))}
      </div>
      <p className="mt-6 text-center text-xs" style={{ color: "var(--muted)" }}>
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
      <div className="hl-row"><Figure name="credits" caption="1K · 2K · 4K" /><Figure name="refund" caption={t("Refunds on failed renders", "Hoàn credit khi tạo lỗi")} /><Figure name="refill" caption={t("Credits refill every 24h", "Credit nạp lại mỗi 24h")} /></div>
    </section>
  );
}
