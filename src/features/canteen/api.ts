import {
  type PaginatedResult,
  type PaginationMeta,
  normalizePaginatedResult,
} from "@/components/pagination-bar";
import { ensureAuthenticated } from "@/features/auth/api";
import type { Order } from "@/features/orders/types";
import { apiGet, apiPost, apiPut } from "@/lib/api-client";
import type {
  BankLinkFormValues,
  BankLinkInitiationData,
  SpendingLimitLog,
  StudentCard,
  SupportedBank,
} from "./types";

interface ListResponse<T> {
  data: T[];
  meta?: Partial<PaginationMeta>;
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

export async function initiateBankUnlink(
  bankLinkId: number,
): Promise<BankLinkInitiationData> {
  await ensureAuthenticated();
  const response = await apiPost<ItemResponse<BankLinkInitiationData>>(
    `/canteen/bank-links/${bankLinkId}/unlink/initiate`,
  );
  return response.data;
}

export async function verifyBankUnlinkOtp(
  bankLinkId: number,
  otpCode: string,
): Promise<StudentCard> {
  await ensureAuthenticated();
  const response = await apiPost<ItemResponse<StudentCard>>(
    `/canteen/bank-links/${bankLinkId}/unlink/verify-otp`,
    {
      otp_code: otpCode.trim(),
    },
  );
  return response.data;
}

export async function resendBankUnlinkOtp(
  bankLinkId: number,
): Promise<BankLinkInitiationData> {
  await ensureAuthenticated();
  const response = await apiPost<ItemResponse<BankLinkInitiationData>>(
    `/canteen/bank-links/${bankLinkId}/unlink/resend-otp`,
  );
  return response.data;
}

export async function updateCardSpendingLimit(
  cardId: number,
  dailyLimit: number,
  reason?: string,
): Promise<StudentCard> {
  await ensureAuthenticated();
  const response = await apiPut<ItemResponse<StudentCard>>(
    `/canteen/cards/${cardId}/spending-limit`,
    {
      daily_limit: dailyLimit,
      reason: reason && reason.trim() !== "" ? reason.trim() : undefined,
    },
  );
  return response.data;
}

export async function fetchCardLimitLogs(
  cardId: number,
  query?: { page?: number; perPage?: number },
): Promise<PaginatedResult<SpendingLimitLog>> {
  await ensureAuthenticated();
  const response = await apiGet<ListResponse<SpendingLimitLog>>(
    `/canteen/cards/${cardId}/limit-logs`,
    {
      page: query?.page,
      per_page: query?.perPage,
    },
  );
  return normalizePaginatedResult(
    response,
    query?.page ?? 1,
    query?.perPage ?? 10,
  );
}

export async function fetchCardOrders(
  cardId: number,
  query?: { page?: number; perPage?: number },
): Promise<PaginatedResult<Order>> {
  await ensureAuthenticated();
  const response = await apiGet<ListResponse<Order>>(
    `/canteen/cards/${cardId}/orders`,
    {
      page: query?.page,
      per_page: query?.perPage,
    },
  );
  return normalizePaginatedResult(
    response,
    query?.page ?? 1,
    query?.perPage ?? 4,
  );
}

export async function createPosPurchase(
  cardId: number,
  input: {
    items: { product_id: number; quantity: number }[];
    store_name?: string;
  },
  idempotencyKey: string,
): Promise<Order> {
  await ensureAuthenticated();
  const response = await apiPost<ItemResponse<Order>>(
    `/canteen/cards/${cardId}/pos-purchases`,
    input,
    {
      headers: {
        "Idempotency-Key": idempotencyKey,
      },
    },
  );
  return response.data;
}
