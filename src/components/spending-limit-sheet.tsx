import React, { useEffect, useRef, useState } from "react";
import {
  QUICK_LIMIT_PRESETS,
  parseLimitInput,
  validateDailyLimit,
} from "@/features/canteen/spending-limit";
import { formatVnd } from "@/lib/format";

interface SpendingLimitSheetProps {
  isOpen: boolean;
  cardLabel?: string;
  currentLimit: number;
  spentToday: number;
  isSaving: boolean;
  serverError: string | null;
  onClearError?: () => void;
  onClose: () => void;
  onSave: (dailyLimit: number) => void;
}

export function SpendingLimitSheet({
  isOpen,
  cardLabel,
  currentLimit,
  spentToday,
  isSaving,
  serverError,
  onClearError,
  onClose,
  onSave,
}: SpendingLimitSheetProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const currentLimitRef = useRef<number>(currentLimit);
  currentLimitRef.current = currentLimit;

  const [rawInput, setRawInput] = useState(String(currentLimit));
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    previousFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const initialLimit = currentLimitRef.current;
    setRawInput(initialLimit > 0 ? String(initialLimit) : "");
    setLocalError(null);
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (previousFocusRef.current?.isConnected) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSaving) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSaving, onClose]);

  if (!isOpen) {
    return null;
  }

  const parsedValue = parseLimitInput(rawInput);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving) {
      return;
    }
    const error = validateDailyLimit(parsedValue);
    if (error) {
      setLocalError(error);
      return;
    }
    setLocalError(null);
    onSave(parsedValue as number);
  };

  const displayError = localError || serverError;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSaving) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="spending-limit-dialog-title"
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl"
      >
        <div className="space-y-1">
          <h2
            id="spending-limit-dialog-title"
            className="text-base font-bold text-gray-900"
          >
            Hạn mức chi tiêu hằng ngày
          </h2>
          {cardLabel ? (
            <p className="text-xs font-semibold text-brand-700">{cardLabel}</p>
          ) : null}
          <p className="text-xs text-gray-600">
            Giới hạn số tiền tối đa học sinh có thể chi tiêu mỗi ngày qua trích
            nợ tự động (không phải số dư ví).
          </p>
        </div>

        <div className="rounded-xl bg-surface-muted border border-gray-200 p-3 flex items-center justify-between text-xs">
          <div>
            <p className="text-gray-600">Hạn mức hiện tại</p>
            <p className="text-sm font-bold text-gray-900">
              {formatVnd(currentLimit)}/ngày
            </p>
          </div>
          <div className="text-right">
            <p className="text-gray-600">Đã chi hôm nay</p>
            <p className="text-sm font-semibold text-brand-700">
              {formatVnd(spentToday)}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="new-daily-limit"
              className="block text-xs font-semibold text-gray-700"
            >
              Hạn mức mới (VNĐ)
            </label>
            <input
              ref={inputRef}
              id="new-daily-limit"
              type="text"
              inputMode="numeric"
              placeholder="Ví dụ: 50000 (hoặc 0 để tạm khóa)"
              value={rawInput}
              disabled={isSaving}
              aria-invalid={displayError ? "true" : undefined}
              aria-describedby={displayError ? "daily-limit-error" : undefined}
              onChange={(e) => {
                setRawInput(e.target.value.replace(/\D+/g, "").slice(0, 7));
                if (localError) {
                  setLocalError(null);
                }
                if (serverError) {
                  onClearError?.();
                }
              }}
              className="w-full px-3 py-2.5 text-base font-mono font-bold rounded-lg border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700"
            />
            {parsedValue !== null ? (
              <p className="text-xs text-gray-600">
                Áp dụng:{" "}
                <strong className="text-brand-700">
                  {formatVnd(parsedValue)}/ngày
                </strong>
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-gray-700">Chọn nhanh</p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_LIMIT_PRESETS.map((preset) => {
                const isSelected = parsedValue === preset.amount;
                return (
                  <button
                    key={preset.amount}
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      setRawInput(String(preset.amount));
                      setLocalError(null);
                      if (serverError) {
                        onClearError?.();
                      }
                    }}
                    className={`py-2 px-2 rounded-lg text-xs font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                      isSelected
                        ? "bg-brand-700 text-white border-brand-700"
                        : "bg-white text-gray-800 border-gray-300 hover:border-brand-600"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {displayError ? (
            <p
              id="daily-limit-error"
              role="alert"
              className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 font-medium"
            >
              {displayError}
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              disabled={isSaving}
              onClick={onClose}
              className="py-2.5 px-4 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
            >
              {isSaving ? "Đang lưu..." : "Lưu hạn mức"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
