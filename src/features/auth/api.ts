import { getAccessToken } from "zmp-sdk";
import { apiGet, apiPost, getAuthToken, setAuthToken } from "@/lib/api-client";

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

let pendingAuthPromise: Promise<AuthUser> | null = null;

async function tryGetZaloSdkToken(): Promise<string | null> {
  try {
    const token = await Promise.race([
      getAccessToken({}),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("zmp timeout")), 1500),
      ),
    ]);
    if (typeof token === "string" && token.trim() !== "" && token !== "DEFAULT_ACCESS_TOKEN") {
      return token.trim();
    }
    return null;
  } catch {
    return null;
  }
}

export async function loginWithZaloToken(
  accessToken: string,
): Promise<AuthUser> {
  const response = await apiPost<AuthSessionResponse>("/auth/zalo", {
    access_token: accessToken,
  });
  setAuthToken(response.data.token);
  return response.data.user;
}

export async function loginWithDemoAccount(
  demoKey = "customer1",
): Promise<AuthUser> {
  const response = await apiPost<AuthSessionResponse>("/auth/demo", {
    demo_key: demoKey,
  });
  setAuthToken(response.data.token);
  return response.data.user;
}

export async function fetchCurrentUser(): Promise<AuthUser> {
  const response = await apiGet<{ data: AuthUser }>("/auth/me");
  return response.data;
}

export async function ensureAuthenticated(): Promise<AuthUser> {
  if (getAuthToken()) {
    try {
      return await fetchCurrentUser();
    } catch {
      setAuthToken(null);
    }
  }

  if (pendingAuthPromise) {
    return pendingAuthPromise;
  }

  pendingAuthPromise = (async () => {
    try {
      const zaloToken = await tryGetZaloSdkToken();
      if (zaloToken) {
        try {
          return await loginWithZaloToken(zaloToken);
        } catch {
          // If running in simulator where dummy token is returned, fall back to demo login in local dev
        }
      }
      return await loginWithDemoAccount();
    } finally {
      pendingAuthPromise = null;
    }
  })();

  return pendingAuthPromise;
}
