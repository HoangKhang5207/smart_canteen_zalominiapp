import React from "react";

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}

export function normalizePaginatedResult<T>(
  payload: { data?: T[]; meta?: Partial<PaginationMeta> } | null | undefined,
  fallbackPage = 1,
  fallbackPerPage = 10,
): PaginatedResult<T> {
  const data = Array.isArray(payload?.data) ? payload.data : [];
  const rawMeta = payload?.meta;
  const total =
    typeof rawMeta?.total === "number" && rawMeta.total >= 0
      ? rawMeta.total
      : data.length;
  const perPage =
    typeof rawMeta?.per_page === "number" && rawMeta.per_page >= 1
      ? rawMeta.per_page
      : fallbackPerPage;
  const lastPage =
    typeof rawMeta?.last_page === "number" && rawMeta.last_page >= 1
      ? rawMeta.last_page
      : Math.max(1, Math.ceil(total / perPage));
  const currentPage =
    typeof rawMeta?.current_page === "number" && rawMeta.current_page >= 1
      ? rawMeta.current_page
      : fallbackPage;
  const from =
    typeof rawMeta?.from === "number"
      ? rawMeta.from
      : data.length > 0
        ? (currentPage - 1) * perPage + 1
        : null;
  const to =
    typeof rawMeta?.to === "number"
      ? rawMeta.to
      : data.length > 0 && from !== null
        ? from + data.length - 1
        : null;

  return {
    data,
    meta: {
      current_page: currentPage,
      last_page: lastPage,
      per_page: perPage,
      total,
      from,
      to,
    },
  };
}

export function buildPageItems(
  currentPage: number,
  lastPage: number,
): (number | "...")[] {
  const safeLast = Math.max(1, lastPage);
  const safeCurrent = Math.min(Math.max(1, currentPage), safeLast);
  const items: (number | "...")[] = [];

  for (let p = 1; p <= safeLast; p++) {
    if (p === 1 || p === safeLast || Math.abs(p - safeCurrent) <= 1) {
      items.push(p);
    } else if (items[items.length - 1] !== "...") {
      items.push("...");
    }
  }

  return items;
}

export function PaginationBar({
  meta,
  onPageChange,
  itemLabel = "mục",
  disabled = false,
}: {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  itemLabel?: string;
  disabled?: boolean;
}) {
  if (meta.total <= 0) {
    return null;
  }

  const { current_page: currentPage, last_page: lastPage, total, from, to } =
    meta;
  const pageItems = buildPageItems(currentPage, lastPage);
  const canPrev = currentPage > 1 && !disabled;
  const canNext = currentPage < lastPage && !disabled;

  const handleSelectPage = (targetPage: number) => {
    if (
      disabled ||
      targetPage < 1 ||
      targetPage > lastPage ||
      targetPage === currentPage
    ) {
      return;
    }
    onPageChange(targetPage);
    if (typeof window !== "undefined" && typeof window.scrollTo === "function") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div
      role="region"
      aria-label={`Thông tin phân trang ${itemLabel}`}
      className="bg-white border border-gray-200 rounded-xl p-3 space-y-2.5"
    >
      <div className="flex items-center justify-between gap-2 text-xs text-gray-600">
        <span>
          Hiển thị{" "}
          <strong className="font-semibold text-gray-900">
            {from ?? 0}–{to ?? 0}
          </strong>{" "}
          trên tổng{" "}
          <strong className="font-semibold text-gray-900">{total}</strong>{" "}
          {itemLabel}
        </span>
        <span className="font-medium text-brand-700">
          Trang {currentPage}/{lastPage}
        </span>
      </div>

      {lastPage > 1 ? (
        <nav
          aria-label={`Điều hướng phân trang ${itemLabel}`}
          className="flex items-center justify-between gap-1.5 pt-2 border-t border-gray-100"
        >
          <button
            type="button"
            disabled={!canPrev}
            onClick={() => handleSelectPage(currentPage - 1)}
            aria-label="Trang trước"
            className="min-h-9 px-3 rounded-lg text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:border-brand-500 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-700 transition-colors"
          >
            ← Trước
          </button>

          <div className="flex items-center gap-1 flex-wrap justify-center">
            {pageItems.map((item, idx) =>
              item === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  aria-hidden="true"
                  className="px-1.5 text-xs font-semibold text-gray-400"
                >
                  …
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectPage(item)}
                  aria-current={item === currentPage ? "page" : undefined}
                  aria-label={`Trang ${item}`}
                  className={`min-w-9 h-9 px-2.5 rounded-lg text-xs font-bold border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                    item === currentPage
                      ? "bg-brand-700 text-white border-brand-700"
                      : "bg-white text-gray-700 border-gray-300 hover:border-brand-500"
                  }`}
                >
                  {item}
                </button>
              ),
            )}
          </div>

          <button
            type="button"
            disabled={!canNext}
            onClick={() => handleSelectPage(currentPage + 1)}
            aria-label="Trang sau"
            className="min-h-9 px-3 rounded-lg text-xs font-semibold border border-gray-300 bg-white text-gray-700 hover:border-brand-500 disabled:opacity-40 disabled:pointer-events-none focus:outline-none focus:ring-2 focus:ring-brand-700 transition-colors"
          >
            Sau →
          </button>
        </nav>
      ) : null}
    </div>
  );
}
