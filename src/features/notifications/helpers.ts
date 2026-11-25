import type { NotificationSeverity } from "./types";

export function isSafeInternalRoute(path?: string | null): boolean {
  if (!path) {
    return false;
  }
  const trimmed = path.trim();
  return /^\/(?![/\\])[^\s\x00-\x1f\x7f]*$/.test(trimmed);
}

export function getNotificationTone(severity: NotificationSeverity): {
  badgeClass: string;
  label: string;
} {
  switch (severity) {
    case "SUCCESS":
      return {
        badgeClass: "bg-brand-100 text-brand-900 border-brand-200",
        label: "Thành công",
      };
    case "WARNING":
      return {
        badgeClass: "bg-amber-100 text-amber-900 border-amber-200",
        label: "Cảnh báo",
      };
    case "ERROR":
      return {
        badgeClass: "bg-red-100 text-red-800 border-red-200",
        label: "Cần chú ý",
      };
    default:
      return {
        badgeClass: "bg-blue-100 text-blue-800 border-blue-200",
        label: "Thông tin",
      };
  }
}

export function formatUnreadBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) {
    return null;
  }
  return count > 99 ? "99+" : String(Math.floor(count));
}
