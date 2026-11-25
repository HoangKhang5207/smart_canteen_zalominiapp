import React, { useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header, Page, useNavigate, useSnackbar } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { SpendingLimitSheet } from "@/components/spending-limit-sheet";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { StudentCardView } from "@/components/student-card-view";
import {
  createPosPurchase,
  fetchCardOrders,
  fetchMyStudentCards,
  updateCardSpendingLimit,
} from "@/features/canteen/api";
import {
  bankLinkDraftAtom,
  bankLinkSuccessBannerAtom,
  EMPTY_BANK_LINK_FORM,
} from "@/features/canteen/store";
import { createIdempotencyKey } from "@/features/cart/cart-logic";
import { fetchProducts } from "@/features/menu/api";
import { formatVnd } from "@/lib/format";

export default function CanteenHubPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [isLimitSheetOpen, setIsLimitSheetOpen] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [posError, setPosError] = useState<string | null>(null);

  const [successBanner, setSuccessBanner] = useAtom(bankLinkSuccessBannerAtom);
  const setDraft = useSetAtom(bankLinkDraftAtom);

  const cardsQuery = useQuery({
    queryKey: ["canteen-cards"],
    queryFn: fetchMyStudentCards,
  });

  const cards = cardsQuery.data ?? [];
  const activeCard =
    cards.find((item) => item.id === selectedCardId) ?? cards[0] ?? null;

  const recentOrdersQuery = useQuery({
    queryKey: ["canteen-card-orders", activeCard?.id ?? null],
    queryFn: () => fetchCardOrders(activeCard!.id, { page: 1, perPage: 4 }),
    enabled: Boolean(activeCard?.is_bank_linked),
  });

  const sampleProductsQuery = useQuery({
    queryKey: ["canteen-pos-sample-products"],
    queryFn: () => fetchProducts({ page: 1, perPage: 6 }),
    enabled: Boolean(activeCard?.is_bank_linked),
    staleTime: 60_000,
  });

  const limitMutation = useMutation({
    mutationFn: async (dailyLimit: number) => {
      if (!activeCard) {
        throw new Error("Không tìm thấy thẻ học sinh.");
      }
      return updateCardSpendingLimit(activeCard.id, dailyLimit);
    },
    onSuccess: (updatedCard) => {
      setLimitError(null);
      setIsLimitSheetOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["canteen-cards"] });
      void queryClient.invalidateQueries({ queryKey: ["canteen-limit-logs"] });
      openSnackbar({
        text: `Đã cập nhật hạn mức ${formatVnd(updatedCard.spending_limit.daily_limit)}/ngày`,
        duration: 2200,
      });
    },
    onError: (err) => {
      setLimitError(
        err instanceof Error
          ? err.message
          : "Không thể cập nhật hạn mức chi tiêu.",
      );
    },
  });

  const posSwipeMutation = useMutation({
    mutationFn: async (productId: number) => {
      if (!activeCard) {
        throw new Error("Không tìm thấy thẻ học sinh.");
      }
      return createPosPurchase(
        activeCard.id,
        {
          items: [{ product_id: productId, quantity: 1 }],
          store_name: activeCard.student.school_name,
        },
        createIdempotencyKey(),
      );
    },
    onSuccess: (order) => {
      setPosError(null);
      void queryClient.invalidateQueries({ queryKey: ["canteen-cards"] });
      void queryClient.invalidateQueries({ queryKey: ["canteen-card-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      openSnackbar({
        text: `Quẹt thẻ thành công (${order.code})`,
        duration: 2200,
      });
      navigate(`/orders/${order.id}`);
    },
    onError: (err) => {
      setPosError(
        err instanceof Error
          ? err.message
          : "Không thể mô phỏng giao dịch quẹt thẻ POS.",
      );
    },
  });

  const handleStartBankLink = () => {
    if (!activeCard) {
      return;
    }
    setSuccessBanner(null);
    setDraft({
      cardId: activeCard.id,
      values: { ...EMPTY_BANK_LINK_FORM },
    });
    navigate("/canteen/link-bank");
  };

  const recentOrders = recentOrdersQuery.data?.data ?? [];
  const availableDemoProduct = (sampleProductsQuery.data ?? []).find(
    (p) => p.is_available,
  );

  const dailyLimit = activeCard?.spending_limit.daily_limit ?? 0;
  const spentToday = activeCard?.spending_limit.spent_today ?? 0;
  const remainingLimit = activeCard?.spending_limit.remaining_limit ?? 0;
  const remainingPct =
    dailyLimit > 0
      ? Math.max(0, Math.min(100, Math.round((remainingLimit / dailyLimit) * 100)))
      : 0;

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header title="Căn tin số" showBackIcon={false} />

      <main className="app-main space-y-4 max-w-2xl mx-auto">
        {successBanner ? (
          <div
            role="status"
            className="bg-brand-50 border border-brand-500/40 rounded-xl p-3.5 flex items-start justify-between gap-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-brand-900">
                Liên kết ngân hàng thành công
              </p>
              <p className="text-xs text-brand-800">{successBanner}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              aria-label="Đóng thông báo"
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              Đóng
            </button>
          </div>
        ) : null}

        {cardsQuery.isLoading ? (
          <LoadingState label="Đang tải thông tin thẻ học sinh..." />
        ) : cardsQuery.error ? (
          <ErrorState
            message={
              cardsQuery.error instanceof Error
                ? cardsQuery.error.message
                : "Không thể tải thông tin thẻ học sinh."
            }
            isRetrying={cardsQuery.isRefetching}
            onRetry={() => void cardsQuery.refetch()}
          />
        ) : !activeCard ? (
          <EmptyState
            message="Tài khoản chưa được gắn thẻ học sinh thông minh."
            actionLabel="Quay về Thực đơn"
            onAction={() => navigate("/")}
          />
        ) : (
          <>
            {cards.length > 1 ? (
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                role="tablist"
                aria-label="Chọn thẻ học sinh"
              >
                {cards.map((card) => {
                  const isSelected = card.id === activeCard.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedCardId(card.id)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                        isSelected
                          ? "bg-brand-700 text-white border-brand-700"
                          : "bg-white text-gray-700 border-gray-200 hover:border-brand-500"
                      }`}
                    >
                      {card.student.full_name} ({card.student.class_name})
                    </button>
                  );
                })}
              </div>
            ) : null}

            <StudentCardView card={activeCard} />

            {activeCard.is_bank_linked && activeCard.bank_link ? (
              <>
                <section
                  aria-label="Hạn mức chi tiêu hằng ngày"
                  className="bg-white border border-brand-100 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium text-gray-600">
                        Hạn mức còn lại hôm nay
                      </p>
                      <p className="text-2xl font-bold text-brand-700 tracking-tight">
                        {formatVnd(remainingLimit)}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-900 border border-brand-100">
                      {formatVnd(dailyLimit)}/ngày
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div
                      className="w-full h-2 rounded-full bg-gray-100 overflow-hidden"
                      role="progressbar"
                      aria-valuenow={remainingPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Phần trăm hạn mức còn lại hôm nay"
                    >
                      <div
                        className={`h-full rounded-full transition-all ${
                          remainingPct <= 20 ? "bg-amber-500" : "bg-brand-700"
                        }`}
                        style={{ width: `${remainingPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Đã chi hôm nay: {formatVnd(spentToday)}</span>
                      <span>Tự động làm mới 00:00 hằng ngày</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setLimitError(null);
                        setIsLimitSheetOpen(true);
                      }}
                      className="py-2.5 px-3 rounded-lg text-xs font-semibold text-white bg-brand-700 hover:bg-brand-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
                    >
                      Thiết lập hạn mức
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/canteen/limit-history")}
                      className="py-2.5 px-3 rounded-lg text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-100 hover:bg-brand-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700"
                    >
                      Lịch sử hạn mức
                    </button>
                  </div>
                </section>

                <section
                  aria-label="Đơn hàng gần đây"
                  className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-gray-900">
                      Đơn hàng gần đây
                    </h3>
                    <button
                      type="button"
                      onClick={() => navigate("/orders")}
                      className="text-xs font-semibold text-brand-700 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-700 rounded px-1.5 py-0.5"
                    >
                      Xem tất cả
                    </button>
                  </div>

                  {recentOrdersQuery.isLoading ? (
                    <p className="text-xs text-gray-500 py-2">
                      Đang tải giao dịch gần đây...
                    </p>
                  ) : recentOrders.length === 0 ? (
                    <p className="text-xs text-gray-600 py-2">
                      Chưa có giao dịch chi tiêu nào bằng thẻ học sinh này.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-100">
                      {recentOrders.map((order) => {
                        const firstItemName =
                          order.items[0]?.product_name || "Mua hàng từ căn tin";
                        const extraItems =
                          order.items.length > 1
                            ? ` (+${order.items.length - 1} món)`
                            : "";
                        return (
                          <li key={order.id}>
                            <button
                              type="button"
                              onClick={() => navigate(`/orders/${order.id}`)}
                              className="w-full py-2.5 flex items-center justify-between gap-3 text-left hover:bg-surface-muted rounded-lg px-1.5 -mx-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                  {firstItemName}
                                  {extraItems}
                                </p>
                                <p className="text-xs text-gray-600 truncate">
                                  {order.store_name ||
                                    activeCard.student.school_name}{" "}
                                  ·{" "}
                                  {new Date(order.created_at).toLocaleString(
                                    "vi-VN",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      day: "2-digit",
                                      month: "2-digit",
                                    },
                                  )}
                                </p>
                              </div>
                              <span
                                className={`text-sm font-bold shrink-0 ${
                                  order.payment_status === "REFUNDED"
                                    ? "text-brand-700"
                                    : "text-gray-900"
                                }`}
                              >
                                {order.payment_status === "REFUNDED"
                                  ? `+${formatVnd(order.total_amount)}`
                                  : `-${formatVnd(order.total_amount)}`}
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  {availableDemoProduct ? (
                    <div className="pt-2 border-t border-gray-100 space-y-2">
                      {posError ? (
                        <p
                          role="alert"
                          className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2"
                        >
                          {posError}
                        </p>
                      ) : null}
                      <button
                        type="button"
                        disabled={posSwipeMutation.isPending}
                        onClick={() => {
                          if (posSwipeMutation.isPending) {
                            return;
                          }
                          setPosError(null);
                          posSwipeMutation.mutate(availableDemoProduct.id);
                        }}
                        className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-gray-800 bg-surface-muted border border-gray-200 hover:border-brand-600 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      >
                        {posSwipeMutation.isPending
                          ? "Đang mô phỏng quẹt thẻ POS..."
                          : `Mô phỏng quẹt thẻ POS: ${availableDemoProduct.name} (${formatVnd(availableDemoProduct.price)})`}
                      </button>
                    </div>
                  ) : null}
                </section>

                <section
                  aria-label="Tài khoản ngân hàng đã liên kết"
                  className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">
                        Tài khoản ngân hàng liên kết
                      </h3>
                      <p className="text-xs text-gray-600">
                        Dịch vụ trích nợ tự động đã kích hoạt
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-900">
                      Đã liên kết
                    </span>
                  </div>

                  <dl className="divide-y divide-gray-100 text-sm">
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-gray-600">Ngân hàng</dt>
                      <dd className="font-semibold text-gray-900">
                        {activeCard.bank_link.bank_name}
                      </dd>
                    </div>
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-gray-600">Số tài khoản</dt>
                      <dd className="font-mono font-semibold text-gray-900">
                        {activeCard.bank_link.account_number_masked}
                      </dd>
                    </div>
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-gray-600">Chủ tài khoản</dt>
                      <dd className="font-semibold text-gray-900 text-right">
                        {activeCard.bank_link.account_holder_name}
                      </dd>
                    </div>
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-gray-600">Số điện thoại OTP</dt>
                      <dd className="font-mono text-gray-900">
                        {activeCard.bank_link.phone_masked}
                      </dd>
                    </div>
                  </dl>
                </section>
              </>
            ) : (
              <section
                aria-label="Đăng ký liên kết ngân hàng"
                className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    Liên kết tài khoản ngân hàng
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Đăng ký trích nợ tự động giữa tài khoản ngân hàng của phụ
                    huynh với thẻ học sinh thông minh để quản lý chi tiêu không
                    tiền mặt tại căn tin trường.
                  </p>
                </div>

                {activeCard.status !== "ACTIVE" ? (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Thẻ học sinh hiện không ở trạng thái hoạt động nên chưa thể
                    liên kết ngân hàng.
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={activeCard.status !== "ACTIVE"}
                  onClick={handleStartBankLink}
                  className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
                >
                  Liên kết tài khoản ngân hàng
                </button>
              </section>
            )}

            <section
              aria-label="Cam kết bảo mật thông tin"
              className="bg-brand-50/70 border border-brand-100 rounded-xl p-3.5 text-xs text-brand-900 space-y-1"
            >
              <p className="font-semibold">Bảo mật &amp; Mã hóa thông tin</p>
              <p className="text-brand-800 leading-relaxed">
                Số tài khoản ngân hàng và số CCCD được mã hóa chuẩn AES-256 khi
                lưu trữ, luôn che giấu một phần khi hiển thị và mọi giao dịch
                liên kết đều bắt buộc xác thực bằng mã OTP 6 chữ số.
              </p>
            </section>
          </>
        )}
      </main>

      <SpendingLimitSheet
        isOpen={isLimitSheetOpen}
        currentLimit={dailyLimit}
        spentToday={spentToday}
        isSaving={limitMutation.isPending}
        serverError={limitError}
        onClose={() => setIsLimitSheetOpen(false)}
        onSave={(amount) => limitMutation.mutate(amount)}
      />

      <BottomNav />
    </Page>
  );
}
