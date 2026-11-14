import type { OrderStatus } from "./types";

export function getOrderStatusMeta(status: OrderStatus): {
  label: string;
  badgeClass: string;
  isTerminal: boolean;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Chờ xác nhận",
        badgeClass: "bg-amber-100 text-amber-800 border-amber-200",
        isTerminal: false,
      };
    case "PREPARING":
      return {
        label: "Đang chế biến",
        badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
        isTerminal: false,
      };
    case "READY":
      return {
        label: "Sẵn sàng nhận món",
        badgeClass: "bg-brand-100 text-brand-900 border-brand-200",
        isTerminal: false,
      };
    case "COMPLETED":
      return {
        label: "Đã hoàn thành",
        badgeClass: "bg-gray-100 text-gray-700 border-gray-200",
        isTerminal: true,
      };
    case "CANCELLED":
      return {
        label: "Đã hủy",
        badgeClass: "bg-red-100 text-red-800 border-red-200",
        isTerminal: true,
      };
  }
}
