import { ensureAuthenticated } from "@/features/auth/api";
import { apiGet, apiPost } from "@/lib/api-client";
import type {
  BankLinkFormValues,
  BankLinkInitiationData,
  StudentCard,
  SupportedBank,
} from "./types";

interface ListResponse<T> {
  data: T[];
}

interface ItemResponse<T> {
  data: T;
}

export async function fetchSupportedBanks(): Promise<SupportedBank[]> {
  const response = await apiGet<ListResponse<SupportedBank>>("/canteen/banks");
  return response.data;
}

export async function fetchMyStudentCards(): Promise<StudentCard[]> {
  await ensureAuthenticated();
  const response = await apiGet<ListResponse<StudentCard>>("/canteen/cards");
  return response.data;
}

export async function initiateBankLink(
  cardId: number,
  values: BankLinkFormValues,
): Promise<BankLinkInitiationData> {
  await ensureAuthenticated();
  const response = await apiPost<ItemResponse<BankLinkInitiationData>>(
    `/canteen/cards/${cardId}/bank-links`,
    {
      bank_code: values.bank_code.trim().toUpperCase(),
      account_number: values.account_number.trim(),
      account_holder_name: values.account_holder_name.trim(),
      national_id: values.national_id.trim(),
      phone_number: values.phone_number.trim(),
      email: values.email.trim() === "" ? null : values.email.trim(),
      agreed_terms: values.agreed_terms,
    },
  );
  return response.data;
}

export async function verifyBankLinkOtp(
  bankLinkId: number,
  otpCode: string,
): Promise<StudentCard> {
  await ensureAuthenticated();
  const response = await apiPost<ItemResponse<StudentCard>>(
    `/canteen/bank-links/${bankLinkId}/verify-otp`,
    {
      otp_code: otpCode.trim(),
    },
  );
  return response.data;
}

export async function resendBankLinkOtp(
  bankLinkId: number,
): Promise<BankLinkInitiationData> {
  await ensureAuthenticated();
  const response = await apiPost<ItemResponse<BankLinkInitiationData>>(
    `/canteen/bank-links/${bankLinkId}/resend-otp`,
  );
  return response.data;
}
