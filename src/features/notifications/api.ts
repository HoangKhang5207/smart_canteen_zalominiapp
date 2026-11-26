import { apiGet, apiPatch, apiPost } from "@/lib/api-client";
import type {
  CanteenNotification,
  NotificationsPaginatedResponse,
} from "./types";

export async function fetchNotifications(params?: {
  page?: number;
  perPage?: number;
  unreadOnly?: boolean;
}): Promise<NotificationsPaginatedResponse> {
  const query = new URLSearchParams();
  if (params?.page) {
    query.set("page", String(params.page));
  }
  if (params?.perPage) {
    query.set("per_page", String(params.perPage));
  }
  if (params?.unreadOnly) {
    query.set("unread_only", "1");
  }
  const qs = query.toString();
  return apiGet<NotificationsPaginatedResponse>(
    `/notifications${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const res = await apiGet<{ data: { unread_count: number } }>(
    "/notifications/unread-count",
  );
  return res.data.unread_count;
}

export async function markNotificationAsRead(
  notificationId: number,
): Promise<CanteenNotification> {
  const res = await apiPatch<{ data: CanteenNotification }>(
    `/notifications/${notificationId}/read`,
  );
  return res.data;
}

export async function markAllNotificationsAsRead(): Promise<number> {
  const res = await apiPost<{
    data: { marked_count: number; unread_count: number };
  }>("/notifications/read-all");
  return res.data.marked_count;
}
