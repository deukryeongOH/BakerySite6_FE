import { apiRequest } from "@/lib/api/client";
import type { Role } from "@/lib/auth/token-storage";

export type { Role };
export type MemberStatus = "ACTIVE" | "SUSPENDED" | "WITHDRAWN";

export interface SignupRequest {
  name: string;
  phoneNumber: string;
  email: string;
  password: string;
}

export interface SignupResponse {
  memberId: number;
  email: string;
}

export function signup(req: SignupRequest) {
  return apiRequest<SignupResponse>("/api/v1/auth/signup", {
    method: "POST",
    body: req,
    auth: false,
  });
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  memberId: number;
  accessToken: string;
  refreshToken: string;
  role: Role;
}

export function login(req: LoginRequest) {
  return apiRequest<LoginResponse>("/api/v1/auth/login", {
    method: "POST",
    body: req,
    auth: false,
  });
}

export function logout(refreshToken: string) {
  return apiRequest<void>("/api/v1/auth/logout", {
    method: "POST",
    body: { refreshToken },
  });
}

export interface Member {
  id: number;
  name: string;
  email: string;
  phoneNumber: string;
  role: Role;
  status: MemberStatus;
}

export function getMember(id: number) {
  return apiRequest<Member>(`/api/v1/members/${id}`);
}

export interface UpdateMemberRequest {
  name?: string;
  phoneNumber?: string;
}

export function updateMember(id: number, req: UpdateMemberRequest) {
  return apiRequest<{ id: number; name: string; phoneNumber: string }>(`/api/v1/members/${id}`, {
    method: "PATCH",
    body: req,
  });
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export function changePassword(id: number, req: ChangePasswordRequest) {
  return apiRequest<void>(`/api/v1/members/${id}/password`, {
    method: "PATCH",
    body: req,
  });
}

export function deleteMember(id: number) {
  return apiRequest<void>(`/api/v1/members/${id}`, {
    method: "DELETE",
  });
}
