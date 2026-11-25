import { describe, expect, it } from "vitest";
import type { SupportedBank } from "./types";
import {
  applyOtpSlotChange,
  formatCountdown,
  normalizeOtpDigits,
  validateBankLinkForm,
} from "./validation";

const MB_BANK: SupportedBank = {
  code: "MB",
  name: "Ngân hàng TMCP Quân đội (MB Bank)",
  short_name: "MB Bank",
  account_min_length: 6,
  account_max_length: 19,
};

describe("validateBankLinkForm", () => {
  it("accepts a valid bank link payload with optional email omitted", () => {
    const errors = validateBankLinkForm(
      {
        bank_code: "MB",
        account_number: "01234567895678",
        account_holder_name: "Nguyen Van A",
        national_id: "079204009012",
        phone_number: "0901236789",
        email: "",
        agreed_terms: true,
      },
      MB_BANK,
    );

    expect(errors).toEqual({});
  });

  it("rejects invalid account number, CCCD, phone, email, and unchecked terms", () => {
    const errors = validateBankLinkForm(
      {
        bank_code: "MB",
        account_number: "123",
        account_holder_name: "A",
        national_id: "07920400",
        phone_number: "0123456789",
        email: "invalid-email",
        agreed_terms: false,
      },
      MB_BANK,
    );

    expect(errors.account_number).toBeDefined();
    expect(errors.account_holder_name).toBeDefined();
    expect(errors.national_id).toBeDefined();
    expect(errors.phone_number).toBeDefined();
    expect(errors.email).toBeDefined();
    expect(errors.agreed_terms).toBeDefined();
  });

  it("requires a supported bank selection", () => {
    const errors = validateBankLinkForm(
      {
        bank_code: "",
        account_number: "0123456789",
        account_holder_name: "Nguyen Van A",
        national_id: "079204009012",
        phone_number: "0901236789",
        email: "parent@example.com",
        agreed_terms: true,
      },
      undefined,
    );

    expect(errors.bank_code).toBeDefined();
  });
});

describe("OTP helpers", () => {
  it("strips non-digits and clamps OTP code to 6 digits", () => {
    expect(normalizeOtpDigits(" 12a3-45678 ")).toBe("123456");
    expect(normalizeOtpDigits("48")).toBe("48");
  });

  it("formats countdown seconds as mm:ss", () => {
    expect(formatCountdown(180)).toBe("03:00");
    expect(formatCountdown(65)).toBe("01:05");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-5)).toBe("00:00");
  });

  it("edits a middle OTP digit without wiping the rest of the 6-digit code", () => {
    expect(applyOtpSlotChange("123456", 2, "39")).toBe("129456");
    expect(applyOtpSlotChange("123456", 2, "93")).toBe("129456");
    expect(applyOtpSlotChange("123456", 2, "9")).toBe("129456");
    expect(applyOtpSlotChange("123456", 0, "654321")).toBe("654321");
    expect(applyOtpSlotChange("123456", 2, "")).toBe("12456");
  });
});
