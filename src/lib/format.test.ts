import { describe, expect, it } from "vitest";
import { formatVnd } from "./format";

describe("formatVnd", () => {
  it("formats integer VND amounts with dot separators and currency symbol", () => {
    expect(formatVnd(35000).replace(/\u00a0/g, " ")).toBe("35.000 ₫");
    expect(formatVnd(0).replace(/\u00a0/g, " ")).toBe("0 ₫");
  });
});
