import {
  getAccessToken,
  getPhoneNumber,
  getUserID,
  getUserInfo,
} from "zmp-sdk";
import {
  apiGet,
  apiPost,
  getAuthToken,
  setAuthToken,
} from "@/lib/api-client";

export interface AuthUser {
  id: number;
  name: string;
  role: "customer" | "parent" | "student" | "staff" | "admin";
  effective_role?: "parent" | "student" | "staff" | "admin";
  can_manage_canteen?: boolean;
  zalo_user_id: string | null;
  phone?: string | null;
  phone_masked?: string | null;
  has_verified_phone?: boolean;
}

interface AuthSessionResponse {
  data: {
    token: string;
    user: AuthUser;
  };
}

interface ZaloSdkIdentity {
  accessToken: string | null;
  zaloUserId: string | null;
  name: string | null;
}

const ZMP_WEB_MOCK_USER_ID = "3368637342326461234";
const ZMP_SDK_TIMEOUT_MS = 8_000;

let inMemoryAuthUser: AuthUser | null = null;
const authListeners = new Set<(user: AuthUser | null) => void>();

function notifyAuthListeners(user: AuthUser | null): void {
  for (const listener of authListeners) {
    listener(user);
  }
}

export function subscribeAuthUser(
  listener: (user: AuthUser | null) => void,
): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export function clearAuthSession(): void {
  inMemoryAuthUser = null;
  setAuthToken(null);
  notifyAuthListeners(null);
}

function applyAuthenticatedSession(token: string, user: AuthUser): AuthUser {
  setAuthToken(token);
  inMemoryAuthUser = user;
  notifyAuthListeners(user);
  return user;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error("zmp sdk timeout")), timeoutMs),
    ),
  ]);
}

async function tryGetZaloSdkToken(): Promise<string | null> {
  try {
    const token = await withTimeout(getAccessToken({}), ZMP_SDK_TIMEOUT_MS);
    if (
      typeof token === "string" &&
      token.trim() !== "" &&
      token !== "DEFAULT_ACCESS_TOKEN"
    ) {
      return token.trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function tryGetZaloNativeUserId(): Promise<string | null> {
  try {
    const uid = await withTimeout(getUserID({}), 5_000);
    if (
      typeof uid === "string" &&
      uid.trim() !== "" &&
      uid.trim() !== ZMP_WEB_MOCK_USER_ID
    ) {
      return uid.trim();
    }
    return null;
  } catch {
    return null;
  }
}

async function tryGetZaloUserProfile(): Promise<{
  id: string | null;
  name: string | null;
}> {
  try {
    const res = await withTimeout(
      getUserInfo({ autoRequestPermission: false }),
      5_000,
    );
    const info = res?.userInfo;
    if (!info) {
      return { id: null, name: null };
    }
    const id =
      typeof info.id === "string" &&
      info.id.trim() !== "" &&
      info.id.trim() !== ZMP_WEB_MOCK_USER_ID
        ? info.id.trim()
        : null;
    const name =
      typeof info.name === "string" &&
      info.name.trim() !== "" &&
      info.name.trim() !== "User Name"
        ? info.name.trim()
        : null;
    return { id, name };
  } catch {
    return { id: null, name: null };
  }
}

async function collectZaloSdkIdentity(): Promise<ZaloSdkIdentity> {
  const [accessToken, nativeUserId, profile] = await Promise.all([
    tryGetZaloSdkToken(),
    tryGetZaloNativeUserId(),
    tryGetZaloUserProfile(),
  ]);

  return {
    accessToken,
    zaloUserId: nativeUserId || profile.id,
    name: profile.name,
  };
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiGet<{ data: AuthUser }>("/auth/me");
  inMemoryAuthUser = response.data;
  notifyAuthListeners(response.data);
  return response.data;
}

/**
 * Lazy auth hydration on app mount: only restores an existing Bearer token session,
 * never forcing login for public menu/product/cart browsing.
 */
export async function hydrateAuthSession(): Promise<AuthUser | null> {
  if (!getAuthToken()) {
    return null;
  }

  if (inMemoryAuthUser) {
    return inMemoryAuthUser;
  }

  try {
    return await fetchCurrentUser();
  } catch {
    clearAuthSession();
    return null;
  }
}

/**
 * Interactive Zalo Phone Authentication: calls zmp-sdk getAccessToken() + getPhoneNumber()
 * and exchanges the one-time phone token server-side via POST /api/v1/auth/zalo-phone.
 */
export async function loginWithZaloPhone(): Promise<AuthUser> {
  const identity = await collectZaloSdkIdentity();
  if (!identity.accessToken) {
    throw new Error(
      "Không lấy được phiên Zalo. Vui lòng mở Mini App trong ứng dụng Zalo hoặc dùng đăng nhập SĐT Demo ở môi trường Local.",
    );
  }

  let phoneToken: string | undefined;
  try {
    const phoneRes = await withTimeout(getPhoneNumber({}), 15_000);
    phoneToken =
      typeof phoneRes?.token === "string" && phoneRes.token.trim() !== ""
        ? phoneRes.token.trim()
        : undefined;
  } catch {
    throw new Error(
      "Bạn đã từ chối chia sẻ số điện thoại Zalo hoặc thiết bị không hỗ trợ getPhoneNumber.",
    );
  }

  if (!phoneToken) {
    throw new Error(
      "Không nhận được mã xác thực số điện thoại từ Zalo. Vui lòng thử lại trên ứng dụng Zalo.",
    );
  }

  const response = await apiPost<AuthSessionResponse>("/auth/zalo-phone", {
    access_token: identity.accessToken,
    phone_token: phoneToken,
    name: identity.name ?? undefined,
  });

  return applyAuthenticatedSession(response.data.token, response.data.user);
}

/**
 * Local/Dev/Testing fallback login by phone number (disabled with 403 in production).
 */
export async function loginWithDemoPhone(
  phoneNumber: string,
  name?: string,
): Promise<AuthUser> {
  const response = await apiPost<AuthSessionResponse>("/auth/demo-phone", {
    phone_number: phoneNumber.trim(),
    name: name && name.trim() !== "" ? name.trim() : undefined,
  });

  return applyAuthenticatedSession(response.data.token, response.data.user);
}

export async function logoutSession(): Promise<void> {
  if (getAuthToken()) {
    try {
      await apiPost<{ message: string }>("/auth/logout");
    } catch {
      // Ignore network/401 errors while clearing local session
    }
  }
  clearAuthSession();
}

export async function ensureAuthenticated(): Promise<AuthUser> {
  if (getAuthToken() && inMemoryAuthUser) {
    return inMemoryAuthUser;
  }

  const hydrated = await hydrateAuthSession();
  if (hydrated) {
    return hydrated;
  }

  throw new Error(
    "Vui lòng đăng nhập bằng số điện thoại Zalo để sử dụng tính năng này.",
  );
}
