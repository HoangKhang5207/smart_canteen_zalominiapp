import React, { useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { useQuery } from "@tanstack/react-query";
import { Header, Page, useNavigate } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { PaginationBar } from "@/components/pagination-bar";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { ZaloPhoneLoginPanel } from "@/components/zalo-phone-login";
import { authHydratedAtom, currentUserAtom } from "@/features/auth/store";
import {
  fetchCardLimitLogs,
  fetchMyStudentCards,
} from "@/features/canteen/api";
import { selectedCardIdAtom } from "@/features/canteen/store";
import { formatVnd } from "@/lib/format";

const LOGS_PER_PAGE = 10;

export default function LimitHistoryPage() {
  const navigate = useNavigate();
  const currentUser = useAtomValue(currentUserAtom);
  const authHydrated = useAtomValue(authHydratedAtom);
  const [page, setPage] = useState(1);
  const [selectedCardId, setSelectedCardId] = useAtom(selectedCardIdAtom);

  const cardsQuery = useQuery({
    queryKey: ["canteen-cards", currentUser?.id ?? null],
    queryFn: fetchMyStudentCards,
    enabled: Boolean(currentUser),
  });

  const cards = cardsQuery.data ?? [];
  const activeCard =
    cards.find((item) => item.id === selectedCardId) ?? cards[0] ?? null;

  const logsQuery = useQuery({
    queryKey: [
      "canteen-limit-logs",
      activeCard?.id ?? null,
      { page, perPage: LOGS_PER_PAGE },
    ],
    queryFn: () =>
      fetchCardLimitLogs(activeCard!.id, { page, perPage: LOGS_PER_PAGE }),
    enabled: activeCard !== null,
  });

  const logs = logsQuery.data?.data ?? [];
  const meta = logsQuery.data?.meta;

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header
        title="Lịch sử hạn mức"
        onBackClick={() => navigate("/canteen")}
      />

      <main className="app-main max-w-2xl mx-auto space-y-3">
        {!authHydrated ? (
          <LoadingState label="Đang kiểm tra phiên đăng nhập..." />
        ) : !currentUser ? (
          <ZaloPhoneLoginPanel title="Đăng nhập để xem lịch sử hạn mức" />
        ) : cardsQuery.isLoading || (activeCard && logsQuery.isLoading) ? (
          <LoadingState label="Đang tải lịch sử thay đổi hạn mức..." />
        ) : cardsQuery.error || logsQuery.error ? (
          <ErrorState
            message="Không thể tải lịch sử hạn mức chi tiêu."
            onRetry={() => {
              void cardsQuery.refetch();
              if (activeCard) {
                void logsQuery.refetch();
              }
            }}
          />
        ) : !activeCard ? (
          <EmptyState
            message="Chưa tìm thấy thẻ học sinh."
            actionLabel="Quay lại Căn tin số"
            onAction={() => navigate("/canteen")}
          />
        ) : logs.length === 0 ? (
          <EmptyState
            message="Chưa có lịch sử thay đổi hạn mức chi tiêu nào cho thẻ này."
            actionLabel="Thiết lập hạn mức"
            onAction={() => navigate("/canteen")}
          />
        ) : (
          <>
            {cards.length > 1 ? (
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                role="tablist"
                aria-label="Chọn thẻ học sinh để xem lịch sử hạn mức"
              >
                {cards.map((card) => {
                  const isSelected = card.id === activeCard.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedCardId(card.id);
                        setPage(1);
                      }}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-brand-700 ${
                        isSelected
                          ? "bg-brand-700 text-white border-brand-700"
                          : "bg-white text-gray-700 border-gray-200 hover:border-brand-500"
                      }`}
                    >
                      {card.student.full_name} ({card.student.class_name})
                    </button>
                  );
                })}
              </div>
            ) : null}

            <div className="bg-brand-50 border border-brand-100 rounded-xl p-3 text-xs text-brand-900 flex items-center justify-between gap-2">
              <span>
                Thẻ <strong className="font-mono">{activeCard.card_code}</strong>{" "}
                · {activeCard.student.full_name}
              </span>
              <span className="font-semibold text-brand-700">
                Hiện tại: {formatVnd(activeCard.spending_limit.daily_limit)}/ngày
              </span>
            </div>

            <ul
              className="space-y-2.5"
              aria-label="Danh sách lịch sử thay đổi hạn mức"
            >
              {logs.map((entry) => {
                const isIncrease = entry.new_limit >= entry.previous_limit;
                return (
                  <li
                    key={entry.id}
                    className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-gray-900">
                        {formatVnd(entry.previous_limit)} →{" "}
                        <span
                          className={
                            isIncrease ? "text-brand-700" : "text-amber-700"
                          }
                        >
                          {formatVnd(entry.new_limit)}/ngày
                        </span>
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          entry.new_limit === 0
                            ? "bg-red-100 text-red-800"
                            : isIncrease
                              ? "bg-brand-100 text-brand-900"
                              : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {entry.new_limit === 0
                          ? "Tạm khóa chi"
                          : isIncrease
                            ? "Tăng hạn mức"
                            : "Giảm hạn mức"}
                      </span>
                    </div>

                    {entry.reason ? (
                      <p className="text-xs text-gray-700">{entry.reason}</p>
                    ) : null}

                    <p className="text-[11px] text-gray-500">
                      {new Date(entry.created_at).toLocaleString("vi-VN", {
                        timeZone: "Asia/Ho_Chi_Minh",
                      })}
                      {entry.changed_by_name
                        ? ` · ${entry.changed_by_name}`
                        : ""}
                    </p>
                  </li>
                );
              })}
            </ul>

            {meta ? (
              <PaginationBar
                meta={meta}
                onPageChange={setPage}
                itemLabel="bản ghi"
                disabled={logsQuery.isFetching}
              />
            ) : null}
          </>
        )}
      </main>

      <BottomNav />
    </Page>
  );
}
