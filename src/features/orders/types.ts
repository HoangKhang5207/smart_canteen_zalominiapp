export type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

export type PaymentMethod =
  | "COUNTER_CASH"
  | "STUDENT_CARD"
  | "STUDENT_CARD_POS";

export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED";

export interface OrderItem {
  id: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Order {
  id: number;
  user_id: number;
  student_card_id?: number | null;
  card_code?: string | null;
  student_name?: string | null;
  student_class?: string | null;
  code: string;
  status: OrderStatus;
  payment_method?: PaymentMethod;
  payment_method_label?: string;
  payment_status?: PaymentStatus;
  payment_status_label?: string;
  store_name?: string;
  subtotal_amount?: number;
  discount_amount?: number;
  total_amount: number;
  remaining_limit_snapshot?: number | null;
  note: string | null;
  version: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}
