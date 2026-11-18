import React, { useState } from "react";
import { useSetAtom } from "jotai";
import { useQuery } from "@tanstack/react-query";
import {
  Box,
  Button,
  Header,
  Page,
  Text,
  useNavigate,
  useParams,
  useSnackbar,
} from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { ProductImage } from "@/components/product-image";
import { ErrorState, LoadingState } from "@/components/state-views";
import {
  MAX_ITEM_QUANTITY,
  addCartItem,
} from "@/features/cart/cart-logic";
import { cartItemsAtom } from "@/features/cart/store";
import { fetchProduct } from "@/features/menu/api";
import { ApiError } from "@/lib/api-client";
import { formatVnd } from "@/lib/format";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const setCartItems = useSetAtom(cartItemsAtom);
  const [quantity, setQuantity] = useState(1);

  const productId = Number(id);
  const isValidId = Number.isInteger(productId) && productId > 0;

  const productQuery = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct(productId),
    enabled: isValidId,
  });

  const isNotFound =
    !isValidId ||
    (productQuery.error instanceof ApiError &&
      productQuery.error.status === 404);

  const handleAddToCart = () => {
    if (!productQuery.data || !productQuery.data.is_available) {
      return;
    }
    setCartItems((prev) => addCartItem(prev, productQuery.data, quantity));
    openSnackbar({
      text: `Đã thêm ${quantity} × "${productQuery.data.name}" vào giỏ`,
      duration: 1800,
    });
    navigate("/cart");
  };

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header title="Chi tiết món" onBackClick={() => navigate("/")} />
      <main className="p-11 max-w-2xl mx-auto">
        {isNotFound ? (
          <Box
            role="status"
            className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4"
          >
            <Text.Title size="small">Món không tồn tại</Text.Title>
            <Text size="small" className="text-gray-600">
              Món ăn bạn tìm không còn trong thực đơn hoặc đã ngừng phục vụ.
            </Text>
            <Button
              size="small"
              variant="secondary"
              onClick={() => navigate("/")}
            >
              Quay lại thực đơn
            </Button>
          </Box>
        ) : productQuery.isLoading ? (
          <LoadingState label="Đang tải thông tin món..." />
        ) : productQuery.error ? (
          <ErrorState
            message={
              productQuery.error instanceof Error
                ? productQuery.error.message
                : "Không thể tải chi tiết món."
            }
            isRetrying={productQuery.isRefetching}
            onRetry={() => void productQuery.refetch()}
          />
        ) : productQuery.data ? (
          <article className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <ProductImage
              imageUrl={productQuery.data.image_url}
              alt={productQuery.data.name}
              variant="detail"
            />
            <div className="p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-lg font-bold text-gray-900">
                  {productQuery.data.name}
                </h1>
                <span
                  className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${productQuery.data.is_available
                    ? "bg-brand-100 text-brand-900"
                    : "bg-gray-200 text-gray-700"
                    }`}
                >
                  {productQuery.data.is_available ? "Còn món" : "Hết món"}
                </span>
              </div>

              <p className="text-xl font-bold text-brand-700">
                {formatVnd(productQuery.data.price)}
              </p>

              <p className="text-sm text-gray-700 leading-relaxed">
                {productQuery.data.description ||
                  "Chưa có mô tả chi tiết cho món ăn này."}
              </p>

              {productQuery.data.is_available ? (
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">
                      Số lượng (tối đa {MAX_ITEM_QUANTITY})
                    </span>
                    <div className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        disabled={quantity <= 1}
                        aria-label="Giảm số lượng"
                        className="w-10 h-10 rounded-lg border border-gray-300 text-base font-bold text-gray-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      >
                        -
                      </button>
                      <span
                        aria-live="polite"
                        className="w-6 text-center text-sm font-bold text-gray-900"
                      >
                        {quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setQuantity((q) =>
                            Math.min(MAX_ITEM_QUANTITY, q + 1),
                          )
                        }
                        disabled={quantity >= MAX_ITEM_QUANTITY}
                        aria-label="Tăng số lượng"
                        className="w-10 h-10 rounded-lg border border-gray-300 text-base font-bold text-gray-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-brand-700"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <Button
                    fullWidth
                    variant="primary"
                    onClick={handleAddToCart}
                  >
                    Thêm vào giỏ ·{" "}
                    {formatVnd(productQuery.data.price * quantity)}
                  </Button>
                </div>
              ) : (
                <div className="pt-3 border-t border-gray-100">
                  <Button fullWidth disabled variant="secondary">
                    Món này hiện đã hết
                  </Button>
                </div>
              )}

              <div>
                <Button
                  fullWidth
                  variant="secondary"
                  onClick={() => navigate("/")}
                >
                  Quay lại thực đơn
                </Button>
              </div>
            </div>
          </article>
        ) : null}
      </main>
      <BottomNav />
    </Page>
  );
}
