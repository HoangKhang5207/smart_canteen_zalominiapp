import { describe, expect, it } from "vitest";
import { resolveProductImageUrl } from "./product-image";

describe("resolveProductImageUrl", () => {
  it("returns null for null, undefined, or blank strings", () => {
    expect(resolveProductImageUrl(null)).toBeNull();
    expect(resolveProductImageUrl(undefined)).toBeNull();
    expect(resolveProductImageUrl("   ")).toBeNull();
  });

  it("preserves local /images/products/<slug>.jpg paths", () => {
    expect(
      resolveProductImageUrl(" /images/products/com-suon-nuong-mat-ong.jpg "),
    ).toBe("/images/products/com-suon-nuong-mat-ong.jpg");
  });

  it("normalizes relative paths without leading slash", () => {
    expect(
      resolveProductImageUrl("images/products/pho-bo-tai-nam-truyen-thong.jpg"),
    ).toBe("/images/products/pho-bo-tai-nam-truyen-thong.jpg");
  });

  it("preserves external http and https URLs", () => {
    expect(resolveProductImageUrl("https://cdn.example.com/food/pho.jpg")).toBe(
      "https://cdn.example.com/food/pho.jpg",
    );
  });
});
