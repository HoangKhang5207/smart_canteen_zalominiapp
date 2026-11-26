export type NotificationSeverity = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

export type NotificationType =
  | "PURCHASE_SUCCESS"
  | "LOW_SPENDING_LIMIT"
  | "PAYMENT_FAILED"
  | "ORDER_REFUNDED"
  | "ORDER_STATUS_UPDATED"
  | "BANK_LINK_CHANGED"
  | "SPENDING_LIMIT_UPDATED";

export interface CanteenNotification {
  id: number;
  type: NotificationType;
  severity: NotificationSeverity;
  title: string;
  body: string;
  action_url: string | null;
  meta: Record<string, unknown>;
  push_channel: string;
  push_status: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsPaginatedResponse {
  data: CanteenNotification[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
    unread_count: number;
  };
}
