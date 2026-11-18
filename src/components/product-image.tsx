import React, { useEffect, useState } from "react";
import canteenLogo from "@/static/canteen-logo.jpg";

export type ProductImageVariant = "card" | "cart" | "detail";

export function resolveProductImageUrl(
  imageUrl: string | null | undefined,
): string | null {
  if (!imageUrl) {
    return null;
  }

  const trimmed = imageUrl.trim();
  if (trimmed === "") {
    return null;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith("/")) {
    return trimmed;
  }

  return `/${trimmed.replace(/^\/+/, "")}`;
}

const CONTAINER_CLASSES: Record<ProductImageVariant, string> = {
  card: "w-20 h-20 aspect-square rounded-lg bg-brand-50 border border-brand-100 shrink-0 flex items-center justify-center overflow-hidden",
  cart: "w-14 h-14 aspect-square rounded-lg bg-brand-50 border border-brand-100 shrink-0 flex items-center justify-center overflow-hidden",
  detail:
    "w-full aspect-[4/3] max-h-64 bg-brand-50 border-b border-brand-100 flex items-center justify-center overflow-hidden",
};

const FALLBACK_PADDING: Record<ProductImageVariant, string> = {
  card: "p-2",
  cart: "p-1.5",
  detail: "p-6",
};

export function ProductImage({
  imageUrl,
  alt,
  variant = "card",
}: {
  imageUrl: string | null | undefined;
  alt: string;
  variant?: ProductImageVariant;
}) {
  const resolvedUrl = resolveProductImageUrl(imageUrl);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedUrl]);

  const useFallback = !resolvedUrl || hasError;

  return (
    <div className={CONTAINER_CLASSES[variant]}>
      <img
        src={useFallback ? canteenLogo : resolvedUrl}
        alt={alt}
        loading={variant === "detail" ? "eager" : "lazy"}
        decoding="async"
        onError={() => {
          if (!hasError) {
            setHasError(true);
          }
        }}
        className={`w-full h-full ${
          useFallback
            ? `object-contain ${FALLBACK_PADDING[variant]}`
            : "object-cover object-center"
        }`}
      />
    </div>
  );
}
