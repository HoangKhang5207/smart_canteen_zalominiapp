import type { Product } from "@/features/menu/types";

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartTotals {
  totalQuantity: number;
  estimatedAmount: number;
}
