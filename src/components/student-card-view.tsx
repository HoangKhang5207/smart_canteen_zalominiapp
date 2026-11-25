import React from "react";
import type { StudentCard, StudentCardStatus } from "@/features/canteen/types";

interface StudentCardViewProps {
  card: StudentCard;
}

const STATUS_META: Record<
  StudentCardStatus,
  { label: string; dotClass: string; badgeClass: string }
> = {
  ACTIVE: {
    label: "Đang hoạt động",
    dotClass: "bg-brand-500",
    badgeClass: "bg-white/15 text-white border-white/25",
  },
  LOCKED: {
    label: "Đang tạm khóa",
    dotClass: "bg-amber-400",
    badgeClass: "bg-amber-500/20 text-amber-100 border-amber-300/40",
  },
  REVOKED: {
    label: "Đã thu hồi",
    dotClass: "bg-red-400",
    badgeClass: "bg-red-500/20 text-red-100 border-red-300/40",
  },
};

export function StudentCardView({ card }: StudentCardViewProps) {
  const statusMeta = STATUS_META[card.status];

  return (
    <section
      aria-label="Thẻ học sinh thông minh"
      className="rounded-xl bg-gradient-to-br from-brand-800 to-brand-900 text-white p-4 shadow-sm border border-brand-900 space-y-4"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-medium text-brand-100 truncate">
            {card.student.school_name}
          </p>
          <h2 className="text-base font-bold tracking-tight text-white">
            Thẻ học sinh thông minh
          </h2>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border shrink-0 ${statusMeta.badgeClass}`}
        >
          <span
            aria-hidden="true"
            className={`w-2 h-2 rounded-full ${statusMeta.dotClass}`}
          />
          {statusMeta.label}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 pt-1">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-brand-100">
            Mã thẻ
          </p>
          <p className="font-mono text-xl font-bold tracking-widest text-white">
            {card.card_code}
          </p>
        </div>

        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
            card.is_bank_linked
              ? "bg-brand-100 text-brand-900 border-brand-100"
              : "bg-white/10 text-brand-50 border-white/25"
          }`}
        >
          {card.is_bank_linked
            ? `Đã liên kết · ${card.bank_link?.bank_name ?? "Ngân hàng"}`
            : "Chưa liên kết ngân hàng"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/15">
        <div className="col-span-2 min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-brand-100">
            Học sinh
          </p>
          <p className="text-sm font-semibold text-white truncate">
            {card.student.full_name}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wider text-brand-100">
            Lớp
          </p>
          <p className="text-sm font-semibold text-white">
            {card.student.class_name}
          </p>
        </div>
      </div>
    </section>
  );
}
