import React, { useEffect, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { useQuery } from "@tanstack/react-query";
import { Box, Header, Input, Page, Text, useNavigate, useSnackbar } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { BrandLogo } from "@/components/brand-logo";
import { PaginationBar } from "@/components/pagination-bar";
import { ProductImage } from "@/components/product-image";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { currentUserAtom } from "@/features/auth/store";
import { addCartItem } from "@/features/cart/cart-logic";
import { cartItemsAtom, cartTotalsAtom } from "@/features/cart/store";
import { fetchCategories, fetchPaginatedProducts } from "@/features/menu/api";
import type { Category, Product } from "@/features/menu/types";
import { formatVnd } from "@/lib/format";

const MENU_PER_PAGE = 8;

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
        className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${selectedId === undefined
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
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${active
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
  onAdd,
}: {
  product: Product;
  onOpen: (id: number) => void;
  onAdd: (product: Product) => void;
}) {
  return (
    <li className="bg-white border border-gray-200 rounded-xl p-3 flex items-start gap-3 hover:border-brand-500 transition-colors">
      <button
        type="button"
        onClick={() => onOpen(product.id)}
        className="flex-1 min-w-0 text-left flex items-start gap-3 focus:outline-none focus:ring-2 focus:ring-brand-700 rounded-lg"
      >
        <ProductImage
          imageUrl={product.image_url}
          alt={product.name}
          variant="card"
        />
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

      {product.is_available ? (
        <button
          type="button"
          onClick={() => onAdd(product)}
          aria-label={`Thêm ${product.name} vào giỏ hàng`}
          className="shrink-0 self-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-700 text-white hover:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-700 transition-colors"
        >
          + Thêm
        </button>
      ) : null}
    </li>
  );
}

export default function MenuPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const currentUser = useAtomValue(currentUserAtom);
  const setCartItems = useSetAtom(cartItemsAtom);
  const { totalQuantity, estimatedAmount } = useAtomValue(cartTotalsAtom);

  const [selectedCategoryId, setSelectedCategoryId] = useState<
    number | undefined
  >(undefined);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const normalizedSearch = debouncedSearch.trim().slice(0, 100);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategoryId, normalizedSearch]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const productsQuery = useQuery({
    queryKey: [
      "products",
      {
        categoryId: selectedCategoryId,
        search: normalizedSearch,
        page: currentPage,
        perPage: MENU_PER_PAGE,
      },
    ],
    queryFn: () =>
      fetchPaginatedProducts({
        categoryId: selectedCategoryId,
        search: normalizedSearch,
        page: currentPage,
        perPage: MENU_PER_PAGE,
      }),
  });

  const isLoading = categoriesQuery.isLoading || productsQuery.isLoading;
  const isRetrying = categoriesQuery.isRefetching || productsQuery.isRefetching;
  const error = categoriesQuery.error || productsQuery.error;
  const products = productsQuery.data?.data ?? [];
  const paginationMeta = productsQuery.data?.meta;

  const handleSelectCategory = (categoryId: number | undefined) => {
    setSelectedCategoryId(categoryId);
    setCurrentPage(1);
  };

  const handleRetry = () => {
    if (categoriesQuery.isError) {
      void categoriesQuery.refetch();
    }
    if (productsQuery.isError) {
      void productsQuery.refetch();
    }
  };

  const handleAddProduct = (product: Product) => {
    setCartItems((prev) => addCartItem(prev, product, 1));
    openSnackbar({
      text: `Đã thêm "${product.name}" vào giỏ hàng`,
      duration: 1800,
    });
  };

  return (
    <Page className="bg-surface-muted min-h-screen pb-28">
      <Header title="Smart Canteen — Thực đơn" showBackIcon={false} />
      <main className="p-11 space-y-11 max-w-2xl mx-auto">
        <section
          aria-label="Giới thiệu Smart Canteen"
          className="bg-white border border-brand-100 rounded-xl p-3 flex items-center justify-between gap-3"
        >
          <BrandLogo size="md" />
          {currentUser ? (
            <span className="shrink-0 text-xs font-medium px-2.5 py-1 rounded-full bg-brand-50 text-brand-900 border border-brand-100">
              {currentUser.name}
            </span>
          ) : null}
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
              onSelect={handleSelectCategory}
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
        ) : products.length === 0 ? (
          <EmptyState message="Không tìm thấy món phù hợp" />
        ) : (
          <section aria-label="Danh sách món ăn" className="space-y-3">
            <Text size="xSmall" className="text-gray-500 block">
              Hiển thị {paginationMeta?.from ?? 1}–
              {paginationMeta?.to ?? products.length} trong tổng số{" "}
              {paginationMeta?.total ?? products.length} món
            </Text>
            <ul className="space-y-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onOpen={(id) => navigate(`/products/${id}`)}
                  onAdd={handleAddProduct}
                />
              ))}
            </ul>
            {paginationMeta ? (
              <PaginationBar
                meta={paginationMeta}
                onPageChange={setCurrentPage}
                itemLabel="món"
                disabled={productsQuery.isFetching}
              />
            ) : null}
          </section>
        )}
      </main>

      {totalQuantity > 0 ? (
        <div className="fixed bottom-16 inset-x-0 z-20 px-4">
          <div className="max-w-2xl mx-auto bg-brand-900 text-white rounded-xl p-3 shadow-md flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-brand-100">
                Giỏ hàng ({totalQuantity} món)
              </p>
              <p className="text-sm font-bold truncate">
                Tạm tính: {formatVnd(estimatedAmount)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/cart")}
              className="shrink-0 px-4 py-2 rounded-lg text-xs font-bold bg-brand-500 text-gray-950 hover:bg-brand-200 focus:outline-none focus:ring-2 focus:ring-white transition-colors"
            >
              Xem giỏ & Đặt món
            </button>
          </div>
        </div>
      ) : null}

      <BottomNav />
    </Page>
  );
}
