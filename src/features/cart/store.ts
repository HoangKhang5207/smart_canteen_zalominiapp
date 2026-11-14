import { atom } from "jotai";
import type { CartItem } from "./types";
import { getCartTotals } from "./cart-logic";

export const cartItemsAtom = atom<CartItem[]>([]);
export const cartNoteAtom = atom<string>("");

export const cartTotalsAtom = atom((get) => {
  const items = get(cartItemsAtom);
  return getCartTotals(items);
});
