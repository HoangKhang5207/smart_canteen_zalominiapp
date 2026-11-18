import { describe, expect, it } from "vitest";
import {
  buildPageItems,
  normalizePaginatedResult,
} from "./pagination-bar";

describe("pagination-bar utilities", () => {
  it("normalizes Laravel paginated payload with meta", () => {
    const result = normalizePaginatedResult(
      {
        data: [{ id: 1 }, { id: 2 }],
        meta: {
          current_page: 2,
          last_page: 4,
          per_page: 8,
          total: 30,
          from: 9,
          to: 10,
        },
      },
      1,
      8,
    );

    expect(result.data).toHaveLength(2);
    expect(result.meta).toEqual({
      current_page: 2,
      last_page: 4,
      per_page: 8,
      total: 30,
      from: 9,
      to: 10,
    });
  });

  it("computes fallback meta when API payload only has data array", () => {
    const result = normalizePaginatedResult(
      {
        data: [{ id: 1 }, { id: 2 }, { id: 3 }],
      },
      1,
      8,
    );

    expect(result.meta.total).toBe(3);
    expect(result.meta.last_page).toBe(1);
    expect(result.meta.from).toBe(1);
    expect(result.meta.to).toBe(3);
  });

  it("builds windowed page items with ellipsis for multi-page results", () => {
    expect(buildPageItems(1, 4)).toEqual([1, 2, "...", 4]);
    expect(buildPageItems(2, 4)).toEqual([1, 2, 3, 4]);
    expect(buildPageItems(5, 10)).toEqual([1, "...", 4, 5, 6, "...", 10]);
  });
});
