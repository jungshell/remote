import type { AuthUser, PlatformRole } from "@/lib/auth/types";

export type { PlatformRole } from "@/lib/auth/types";

export function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, {
    ...init,
    credentials: "include",
  });
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const response = await authFetch("/api/auth/me");
    const data = (await response.json()) as { ok: boolean; user?: AuthUser };

    if (!response.ok || !data.ok || !data.user) {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

export async function logout() {
  await authFetch("/api/auth/logout", { method: "POST" });
}

export function canAccessRole(user: AuthUser | null, requiredRole: PlatformRole) {
  if (!user || user.status !== "approved") {
    return false;
  }

  if (requiredRole === "staff") {
    return user.role === "staff" || user.role === "admin";
  }

  return user.role === "admin";
}
