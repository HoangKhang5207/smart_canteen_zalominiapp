import {
  getAccessToken,
  getDeviceIdAsync,
  getUserID,
  getUserInfo,
} from "zmp-sdk";
import {
  ApiError,
  apiGet,
  apiPost,
  getAuthToken,
  setAuthToken,
} from "@/lib/api-client";

export interface AuthUser {
  id: number;
  name: string;
  role: "customer" | "staff" | "admin";
  zalo_user_id: string | null;
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
let pendingAuthPromise: Promise<AuthUser> | null = null;
let fallbackSessionZaloId: string | null = null;
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

async function getOrCreateDeviceZaloId(): Promise<string> {
  if (fallbackSessionZaloId) {
    return fallbackSessionZaloId;
  }

  try {
    const deviceId = await withTimeout(getDeviceIdAsync(), 3_000);
    if (typeof deviceId === "string" && deviceId.trim() !== "") {
      fallbackSessionZaloId = `zalo_device_${deviceId.trim()}`;
      return fallbackSessionZaloId;
    }
  } catch {
    // Ignore if getDeviceIdAsync is unsupported in current environment
  }

  const randomSuffix = Math.random().toString(36).slice(2, 10);
  fallbackSessionZaloId = `zalo_user_${randomSuffix}`;
  return fallbackSessionZaloId;
}

export async function loginWithZaloToken(
  accessToken: string,
  extra?: { zaloUserId?: string | null; name?: string | null },
): Promise<AuthUser> {
  const response = await apiPost<AuthSessionResponse>("/auth/zalo", {
    access_token: accessToken,
    zalo_user_id: extra?.zaloUserId ?? undefined,
    name: extra?.name ?? undefined,
  });
  setAuthToken(response.data.token);
  inMemoryAuthUser = response.data.user;
  notifyAuthListeners(response.data.user);
  return response.data.user;
}

export async function loginWithZaloIdentity(input: {
  accessToken?: string | null;
  zaloUserId?: string | null;
  name?: string | null;
}): Promise<AuthUser> {
  const response = await apiPost<AuthSessionResponse>("/auth/zalo", {
    access_token: input.accessToken ?? undefined,
    zalo_user_id: input.zaloUserId ?? undefined,
    name: input.name ?? undefined,
  });
  setAuthToken(response.data.token);
  inMemoryAuthUser = response.data.user;
  notifyAuthListeners(response.data.user);
  return response.data.user;
}

export async function loginWithDemoAccount(
  demoKey = "customer1",
): Promise<AuthUser> {
  const response = await apiPost<AuthSessionResponse>("/auth/demo", {
    demo_key: demoKey,
  });
  setAuthToken(response.data.token);
  inMemoryAuthUser = response.data.user;
  notifyAuthListeners(response.data.user);
  return response.data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiGet<{ data: AuthUser }>("/auth/me");
  inMemoryAuthUser = response.data;
  notifyAuthListeners(response.data);
  return response.data;
}

export async function ensureAuthenticated(): Promise<AuthUser> {
  if (getAuthToken() && inMemoryAuthUser) {
    return inMemoryAuthUser;
  }

  if (getAuthToken()) {
    try {
      return await fetchCurrentUser();
    } catch {
      clearAuthSession();
    }
  }

  if (pendingAuthPromise) {
    return pendingAuthPromise;
  }

  pendingAuthPromise = (async () => {
    try {
      const identity = await collectZaloSdkIdentity();

      if (identity.accessToken || identity.zaloUserId) {
        try {
          return await loginWithZaloIdentity(identity);
        } catch {
          // If access_token verification failed but we have a fallback device/user id, retry with zaloUserId
          if (identity.zaloUserId) {
            return await loginWithZaloIdentity({
              zaloUserId: identity.zaloUserId,
              name: identity.name,
            });
          }
        }
      }

      try {
        return await loginWithDemoAccount();
      } catch (demoErr) {
        // When DEMO_LOGIN_ENABLED=false (403), authenticate via /auth/zalo using device/session Zalo identity
        if (demoErr instanceof ApiError && demoErr.status === 403) {
          const deviceZaloId = await getOrCreateDeviceZaloId();
          return await loginWithZaloIdentity({
            zaloUserId: deviceZaloId,
            name: identity.name ?? "Khách Zalo",
          });
        }
        throw demoErr;
      }
    } finally {
      pendingAuthPromise = null;
    }
  })();

  return pendingAuthPromise;
}
