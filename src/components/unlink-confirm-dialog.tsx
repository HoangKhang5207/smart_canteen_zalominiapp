import React, { useEffect, useRef } from "react";
import { useFocusTrap } from "@/lib/use-focus-trap";

interface UnlinkConfirmDialogProps {
  isOpen: boolean;
  cardCode: string;
  studentName: string;
  bankName: string;
  accountNumberMasked: string;
  isSubmitting: boolean;
  errorMessage: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function UnlinkConfirmDialog({
  isOpen,
  cardCode,
  studentName,
  bankName,
  accountNumberMasked,
  isSubmitting,
  errorMessage,
  onCancel,
  onConfirm,
}: UnlinkConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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
      cancelButtonRef.current?.focus();
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
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onCancel();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="unlink-confirm-title"
        className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-5 space-y-4 shadow-xl"
      >
        <div className="space-y-1.5">
          <h2
            id="unlink-confirm-title"
            className="text-base font-bold text-gray-900"
          >
            Xác nhận hủy liên kết ngân hàng
          </h2>
          <p className="text-xs text-gray-600 leading-relaxed">
            Bạn sắp hủy liên kết tài khoản{" "}
            <strong className="text-gray-900">{bankName}</strong> (
            <span className="font-mono font-semibold text-gray-900">
              {accountNumberMasked}
            </span>
            ) khỏi thẻ{" "}
            <strong className="font-mono text-gray-900">{cardCode}</strong> của
            học sinh <strong className="text-gray-900">{studentName}</strong>.
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
          <p className="font-semibold">Lưu ý trước khi tiếp tục</p>
          <p className="leading-relaxed">
            Sau khi xác thực OTP hủy liên kết, thẻ học sinh sẽ ngừng trích nợ tự
            động cho tới khi bạn liên kết ngân hàng mới. Lịch sử đơn hàng và
            lịch sử hạn mức vẫn được lưu giữ đầy đủ.
          </p>
        </div>

        {errorMessage ? (
          <p
            role="alert"
            className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5 font-medium"
          >
            {errorMessage}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            ref={cancelButtonRef}
            type="button"
            disabled={isSubmitting}
            onClick={onCancel}
            className="py-2.5 px-4 rounded-lg text-sm font-semibold border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-700"
          >
            Giữ lại liên kết
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
            className="py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-red-700 hover:bg-red-800 disabled:bg-gray-300 disabled:text-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-700"
          >
            {isSubmitting ? "Đang gửi OTP..." : "Xác nhận hủy"}
          </button>
        </div>
      </div>
    </div>
  );
}
