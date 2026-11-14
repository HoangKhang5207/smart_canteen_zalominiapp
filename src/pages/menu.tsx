import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Header, Input, Page, Text, useNavigate } from "zmp-ui";
import { BrandLogo } from "@/components/brand-logo";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { fetchCategories, fetchProducts } from "@/features/menu/api";
import type { Category, Product } from "@/features/menu/types";
import { formatVnd } from "@/lib/format";
import canteenLogo from "@/static/canteen-logo.jpg";

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function CategoryFilterBar({
  categories,
  selectedId,
  onSelect,
}: {
  categories: Category[];
  selectedId: number | undefined;
  onSelect: (id: number | undefined) => void;
}) {
  return (
    <nav
      aria-label="Danh mục món ăn"
      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
    >
      <button
        type="button"
        onClick={() => onSelect(undefined)}
        aria-pressed={selectedId === undefined}
        className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
          selectedId === undefined
            ? "bg-brand-700 text-white border-brand-700"
            : "bg-white text-gray-700 border-gray-300 hover:border-brand-500"
        }`}
      >
        Tất cả
      </button>
      {categories.map((cat) => {
        const active = selectedId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            aria-pressed={active}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
              active
                ? "bg-brand-700 text-white border-brand-700"
                : "bg-white text-gray-700 border-gray-300 hover:border-brand-500"
            }`}
          >
            {cat.name}
          </button>
        );
      })}
    </nav>
  );
}

function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (id: number) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(product.id)}
        className="w-full text-left bg-white border border-gray-200 rounded-xl p-3 flex items-start gap-3 hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-700 transition-colors"
      >
        <div className="w-16 h-16 rounded-lg bg-brand-50 border border-brand-100 shrink-0 flex items-center justify-center overflow-hidden">
          <img
            src={product.image_url || canteenLogo}
            alt={product.name}
            className={`w-full h-full ${
              product.image_url ? "object-cover" : "object-contain p-1.5"
            }`}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {product.name}
            </h2>
            {!product.is_available ? (
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                Hết món
              </span>
            ) : null}
          </div>
          {product.description ? (
            <p className="mt-1 text-xs text-gray-600 line-clamp-2">
              {product.description}
            </p>
          ) : null}
          <p className="mt-2 text-sm font-bold text-brand-700">
            {formatVnd(product.price)}
          </p>
        </div>
      </button>
    </li>
  );
}

export default function MenuPage() {
  const navigate = useNavigate();
  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | undefined
  >(undefined);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const productsQuery = useQuery({
    queryKey: [
      "products",
      {
        categoryId: selectedCategoryId,
        search: debouncedSearch.trim().slice(0, 100),
      },
    ],
    queryFn: () =>
      fetchProducts({
        categoryId: selectedCategoryId,
        search: debouncedSearch.trim().slice(0, 100),
      }),
  });

  const isLoading = categoriesQuery.isLoading || productsQuery.isLoading;
  const isRetrying = categoriesQuery.isRefetching || productsQuery.isRefetching;
  const error = categoriesQuery.error || productsQuery.error;

  const handleRetry = () => {
    if (categoriesQuery.isError) {
      void categoriesQuery.refetch();
    }
    if (productsQuery.isError) {
      void productsQuery.refetch();
    }
  };

  return (
    <Page className="bg-surface-muted min-h-screen">
      <Header title="Smart Canteen — Thực đơn" showBackIcon={false} />
      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        <section
          aria-label="Giới thiệu Smart Canteen"
          className="bg-white border border-brand-100 rounded-xl p-3 flex items-center justify-between gap-3"
        >
          <BrandLogo size="md" />
        </section>

        <Box className="space-y-3">
          <label htmlFor="menu-search" className="sr-only">
            Tìm kiếm món ăn
          </label>
          <Input.Search
            id="menu-search"
            placeholder="Tìm món ăn (ví dụ: Phở, Cơm sườn...)"
            value={searchInput}
            maxLength={100}
            onChange={(e) => setSearchInput(e.target.value.slice(0, 100))}
            clearable
          />
          {categoriesQuery.data ? (
            <CategoryFilterBar
              categories={categoriesQuery.data}
              selectedId={selectedCategoryId}
              onSelect={setSelectedCategoryId}
            />
          ) : null}
        </Box>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState
            message={
              error instanceof Error
                ? error.message
                : "Không thể kết nối máy chủ."
            }
            isRetrying={isRetrying}
            onRetry={handleRetry}
          />
        ) : !productsQuery.data || productsQuery.data.length === 0 ? (
          <EmptyState message="Không tìm thấy món phù hợp" />
        ) : (
          <section aria-label="Danh sách món ăn">
            <Text size="xSmall" className="text-gray-500 mb-2 block">
              Hiển thị {productsQuery.data.length} món
            </Text>
            <ul className="space-y-3">
              {productsQuery.data.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={(id) => navigate(`/products/${id}`)}
                />
              ))}
            </ul>
          </section>
        )}
      </main>
    </Page>
  );
}
