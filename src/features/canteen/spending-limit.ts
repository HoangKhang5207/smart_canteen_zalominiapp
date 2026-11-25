export const DAILY_LIMIT_MIN = 0;
export const DAILY_LIMIT_MAX = 5_000_000;
export const DAILY_LIMIT_STEP = 1_000;

export const QUICK_LIMIT_PRESETS = [
  { label: "20k", amount: 20_000 },
  { label: "30k", amount: 30_000 },
  { label: "50k", amount: 50_000 },
  { label: "100k", amount: 100_000 },
] as const;

export function parseLimitInput(raw: string): number | null {
  const digits = raw.replace(/\D+/g, "");
  if (digits === "") {
    return null;
  }
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateDailyLimit(amount: number | null): string | null {
  if (amount === null || !Number.isInteger(amount)) {
    return "Vui lòng nhập hạn mức chi tiêu hợp lệ.";
  }
  if (amount < DAILY_LIMIT_MIN) {
    return "Hạn mức chi tiêu không được nhỏ hơn 0 đ.";
  }
  if (amount > DAILY_LIMIT_MAX) {
    return "Hạn mức chi tiêu tối đa là 5.000.000 đ/ngày.";
  }
  if (amount % DAILY_LIMIT_STEP !== 0) {
    return "Hạn mức chi tiêu phải là bội số của 1.000 đ.";
  }
  return null;
}

export function canPayWithStudentCard(
  requiredAmount: number,
  remainingLimit: number,
): boolean {
  return requiredAmount > 0 && remainingLimit >= requiredAmount;
}

export function getRemainingBarTone(
  remainingPct: number,
): "red" | "amber" | "brand" {
  if (remainingPct <= 0) {
    return "red";
  }
  if (remainingPct <= 20) {
    return "amber";
  }
  return "brand";
}

export function canUnlinkBankAccount(
  cardStatus: "ACTIVE" | "LOCKED" | "REVOKED",
  isBankLinked: boolean,
): boolean {
  return isBankLinked && cardStatus !== "REVOKED";
}
