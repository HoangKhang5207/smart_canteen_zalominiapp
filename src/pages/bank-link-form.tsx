import React, { useMemo, useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Header, Page, useNavigate } from "zmp-ui";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import {
  fetchMyStudentCards,
  fetchSupportedBanks,
  initiateBankLink,
} from "@/features/canteen/api";
import {
  bankLinkDraftAtom,
  EMPTY_BANK_LINK_FORM,
  pendingOtpSessionAtom,
} from "@/features/canteen/store";
import type {
  BankLinkFormErrors,
  BankLinkFormValues,
} from "@/features/canteen/types";
import { validateBankLinkForm } from "@/features/canteen/validation";
import { ApiError } from "@/lib/api-client";

export default function BankLinkFormPage() {
  const navigate = useNavigate();
  const [draft, setDraft] = useAtom(bankLinkDraftAtom);
  const setPendingOtp = useSetAtom(pendingOtpSessionAtom);

  const [values, setValues] = useState<BankLinkFormValues>(
    () => draft?.values ?? { ...EMPTY_BANK_LINK_FORM },
  );
  const [fieldErrors, setFieldErrors] = useState<BankLinkFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [bankSearch, setBankSearch] = useState("");

  const banksQuery = useQuery({
    queryKey: ["canteen-banks"],
    queryFn: fetchSupportedBanks,
    staleTime: 5 * 60_000,
  });

  const cardsQuery = useQuery({
    queryKey: ["canteen-cards"],
    queryFn: fetchMyStudentCards,
  });

  const banks = banksQuery.data ?? [];
  const cards = cardsQuery.data ?? [];
  const targetCard =
    cards.find((card) => card.id === draft?.cardId) ?? cards[0] ?? null;

  const selectedBank = useMemo(
    () => banks.find((b) => b.code === values.bank_code),
    [banks, values.bank_code],
  );

  const filteredBanks = useMemo(() => {
    const keyword = bankSearch.trim().toLowerCase();
    if (!keyword) {
      return banks;
    }
    return banks.filter(
      (bank) =>
        bank.short_name.toLowerCase().includes(keyword) ||
        bank.name.toLowerCase().includes(keyword) ||
        bank.code.toLowerCase().includes(keyword),
    );
  }, [banks, bankSearch]);

  const initiateMutation = useMutation({
    mutationFn: async (formValues: BankLinkFormValues) => {
      if (!targetCard) {
        throw new Error("Không tìm thấy thẻ học sinh hợp lệ.");
      }
      return initiateBankLink(targetCard.id, formValues);
    },
    onSuccess: (session, submittedValues) => {
      if (targetCard) {
        setDraft({ cardId: targetCard.id, values: submittedValues });
      }
      setPendingOtp(session);
      navigate("/canteen/verify-otp");
    },
    onError: (err) => {
      if (err instanceof ApiError && err.errors) {
        const mapped: BankLinkFormErrors = {};
        const keys: Array<keyof BankLinkFormValues> = [
          "bank_code",
          "account_number",
          "account_holder_name",
          "national_id",
          "phone_number",
          "email",
          "agreed_terms",
        ];
        for (const key of keys) {
          const msg = err.errors[key]?.[0];
          if (msg) {
            mapped[key] = msg;
          }
        }
        setFieldErrors(mapped);
      }
      setSubmitError(
        err instanceof Error
          ? err.message
          : "Không thể khởi tạo liên kết ngân hàng. Vui lòng thử lại.",
      );
    },
  });

  const updateField = <K extends keyof BankLinkFormValues>(
    field: K,
    value: BankLinkFormValues[K],
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setSubmitError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (initiateMutation.isPending) {
      return;
    }
    setSubmitError(null);

    const validationErrors = validateBankLinkForm(values, selectedBank);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }

    setFieldErrors({});
    initiateMutation.mutate(values);
  };

  const isLoading = banksQuery.isLoading || cardsQuery.isLoading;
  const loadError = banksQuery.error || cardsQuery.error;

  return (
    <Page className="bg-surface-muted min-h-screen pb-10">
      <Header
        title="Liên kết ngân hàng"
        onBackClick={() => navigate("/canteen")}
      />

      <main className="app-main max-w-2xl mx-auto space-y-4">
        {isLoading ? (
          <LoadingState label="Đang tải danh sách ngân hàng..." />
        ) : loadError ? (
          <ErrorState
            message="Không thể tải biểu mẫu liên kết ngân hàng."
            onRetry={() => {
              void banksQuery.refetch();
              void cardsQuery.refetch();
            }}
          />
        ) : !targetCard ? (
          <EmptyState
            message="Chưa tìm thấy thẻ học sinh để thực hiện liên kết."
            actionLabel="Quay lại Căn tin số"
            onAction={() => navigate("/canteen")}
          />
        ) : targetCard.is_bank_linked || targetCard.status !== "ACTIVE" ? (
          <EmptyState
            message={
              targetCard.is_bank_linked
                ? "Thẻ học sinh này đã được liên kết với một tài khoản ngân hàng."
                : "Thẻ học sinh hiện không ở trạng thái hoạt động nên chưa thể liên kết ngân hàng."
            }
            actionLabel="Quay lại Căn tin số"
            onAction={() => navigate("/canteen")}
          />
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 flex items-center justify-between gap-2 text-xs">
              <span className="text-brand-900 font-medium">
                Thẻ liên kết:{" "}
                <strong className="font-mono">{targetCard.card_code}</strong> ·{" "}
                {targetCard.student.full_name}
              </span>
              <span className="text-brand-700 font-semibold">
                Lớp {targetCard.student.class_name}
              </span>
            </div>

            {submitError ? (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs font-medium"
              >
                {submitError}
              </div>
            ) : null}

            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-gray-900">
                1. Thông tin ngân hàng
              </h2>

              <div className="space-y-2">
                <label
                  htmlFor="bank-search"
                  className="block text-xs font-semibold text-gray-700"
                >
                  Chọn ngân hàng <span className="text-red-600">*</span>
                </label>
                <input
                  id="bank-search"
                  type="search"
                  placeholder="Tìm nhanh ngân hàng (VD: MB, Vietcombank...)"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                />

                <div
                  role="radiogroup"
                  aria-label="Danh sách ngân hàng hỗ trợ"
                  aria-describedby={
                    fieldErrors.bank_code ? "bank-code-error" : undefined
                  }
                  className="grid grid-cols-2 gap-2"
                >
                  {filteredBanks.length === 0 ? (
                    <p className="col-span-2 text-xs text-gray-600 py-2 text-center">
                      Không tìm thấy ngân hàng phù hợp với từ khóa.
                    </p>
                  ) : (
                    filteredBanks.map((bank) => {
                      const isSelected = values.bank_code === bank.code;
                      return (
                        <button
                          key={bank.code}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => updateField("bank_code", bank.code)}
                          className={`text-left px-3 py-2.5 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                            isSelected
                              ? "border-brand-700 bg-brand-50 text-brand-900"
                              : "border-gray-200 bg-white text-gray-800 hover:border-brand-500"
                          }`}
                        >
                          <p className="text-xs font-bold">{bank.short_name}</p>
                          <p className="text-[11px] text-gray-600 font-mono">
                            {bank.code}
                          </p>
                        </button>
                      );
                    })
                  )}
                </div>
                {fieldErrors.bank_code ? (
                  <p
                    id="bank-code-error"
                    role="alert"
                    className="text-xs text-red-700"
                  >
                    {fieldErrors.bank_code}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="account-number"
                  className="block text-xs font-semibold text-gray-700"
                >
                  Số tài khoản ngân hàng <span className="text-red-600">*</span>
                </label>
                <input
                  id="account-number"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder={
                    selectedBank
                      ? `Nhập ${selectedBank.account_min_length}–${selectedBank.account_max_length} chữ số`
                      : "Nhập số tài khoản"
                  }
                  value={values.account_number}
                  aria-invalid={fieldErrors.account_number ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.account_number
                      ? "account-number-error"
                      : undefined
                  }
                  onChange={(e) =>
                    updateField(
                      "account_number",
                      e.target.value.replace(/\D+/g, ""),
                    )
                  }
                  className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
                {fieldErrors.account_number ? (
                  <p
                    id="account-number-error"
                    role="alert"
                    className="text-xs text-red-700"
                  >
                    {fieldErrors.account_number}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-gray-900">
                2. Thông tin chủ tài khoản
              </h2>

              <div className="space-y-1">
                <label
                  htmlFor="account-holder"
                  className="block text-xs font-semibold text-gray-700"
                >
                  Tên chủ tài khoản <span className="text-red-600">*</span>
                </label>
                <input
                  id="account-holder"
                  type="text"
                  placeholder="VD: NGUYEN VAN A"
                  value={values.account_holder_name}
                  aria-invalid={
                    fieldErrors.account_holder_name ? "true" : undefined
                  }
                  aria-describedby={
                    fieldErrors.account_holder_name
                      ? "account-holder-error"
                      : undefined
                  }
                  onChange={(e) =>
                    updateField("account_holder_name", e.target.value)
                  }
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
                {fieldErrors.account_holder_name ? (
                  <p
                    id="account-holder-error"
                    role="alert"
                    className="text-xs text-red-700"
                  >
                    {fieldErrors.account_holder_name}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="national-id"
                  className="block text-xs font-semibold text-gray-700"
                >
                  Số căn cước công dân (CCCD){" "}
                  <span className="text-red-600">*</span>
                </label>
                <input
                  id="national-id"
                  type="text"
                  inputMode="numeric"
                  maxLength={12}
                  placeholder="Nhập đủ 12 chữ số CCCD"
                  value={values.national_id}
                  aria-invalid={fieldErrors.national_id ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.national_id ? "national-id-error" : undefined
                  }
                  onChange={(e) =>
                    updateField(
                      "national_id",
                      e.target.value.replace(/\D+/g, "").slice(0, 12),
                    )
                  }
                  className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
                {fieldErrors.national_id ? (
                  <p
                    id="national-id-error"
                    role="alert"
                    className="text-xs text-red-700"
                  >
                    {fieldErrors.national_id}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="phone-number"
                  className="block text-xs font-semibold text-gray-700"
                >
                  Số điện thoại nhận OTP <span className="text-red-600">*</span>
                </label>
                <input
                  id="phone-number"
                  type="tel"
                  inputMode="tel"
                  maxLength={10}
                  placeholder="VD: 0901236789"
                  value={values.phone_number}
                  aria-invalid={fieldErrors.phone_number ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.phone_number ? "phone-number-error" : undefined
                  }
                  onChange={(e) =>
                    updateField(
                      "phone_number",
                      e.target.value.replace(/\D+/g, "").slice(0, 10),
                    )
                  }
                  className="w-full px-3 py-2.5 text-sm font-mono rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
                {fieldErrors.phone_number ? (
                  <p
                    id="phone-number-error"
                    role="alert"
                    className="text-xs text-red-700"
                  >
                    {fieldErrors.phone_number}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-gray-700"
                >
                  Email <span className="text-gray-600 font-normal">(không bắt buộc)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="phuhuynh@example.com"
                  value={values.email}
                  aria-invalid={fieldErrors.email ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.email ? "email-error" : undefined
                  }
                  onChange={(e) => updateField("email", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-300 bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
                />
                {fieldErrors.email ? (
                  <p
                    id="email-error"
                    role="alert"
                    className="text-xs text-red-700"
                  >
                    {fieldErrors.email}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={values.agreed_terms}
                  aria-invalid={fieldErrors.agreed_terms ? "true" : undefined}
                  aria-describedby={
                    fieldErrors.agreed_terms ? "agreed-terms-error" : undefined
                  }
                  onChange={(e) =>
                    updateField("agreed_terms", e.target.checked)
                  }
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-700 focus:ring-brand-700"
                />
                <span className="text-xs text-gray-700 leading-relaxed">
                  Tôi xác nhận thông tin trên là chính xác và đồng ý đăng ký{" "}
                  <strong>dịch vụ trích nợ tự động</strong> cho thẻ học sinh
                  thông minh theo điều khoản liên kết tài khoản ngân hàng.
                </span>
              </label>
              {fieldErrors.agreed_terms ? (
                <p
                  id="agreed-terms-error"
                  role="alert"
                  className="text-xs text-red-700"
                >
                  {fieldErrors.agreed_terms}
                </p>
              ) : null}

              <p className="text-[11px] text-gray-500 leading-relaxed">
                Thông tin của bạn được bảo vệ và mã hóa theo chuẩn bảo mật ngân
                hàng. Hệ thống sẽ gửi mã OTP 6 chữ số tới số điện thoại đã đăng
                ký để xác thực.
              </p>

              <button
                type="submit"
                disabled={initiateMutation.isPending}
                className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
              >
                {initiateMutation.isPending
                  ? "Đang gửi mã OTP..."
                  : "Tiếp tục xác thực OTP"}
              </button>
            </section>
          </form>
        )}
      </main>
    </Page>
  );
}
