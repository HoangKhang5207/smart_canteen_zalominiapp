import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header, Page, useNavigate } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { fetchPaginatedMyOrders } from "@/features/orders/api";
import { getOrderStatusMeta } from "@/features/orders/status";
import { formatVnd } from "@/lib/format";

const ORDERS_PER_PAGE = 6;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);

  const ordersQuery = useQuery({
    queryKey: ["my-orders", { page: currentPage, perPage: ORDERS_PER_PAGE }],
    queryFn: () =>
      fetchPaginatedMyOrders({
        page: currentPage,
        perPage: ORDERS_PER_PAGE,
      }),
    refetchInterval: 10_000,
  });

  const orders = ordersQuery.data?.data ?? [];
  const paginationMeta = ordersQuery.data?.meta;

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header
        title="Đơn hàng của tôi"
        onBackClick={() => navigate("/")}
      />
      <main className="p-11 space-y-3 max-w-2xl mx-auto">
        {ordersQuery.isLoading ? (
          <LoadingState label="Đang tải lịch sử đơn hàng..." />
        ) : ordersQuery.error ? (
          <ErrorState
            message={
              ordersQuery.error instanceof Error
                ? ordersQuery.error.message
                : "Không thể tải danh sách đơn hàng."
            }
            isRetrying={ordersQuery.isRefetching}
            onRetry={() => void ordersQuery.refetch()}
          />
        ) : orders.length === 0 ? (
          <EmptyState
            message="Bạn chưa có đơn hàng nào."
            actionLabel="Đặt món ngay"
            onAction={() => navigate("/")}
          />
        ) : (
          <section className="space-y-3" aria-label="Danh sách đơn hàng của tôi">
            <ul className="space-y-3">
              {orders.map((order) => {
                const statusMeta = getOrderStatusMeta(order.status);
                const totalCount = order.items.reduce(
                  (acc, item) => acc + item.quantity,
                  0,
                );
                return (
                  <li key={order.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="w-full text-left bg-white border border-gray-200 rounded-xl p-4 space-y-2 hover:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-700 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-bold text-gray-900">
                          {order.code}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <p className="text-xs text-gray-600 truncate">
                        {order.items
                          .map(
                            (item) =>
                              `${item.quantity}× ${item.product_name || `Món #${item.product_id}`
                              }`,
                          )
                          .join(", ")}
                      </p>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                        <span className="text-gray-500">
                          {totalCount} phần ·{" "}
                          {new Date(order.created_at).toLocaleTimeString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </span>
                        <span className="text-sm font-bold text-brand-700">
                          {formatVnd(order.total_amount)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {paginationMeta ? (
              <PaginationBar
                meta={paginationMeta}
                onPageChange={setCurrentPage}
                itemLabel="đơn hàng"
                disabled={ordersQuery.isFetching}
              />
            ) : null}
          </section>
        )}
      </main>
      <BottomNav />
    </Page>
  );
}
