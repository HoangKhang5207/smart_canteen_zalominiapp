export type StudentCardStatus = "ACTIVE" | "LOCKED" | "REVOKED";

export type BankLinkStatus =
  | "PENDING_OTP"
  | "ACTIVE"
  | "UNLINKED"
  | "FAILED"
  | "EXPIRED";

export interface SupportedBank {
  code: string;
  name: string;
  short_name: string;
  account_min_length: number;
  account_max_length: number;
}

export interface StudentProfile {
  id: number;
  student_code: string;
  full_name: string;
  school_name: string;
  class_name: string;
  avatar_url: string | null;
}

export interface BankLinkSummary {
  id: number;
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  account_holder_name: string;
  national_id_masked: string;
  phone_masked: string;
  email: string | null;
  status: BankLinkStatus;
  auto_debit_agreed: boolean;
  linked_at: string | null;
}

export interface SpendingLimitSummary {
  daily_limit: number;
  spent_today: number;
  remaining_limit: number;
  effective_date: string;
}

export interface SpendingLimitLog {
  id: number;
  previous_limit: number;
  new_limit: number;
  reason: string | null;
  changed_by_name?: string | null;
  created_at: string;
}

export interface StudentCard {
  id: number;
  card_code: string;
  status: StudentCardStatus;
  issued_at: string | null;
  student: StudentProfile;
  is_bank_linked: boolean;
  bank_link: BankLinkSummary | null;
  spending_limit: SpendingLimitSummary;
}

export interface BankLinkFormValues {
  bank_code: string;
  account_number: string;
  account_holder_name: string;
  national_id: string;
  phone_number: string;
  email: string;
  agreed_terms: boolean;
}

export type BankLinkFormErrors = Partial<
  Record<keyof BankLinkFormValues, string>
>;

export interface OtpChallengeMeta {
  expires_in_seconds: number;
  resend_cooldown_seconds: number;
  max_attempts: number;
  remaining_attempts: number;
  max_resends: number;
  remaining_resends: number;
  delivery_channel?: string;
  delivery_provider?: string;
  debug_otp?: string;
}

export type OtpPurpose = "BANK_LINK" | "BANK_UNLINK";

export interface BankLinkInitiationData {
  bank_link_id: number;
  student_card_id: number;
  purpose?: OtpPurpose;
  status: BankLinkStatus;
  bank_code: string;
  bank_name: string;
  account_number_masked: string;
  phone_masked: string;
  otp: OtpChallengeMeta;
}
