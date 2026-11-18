import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Header, Page, Text, useNavigate, useParams } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { ErrorState, LoadingState } from "@/components/state-views";
import { fetchOrder } from "@/features/orders/api";
import { getOrderStatusMeta } from "@/features/orders/status";
import { ApiError } from "@/lib/api-client";
import { formatVnd } from "@/lib/format";

const WORKFLOW_STEPS = [
  { key: "PENDING", label: "Đã tiếp nhận" },
  { key: "PREPARING", label: "Đang chế biến" },
  { key: "READY", label: "Sẵn sàng nhận món" },
  { key: "COMPLETED", label: "Hoàn thành" },
] as const;

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const orderId = Number(id);
  const isValidId = Number.isInteger(orderId) && orderId > 0;

  const orderQuery = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: isValidId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) {
        return false;
      }
      return getOrderStatusMeta(data.status).isTerminal ? false : 7_000;
    },
  });

  const isNotFound =
    !isValidId ||
    (orderQuery.error instanceof ApiError && orderQuery.error.status === 404);

  const order = orderQuery.data;
  const statusMeta = order ? getOrderStatusMeta(order.status) : null;
  const activeStepIndex = order
    ? WORKFLOW_STEPS.findIndex((s) => s.key === order.status)
    : -1;

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header
        title="Chi tiết đơn hàng"
        onBackClick={() => navigate("/orders")}
      />
      <main className="p-11 space-y-4 max-w-2xl mx-auto">
        {isNotFound ? (
          <Box
            role="status"
            className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4"
          >
            <Text.Title size="small">Không tìm thấy đơn hàng</Text.Title>
            <Text size="small" className="text-gray-600">
              Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn.
            </Text>
            <Button
              size="small"
              variant="secondary"
              onClick={() => navigate("/orders")}
            >
              Về danh sách đơn
            </Button>
          </Box>
        ) : orderQuery.isLoading ? (
          <LoadingState label="Đang tải thông tin đơn hàng..." />
        ) : orderQuery.error ? (
          <ErrorState
            message={
              orderQuery.error instanceof Error
                ? orderQuery.error.message
                : "Không thể tải chi tiết đơn hàng."
            }
            isRetrying={orderQuery.isRefetching}
            onRetry={() => void orderQuery.refetch()}
          />
        ) : order && statusMeta ? (
          <>
            <section
              aria-label="Trạng thái đơn hàng"
              className="bg-white border border-brand-100 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-500">Mã đơn hàng</p>
                  <h1 className="font-mono text-lg font-bold text-gray-900">
                    {order.code}
                  </h1>
                </div>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.badgeClass}`}
                >
                  {statusMeta.label}
                </span>
              </div>

              {order.status !== "CANCELLED" ? (
                <ol
                  aria-label="Tiến độ xử lý đơn"
                  className="grid grid-cols-4 gap-1.5 pt-2"
                >
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const reached = idx <= activeStepIndex;
                    return (
                      <li key={step.key} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full ${reached ? "bg-brand-700" : "bg-gray-200"
                            }`}
                        />
                        <p
                          className={`text-[11px] leading-tight ${reached
                              ? "font-semibold text-brand-900"
                              : "text-gray-400"
                            }`}
                        >
                          {step.label}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              ) : null}

              {!statusMeta.isTerminal ? (
                <p className="text-xs text-gray-500">
                  Trạng thái tự động cập nhật mỗi 7 giây.
                </p>
              ) : null}
            </section>

            <section
              aria-label="Danh sách món đã đặt"
              className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <h2 className="text-sm font-bold text-gray-900">
                Chi tiết phần ăn
              </h2>
              <ul className="divide-y divide-gray-100">
                {order.items.map((item) => (
                  <li
                    key={item.id}
                    className="py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {item.product_name || `Món #${item.product_id}`}
                      </p>
                      <p className="text-xs text-gray-500">
                        {item.quantity} × {formatVnd(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-semibold text-gray-900 shrink-0">
                      {formatVnd(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.note ? (
                <div className="pt-2 border-t border-gray-100 text-xs text-gray-600">
                  <span className="font-semibold text-gray-800">Ghi chú: </span>
                  {order.note}
                </div>
              ) : null}

              <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">
                  Tổng thanh toán
                </span>
                <span className="text-lg font-bold text-brand-700">
                  {formatVnd(order.total_amount)}
                </span>
              </div>
            </section>

            <div className="flex gap-3">
              <Button
                fullWidth
                variant="secondary"
                loading={orderQuery.isRefetching}
                onClick={() => void orderQuery.refetch()}
              >
                Làm mới trạng thái
              </Button>
              <Button
                fullWidth
                variant="primary"
                onClick={() => navigate("/")}
              >
                Đặt thêm món
              </Button>
            </div>
          </>
        ) : null}
      </main>
      <BottomNav />
    </Page>
  );
}
