import { describe, expect, it } from "vitest";
import type { Product } from "@/features/menu/types";
import {
  MAX_ITEM_QUANTITY,
  addCartItem,
  computeCartFingerprint,
  getCartTotals,
  removeCartItem,
  updateCartQuantity,
} from "./cart-logic";

const availableProduct: Product = {
  id: 1,
  category_id: 1,
  name: "Cơm sườn nướng mật ong",
  description: "Sườn nướng",
  price: 45000,
  image_url: null,
  is_available: true,
};

const drinkProduct: Product = {
  id: 2,
  category_id: 3,
  name: "Trà đào cam sả",
  description: null,
  price: 25000,
  image_url: null,
  is_available: true,
};

const unavailableProduct: Product = {
  id: 3,
  category_id: 1,
  name: "Cơm cá kho tộ",
  description: null,
  price: 40000,
  image_url: null,
  is_available: false,
};

describe("cart-logic (AC-03)", () => {
  it("adds available product and merges quantity up to MAX_ITEM_QUANTITY (20)", () => {
    const step1 = addCartItem([], availableProduct, 2);
    expect(step1).toEqual([{ product: availableProduct, quantity: 2 }]);

    const step2 = addCartItem(step1, availableProduct, 3);
    expect(step2).toEqual([{ product: availableProduct, quantity: 5 }]);

    const capped = addCartItem(step2, availableProduct, 50);
    expect(capped[0].quantity).toBe(MAX_ITEM_QUANTITY);
  });

  it("ignores unavailable product or non-positive quantity when adding", () => {
    expect(addCartItem([], unavailableProduct, 1)).toEqual([]);
    expect(addCartItem([], availableProduct, 0)).toEqual([]);
  });

  it("updates quantity and removes item when quantity <= 0", () => {
    const initial = addCartItem(
      addCartItem([], availableProduct, 2),
      drinkProduct,
      1,
    );

    const updated = updateCartQuantity(initial, availableProduct.id, 4);
    expect(updated[0].quantity).toBe(4);

    const capped = updateCartQuantity(updated, availableProduct.id, 99);
    expect(capped[0].quantity).toBe(MAX_ITEM_QUANTITY);

    const removedByZero = updateCartQuantity(capped, availableProduct.id, 0);
    expect(removedByZero).toEqual([{ product: drinkProduct, quantity: 1 }]);
  });

  it("removes item explicitly and calculates cart totals", () => {
    const cart = addCartItem(
      addCartItem([], availableProduct, 2),
      drinkProduct,
      3,
    );

    const totals = getCartTotals(cart);
    expect(totals).toEqual({
      totalQuantity: 5,
      estimatedAmount: 2 * 45000 + 3 * 25000,
    });

    const afterRemove = removeCartItem(cart, availableProduct.id);
    expect(afterRemove).toEqual([{ product: drinkProduct, quantity: 3 }]);
  });

  it("computes stable fingerprint for idempotency tracking across edits", () => {
    const cart1 = addCartItem([], availableProduct, 2);
    const cart2 = addCartItem([], availableProduct, 3);

    expect(computeCartFingerprint(cart1, "Ít cơm")).toBe(
      computeCartFingerprint(cart1, "  Ít cơm "),
    );
    expect(computeCartFingerprint(cart1, "Ít cơm")).not.toBe(
      computeCartFingerprint(cart2, "Ít cơm"),
    );
  });
});
