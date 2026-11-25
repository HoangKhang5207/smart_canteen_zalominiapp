import React, { useRef } from "react";
import { normalizeOtpDigits } from "@/features/canteen/validation";

interface OtpCodeInputProps {
  value: string;
  onChange: (nextValue: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}

const OTP_LENGTH = 6;
const SLOTS = [0, 1, 2, 3, 4, 5] as const;

export function OtpCodeInput({
  value,
  onChange,
  disabled = false,
  hasError = false,
}: OtpCodeInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = normalizeOtpDigits(value);

  const focusSlot = (index: number) => {
    const target = inputRefs.current[Math.max(0, Math.min(OTP_LENGTH - 1, index))];
    target?.focus();
    target?.select();
  };

  const handleDigitChange = (index: number, rawInput: string) => {
    const cleaned = normalizeOtpDigits(rawInput);
    if (cleaned.length > 1) {
      onChange(cleaned);
      focusSlot(Math.min(cleaned.length, OTP_LENGTH - 1));
      return;
    }

    const chars = digits.padEnd(OTP_LENGTH, " ").split("");
    chars[index] = cleaned || " ";
    const next = chars.join("").replace(/\s+/g, "").slice(0, OTP_LENGTH);
    onChange(next);

    if (cleaned && index < OTP_LENGTH - 1) {
      focusSlot(index + 1);
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const next = digits.slice(0, index - 1) + digits.slice(index);
      onChange(next);
      focusSlot(index - 1);
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusSlot(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      event.preventDefault();
      focusSlot(index + 1);
    }
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    const pasted = normalizeOtpDigits(event.clipboardData.getData("text"));
    if (pasted) {
      onChange(pasted);
      focusSlot(Math.min(pasted.length, OTP_LENGTH - 1));
    }
  };

  return (
    <div
      className="grid grid-cols-6 gap-2 max-w-xs mx-auto"
      role="group"
      aria-label="Nhập mã OTP gồm 6 chữ số"
    >
      {SLOTS.map((index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          aria-label={`Chữ số OTP thứ ${index + 1}`}
          aria-invalid={hasError ? "true" : undefined}
          value={digits[index] ?? ""}
          onChange={(e) => handleDigitChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`w-full h-12 text-center font-mono text-lg font-bold rounded-lg border bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-700 disabled:bg-gray-100 disabled:text-gray-400 transition-colors ${
            hasError
              ? "border-red-400 focus:border-red-500"
              : digits[index]
                ? "border-brand-600"
                : "border-gray-300"
          }`}
        />
      ))}
    </div>
  );
}
