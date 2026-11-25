import React, { useEffect, useState } from "react";
import { useAtomValue } from "jotai";
import { useMutation, useQuery } from "@tanstack/react-query";
import { openWebview } from "zmp-sdk";
import { Box, Button, Header, Page, Text, useNavigate, useParams } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { ErrorState, LoadingState } from "@/components/state-views";
import { ZaloPhoneLoginPanel } from "@/components/zalo-phone-login";
import { authHydratedAtom, currentUserAtom } from "@/features/auth/store";
import { createVnpayPaymentUrl, fetchOrder } from "@/features/orders/api";
import {
  canLaunchVnpayPayment,
  formatPaymentError,
  getPaymentBadgeClass,
  isSafeHttpUrl,
} from "@/features/orders/payment";
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
  const currentUser = useAtomValue(currentUserAtom);
  const authHydrated = useAtomValue(authHydratedAtom);
  const orderId = Number(id);
  const isValidId = Number.isInteger(orderId) && orderId > 0;

  const orderQuery = useQuery({
    queryKey: ["order", currentUser?.id ?? null, orderId],
    queryFn: () => fetchOrder(orderId),
    enabled: isValidId && Boolean(currentUser),
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

  const [vnpayError, setVnpayError] = useState<string | null>(null);
  const [vnpayUrl, setVnpayUrl] = useState<string | null>(null);

  useEffect(() => {
    setVnpayUrl(null);
    setVnpayError(null);
  }, [orderId]);

  const launchExternalUrl = async (url: string) => {
    try {
      await openWebview({ url });
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const vnpayMutation = useMutation({
    mutationFn: () => createVnpayPaymentUrl(orderId),
    onSuccess: (data) => {
      if (!isSafeHttpUrl(data.payment_url)) {
        setVnpayUrl(null);
        setVnpayError("Liên kết thanh toán VNPay không hợp lệ (chỉ chấp nhận HTTP/HTTPS).");
        return;
      }
      setVnpayError(null);
      setVnpayUrl(data.payment_url);
      if (!data.simulated) {
        void launchExternalUrl(data.payment_url);
      }
    },
    onError: (err) => {
      setVnpayError(
        formatPaymentError(err, "Không thể tạo liên kết thanh toán VNPay Sandbox."),
      );
    },
  });

  const subtotalAmount = order?.subtotal_amount ?? order?.total_amount ?? 0;
  const discountAmount = order?.discount_amount ?? 0;
  const paymentBadgeClass = getPaymentBadgeClass(order?.payment_status);

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header
        title="Chi tiết đơn hàng"
        onBackClick={() => navigate("/orders")}
      />
      <main className="app-main space-y-4 max-w-2xl mx-auto">
        {!authHydrated ? (
          <LoadingState label="Đang kiểm tra phiên đăng nhập..." />
        ) : !currentUser ? (
          <ZaloPhoneLoginPanel
            title="Đăng nhập để xem chi tiết đơn hàng"
            description="Xác thực số điện thoại Zalo để xem hóa đơn, món đã mua và hạn mức chi tiêu của thẻ học sinh."
          />
        ) : isNotFound ? (
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
              aria-label="Trạng thái và tổng quan đơn hàng"
              className="bg-white border border-brand-100 rounded-xl p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs text-gray-600">Mã đơn</p>
                  <h1 className="font-mono text-lg font-bold text-gray-900">
                    #{order.code}
                  </h1>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${paymentBadgeClass}`}
                  >
                    {order.payment_status_label || "Chờ thanh toán"}
                  </span>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusMeta.badgeClass}`}
                  >
                    {statusMeta.label}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-baseline justify-between">
                <span className="text-xs font-medium text-gray-600">
                  Tổng thanh toán
                </span>
                <span className="text-2xl font-bold text-brand-700">
                  {formatVnd(order.total_amount)}
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
                          className={`h-1.5 rounded-full ${
                            reached ? "bg-brand-700" : "bg-gray-200"
                          }`}
                        />
                        <p
                          className={`text-[11px] leading-tight ${
                            reached
                              ? "font-semibold text-brand-900"
                              : "text-gray-500"
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
                <p className="text-xs text-gray-600">
                  Trạng thái tự động cập nhật mỗi 7 giây.
                </p>
              ) : null}

              {order.payment_status === "FAILED" ? (
                <p
                  role="alert"
                  className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5"
                >
                  Thanh toán trước đó chưa thành công. Bạn có thể tạo lại liên kết thanh toán hoặc liên hệ quầy căn tin.
                </p>
              ) : order.payment_status === "PENDING_RECONCILE" ? (
                <p
                  role="status"
                  className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5"
                >
                  Giao dịch đang chờ đối soát với ngân hàng. Vui lòng không thanh toán lặp lại cho đến khi trạng thái được cập nhật.
                </p>
              ) : null}
            </section>

            <section
              aria-label="Thông tin giao dịch"
              className="bg-white border border-gray-200 rounded-xl p-4"
            >
              <dl className="divide-y divide-gray-100 text-sm">
                {order.student_name ? (
                  <div className="py-2 flex items-center justify-between gap-2">
                    <dt className="text-gray-600">Học sinh</dt>
                    <dd className="font-semibold text-gray-900 text-right">
                      {order.student_name}
                      {order.student_class ? ` · Lớp ${order.student_class}` : ""}
                    </dd>
                  </div>
                ) : null}
                <div className="py-2 flex items-center justify-between gap-2">
                  <dt className="text-gray-600">Thời gian</dt>
                  <dd className="text-gray-900 font-medium">
                    {new Date(order.created_at).toLocaleString("vi-VN", {
                      timeZone: "Asia/Ho_Chi_Minh",
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between gap-2">
                  <dt className="text-gray-600">Cửa hàng</dt>
                  <dd className="font-semibold text-gray-900 text-right">
                    {order.store_name || "Căn tin Smart Canteen"}
                  </dd>
                </div>
                <div className="py-2 flex items-center justify-between gap-2">
                  <dt className="text-gray-600">Hình thức</dt>
                  <dd className="font-semibold text-gray-900 text-right">
                    {order.payment_method_label || "Thanh toán tại quầy"}
                  </dd>
                </div>
              </dl>
            </section>

            <section
              aria-label="Món đã mua"
              className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
            >
              <h2 className="text-sm font-bold text-gray-900">Món đã mua</h2>
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
                      <p className="text-xs text-gray-600">
                        {formatVnd(item.unit_price)} × {item.quantity}
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

              <dl className="pt-3 border-t border-gray-200 space-y-1.5 text-sm">
                <div className="flex items-center justify-between text-gray-600">
                  <dt>Tạm tính</dt>
                  <dd className="font-medium text-gray-900">
                    {formatVnd(subtotalAmount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between text-gray-600">
                  <dt>Giảm giá</dt>
                  <dd className="font-medium text-gray-900">
                    {formatVnd(discountAmount)}
                  </dd>
                </div>
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <dt className="font-bold text-gray-900">Tổng cộng</dt>
                  <dd className="text-lg font-bold text-brand-700">
                    {formatVnd(order.total_amount)}
                  </dd>
                </div>
              </dl>
            </section>

            {order.remaining_limit_snapshot !== null &&
            order.remaining_limit_snapshot !== undefined ? (
              <section
                aria-label="Hạn mức thẻ học sinh sau giao dịch"
                className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-semibold text-brand-900">
                    Thẻ học sinh{order.card_code ? ` (${order.card_code})` : ""}
                  </p>
                  <p className="text-xs text-brand-800">
                    Hạn mức còn lại sau đơn hàng
                  </p>
                </div>
                <p className="text-base font-bold text-brand-700">
                  {formatVnd(order.remaining_limit_snapshot)}
                </p>
              </section>
            ) : null}

            {canLaunchVnpayPayment(order) ? (
              <section
                aria-label="Thanh toán VNPay Sandbox"
                className="bg-white border border-brand-200 rounded-xl p-4 space-y-3"
              >
                <div>
                  <h2 className="text-sm font-bold text-gray-900">
                    Thanh toán qua VNPay Sandbox
                  </h2>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Tạo liên kết thanh toán có chữ ký HMAC-SHA512 để hoàn tất
                    đơn hàng trực tuyến.
                  </p>
                </div>
                {vnpayError ? (
                  <p
                    role="alert"
                    className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5"
                  >
                    {vnpayError}
                  </p>
                ) : null}
                {vnpayUrl && isSafeHttpUrl(vnpayUrl) ? (
                  <div className="rounded-lg bg-brand-50 border border-brand-100 p-3 space-y-2 text-xs">
                    <p className="font-semibold text-brand-900">
                      Đã tạo liên kết VNPay Sandbox hợp lệ:
                    </p>
                    <button
                      type="button"
                      onClick={() => void launchExternalUrl(vnpayUrl)}
                      className="inline-block font-semibold text-brand-700 underline break-all text-left"
                    >
                      Mở cổng thanh toán VNPay Sandbox →
                    </button>
                  </div>
                ) : null}
                <button
                  type="button"
                  disabled={vnpayMutation.isPending}
                  onClick={() => vnpayMutation.mutate()}
                  className="w-full py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
                >
                  {vnpayMutation.isPending
                    ? "Đang tạo liên kết VNPay..."
                    : "Thanh toán VNPay Sandbox ngay"}
                </button>
              </section>
            ) : null}

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
