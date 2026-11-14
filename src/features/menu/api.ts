import { apiGet } from "@/lib/api-client";
import type { Category, Product } from "./types";

interface DataEnvelope<T> {
  data: T;
}

export async function fetchCategories(): Promise<Category[]> {
  const response = await apiGet<DataEnvelope<Category[]>>("/categories");
  return response.data;
}

export async function fetchProducts(query?: {
  categoryId?: number;
  search?: string;
}): Promise<Product[]> {
  const response = await apiGet<DataEnvelope<Product[]>>("/products", {
    category_id: query?.categoryId,
    search: query?.search,
  });
  return response.data;
}

export async function fetchProduct(id: number): Promise<Product> {
  const response = await apiGet<DataEnvelope<Product>>(`/products/${id}`);
  return response.data;
}
