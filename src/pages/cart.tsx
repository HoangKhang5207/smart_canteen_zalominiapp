import React, { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Header, Page, useNavigate, useSnackbar } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { ProductImage } from "@/components/product-image";
import { EmptyState } from "@/components/state-views";
import { ZaloPhoneLoginModal } from "@/components/zalo-phone-login";
import { currentUserAtom } from "@/features/auth/store";
import { fetchMyStudentCards } from "@/features/canteen/api";
import { canPayWithStudentCard } from "@/features/canteen/spending-limit";
import { selectedCardIdAtom } from "@/features/canteen/store";
import {
  computeCartFingerprint,
  createIdempotencyKey,
  getMaxAddableQuantity,
  removeCartItem,
  updateCartQuantity,
} from "@/features/cart/cart-logic";
import {
  cartItemsAtom,
  cartNoteAtom,
  cartTotalsAtom,
} from "@/features/cart/store";
import { createOrder } from "@/features/orders/api";
import { formatPaymentError } from "@/features/orders/payment";
import { formatVnd } from "@/lib/format";

export default function CartPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const currentUser = useAtomValue(currentUserAtom);

  const [items, setItems] = useAtom(cartItemsAtom);
  const [note, setNote] = useAtom(cartNoteAtom);
  const { totalQuantity, estimatedAmount } = useAtomValue(cartTotalsAtom);
  const [paymentChoice, setPaymentChoice] = useState<
    "COUNTER_CASH" | "STUDENT_CARD" | "VNPAY"
  >("COUNTER_CASH");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loginModalMode, setLoginModalMode] = useState<
    null | "card" | "checkout"
  >(null);

  const [selectedCardId, setSelectedCardId] = useAtom(selectedCardIdAtom);

  const cardsQuery = useQuery({
    queryKey: ["canteen-cards", currentUser?.id ?? null],
    queryFn: fetchMyStudentCards,
    enabled: Boolean(currentUser),
  });

  const linkedCards = (cardsQuery.data ?? []).filter(
    (card) => card.is_bank_linked && card.status === "ACTIVE",
  );
  const linkedCard =
    linkedCards.find((card) => card.id === selectedCardId) ??
    linkedCards[0] ??
    null;

  const effectivePaymentMethod =
    paymentChoice === "STUDENT_CARD"
      ? linkedCard
        ? "STUDENT_CARD"
        : "COUNTER_CASH"
      : paymentChoice;
  const remainingLimit = linkedCard?.spending_limit.remaining_limit ?? 0;
  const exceedsLimit =
    effectivePaymentMethod === "STUDENT_CARD" &&
    !canPayWithStudentCard(estimatedAmount, remainingLimit);

  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );

  const getIdempotencyKeyForCurrentCart = (): string => {
    const fingerprint = `${computeCartFingerprint(items, note)}|${effectivePaymentMethod}|${linkedCard?.id ?? 0}`;
    if (
      !idempotencyRef.current ||
      idempotencyRef.current.fingerprint !== fingerprint
    ) {
      idempotencyRef.current = {
        fingerprint,
        key: createIdempotencyKey(),
      };
    }
    return idempotencyRef.current.key;
  };

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      const key = getIdempotencyKeyForCurrentCart();
      return await createOrder(
        {
          items: items.map((entry) => ({
            product_id: entry.product.id,
            quantity: entry.quantity,
          })),
          note: note.trim() !== "" ? note.trim() : undefined,
          payment_method: effectivePaymentMethod,
          student_card_id:
            effectivePaymentMethod === "STUDENT_CARD" && linkedCard
              ? linkedCard.id
              : undefined,
        },
        key,
      );
    },
    onSuccess: (order) => {
      setSubmitError(null);
      setItems([]);
      setNote("");
      idempotencyRef.current = null;
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["canteen-cards"] });
      void queryClient.invalidateQueries({ queryKey: ["canteen-card-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["products"] });
      void queryClient.invalidateQueries({ queryKey: ["product"] });
      void queryClient.invalidateQueries({ queryKey: ["canteen-pos-sample-products"] });
      openSnackbar({
        text: `Đặt đơn thành công (${order.code})`,
        duration: 2200,
      });
      navigate(`/orders/${order.id}`);
    },
    onError: (err) => {
      setSubmitError(
        formatPaymentError(err, "Không thể tạo đơn hàng. Vui lòng thử lại."),
      );
    },
  });

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header title="Giỏ hàng & Đặt món" onBackClick={() => navigate("/")} />
      <main className="app-main space-y-4 max-w-2xl mx-auto">
        {items.length === 0 ? (
          <EmptyState
            message="Giỏ hàng của bạn đang trống. Hãy chọn món từ thực đơn nhé!"
            actionLabel="Xem thực đơn"
            onAction={() => navigate("/")}
          />
        ) : (
          <>
            <section
              aria-label="Danh sách món trong giỏ"
              className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100"
            >
              <ul className="divide-y divide-gray-100">
                {items.map(({ product, quantity }) => (
                  <li
                    key={product.id}
                    className="p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <ProductImage
                        imageUrl={product.image_url}
                        alt={product.name}
                        variant="cart"
                      />
                      <div className="min-w-0 flex-1">
                        <h2 className="text-sm font-semibold text-gray-900 truncate">
                          {product.name}
                        </h2>
                        <p className="text-xs text-gray-600">
                          {formatVnd(product.price)} × {quantity} ={" "}
                          <span className="font-semibold text-brand-700">
                            {formatVnd(product.price * quantity)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        aria-label={`Giảm số lượng ${product.name}`}
                        onClick={() =>
                          setItems((prev) =>
                            updateCartQuantity(prev, product.id, quantity - 1),
                          )
                        }
                        className="w-9 h-9 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-gray-900">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Tăng số lượng ${product.name}`}
                        disabled={quantity >= Math.max(1, getMaxAddableQuantity(product))}
                        onClick={() =>
                          setItems((prev) =>
                            updateCartQuantity(prev, product.id, quantity + 1),
                          )
                        }
                        className="w-9 h-9 rounded-lg border border-gray-300 text-sm font-bold text-gray-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      >
                        +
                      </button>
                      <button
                        type="button"
                        aria-label={`Xóa ${product.name} khỏi giỏ`}
                        onClick={() =>
                          setItems((prev) => removeCartItem(prev, product.id))
                        }
                        className="ml-1 min-h-9 px-2 text-xs font-medium text-red-600 hover:underline focus:outline-none focus:ring-2 focus:ring-red-600 rounded"
                      >
                        Xóa
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {!currentUser ? (
              <section
                aria-label="Đăng nhập để dùng thẻ học sinh"
                className="bg-brand-50 border border-brand-100 rounded-xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-bold text-brand-900">
                    Thanh toán bằng Thẻ học sinh?
                  </p>
                  <p className="text-[11px] text-brand-800">
                    Đăng nhập bằng SĐT Zalo để chọn thẻ học sinh &amp; đặt món.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setLoginModalMode("card")}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-brand-700 hover:bg-brand-800 shrink-0 focus:outline-none focus:ring-2 focus:ring-brand-700"
                >
                  Đăng nhập
                </button>
              </section>
            ) : (
              <section
                aria-label="Phương thức thanh toán"
                className="bg-white border border-gray-200 rounded-xl p-4 space-y-2.5"
              >
                <h2 className="text-sm font-semibold text-gray-900">
                  Phương thức thanh toán
                </h2>
                <div
                  role="radiogroup"
                  aria-label="Chọn phương thức thanh toán"
                  className="space-y-2"
                  onKeyDown={(e) => {
                    if ((e.target as HTMLElement | null)?.getAttribute("role") !== "radio") {
                      return;
                    }
                    if (
                      e.key !== "ArrowDown" &&
                      e.key !== "ArrowRight" &&
                      e.key !== "ArrowUp" &&
                      e.key !== "ArrowLeft"
                    ) {
                      return;
                    }
                    e.preventDefault();
                    const options: Array<"STUDENT_CARD" | "VNPAY" | "COUNTER_CASH"> =
                      linkedCard
                        ? ["STUDENT_CARD", "VNPAY", "COUNTER_CASH"]
                        : ["VNPAY", "COUNTER_CASH"];
                    const currentIdx = Math.max(
                      0,
                      options.indexOf(effectivePaymentMethod),
                    );
                    const delta =
                      e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : -1;
                    const nextIdx =
                      (currentIdx + delta + options.length) % options.length;
                    setPaymentChoice(options[nextIdx]);
                    setSubmitError(null);
                    const radios =
                      e.currentTarget.querySelectorAll<HTMLButtonElement>(
                        '[role="radio"]',
                      );
                    radios[nextIdx]?.focus();
                  }}
                >
                  {linkedCard ? (
                    <>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={effectivePaymentMethod === "STUDENT_CARD"}
                        onClick={() => {
                          setPaymentChoice("STUDENT_CARD");
                          setSubmitError(null);
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                          effectivePaymentMethod === "STUDENT_CARD"
                            ? "border-brand-700 bg-brand-50"
                            : "border-gray-200 bg-white hover:border-brand-500"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-900">
                            Thẻ học sinh thông minh ({linkedCard.card_code})
                          </span>
                          <span className="text-xs font-semibold text-brand-700">
                            Còn {formatVnd(remainingLimit)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 mt-0.5">
                          Trích nợ tự động qua {linkedCard.bank_link?.bank_name} (
                          {linkedCard.bank_link?.account_number_masked})
                        </p>
                      </button>

                      {effectivePaymentMethod === "STUDENT_CARD" &&
                      linkedCards.length > 1 ? (
                        <div
                          className="flex gap-2 overflow-x-auto pt-1"
                          role="group"
                          aria-label="Chọn thẻ học sinh thanh toán"
                        >
                          {linkedCards.map((card) => {
                            const isSelected = card.id === linkedCard.id;
                            return (
                              <button
                                key={card.id}
                                type="button"
                                onClick={() => {
                                  setSelectedCardId(card.id);
                                  setSubmitError(null);
                                }}
                                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                                  isSelected
                                    ? "bg-brand-700 text-white border-brand-700"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-brand-500"
                                }`}
                              >
                                {card.student.full_name} ·{" "}
                                {formatVnd(card.spending_limit.remaining_limit)}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </>
                  ) : null}

                  <button
                    type="button"
                    role="radio"
                    aria-checked={effectivePaymentMethod === "VNPAY"}
                    onClick={() => {
                      setPaymentChoice("VNPAY");
                      setSubmitError(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                      effectivePaymentMethod === "VNPAY"
                        ? "border-brand-700 bg-brand-50"
                        : "border-gray-200 bg-white hover:border-brand-500"
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900">
                      Thanh toán VNPay (Sandbox)
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Chuyển sang cổng VNPay Sandbox ký bảo mật HMAC-SHA512
                    </p>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={effectivePaymentMethod === "COUNTER_CASH"}
                    onClick={() => {
                      setPaymentChoice("COUNTER_CASH");
                      setSubmitError(null);
                    }}
                    className={`w-full text-left p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                      effectivePaymentMethod === "COUNTER_CASH"
                        ? "border-brand-700 bg-brand-50"
                        : "border-gray-200 bg-white hover:border-brand-500"
                    }`}
                  >
                    <p className="text-xs font-bold text-gray-900">
                      Thanh toán tại quầy
                    </p>
                    <p className="text-[11px] text-gray-600 mt-0.5">
                      Thanh toán trực tiếp khi nhận suất ăn tại căn tin
                    </p>
                  </button>
                </div>

                {exceedsLimit ? (
                  <div
                    role="alert"
                    className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-2"
                  >
                    <span>
                      Đơn hàng vượt hạn mức còn lại ({formatVnd(remainingLimit)}
                      ).
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate("/canteen")}
                      className="font-semibold text-brand-700 underline shrink-0"
                    >
                      Đổi hạn mức
                    </button>
                  </div>
                ) : null}
              </section>
            )}

            <section
              aria-label="Ghi chú đơn hàng"
              className="bg-white border border-gray-200 rounded-xl p-4 space-y-2"
            >
              <label
                htmlFor="order-note"
                className="block text-sm font-semibold text-gray-900"
              >
                Ghi chú cho nhà bếp (tùy chọn)
              </label>
              <textarea
                id="order-note"
                rows={2}
                maxLength={500}
                placeholder="Ví dụ: Ít cơm, không hành, lấy muỗng đũa..."
                value={note}
                onChange={(e) => setNote(e.target.value.slice(0, 500))}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
              />
            </section>

            <section
              aria-label="Tổng kết đơn hàng"
              className="bg-white border border-brand-100 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>Tổng số lượng</span>
                <span className="font-semibold text-gray-900">
                  {totalQuantity} phần
                </span>
              </div>
              <div className="flex items-center justify-between text-base font-bold text-gray-900">
                <span>Tạm tính</span>
                <span className="text-brand-700">
                  {formatVnd(estimatedAmount)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Tổng tiền chính thức được máy chủ xác thực và chốt theo bảng giá
                hiện hành khi tạo đơn.
              </p>

              {submitError ? (
                <div
                  role="alert"
                  className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700"
                >
                  {submitError}
                </div>
              ) : null}

              <Button
                fullWidth
                variant="primary"
                loading={checkoutMutation.isPending}
                disabled={checkoutMutation.isPending || exceedsLimit}
                onClick={() => {
                  if (checkoutMutation.isPending || exceedsLimit) {
                    return;
                  }
                  if (!currentUser) {
                    setSubmitError(null);
                    setLoginModalMode("checkout");
                    return;
                  }
                  checkoutMutation.mutate();
                }}
              >
                {currentUser
                  ? `Đặt món ngay · ${formatVnd(estimatedAmount)}`
                  : `Đăng nhập SĐT Zalo & Đặt món · ${formatVnd(estimatedAmount)}`}
              </Button>
            </section>
          </>
        )}
      </main>

      <ZaloPhoneLoginModal
        isOpen={loginModalMode !== null}
        title={
          loginModalMode === "card"
            ? "Đăng nhập để chọn Thẻ học sinh"
            : "Xác thực SĐT Zalo để đặt món"
        }
        description={
          loginModalMode === "card"
            ? "Xác thực số điện thoại phụ huynh trên Zalo để tải danh sách thẻ học sinh đã liên kết."
            : "Giỏ hàng của bạn được giữ nguyên. Xác thực số điện thoại Zalo để hoàn tất đặt đơn tại căn tin."
        }
        onClose={() => setLoginModalMode(null)}
        onSuccess={() => {
          openSnackbar({
            text: "Đăng nhập thành công! Hãy kiểm tra phương thức thanh toán và nhấn Đặt món.",
            duration: 2400,
          });
        }}
      />

      <BottomNav />
    </Page>
  );
}
