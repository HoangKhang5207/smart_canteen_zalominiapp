import {
  type PaginatedResult,
  type PaginationMeta,
  normalizePaginatedResult,
} from "@/components/pagination-bar";
import { ensureAuthenticated } from "@/features/auth/api";
import { apiGet, apiPost } from "@/lib/api-client";
import type { Order } from "./types";

interface DataEnvelope<T> {
  data: T;
  meta?: Partial<PaginationMeta>;
}

export interface CreateOrderInput {
  items: { product_id: number; quantity: number }[];
  note?: string;
}

export async function createOrder(
  input: CreateOrderInput,
  idempotencyKey: string,
): Promise<Order> {
  await ensureAuthenticated();
  const response = await apiPost<DataEnvelope<Order>>("/orders", input, {
    headers: {
      "Idempotency-Key": idempotencyKey,
    },
  });
  return response.data;
}

export async function fetchPaginatedMyOrders(query?: {
  page?: number;
  perPage?: number;
}): Promise<PaginatedResult<Order>> {
  await ensureAuthenticated();
  const response = await apiGet<DataEnvelope<Order[]>>("/orders", {
    page: query?.page,
    per_page: query?.perPage,
  });

  return normalizePaginatedResult(
    response,
    query?.page ?? 1,
    query?.perPage ?? 10,
  );
}

export async function fetchMyOrders(): Promise<Order[]> {
  const paginated = await fetchPaginatedMyOrders();
  return paginated.data;
}

export async function fetchOrder(id: number): Promise<Order> {
  await ensureAuthenticated();
  const response = await apiGet<DataEnvelope<Order>>(`/orders/${id}`);
  return response.data;
}
