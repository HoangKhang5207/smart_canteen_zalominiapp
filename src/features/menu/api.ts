import {
  type PaginatedResult,
  type PaginationMeta,
  normalizePaginatedResult,
} from "@/components/pagination-bar";
import { apiGet } from "@/lib/api-client";
import type { Category, Product } from "./types";

interface DataEnvelope<T> {
  data: T;
  meta?: Partial<PaginationMeta>;
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiGet<DataEnvelope<Category[]>>("/categories");
  return response.data;
}

export async function fetchPaginatedProducts(query?: {
  categoryId?: number;
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<PaginatedResult<Product>> {
  const response = await apiGet<DataEnvelope<Product[]>>("/products", {
    category_id: query?.categoryId,
    search: query?.search,
    page: query?.page,
    per_page: query?.perPage,
  });

  return normalizePaginatedResult(
    response,
    query?.page ?? 1,
    query?.perPage ?? 12,
  );
}

export async function fetchProducts(query?: {
  categoryId?: number;
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<Product[]> {
  const paginated = await fetchPaginatedProducts(query);
  return paginated.data;
}

export async function fetchProduct(id: number): Promise<Product> {
  const response = await apiGet<DataEnvelope<Product>>(`/products/${id}`);
  return response.data;
}
