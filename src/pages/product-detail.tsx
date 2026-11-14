import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Header, Page, Text, useNavigate, useParams } from "zmp-ui";
import { ErrorState, LoadingState } from "@/components/state-views";
import { fetchProduct } from "@/features/menu/api";
import { ApiError } from "@/lib/api-client";
import { formatVnd } from "@/lib/format";

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
    <Page className="bg-gray-50 min-h-screen">
      <Header title="Chi tiết món" onBackClick={() => navigate("/")} />
      <main className="p-4 max-w-2xl mx-auto">
        {isNotFound ? (
          <Box
            role="status"
            className="bg-white border border-gray-200 rounded-lg p-6 text-center space-y-4"
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
            onRetry={() => void productQuery.refetch()}
          />
        ) : productQuery.data ? (
          <article className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="w-full h-48 bg-gray-100 border-b border-gray-200 flex items-center justify-center text-gray-500 font-semibold">
              {productQuery.data.image_url ? (
                <img
                  src={productQuery.data.image_url}
                  alt={productQuery.data.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>SMART CANTEEN</span>
              )}
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-lg font-bold text-gray-900">
                  {productQuery.data.name}
                </h1>
                <span
                  className={`shrink-0 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium ${
                    productQuery.data.is_available
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {productQuery.data.is_available ? "Còn món" : "Hết món"}
                </span>
              </div>

              <p className="text-xl font-bold text-blue-700">
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
