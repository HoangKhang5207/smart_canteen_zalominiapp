import { describe, expect, it } from "vitest";
import {
  isPublicRoute,
  normalizeVietnamPhone,
  validateVietnamPhone,
} from "./phone";

describe("Zalo phone auth helpers", () => {
  it("normalizes Vietnamese mobile numbers from 0x, 84x, and +84x formats", () => {
    expect(normalizeVietnamPhone("0901234567")).toBe("0901234567");
    expect(normalizeVietnamPhone("84901234567")).toBe("0901234567");
    expect(normalizeVietnamPhone("+84 901-234-567")).toBe("0901234567");
    expect(normalizeVietnamPhone("012345")).toBeNull();
    expect(normalizeVietnamPhone("0281234567")).toBeNull();
    expect(normalizeVietnamPhone("")).toBeNull();
  });

  it("validates Vietnamese mobile input with user-friendly messages", () => {
    expect(validateVietnamPhone("0987654321")).toBeNull();
    expect(validateVietnamPhone("")).not.toBeNull();
    expect(validateVietnamPhone("12345")).not.toBeNull();
  });

  it("classifies public browsing routes vs protected routes accurately", () => {
    expect(isPublicRoute("/")).toBe(true);
    expect(isPublicRoute("/products/12")).toBe(true);
    expect(isPublicRoute("/cart")).toBe(true);
    expect(isPublicRoute("/canteen")).toBe(false);
    expect(isPublicRoute("/orders")).toBe(false);
    expect(isPublicRoute("/orders/5")).toBe(false);
  });
});
