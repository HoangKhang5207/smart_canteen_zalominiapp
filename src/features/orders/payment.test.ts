import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/api-client";
import {
  canLaunchVnpayPayment,
  formatPaymentError,
  getPaymentBadgeClass,
  isSafeHttpUrl,
} from "./payment";

describe("order payment helpers", () => {
  it("returns semantic WCAG-safe badge classes for all payment statuses", () => {
    expect(getPaymentBadgeClass("PAID")).toContain("text-brand-900");
    expect(getPaymentBadgeClass("REFUNDED")).toContain("text-blue-800");
    expect(getPaymentBadgeClass("FAILED")).toContain("text-red-800");
    expect(getPaymentBadgeClass("PENDING_RECONCILE")).toContain("text-amber-900");
    expect(getPaymentBadgeClass("UNPAID")).toContain("text-gray-700");
  });

  it("enables VNPay payment button only for active UNPAID/FAILED VNPay orders", () => {
    expect(
      canLaunchVnpayPayment({
        status: "PENDING",
        payment_method: "VNPAY",
        payment_status: "UNPAID",
      }),
    ).toBe(true);
    expect(
      canLaunchVnpayPayment({
        status: "PENDING",
        payment_method: "VNPAY",
        payment_status: "FAILED",
      }),
    ).toBe(true);
    expect(
      canLaunchVnpayPayment({
        status: "PENDING",
        payment_method: "VNPAY",
        payment_status: "PAID",
      }),
    ).toBe(false);
    expect(
      canLaunchVnpayPayment({
        status: "COMPLETED",
        payment_method: "VNPAY",
        payment_status: "UNPAID",
      }),
    ).toBe(false);
    expect(
      canLaunchVnpayPayment({
        status: "CANCELLED",
        payment_method: "VNPAY",
        payment_status: "UNPAID",
      }),
    ).toBe(false);
    expect(
      canLaunchVnpayPayment({
        status: "PENDING",
        payment_method: "COUNTER_CASH",
        payment_status: "UNPAID",
      }),
    ).toBe(false);
  });

  it("validates VNPay redirect URLs strictly to http(s) schemes", () => {
    expect(isSafeHttpUrl("https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=4000000")).toBe(true);
    expect(isSafeHttpUrl("http://localhost:8080/api/v1/payments/vnpay/return")).toBe(true);
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(false);
    expect(isSafeHttpUrl("not-a-url")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
  });

  it("formats actionable Vietnamese hints for banking gateway error codes", () => {
    const insufficient = new ApiError("Không đủ số dư", 422, undefined, "INSUFFICIENT_BANK_BALANCE");
    expect(formatPaymentError(insufficient, "Fallback")).toContain("VNPay Sandbox");

    const declined = new ApiError("Ngân hàng từ chối", 502, undefined, "BANK_DECLINED");
    expect(formatPaymentError(declined, "Fallback")).toContain("phương thức thanh toán khác");

    const timeout = new ApiError("Quá thời gian", 504, undefined, "GATEWAY_TIMEOUT");
    expect(formatPaymentError(timeout, "Fallback")).toContain("tránh trừ tiền hai lần");

    expect(formatPaymentError(new Error("Generic error"), "Fallback")).toBe("Generic error");
    expect(formatPaymentError(null, "Fallback")).toBe("Fallback");
  });
});
