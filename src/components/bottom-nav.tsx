import React from "react";
import { useAtomValue } from "jotai";
import { useLocation, useNavigate } from "zmp-ui";
import { cartTotalsAtom } from "@/features/cart/store";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { totalQuantity } = useAtomValue(cartTotalsAtom);

  const pathname = location.pathname;
  const isMenu = pathname === "/" || pathname.startsWith("/products");
  const isCanteen = pathname.startsWith("/canteen");
  const isCart = pathname.startsWith("/cart");
  const isOrders = pathname.startsWith("/orders");

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-sm"
    >
      <div className="max-w-2xl mx-auto grid grid-cols-4 h-14">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-current={isMenu ? "page" : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-700 ${
            isMenu ? "text-brand-700 font-semibold" : "text-gray-600"
          }`}
        >
          <span>Thực đơn</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/canteen")}
          aria-current={isCanteen ? "page" : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-700 ${
            isCanteen ? "text-brand-700 font-semibold" : "text-gray-600"
          }`}
        >
          <span>Căn tin số</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/cart")}
          aria-current={isCart ? "page" : undefined}
          className={`relative min-w-0 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-700 ${
            isCart ? "text-brand-700 font-semibold" : "text-gray-600"
          }`}
        >
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <span>Giỏ hàng</span>
            {totalQuantity > 0 ? (
              <span
                aria-label={`${totalQuantity} món trong giỏ`}
                className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold bg-brand-700 text-white shrink-0"
              >
                {totalQuantity}
              </span>
            ) : null}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/orders")}
          aria-current={isOrders ? "page" : undefined}
          className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-700 ${
            isOrders ? "text-brand-700 font-semibold" : "text-gray-600"
          }`}
        >
          <span>Đơn của tôi</span>
        </button>
      </div>
    </nav>
  );
}
