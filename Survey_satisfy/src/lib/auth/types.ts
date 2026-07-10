export type PlatformRole = "staff" | "admin";

export type UserStatus = "pending" | "approved" | "rejected";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  division: string;
  role: PlatformRole;
  status: UserStatus;
}

export interface PublicUser extends AuthUser {
  created_at?: string;
  approved_at?: string | null;
}
