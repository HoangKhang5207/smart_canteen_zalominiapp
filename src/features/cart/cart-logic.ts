import type { Product } from "@/features/menu/types";
import type { CartItem, CartTotals } from "./types";

export const MAX_ITEM_QUANTITY = 20;

export function getMaxAddableQuantity(product: Pick<Product, "is_available" | "stock_quantity">): number {
  if (!product.is_available) {
    return 0;
  }
  if (product.stock_quantity === null || product.stock_quantity === undefined) {
    return MAX_ITEM_QUANTITY;
  }
  return Math.max(0, Math.min(MAX_ITEM_QUANTITY, Math.floor(product.stock_quantity)));
}

export function isProductInStock(product: Pick<Product, "is_available" | "stock_quantity" | "is_in_stock">): boolean {
  if (product.is_in_stock !== undefined) {
    return product.is_in_stock;
  }
  return getMaxAddableQuantity(product) > 0;
}

export function addCartItem(
  items: CartItem[],
  product: Product,
  quantityToAdd = 1,
): CartItem[] {
  const normalizedAdd = Math.floor(quantityToAdd);
  const maxAllowed = getMaxAddableQuantity(product);
  if (maxAllowed <= 0 || normalizedAdd <= 0) {
    return items;
  }

  const existingIndex = items.findIndex(
    (entry) => entry.product.id === product.id,
  );

  if (existingIndex === -1) {
    return [
      ...items,
      {
        product,
        quantity: Math.min(maxAllowed, normalizedAdd),
      },
    ];
  }

  return items.map((entry, idx) =>
    idx === existingIndex
      ? {
          product,
          quantity: Math.min(maxAllowed, entry.quantity + normalizedAdd),
        }
      : entry,
  );
}

export function updateCartQuantity(
  items: CartItem[],
  productId: number,
  nextQuantity: number,
): CartItem[] {
  const normalized = Math.floor(nextQuantity);
  if (normalized <= 0) {
    return removeCartItem(items, productId);
  }

  return items.reduce<CartItem[]>((acc, entry) => {
    if (entry.product.id !== productId) {
      acc.push(entry);
      return acc;
    }
    const maxAllowed = getMaxAddableQuantity(entry.product);
    if (maxAllowed > 0) {
      acc.push({
        ...entry,
        quantity: Math.min(maxAllowed, normalized),
      });
    }
    return acc;
  }, []);
}

export function removeCartItem(
  items: CartItem[],
  productId: number,
): CartItem[] {
  return items.filter((entry) => entry.product.id !== productId);
}

export function getCartTotals(items: CartItem[]): CartTotals {
  let totalQuantity = 0;
  let estimatedAmount = 0;

  for (const entry of items) {
    totalQuantity += entry.quantity;
    estimatedAmount += entry.product.price * entry.quantity;
  }

  return { totalQuantity, estimatedAmount };
}

export function computeCartFingerprint(
  items: CartItem[],
  note?: string,
): string {
  const parts = [...items]
    .sort((a, b) => a.product.id - b.product.id)
    .map((entry) => `${entry.product.id}:${entry.quantity}`)
    .join(",");

  return `${parts}|${(note ?? "").trim()}`;
}

export function createIdempotencyKey(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
