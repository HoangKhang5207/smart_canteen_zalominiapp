import React, { useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Header, Page, useNavigate, useSnackbar } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { ProductImage } from "@/components/product-image";
import { EmptyState } from "@/components/state-views";
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const idempotencyRef = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );

  const getIdempotencyKeyForCurrentCart = (): string => {
    const fingerprint = computeCartFingerprint(items, note);
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
                disabled={checkoutMutation.isPending}
                onClick={() => checkoutMutation.mutate()}
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
