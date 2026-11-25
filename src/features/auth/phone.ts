export const VIETNAM_MOBILE_REGEX = /^0[35789]\d{8}$/;

export function normalizeVietnamPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s.\-()]+/g, "").trim();
  if (cleaned === "") {
    return null;
  }

  let candidate = cleaned;
  if (candidate.startsWith("+84")) {
    candidate = `0${candidate.slice(3)}`;
  } else if (candidate.startsWith("84") && candidate.length === 11) {
    candidate = `0${candidate.slice(2)}`;
  }

  return VIETNAM_MOBILE_REGEX.test(candidate) ? candidate : null;
}

export function validateVietnamPhone(raw: string): string | null {
  if (raw.trim() === "") {
    return "Vui lòng nhập số điện thoại di động Việt Nam.";
  }
  if (!normalizeVietnamPhone(raw)) {
    return "Số điện thoại phải gồm 10 chữ số hợp lệ (ví dụ: 0901234567).";
  }
  return null;
}

export function isPublicRoute(pathname: string): boolean {
  if (pathname === "/" || pathname === "/cart") {
    return true;
  }
  return /^\/products\/\d+$/.test(pathname);
}
