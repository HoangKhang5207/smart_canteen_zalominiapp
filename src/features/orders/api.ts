import { ensureAuthenticated } from "@/features/auth/api";
import { apiGet, apiPost } from "@/lib/api-client";
import type { Order } from "./types";

interface DataEnvelope<T> {
  data: T;
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

export async function fetchMyOrders(): Promise<Order[]> {
  await ensureAuthenticated();
  const response = await apiGet<DataEnvelope<Order[]>>("/orders");
  return response.data;
}

export async function fetchOrder(id: number): Promise<Order> {
  await ensureAuthenticated();
  const response = await apiGet<DataEnvelope<Order>>(`/orders/${id}`);
  return response.data;
}
