import { describe, expect, it } from "vitest";
import { resolveNextFocusIndex } from "./use-focus-trap";

describe("resolveNextFocusIndex", () => {
  it("wraps forward Tab from last element or outside back to index 0", () => {
    expect(resolveNextFocusIndex(2, 3, false)).toBe(0);
    expect(resolveNextFocusIndex(-1, 3, false)).toBe(0);
    expect(resolveNextFocusIndex(0, 3, false)).toBeNull();
    expect(resolveNextFocusIndex(1, 3, false)).toBeNull();
  });

  it("wraps Shift+Tab from first element or outside to the last element", () => {
    expect(resolveNextFocusIndex(0, 3, true)).toBe(2);
    expect(resolveNextFocusIndex(-1, 3, true)).toBe(2);
    expect(resolveNextFocusIndex(2, 3, true)).toBeNull();
  });

  it("returns null when there are no focusable items", () => {
    expect(resolveNextFocusIndex(0, 0, false)).toBeNull();
    expect(resolveNextFocusIndex(0, 0, true)).toBeNull();
  });
});
