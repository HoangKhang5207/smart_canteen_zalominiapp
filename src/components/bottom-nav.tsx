import React from "react";
import { useAtomValue } from "jotai";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "zmp-ui";
import { currentUserAtom } from "@/features/auth/store";
import { cartTotalsAtom } from "@/features/cart/store";
import { fetchUnreadNotificationCount } from "@/features/notifications/api";
import { formatUnreadBadge } from "@/features/notifications/helpers";

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentUser = useAtomValue(currentUserAtom);
  const { totalQuantity } = useAtomValue(cartTotalsAtom);

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread", currentUser?.id ?? null],
    queryFn: fetchUnreadNotificationCount,
    enabled: Boolean(currentUser),
    refetchInterval: 20_000,
  });

  const unreadCount = unreadQuery.data ?? 0;
  const unreadBadge = formatUnreadBadge(unreadCount);

  const pathname = location.pathname;
  const isMenu = pathname === "/" || pathname.startsWith("/products");
  const isCanteen = pathname.startsWith("/canteen");
  const isCart = pathname.startsWith("/cart");
  const isOrders = pathname.startsWith("/orders");
  const isNotifications = pathname.startsWith("/notifications");

  return (
    <nav
      aria-label="Điều hướng chính"
      className="fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-200 shadow-sm"
    >
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {currentUser && unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : ""}
      </span>
      <div className="max-w-2xl mx-auto grid grid-cols-5 h-14">
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
          <span>Căn tin</span>
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
            <span>Giỏ</span>
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
          <span>Đơn hàng</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/notifications")}
          aria-current={isNotifications ? "page" : undefined}
          aria-label={unreadBadge ? `Thông báo (${unreadBadge} chưa đọc)` : "Thông báo"}
          className={`relative min-w-0 flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-700 ${
            isNotifications ? "text-brand-700 font-semibold" : "text-gray-600"
          }`}
        >
          <span>Thông báo</span>
          {unreadBadge ? (
            <span
              aria-hidden="true"
              className="absolute top-1 right-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold bg-red-600 text-white leading-none"
            >
              {unreadBadge}
            </span>
          ) : null}
        </button>
      </div>
    </nav>
  );
}
