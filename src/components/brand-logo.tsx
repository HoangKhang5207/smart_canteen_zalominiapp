import React from "react";
import canteenLogo from "@/static/canteen-logo.jpg";

export function BrandLogo({
  size = "md",
  showText = true,
}: {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}) {
  const dimension =
    size === "sm"
      ? "w-9 h-9"
      : size === "lg"
        ? "w-16 h-16"
        : "w-11 h-11";

  return (
    <div className="flex items-center gap-3">
      <img
        src={canteenLogo}
        alt="Logo Smart Canteen"
        className={`${dimension} rounded-lg object-contain bg-white border border-brand-100 p-0.5 shrink-0`}
      />
      {showText ? (
        <div className="min-w-0">
          <p className="text-base font-bold text-gray-900 leading-tight truncate">
            Smart Canteen
          </p>
          <p className="text-xs text-brand-700 font-medium truncate">
            Đặt suất ăn nhanh · Chuẩn vị mỗi ngày
          </p>
        </div>
      ) : null}
    </div>
  );
}
