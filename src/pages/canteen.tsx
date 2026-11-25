import React, { useState } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header, Page, useNavigate, useSnackbar } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { SpendingLimitSheet } from "@/components/spending-limit-sheet";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { StudentCardView } from "@/components/student-card-view";
import { UnlinkConfirmDialog } from "@/components/unlink-confirm-dialog";
import { ZaloPhoneLoginPanel } from "@/components/zalo-phone-login";
import { logoutSession } from "@/features/auth/api";
import { authHydratedAtom, currentUserAtom } from "@/features/auth/store";
import { formatPaymentError } from "@/features/orders/payment";
import {
  createPosPurchase,
  fetchCardOrders,
  fetchMyStudentCards,
  initiateBankUnlink,
  updateCardSpendingLimit,
} from "@/features/canteen/api";
import {
  bankLinkDraftAtom,
  bankLinkSuccessBannerAtom,
  EMPTY_BANK_LINK_FORM,
  pendingOtpSessionAtom,
  pendingUnlinkOtpSessionAtom,
  selectedCardIdAtom,
} from "@/features/canteen/store";
import {
  canUnlinkBankAccount,
  getRemainingBarTone,
} from "@/features/canteen/spending-limit";
import { createIdempotencyKey, isProductInStock } from "@/features/cart/cart-logic";
import { fetchProducts } from "@/features/menu/api";
import { formatVnd } from "@/lib/format";

export default function CanteenHubPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const currentUser = useAtomValue(currentUserAtom);
  const authHydrated = useAtomValue(authHydratedAtom);

  const [selectedCardId, setSelectedCardId] = useAtom(selectedCardIdAtom);
  const [isLimitSheetOpen, setIsLimitSheetOpen] = useState(false);
  const [limitError, setLimitError] = useState<string | null>(null);
  const [posError, setPosError] = useState<string | null>(null);
  const [isUnlinkDialogOpen, setIsUnlinkDialogOpen] = useState(false);
  const [unlinkError, setUnlinkError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [successBanner, setSuccessBanner] = useAtom(bankLinkSuccessBannerAtom);
  const setDraft = useSetAtom(bankLinkDraftAtom);
  const setPendingOtp = useSetAtom(pendingOtpSessionAtom);
  const setPendingUnlinkSession = useSetAtom(pendingUnlinkOtpSessionAtom);

  const cardsQuery = useQuery({
    queryKey: ["canteen-cards", currentUser?.id ?? null],
    queryFn: fetchMyStudentCards,
    enabled: Boolean(currentUser),
  });

  const canManageCanteen =
    currentUser?.can_manage_canteen ??
    (currentUser?.role !== "student");
  const isStudentAccount = currentUser?.role === "student";

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
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product"] });
      void queryClient.invalidateQueries({ queryKey: ["canteen-pos-sample-products"] });
      openSnackbar({
        text: `Quẹt thẻ thành công (${order.code})`,
        duration: 2200,
      });
      navigate(`/orders/${order.id}`);
    },
    onError: (err) => {
      setPosError(
        formatPaymentError(err, "Không thể mô phỏng giao dịch quẹt thẻ POS."),
      );
    },
  });

  const initiateUnlinkMutation = useMutation({
    mutationFn: async () => {
      if (!activeCard?.bank_link) {
        throw new Error("Không tìm thấy tài khoản ngân hàng đang liên kết.");
      }
      return initiateBankUnlink(activeCard.bank_link.id);
    },
    onSuccess: (initiation) => {
      setUnlinkError(null);
      setIsUnlinkDialogOpen(false);
      setSuccessBanner(null);
      setPendingUnlinkSession({
        initiation,
        cardCode: activeCard?.card_code ?? "",
        studentName: activeCard?.student.full_name ?? "",
      });
      navigate("/canteen/unlink-otp");
    },
    onError: (err) => {
      setUnlinkError(
        err instanceof Error
          ? err.message
          : "Không thể khởi tạo yêu cầu hủy liên kết lúc này.",
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
      values: {
        ...EMPTY_BANK_LINK_FORM,
        phone_number: currentUser?.phone ?? "",
      },
    });
    navigate("/canteen/link-bank");
  };

  const handleLogout = async () => {
    if (isLoggingOut) {
      return;
    }
    setIsLoggingOut(true);
    try {
      await logoutSession();
      setSelectedCardId(null);
      setDraft(null);
      setPendingOtp(null);
      setPendingUnlinkSession(null);
      setSuccessBanner(null);
      queryClient.removeQueries({ queryKey: ["canteen-cards"] });
      queryClient.removeQueries({ queryKey: ["canteen-card-orders"] });
      queryClient.removeQueries({ queryKey: ["canteen-limit-logs"] });
      queryClient.removeQueries({ queryKey: ["my-orders"] });
      queryClient.removeQueries({ queryKey: ["order"] });
      openSnackbar({
        text: "Đã đăng xuất tài khoản.",
        duration: 2000,
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  const recentOrders = recentOrdersQuery.data?.data ?? [];
  const availableDemoProduct = (sampleProductsQuery.data ?? []).find(
    (p) => isProductInStock(p),
  );

  const dailyLimit = activeCard?.spending_limit.daily_limit ?? 0;
  const spentToday = activeCard?.spending_limit.spent_today ?? 0;
  const remainingLimit = activeCard?.spending_limit.remaining_limit ?? 0;
  const remainingPct =
    dailyLimit > 0
      ? Math.max(0, Math.min(100, Math.round((remainingLimit / dailyLimit) * 100)))
      : 0;
  const isCardActive = activeCard?.status === "ACTIVE";
  const canUnlink = activeCard
    ? canUnlinkBankAccount(activeCard.status, activeCard.is_bank_linked)
    : false;
  const barTone = getRemainingBarTone(remainingPct);
  const progressBarColor =
    barTone === "red"
      ? "bg-red-600"
      : barTone === "amber"
        ? "bg-amber-600"
        : "bg-brand-700";

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

        {!authHydrated ? (
          <LoadingState label="Đang kiểm tra phiên đăng nhập..." />
        ) : !currentUser ? (
          <ZaloPhoneLoginPanel />
        ) : cardsQuery.isLoading ? (
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
          <div className="space-y-3">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {currentUser.name}
                </p>
                <p className="text-gray-600 font-mono">
                  {currentUser.phone_masked ?? "Tài khoản Zalo"}
                </p>
              </div>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                {isLoggingOut ? "Đang thoát..." : "Đăng xuất"}
              </button>
            </div>
            <EmptyState
              message="Tài khoản chưa được gắn thẻ học sinh thông minh."
              actionLabel="Quay về Thực đơn"
              onAction={() => navigate("/")}
            />
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 truncate">
                  {isStudentAccount ? "Học sinh" : "Phụ huynh"}: {currentUser.name}
                </p>
                <p className="text-gray-600 font-mono">
                  {currentUser.phone_masked
                    ? `SĐT xác thực: ${currentUser.phone_masked}`
                    : "Tài khoản Zalo"}
                </p>
              </div>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
                className="px-2.5 py-1.5 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-700 shrink-0"
              >
                {isLoggingOut ? "Đang thoát..." : "Đăng xuất"}
              </button>
            </div>
            {isStudentAccount ? (
              <div
                role="status"
                className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-900"
              >
                <strong>Chế độ Tài khoản Học sinh:</strong> Bạn có thể xem thẻ, hạn mức còn lại hôm nay và lịch sử mua hàng. Các thao tác liên kết ngân hàng và thay đổi hạn mức chỉ dành cho tài khoản Phụ huynh.
              </div>
            ) : null}
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
                      onClick={() => {
                        setSelectedCardId(card.id);
                        setPosError(null);
                        setLimitError(null);
                        setUnlinkError(null);
                      }}
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
                        className={`h-full rounded-full transition-all ${progressBarColor}`}
                        style={{ width: `${remainingPct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-600">
                      <span>Đã chi hôm nay: {formatVnd(spentToday)}</span>
                      <span>Tự động làm mới 00:00 hằng ngày</span>
                    </div>
                  </div>

                  {!isCardActive ? (
                    <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                      Thẻ đang ở trạng thái <strong>{activeCard.status}</strong>{" "}
                      nên tạm dừng chi tiêu và điều chỉnh hạn mức. Bạn vẫn có
                      thể hủy liên kết ngân hàng bên dưới.
                    </p>
                  ) : null}

                  <div className={`grid gap-2.5 pt-1 ${canManageCanteen ? "grid-cols-2" : "grid-cols-1"}`}>
                    {canManageCanteen ? (
                      <button
                        type="button"
                        disabled={!isCardActive}
                        onClick={() => {
                          setLimitError(null);
                          setIsLimitSheetOpen(true);
                        }}
                        className="py-2.5 px-3 rounded-lg text-xs font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
                      >
                        Thiết lập hạn mức
                      </button>
                    ) : null}
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
                                      timeZone: "Asia/Ho_Chi_Minh",
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
                        disabled={!isCardActive || posSwipeMutation.isPending}
                        onClick={() => {
                          if (!isCardActive || posSwipeMutation.isPending) {
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

                  {canUnlink && canManageCanteen ? (
                    <div className="pt-2 border-t border-gray-100">
                      <button
                        type="button"
                        onClick={() => {
                          setUnlinkError(null);
                          setIsUnlinkDialogOpen(true);
                        }}
                        className="w-full py-2.5 px-3 rounded-lg text-xs font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors focus:outline-none focus:ring-2 focus:ring-red-700"
                      >
                        Hủy liên kết ngân hàng
                      </button>
                    </div>
                  ) : null}
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

                {canManageCanteen ? (
                  <button
                    type="button"
                    disabled={activeCard.status !== "ACTIVE"}
                    onClick={handleStartBankLink}
                    className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
                  >
                    Liên kết tài khoản ngân hàng
                  </button>
                ) : (
                  <p className="text-xs text-blue-900 bg-blue-50 border border-blue-200 rounded-lg p-3">
                    Thẻ học sinh chưa được phụ huynh liên kết tài khoản ngân hàng. Hãy nhờ phụ huynh đăng nhập bằng tài khoản Phụ huynh để kích hoạt.
                  </p>
                )}
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
        isOpen={canManageCanteen && isLimitSheetOpen}
        cardLabel={
          activeCard
            ? `${activeCard.student.full_name} · Thẻ ${activeCard.card_code}`
            : undefined
        }
        currentLimit={dailyLimit}
        spentToday={spentToday}
        isSaving={limitMutation.isPending}
        serverError={limitError}
        onClearError={() => setLimitError(null)}
        onClose={() => setIsLimitSheetOpen(false)}
        onSave={(amount) => limitMutation.mutate(amount)}
      />

      {canManageCanteen && activeCard?.bank_link ? (
        <UnlinkConfirmDialog
          isOpen={canManageCanteen && isUnlinkDialogOpen}
          cardCode={activeCard.card_code}
          studentName={activeCard.student.full_name}
          bankName={activeCard.bank_link.bank_name}
          accountNumberMasked={activeCard.bank_link.account_number_masked}
          isSubmitting={initiateUnlinkMutation.isPending}
          errorMessage={unlinkError}
          onCancel={() => {
            setUnlinkError(null);
            setIsUnlinkDialogOpen(false);
          }}
          onConfirm={() => initiateUnlinkMutation.mutate()}
        />
      ) : null}

      <BottomNav />
    </Page>
  );
}
