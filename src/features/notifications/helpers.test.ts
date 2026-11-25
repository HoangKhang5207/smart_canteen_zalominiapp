import { describe, expect, it } from "vitest";
import {
  formatUnreadBadge,
  getNotificationTone,
  isSafeInternalRoute,
} from "./helpers";

describe("notification helpers", () => {
  it("allows only safe single-slash internal routes and rejects open redirects", () => {
    expect(isSafeInternalRoute("/orders/12")).toBe(true);
    expect(isSafeInternalRoute("/canteen")).toBe(true);
    expect(isSafeInternalRoute("//evil.example/phish")).toBe(false);
    expect(isSafeInternalRoute("/\\evil.example/phish")).toBe(false);
    expect(isSafeInternalRoute("/orders/1\nSet-Cookie:a=1")).toBe(false);
    expect(isSafeInternalRoute("/orders/1\t2")).toBe(false);
    expect(isSafeInternalRoute("https://evil.example")).toBe(false);
    expect(isSafeInternalRoute("javascript:alert(1)")).toBe(false);
    expect(isSafeInternalRoute("")).toBe(false);
    expect(isSafeInternalRoute(null)).toBe(false);
  });

  it("maps notification severities to WCAG-safe tones", () => {
    expect(getNotificationTone("SUCCESS").badgeClass).toContain("text-brand-900");
    expect(getNotificationTone("WARNING").badgeClass).toContain("text-amber-900");
    expect(getNotificationTone("ERROR").badgeClass).toContain("text-red-800");
    expect(getNotificationTone("INFO").badgeClass).toContain("text-blue-800");
  });

  it("formats unread badge numbers with 99+ cap", () => {
    expect(formatUnreadBadge(0)).toBeNull();
    expect(formatUnreadBadge(-3)).toBeNull();
    expect(formatUnreadBadge(5)).toBe("5");
    expect(formatUnreadBadge(120)).toBe("99+");
  });
});
