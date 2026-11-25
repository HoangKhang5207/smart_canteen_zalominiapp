import { describe, expect, it } from "vitest";
import {
  QUICK_LIMIT_PRESETS,
  canPayWithStudentCard,
  canUnlinkBankAccount,
  getRemainingBarTone,
  parseLimitInput,
  validateDailyLimit,
} from "./spending-limit";

describe("spending-limit helpers", () => {
  it("exposes exact quick presets 20k, 30k, 50k, 100k", () => {
    expect(QUICK_LIMIT_PRESETS.map((p) => p.amount)).toEqual([
      20_000, 30_000, 50_000, 100_000,
    ]);
  });

  it("parses formatted numeric input cleanly", () => {
    expect(parseLimitInput("100.000")).toBe(100_000);
    expect(parseLimitInput("0")).toBe(0);
    expect(parseLimitInput("")).toBeNull();
  });

  it("validates daily limit bounds and 1,000 VND step", () => {
    expect(validateDailyLimit(0)).toBeNull();
    expect(validateDailyLimit(50_000)).toBeNull();
    expect(validateDailyLimit(5_000_000)).toBeNull();
    expect(validateDailyLimit(-1_000)).not.toBeNull();
    expect(validateDailyLimit(25_500)).not.toBeNull();
    expect(validateDailyLimit(5_001_000)).not.toBeNull();
  });

  it("checks whether cart amount fits remaining card limit", () => {
    expect(canPayWithStudentCard(45_000, 50_000)).toBe(true);
    expect(canPayWithStudentCard(50_000, 50_000)).toBe(true);
    expect(canPayWithStudentCard(55_000, 50_000)).toBe(false);
    expect(canPayWithStudentCard(10_000, 0)).toBe(false);
  });

  it("maps remaining percentage to high-contrast progress bar tones", () => {
    expect(getRemainingBarTone(0)).toBe("red");
    expect(getRemainingBarTone(15)).toBe("amber");
    expect(getRemainingBarTone(20)).toBe("amber");
    expect(getRemainingBarTone(50)).toBe("brand");
  });

  it("allows unlinking linked bank accounts on ACTIVE and LOCKED cards, but not REVOKED or unlinked", () => {
    expect(canUnlinkBankAccount("ACTIVE", true)).toBe(true);
    expect(canUnlinkBankAccount("LOCKED", true)).toBe(true);
    expect(canUnlinkBankAccount("REVOKED", true)).toBe(false);
    expect(canUnlinkBankAccount("ACTIVE", false)).toBe(false);
  });
});
