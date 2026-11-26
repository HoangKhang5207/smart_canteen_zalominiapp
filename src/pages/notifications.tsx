import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Header, Page, useNavigate, useSnackbar } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { ZaloPhoneLoginPanel } from "@/components/zalo-phone-login";
import { authHydratedAtom, currentUserAtom } from "@/features/auth/store";
import {
  fetchNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/features/notifications/api";
import {
  getNotificationTone,
  isSafeInternalRoute,
} from "@/features/notifications/helpers";
import type { CanteenNotification } from "@/features/notifications/types";

const PER_PAGE = 10;

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { openSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const currentUser = useAtomValue(currentUserAtom);
  const authHydrated = useAtomValue(authHydratedAtom);

  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);

  const notificationsQuery = useQuery({
    queryKey: [
      "notifications",
      currentUser?.id ?? null,
      { page, perPage: PER_PAGE, unreadOnly },
    ],
    queryFn: () =>
      fetchNotifications({ page, perPage: PER_PAGE, unreadOnly }),
    enabled: Boolean(currentUser),
    refetchInterval: 20_000,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => markNotificationAsRead(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread"],
      });
    },
    onError: () => {
      openSnackbar({
        text: "Không thể cập nhật trạng thái đã đọc. Vui lòng thử lại.",
        duration: 2000,
      });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: (marked) => {
      setPage(1);
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
      void queryClient.invalidateQueries({
        queryKey: ["notifications-unread"],
      });
      if (marked > 0) {
        openSnackbar({
          text: `Đã đánh dấu ${marked} thông báo là đã đọc.`,
          duration: 1800,
        });
      }
    },
    onError: () => {
      openSnackbar({
        text: "Không thể đánh dấu tất cả đã đọc. Vui lòng thử lại.",
        duration: 2000,
      });
    },
  });

  const handleOpenNotification = (item: CanteenNotification) => {
    if (!item.is_read) {
      markReadMutation.mutate(item.id);
    }
    if (isSafeInternalRoute(item.action_url)) {
      navigate(item.action_url!.trim());
    }
  };

  const items = notificationsQuery.data?.data ?? [];
  const meta = notificationsQuery.data?.meta;
  const unreadCount = meta?.unread_count ?? 0;

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header title="Thông báo" onBackClick={() => navigate("/")} />

      <main className="app-main space-y-3 max-w-2xl mx-auto">
        {!authHydrated ? (
          <LoadingState label="Đang kiểm tra phiên đăng nhập..." />
        ) : !currentUser ? (
          <ZaloPhoneLoginPanel
            title="Đăng nhập để xem thông báo giao dịch"
            description="Nhận thông báo tức thì khi học sinh mua hàng tại căn tin, sắp chạm hạn mức ngày hoặc có biến động liên kết ngân hàng."
          />
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <div
                className="inline-flex rounded-lg bg-white border border-gray-200 p-0.5"
                role="tablist"
                aria-label="Lọc thông báo"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={!unreadOnly}
                  onClick={() => {
                    setUnreadOnly(false);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                    !unreadOnly
                      ? "bg-brand-700 text-white"
                      : "text-gray-700 hover:text-brand-700"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={unreadOnly}
                  onClick={() => {
                    setUnreadOnly(true);
                    setPage(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                    unreadOnly
                      ? "bg-brand-700 text-white"
                      : "text-gray-700 hover:text-brand-700"
                  }`}
                >
                  Chưa đọc ({unreadCount})
                </button>
              </div>

              {unreadCount > 0 ? (
                <button
                  type="button"
                  disabled={markAllMutation.isPending}
                  onClick={() => markAllMutation.mutate()}
                  className="text-xs font-semibold text-brand-700 hover:text-brand-800 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-brand-700 rounded px-2 py-1"
                >
                  Đọc tất cả
                </button>
              ) : null}
            </div>

            {notificationsQuery.isLoading ? (
              <LoadingState label="Đang tải danh sách thông báo..." />
            ) : notificationsQuery.error ? (
              <ErrorState
                message="Không thể tải thông báo. Vui lòng thử lại."
                isRetrying={notificationsQuery.isRefetching}
                onRetry={() => void notificationsQuery.refetch()}
              />
            ) : items.length === 0 ? (
              <EmptyState
                message={
                  unreadOnly
                    ? "Bạn không có thông báo chưa đọc nào."
                    : "Chưa có thông báo giao dịch nào."
                }
                actionLabel="Về Thực đơn"
                onAction={() => navigate("/")}
              />
            ) : (
              <section aria-label="Danh sách thông báo" className="space-y-2.5">
                <ul className="space-y-2.5">
                  {items.map((item) => {
                    const tone = getNotificationTone(item.severity);
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => handleOpenNotification(item)}
                          className={`w-full text-left rounded-xl p-3.5 border transition-colors space-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                            item.is_read
                              ? "bg-white border-gray-200 hover:border-brand-400"
                              : "bg-brand-50/50 border-brand-200 hover:border-brand-600"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-1.5 min-w-0">
                              {!item.is_read ? (
                                <>
                                  <span
                                    aria-hidden="true"
                                    className="w-2 h-2 mt-1.5 rounded-full bg-brand-700 shrink-0"
                                  />
                                  <span className="sr-only">Chưa đọc: </span>
                                </>
                              ) : null}
                              <h2 className="text-sm font-bold text-gray-900 line-clamp-2">
                                {item.title}
                              </h2>
                            </div>
                            <span
                              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${tone.badgeClass}`}
                            >
                              {tone.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {item.body}
                          </p>
                          <p className="text-[11px] text-gray-500">
                            {new Date(item.created_at).toLocaleString("vi-VN", {
                              timeZone: "Asia/Ho_Chi_Minh",
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </p>
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {meta ? (
                  <PaginationBar
                    meta={meta}
                    onPageChange={setPage}
                    itemLabel="thông báo"
                    disabled={notificationsQuery.isFetching}
                  />
                ) : null}
              </section>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </Page>
  );
}
