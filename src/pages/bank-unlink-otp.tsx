import React, { useEffect, useRef, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Header, Page, useNavigate } from "zmp-ui";
import { OtpCodeInput } from "@/components/otp-code-input";
import { EmptyState, LoadingState } from "@/components/state-views";
import { ZaloPhoneLoginPanel } from "@/components/zalo-phone-login";
import { authHydratedAtom, currentUserAtom } from "@/features/auth/store";
import {
  resendBankUnlinkOtp,
  verifyBankUnlinkOtp,
} from "@/features/canteen/api";
import { pendingUnlinkOtpSessionAtom } from "@/features/canteen/store";
import {
  formatCountdown,
  normalizeOtpDigits,
} from "@/features/canteen/validation";
import { ApiError } from "@/lib/api-client";

function computeRemainingSeconds(deadlineMs: number): number {
  return Math.max(0, Math.ceil((deadlineMs - Date.now()) / 1000));
}

interface UnlinkSuccessInfo {
  cardCode: string;
  studentName: string;
  bankName: string;
  accountNumberMasked: string;
}

export default function BankUnlinkOtpPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAtomValue(currentUserAtom);
  const authHydrated = useAtomValue(authHydratedAtom);

  const [session, setSession] = useAtom(pendingUnlinkOtpSessionAtom);

  const [otpCode, setOtpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [unlinkedInfo, setUnlinkedInfo] = useState<UnlinkSuccessInfo | null>(
    null,
  );

  const expiresDeadlineRef = useRef<number>(0);
  const resendDeadlineRef = useRef<number>(0);

  const [expiresIn, setExpiresIn] = useState<number>(
    session?.initiation.otp.expires_in_seconds ?? 0,
  );
  const [resendCooldown, setResendCooldown] = useState<number>(
    session?.initiation.otp.resend_cooldown_seconds ?? 0,
  );

  useEffect(() => {
    if (!session) {
      return;
    }
    const now = Date.now();
    expiresDeadlineRef.current =
      now + session.initiation.otp.expires_in_seconds * 1000;
    resendDeadlineRef.current =
      now + session.initiation.otp.resend_cooldown_seconds * 1000;

    setOtpCode("");
    setErrorMessage(null);
    setIsLockedOut(false);
    setExpiresIn(session.initiation.otp.expires_in_seconds);
    setResendCooldown(session.initiation.otp.resend_cooldown_seconds);
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }
    const syncTimers = () => {
      setExpiresIn(computeRemainingSeconds(expiresDeadlineRef.current));
      setResendCooldown(computeRemainingSeconds(resendDeadlineRef.current));
    };

    const timer = window.setInterval(syncTimers, 1000);
    document.addEventListener("visibilitychange", syncTimers);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", syncTimers);
    };
  }, [session]);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!session) {
        throw new Error("Phiên xác thực OTP hủy liên kết không tồn tại.");
      }
      return verifyBankUnlinkOtp(session.initiation.bank_link_id, code);
    },
    onSuccess: (updatedCard) => {
      const completedSummary: UnlinkSuccessInfo = {
        cardCode: updatedCard.card_code,
        studentName: updatedCard.student.full_name,
        bankName: session?.initiation.bank_name ?? "ngân hàng",
        accountNumberMasked: session?.initiation.account_number_masked ?? "",
      };
      void queryClient.invalidateQueries({ queryKey: ["canteen-cards"] });
      void queryClient.invalidateQueries({ queryKey: ["canteen-card-orders"] });
      void queryClient.invalidateQueries({ queryKey: ["canteen-limit-logs"] });
      setSession(null);
      setUnlinkedInfo(completedSummary);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.errorCode === "OTP_MAX_ATTEMPTS_EXCEEDED") {
          setIsLockedOut(true);
        } else if (err.errorCode === "BANK_LINK_NOT_ACTIVE") {
          void queryClient.invalidateQueries({ queryKey: ["canteen-cards"] });
          setIsLockedOut(true);
        } else if (err.errorCode === "OTP_EXPIRED") {
          expiresDeadlineRef.current = 0;
          setExpiresIn(0);
        }
        setErrorMessage(err.message);
        return;
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không thể xác thực mã OTP hủy liên kết. Vui lòng thử lại.",
      );
    },
  });

  const resendMutation = useMutation({
    mutationFn: async () => {
      if (!session) {
        throw new Error("Phiên xác thực OTP hủy liên kết không tồn tại.");
      }
      return resendBankUnlinkOtp(session.initiation.bank_link_id);
    },
    onSuccess: (nextInitiation) => {
      setSession((prev) =>
        prev
          ? {
              ...prev,
              initiation: nextInitiation,
            }
          : null,
      );
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        if (err.errorCode === "OTP_MAX_ATTEMPTS_EXCEEDED") {
          setIsLockedOut(true);
        } else if (err.errorCode === "BANK_LINK_NOT_ACTIVE") {
          void queryClient.invalidateQueries({ queryKey: ["canteen-cards"] });
          setIsLockedOut(true);
        } else if (err.errorCode === "OTP_MAX_RESENDS_EXCEEDED") {
          setSession((prev) =>
            prev
              ? {
                  ...prev,
                  initiation: {
                    ...prev.initiation,
                    otp: {
                      ...prev.initiation.otp,
                      remaining_resends: 0,
                    },
                  },
                }
              : null,
          );
        } else if (
          err.errorCode === "OTP_RESEND_COOLDOWN" &&
          typeof err.meta?.retry_after_seconds === "number"
        ) {
          resendDeadlineRef.current =
            Date.now() + err.meta.retry_after_seconds * 1000;
          setResendCooldown(err.meta.retry_after_seconds);
        }
      }
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không thể gửi lại mã OTP lúc này.",
      );
    },
  });

  const handleVerifySubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (verifyMutation.isPending || isLockedOut || expiresIn <= 0) {
      return;
    }
    const cleaned = normalizeOtpDigits(otpCode);
    if (cleaned.length !== 6) {
      setErrorMessage("Vui lòng nhập đầy đủ 6 chữ số OTP.");
      return;
    }
    setErrorMessage(null);
    verifyMutation.mutate(cleaned);
  };

  const handleResendClick = () => {
    if (
      resendMutation.isPending ||
      isLockedOut ||
      resendCooldown > 0 ||
      !session ||
      session.initiation.otp.remaining_resends <= 0
    ) {
      return;
    }
    resendMutation.mutate();
  };

  if (unlinkedInfo) {
    return (
      <Page className="bg-surface-muted min-h-screen pb-10">
        <Header
          title="Hủy liên kết thành công"
          showBackIcon={false}
        />
        <main className="app-main max-w-2xl mx-auto">
          <section
            role="status"
            aria-label="Thông báo hủy liên kết thành công"
            className="bg-white border border-brand-100 rounded-xl p-6 text-center space-y-4"
          >
            <div
              aria-hidden="true"
              className="mx-auto w-14 h-14 rounded-full bg-brand-100 text-brand-800 flex items-center justify-center text-2xl font-bold"
            >
              ✓
            </div>
            <div className="space-y-1.5">
              <h1 className="text-lg font-bold text-gray-900">
                Hủy liên kết ngân hàng thành công
              </h1>
              <p className="text-xs text-gray-600 leading-relaxed">
                Tài khoản{" "}
                <strong className="text-gray-900">
                  {unlinkedInfo.bankName}
                </strong>{" "}
                (
                <span className="font-mono font-semibold text-gray-900">
                  {unlinkedInfo.accountNumberMasked}
                </span>
                ) đã được gỡ khỏi thẻ{" "}
                <strong className="font-mono text-gray-900">
                  {unlinkedInfo.cardCode}
                </strong>{" "}
                của học sinh{" "}
                <strong className="text-gray-900">
                  {unlinkedInfo.studentName}
                </strong>
                .
              </p>
            </div>

            <div className="rounded-lg bg-surface-muted border border-gray-200 p-3 text-xs text-gray-700 text-left">
              Dịch vụ trích nợ tự động đã được dừng ngay lập tức. Bạn có thể
              liên kết lại tài khoản ngân hàng khác bất cứ lúc nào tại màn hình
              Căn tin số.
            </div>

            <button
              type="button"
              onClick={() => navigate("/canteen", { replace: true })}
              className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
            >
              Quay về Căn tin số
            </button>
          </section>
        </main>
      </Page>
    );
  }

  if (!authHydrated) {
    return (
      <Page className="bg-surface-muted min-h-screen">
        <Header
          title="Xác thực hủy liên kết"
          onBackClick={() => navigate("/canteen")}
        />
        <main className="app-main max-w-2xl mx-auto">
          <LoadingState label="Đang kiểm tra phiên đăng nhập..." />
        </main>
      </Page>
    );
  }

  if (!currentUser) {
    return (
      <Page className="bg-surface-muted min-h-screen">
        <Header
          title="Xác thực hủy liên kết"
          onBackClick={() => navigate("/canteen")}
        />
        <main className="app-main max-w-2xl mx-auto">
          <ZaloPhoneLoginPanel title="Đăng nhập để xác thực hủy liên kết" />
        </main>
      </Page>
    );
  }

  if (!session) {
    return (
      <Page className="bg-surface-muted min-h-screen">
        <Header
          title="Xác thực hủy liên kết"
          onBackClick={() => navigate("/canteen")}
        />
        <main className="app-main max-w-2xl mx-auto">
          <EmptyState
            message="Phiên xác thực OTP hủy liên kết đã kết thúc hoặc không tồn tại."
            actionLabel="Quay lại Căn tin số"
            onAction={() => navigate("/canteen")}
          />
        </main>
      </Page>
    );
  }

  const initiation = session.initiation;
  const isExpired = expiresIn <= 0;
  const remainingResends = initiation.otp.remaining_resends;
  const canResend =
    !isLockedOut &&
    resendCooldown <= 0 &&
    remainingResends > 0 &&
    !resendMutation.isPending;

  return (
    <Page className="bg-surface-muted min-h-screen pb-10">
      <Header
        title="Xác thực hủy liên kết"
        onBackClick={() => {
          setSession(null);
          navigate("/canteen");
        }}
      />

      <main className="app-main max-w-2xl mx-auto space-y-4">
        <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div className="text-center space-y-1.5">
            <h2 className="text-base font-bold text-gray-900">
              Nhập mã OTP hủy liên kết
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed">
              Mã OTP gồm 6 chữ số đã được gửi tới số điện thoại{" "}
              <strong className="font-mono text-gray-900">
                {initiation.phone_masked}
              </strong>{" "}
              để xác nhận hủy liên kết <strong>{initiation.bank_name}</strong> (
              <span className="font-mono">
                {initiation.account_number_masked}
              </span>
              ) khỏi thẻ{" "}
              <strong className="font-mono">{session.cardCode}</strong>.
            </p>
            <p className="text-xs font-medium text-red-700">
              {isLockedOut
                ? "Phiên OTP đã bị khóa — vui lòng quay lại Căn tin số để yêu cầu lại"
                : isExpired
                  ? "Mã OTP đã hết hạn — vui lòng gửi lại mã mới"
                  : `Hiệu lực còn lại: ${formatCountdown(expiresIn)}`}
            </p>
          </div>

          {initiation.otp.debug_otp ? (
            <div
              role="note"
              className="rounded-lg bg-brand-50 border border-brand-500/40 p-3 flex items-center justify-between gap-2 text-xs"
            >
              <div>
                <p className="font-semibold text-brand-900">
                  Chế độ Demo Local — Mã OTP hủy liên kết
                </p>
                <p className="font-mono text-sm font-bold tracking-widest text-brand-700">
                  {initiation.otp.debug_otp}
                </p>
              </div>
              <button
                type="button"
                disabled={isLockedOut || isExpired || verifyMutation.isPending}
                onClick={() => {
                  setOtpCode(initiation.otp.debug_otp ?? "");
                  setErrorMessage(null);
                }}
                className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-brand-700 text-white hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-700"
              >
                Điền nhanh
              </button>
            </div>
          ) : null}

          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <OtpCodeInput
              value={otpCode}
              onChange={(next) => {
                setOtpCode(next);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              disabled={verifyMutation.isPending || isLockedOut}
              hasError={Boolean(errorMessage)}
            />

            {errorMessage ? (
              <p
                role="alert"
                className="text-xs text-center text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 font-medium"
              >
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={
                verifyMutation.isPending ||
                isLockedOut ||
                isExpired ||
                otpCode.length !== 6
              }
              className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-gray-300 disabled:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700"
            >
              {verifyMutation.isPending
                ? "Đang xác thực..."
                : "Xác nhận hủy liên kết"}
            </button>
          </form>

          <div className="pt-2 border-t border-gray-100 flex flex-col items-center gap-2 text-xs">
            {isLockedOut ? (
              <button
                type="button"
                onClick={() => {
                  setSession(null);
                  navigate("/canteen");
                }}
                className="font-semibold text-brand-700 hover:text-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-700 rounded px-2 py-1"
              >
                Quay lại Căn tin số
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={!canResend}
                  onClick={handleResendClick}
                  className="font-semibold text-brand-700 hover:text-brand-800 disabled:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-700 rounded px-2 py-1"
                >
                  {resendMutation.isPending
                    ? "Đang gửi lại mã OTP..."
                    : remainingResends <= 0
                      ? "Đã hết lượt gửi lại mã OTP"
                      : resendCooldown > 0
                        ? `Gửi lại mã OTP sau ${resendCooldown}s (còn ${remainingResends} lượt)`
                        : `Gửi lại mã OTP (còn ${remainingResends} lượt)`}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSession(null);
                    navigate("/canteen");
                  }}
                  className="text-gray-600 hover:text-gray-900 underline focus:outline-none focus:ring-2 focus:ring-brand-700 rounded px-2 py-1"
                >
                  Hủy thao tác và quay lại Căn tin số
                </button>
              </>
            )}
          </div>
        </section>
      </main>
    </Page>
  );
}
