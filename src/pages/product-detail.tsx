import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Header, Page, Text, useNavigate, useParams } from "zmp-ui";
import { ErrorState, LoadingState } from "@/components/state-views";
import { fetchProduct } from "@/features/menu/api";
import { ApiError } from "@/lib/api-client";
import { formatVnd } from "@/lib/format";
import canteenLogo from "@/static/canteen-logo.jpg";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
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

  return (
    <Page className="bg-surface-muted min-h-screen">
      <Header title="Chi tiết món" onBackClick={() => navigate("/")} />
      <main className="p-4 max-w-2xl mx-auto">
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
            <div className="w-full h-48 bg-brand-50 border-b border-brand-100 flex items-center justify-center overflow-hidden">
              <img
                src={productQuery.data.image_url || canteenLogo}
                alt={productQuery.data.name}
                className={`w-full h-full ${
                  productQuery.data.image_url
                    ? "object-cover"
                    : "object-contain p-6"
                }`}
              />
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-lg font-bold text-gray-900">
                  {productQuery.data.name}
                </h1>
                <span
                  className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                    productQuery.data.is_available
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

              <div className="pt-3 border-t border-gray-100">
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
    </Page>
  );
}
