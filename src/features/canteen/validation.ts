import type {
  BankLinkFormErrors,
  BankLinkFormValues,
  SupportedBank,
} from "./types";

const DIGITS_ONLY_RE = /^\d+$/;
const VN_PHONE_RE = /^0[35789]\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateBankLinkForm(
  values: BankLinkFormValues,
  selectedBank: SupportedBank | undefined,
): BankLinkFormErrors {
  const errors: BankLinkFormErrors = {};

  if (!values.bank_code.trim() || !selectedBank) {
    errors.bank_code = "Vui lòng chọn ngân hàng liên kết.";
  }

  const account = values.account_number.trim();
  const minLen = selectedBank?.account_min_length ?? 6;
  const maxLen = selectedBank?.account_max_length ?? 20;

  if (!account) {
    errors.account_number = "Vui lòng nhập số tài khoản ngân hàng.";
  } else if (!DIGITS_ONLY_RE.test(account)) {
    errors.account_number = "Số tài khoản chỉ được chứa chữ số.";
  } else if (account.length < minLen || account.length > maxLen) {
    errors.account_number = `Số tài khoản phải từ ${minLen} đến ${maxLen} chữ số.`;
  }

  const holder = values.account_holder_name.trim();
  if (!holder) {
    errors.account_holder_name = "Vui lòng nhập tên chủ tài khoản.";
  } else if (holder.length < 2) {
    errors.account_holder_name = "Tên chủ tài khoản phải có ít nhất 2 ký tự.";
  }

  const nationalId = values.national_id.trim();
  if (!nationalId) {
    errors.national_id = "Vui lòng nhập số căn cước công dân (CCCD).";
  } else if (!DIGITS_ONLY_RE.test(nationalId) || nationalId.length !== 12) {
    errors.national_id = "Số CCCD phải gồm đúng 12 chữ số.";
  }

  const phone = values.phone_number.trim();
  if (!phone) {
    errors.phone_number = "Vui lòng nhập số điện thoại nhận mã OTP.";
  } else if (!VN_PHONE_RE.test(phone)) {
    errors.phone_number =
      "Số điện thoại không đúng định dạng di động Việt Nam (10 chữ số).";
  }

  const email = values.email.trim();
  if (email !== "" && !EMAIL_RE.test(email)) {
    errors.email = "Địa chỉ email không đúng định dạng.";
  }

  if (!values.agreed_terms) {
    errors.agreed_terms =
      "Bạn cần đồng ý điều khoản đăng ký trích nợ tự động để tiếp tục.";
  }

  return errors;
}

export function normalizeOtpDigits(raw: string): string {
  return raw.replace(/\D+/g, "").slice(0, 6);
}

export function formatCountdown(totalSeconds: number): string {
  const clamped = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
