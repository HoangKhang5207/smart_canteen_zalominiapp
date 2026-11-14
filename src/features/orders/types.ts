export type OrderStatus =
  | "PENDING"
  | "PREPARING"
  | "READY"
  | "COMPLETED"
  | "CANCELLED";

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
  code: string;
  status: OrderStatus;
  total_amount: number;
  note: string | null;
  version: number;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}
