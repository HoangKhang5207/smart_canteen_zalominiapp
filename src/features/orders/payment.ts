import { ApiError } from "@/lib/api-client";
import type { Order, PaymentStatus } from "./types";

export function getPaymentBadgeClass(status?: PaymentStatus): string {
  switch (status) {
    case "PAID":
      return "bg-brand-100 text-brand-900 border-brand-200";
    case "REFUNDED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "FAILED":
      return "bg-red-100 text-red-800 border-red-200";
    case "PENDING_RECONCILE":
      return "bg-amber-100 text-amber-900 border-amber-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export function canLaunchVnpayPayment(
  order: Pick<Order, "status" | "payment_method" | "payment_status">,
): boolean {
  if (
    order.status === "CANCELLED" ||
    order.status === "COMPLETED" ||
    order.payment_method !== "VNPAY"
  ) {
    return false;
  }
  return order.payment_status === "UNPAID" || order.payment_status === "FAILED";
}

export function isSafeHttpUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === "") {
    return false;
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export function formatPaymentError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    const base = err.message || fallback;
    switch (err.errorCode) {
      case "INSUFFICIENT_BANK_BALANCE":
        return `${base} Gợi ý: Bạn có thể chuyển sang thanh toán VNPay Sandbox hoặc Thanh toán tại quầy, hoặc nhờ phụ huynh nạp thêm số dư ngân hàng.`;
      case "BANK_DECLINED":
        return `${base} Gợi ý: Kiểm tra lại tài khoản ngân hàng liên kết hoặc chọn phương thức thanh toán khác.`;
      case "GATEWAY_TIMEOUT":
        return `${base} Lưu ý: Không bấm đặt lại ngay lập tức — hãy kiểm tra mục Đơn hàng để tránh trừ tiền hai lần.`;
      case "SPENDING_LIMIT_EXCEEDED":
        return `${base} Gợi ý: Phụ huynh có thể điều chỉnh hạn mức chi tiêu trong mục Căn tin Số.`;
      case "INSUFFICIENT_STOCK":
        return `${base} Gợi ý: Vui lòng giảm số lượng hoặc chọn món khác đang còn hàng.`;
      case "PARENT_ROLE_REQUIRED":
        return `${base} Gợi ý: Chức năng này yêu cầu đăng nhập bằng tài khoản Phụ huynh.`;
      default:
        return base;
    }
  }

  return err instanceof Error && err.message ? err.message : fallback;
}
