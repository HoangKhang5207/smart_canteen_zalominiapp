import React, { useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { useQuery } from "@tanstack/react-query";
import { Header, Page, useNavigate } from "zmp-ui";
import { BottomNav } from "@/components/bottom-nav";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-views";
import { StudentCardView } from "@/components/student-card-view";
import { fetchMyStudentCards } from "@/features/canteen/api";
import {
  bankLinkDraftAtom,
  bankLinkSuccessBannerAtom,
  EMPTY_BANK_LINK_FORM,
} from "@/features/canteen/store";

export default function CanteenHubPage() {
  const navigate = useNavigate();
  const [selectedCardId, setSelectedCardId] = useState<number | null>(null);
  const [successBanner, setSuccessBanner] = useAtom(bankLinkSuccessBannerAtom);
  const setDraft = useSetAtom(bankLinkDraftAtom);

  const cardsQuery = useQuery({
    queryKey: ["canteen-cards"],
    queryFn: fetchMyStudentCards,
  });

  const cards = cardsQuery.data ?? [];
  const activeCard =
    cards.find((item) => item.id === selectedCardId) ?? cards[0] ?? null;

  const handleStartBankLink = () => {
    if (!activeCard) {
      return;
    }
    setSuccessBanner(null);
    setDraft({
      cardId: activeCard.id,
      values: { ...EMPTY_BANK_LINK_FORM },
    });
    navigate("/canteen/link-bank");
  };

  return (
    <Page className="bg-surface-muted min-h-screen pb-24">
      <Header title="Căn tin số" showBackIcon={false} />

      <main className="app-main space-y-4 max-w-2xl mx-auto">
        {successBanner ? (
          <div
            role="status"
            className="bg-brand-50 border border-brand-500/40 rounded-xl p-3.5 flex items-start justify-between gap-3"
          >
            <div className="space-y-0.5">
              <p className="text-sm font-semibold text-brand-900">
                Liên kết ngân hàng thành công
              </p>
              <p className="text-xs text-brand-800">{successBanner}</p>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              aria-label="Đóng thông báo"
              className="text-xs font-semibold text-brand-700 hover:text-brand-900 px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-brand-700"
            >
              Đóng
            </button>
          </div>
        ) : null}

        {cardsQuery.isLoading ? (
          <LoadingState label="Đang tải thông tin thẻ học sinh..." />
        ) : cardsQuery.error ? (
          <ErrorState
            message={
              cardsQuery.error instanceof Error
                ? cardsQuery.error.message
                : "Không thể tải thông tin thẻ học sinh."
            }
            isRetrying={cardsQuery.isRefetching}
            onRetry={() => void cardsQuery.refetch()}
          />
        ) : !activeCard ? (
          <EmptyState
            message="Tài khoản chưa được gắn thẻ học sinh thông minh."
            actionLabel="Quay về Thực đơn"
            onAction={() => navigate("/")}
          />
        ) : (
          <>
            {cards.length > 1 ? (
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                role="tablist"
                aria-label="Chọn thẻ học sinh"
              >
                {cards.map((card) => {
                  const isSelected = card.id === activeCard.id;
                  return (
                    <button
                      key={card.id}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      onClick={() => setSelectedCardId(card.id)}
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

            <StudentCardView card={activeCard} />

            {activeCard.is_bank_linked && activeCard.bank_link ? (
              <section
                aria-label="Tài khoản ngân hàng đã liên kết"
                className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Tài khoản ngân hàng liên kết
                    </h3>
                    <p className="text-xs text-gray-600">
                      Dịch vụ trích nợ tự động đã kích hoạt
                    </p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-100 text-brand-900">
                    Đã liên kết
                  </span>
                </div>

                <dl className="divide-y divide-gray-100 text-sm">
                  <div className="py-2 flex items-center justify-between gap-2">
                    <dt className="text-gray-600">Ngân hàng</dt>
                    <dd className="font-semibold text-gray-900">
                      {activeCard.bank_link.bank_name}
                    </dd>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <dt className="text-gray-600">Số tài khoản</dt>
                    <dd className="font-mono font-semibold text-gray-900">
                      {activeCard.bank_link.account_number_masked}
                    </dd>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <dt className="text-gray-600">Chủ tài khoản</dt>
                    <dd className="font-semibold text-gray-900 text-right">
                      {activeCard.bank_link.account_holder_name}
                    </dd>
                  </div>
                  <div className="py-2 flex items-center justify-between gap-2">
                    <dt className="text-gray-600">Số điện thoại OTP</dt>
                    <dd className="font-mono text-gray-900">
                      {activeCard.bank_link.phone_masked}
                    </dd>
                  </div>
                  {activeCard.bank_link.linked_at ? (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <dt className="text-gray-600">Thời điểm liên kết</dt>
                      <dd className="text-xs text-gray-700">
                        {new Date(
                          activeCard.bank_link.linked_at,
                        ).toLocaleString("vi-VN")}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="rounded-lg bg-surface-muted border border-gray-200 p-3 text-xs text-gray-600">
                  Quản lý hạn mức chi tiêu hằng ngày (Slice D2) và hủy liên kết
                  qua OTP (Slice D3) sẽ được kích hoạt ngay trên thẻ này ở các
                  đợt nâng cấp kế tiếp.
                </div>
              </section>
            ) : (
              <section
                aria-label="Đăng ký liên kết ngân hàng"
                className="bg-white border border-gray-200 rounded-xl p-4 space-y-3"
              >
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-gray-900">
                    Liên kết tài khoản ngân hàng
                  </h3>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Đăng ký trích nợ tự động giữa tài khoản ngân hàng của phụ
                    huynh với thẻ học sinh thông minh để quản lý chi tiêu không
                    tiền mặt tại căn tin trường.
                  </p>
                </div>

                {activeCard.status !== "ACTIVE" ? (
                  <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    Thẻ học sinh hiện không ở trạng thái hoạt động nên chưa thể
                    liên kết ngân hàng.
                  </p>
                ) : null}

                <button
                  type="button"
                  disabled={activeCard.status !== "ACTIVE"}
                  onClick={handleStartBankLink}
                  className="w-full py-3 px-4 rounded-lg text-sm font-semibold text-white bg-brand-700 hover:bg-brand-800 disabled:bg-gray-300 disabled:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-700"
                >
                  Liên kết tài khoản ngân hàng
                </button>
              </section>
            )}

            <section
              aria-label="Cam kết bảo mật thông tin"
              className="bg-brand-50/70 border border-brand-100 rounded-xl p-3.5 text-xs text-brand-900 space-y-1"
            >
              <p className="font-semibold">Bảo mật &amp; Mã hóa thông tin</p>
              <p className="text-brand-800 leading-relaxed">
                Số tài khoản ngân hàng và số CCCD được mã hóa chuẩn AES-256 khi
                lưu trữ, luôn che giấu một phần khi hiển thị và mọi giao dịch
                liên kết đều bắt buộc xác thực bằng mã OTP 6 chữ số.
              </p>
            </section>
          </>
        )}
      </main>

      <BottomNav />
    </Page>
  );
}
