import React, { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Header, Page, useNavigate, useSnackbar } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { ProductImage } from "@/components/product-image";
import { EmptyState } from "@/components/state-views";
import { fetchMyStudentCards } from "@/features/canteen/api";
import { canPayWithStudentCard } from "@/features/canteen/spending-limit";
import {
  MAX_ITEM_QUANTITY,
  computeCartFingerprint,
  createIdempotencyKey,
  removeCartItem,
  updateCartQuantity,
} from "@/features/cart/cart-logic";
import {
  cartItemsAtom,
  cartNoteAtom,
  cartTotalsAtom,
} from "@/features/cart/store";
import { createOrder } from "@/features/orders/api";
import { formatVnd } from "@/lib/format";

export default function CartPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [items, setItems] = useAtom(cartItemsAtom);
  const [note, setNote] = useAtom(cartNoteAtom);
  const { totalQuantity, estimatedAmount } = useAtomValue(cartTotalsAtom);
  const [paymentChoice, setPaymentChoice] = useState<
    "COUNTER_CASH" | "STUDENT_CARD"
  >("COUNTER_CASH");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const cardsQuery = useQuery({
    queryKey: ["canteen-cards"],
    queryFn: fetchMyStudentCards,
  });

  const linkedCard =
    (cardsQuery.data ?? []).find(
      (card) => card.is_bank_linked && card.status === "ACTIVE",
    ) ?? null;

  const effectivePaymentMethod =
    paymentChoice === "STUDENT_CARD" && linkedCard
      ? "STUDENT_CARD"
      : "COUNTER_CASH";
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
      openSnackbar({
        text: `Đặt đơn thành công (${order.code})`,
        duration: 2200,
      });
      navigate(`/orders/${order.id}`);
    },
    onError: (err) => {
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Không thể tạo đơn hàng. Vui lòng thử lại.",
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
                        disabled={quantity >= MAX_ITEM_QUANTITY}
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

            {linkedCard ? (
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
                >
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
            ) : null}

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
                  checkoutMutation.mutate();
                }}
              >
                Đặt món ngay · {formatVnd(estimatedAmount)}
              </Button>
            </section>
          </>
        )}
      </main>
      <BottomNav />
    </Page>
  );
}
