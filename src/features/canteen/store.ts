import { atom } from "jotai";
import type { BankLinkFormValues, BankLinkInitiationData } from "./types";

export const EMPTY_BANK_LINK_FORM: BankLinkFormValues = {
  bank_code: "MB",
  account_number: "",
  account_holder_name: "",
  national_id: "",
  phone_number: "",
  email: "",
  agreed_terms: false,
};

export interface PendingBankLinkDraft {
  cardId: number;
  values: BankLinkFormValues;
}

export interface PendingUnlinkOtpSession {
  initiation: BankLinkInitiationData;
  cardCode: string;
  studentName: string;
}

export const selectedCardIdAtom = atom<number | null>(null);

export const bankLinkDraftAtom = atom<PendingBankLinkDraft | null>(null);

export const pendingOtpSessionAtom = atom<BankLinkInitiationData | null>(null);

export const pendingUnlinkOtpSessionAtom = atom<PendingUnlinkOtpSession | null>(
  null,
);

export const bankLinkSuccessBannerAtom = atom<string | null>(null);
