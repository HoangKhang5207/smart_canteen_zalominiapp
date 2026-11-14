import type { Product } from "@/features/menu/types";
import type { CartItem, CartTotals } from "./types";

export const MAX_ITEM_QUANTITY = 20;

export function addCartItem(
  items: CartItem[],
  product: Product,
  quantityToAdd = 1,
): CartItem[] {
  const normalizedAdd = Math.floor(quantityToAdd);
  if (!product.is_available || normalizedAdd <= 0) {
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
        quantity: Math.min(MAX_ITEM_QUANTITY, normalizedAdd),
      },
    ];
  }

  return items.map((entry, idx) =>
    idx === existingIndex
      ? {
          product,
          quantity: Math.min(MAX_ITEM_QUANTITY, entry.quantity + normalizedAdd),
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

  return items.map((entry) =>
    entry.product.id === productId
      ? {
          ...entry,
          quantity: Math.min(MAX_ITEM_QUANTITY, normalized),
        }
      : entry,
  );
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
