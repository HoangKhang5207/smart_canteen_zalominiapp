import React, { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type AuthUser,
  loginWithDemoPhone,
  loginWithZaloPhone,
} from "@/features/auth/api";
import {
  normalizeVietnamPhone,
  validateVietnamPhone,
} from "@/features/auth/phone";
import { ApiError } from "@/lib/api-client";
import { useFocusTrap } from "@/lib/use-focus-trap";

const DEMO_PHONE_DEFAULT = "0901234567";
const ALLOW_DEMO_PHONE_UI =
  import.meta.env.VITE_DEMO_PHONE_LOGIN !== "false";

interface ZaloPhoneLoginContentProps {
  title?: string;
  description?: string;
  onSuccess?: (user: AuthUser) => void;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}

function ZaloPhoneLoginContent({
  title = "Đăng nhập bằng Số điện thoại Zalo",
  description = "Xác thực số điện thoại phụ huynh trên Zalo để quản lý thẻ học sinh, thiết lập hạn mức, theo dõi đơn hàng và nhận mã OTP.",
  onSuccess,
  onCancel,
  onBusyChange,
}: ZaloPhoneLoginContentProps) {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);
  const [isZaloLoading, setIsZaloLoading] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [demoDisabledByServer, setDemoDisabledByServer] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isBusy = isZaloLoading || isDemoLoading;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onBusyChange?.(isBusy);
  }, [isBusy, onBusyChange]);

  const finalizeSuccess = (user: AuthUser) => {
    void queryClient.invalidateQueries({ queryKey: ["canteen-cards"] });
    void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    if (mountedRef.current) {
      onSuccess?.(user);
    }
  };

  const handleZaloPhoneLogin = async () => {
    if (isBusy) {
      return;
    }
    setErrorMessage(null);
    setIsZaloLoading(true);
    try {
      const user = await loginWithZaloPhone();
      finalizeSuccess(user);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Không thể xác thực số điện thoại Zalo. Vui lòng thử lại.",
      );
    } finally {
      setIsZaloLoading(false);
    }
  };

  const handleDemoPhoneSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    if (isBusy) {
      return;
    }
    const validationErr = validateVietnamPhone(phoneInput);
    if (validationErr) {
      setErrorMessage(validationErr);
      return;
    }
    const normalized = normalizeVietnamPhone(phoneInput);
    if (!normalized) {
      setErrorMessage("Số điện thoại không hợp lệ.");
      return;
    }

    setErrorMessage(null);
    setIsDemoLoading(true);
    try {
      const user = await loginWithDemoPhone(normalized);
      finalizeSuccess(user);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setDemoDisabledByServer(true);
        setErrorMessage(
          "Chế độ đăng nhập SĐT Demo đang tắt trên máy chủ. Vui lòng dùng nút Đăng nhập bằng Zalo.",
        );
      } else {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Không thể đăng nhập bằng số điện thoại lúc này.",
        );
      }
    } finally {
      setIsDemoLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-600 leading-relaxed">{description}</p>
      </div>

      {errorMessage ? (
        <p
          role="alert"
          className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 font-medium"
        >
          {errorMessage}
        </p>
      ) : null}

      <button
        type="button"
        disabled={isBusy}
        onClick={() => void handleZaloPhoneLogin()}
        className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
      >
        {isZaloLoading
          ? "Đang xác thực SĐT Zalo..."
          : "Đăng nhập bằng số điện thoại Zalo"}
      </button>

      {ALLOW_DEMO_PHONE_UI && !demoDisabledByServer ? (
        <form
          onSubmit={(e) => void handleDemoPhoneSubmit(e)}
          className="pt-3 border-t border-gray-200 space-y-2.5"
          noValidate
        >
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="demo-phone-input"
              className="text-xs font-semibold text-gray-700"
            >
              Chế độ Demo Local — Nhập SĐT phụ huynh
            </label>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setPhoneInput(DEMO_PHONE_DEFAULT);
                setErrorMessage(null);
              }}
              className="text-[11px] font-semibold text-brand-700 hover:text-brand-800 underline focus:outline-none focus:ring-2 focus:ring-brand-700 rounded px-1"
            >
              Dùng SĐT mẫu ({DEMO_PHONE_DEFAULT})
            </button>
          </div>
          <div className="flex gap-2">
            <input
              id="demo-phone-input"
              type="tel"
              inputMode="numeric"
              placeholder="Ví dụ: 0901234567"
              value={phoneInput}
              disabled={isBusy}
              onChange={(e) => {
                setPhoneInput(e.target.value);
                if (errorMessage) {
                  setErrorMessage(null);
                }
              }}
              className="flex-1 px-3 py-2 text-sm font-mono rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
            <button
              type="submit"
              disabled={isBusy}
              className="px-3.5 py-2 rounded-lg text-xs font-semibold text-brand-900 bg-brand-100 border border-brand-200 hover:bg-brand-200 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-700 whitespace-nowrap"
            >
              {isDemoLoading ? "Đang vào..." : "Tiếp tục"}
            </button>
          </div>
        </form>
      ) : null}

      {onCancel ? (
        <button
          type="button"
          disabled={isBusy}
          onClick={onCancel}
          className="w-full py-2 px-3 rounded-lg text-xs font-semibold text-gray-600 hover:text-gray-900 border border-gray-200 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
        >
          Để sau, tiếp tục xem thực đơn
        </button>
      ) : null}
    </div>
  );
}

export function ZaloPhoneLoginPanel({
  title,
  description,
  onSuccess,
}: Omit<ZaloPhoneLoginContentProps, "onCancel">) {
  return (
    <section
      aria-label="Xác thực số điện thoại Zalo"
      className="bg-white border border-brand-100 rounded-xl p-5 shadow-sm"
    >
      <ZaloPhoneLoginContent
        title={title}
        description={description}
        onSuccess={onSuccess}
      />
    </section>
  );
}

interface ZaloPhoneLoginModalProps extends ZaloPhoneLoginContentProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ZaloPhoneLoginModal({
  isOpen,
  title,
  description,
  onSuccess,
  onClose,
}: ZaloPhoneLoginModalProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const [isBusy, setIsBusy] = useState(false);
  const isBusyRef = useRef(isBusy);
  isBusyRef.current = isBusy;

  useFocusTrap(isOpen, dialogRef);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const frame = window.requestAnimationFrame(() => {
      const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      firstFocusable?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isBusyRef.current) {
        onCloseRef.current();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Đăng nhập bằng Số điện thoại Zalo"}
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
      >
        <ZaloPhoneLoginContent
          title={title}
          description={description}
          onBusyChange={setIsBusy}
          onSuccess={(user) => {
            onClose();
            onSuccess?.(user);
          }}
          onCancel={() => {
            if (!isBusy) {
              onClose();
            }
          }}
        />
      </div>
    </div>
  );
}
