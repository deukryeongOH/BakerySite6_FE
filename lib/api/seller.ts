import { apiRequest } from "@/lib/api/client";

export type ApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface BusinessVerificationRequest {
  businessNumber: string;
  businessAddress: string;
  businessRepresentativeName: string;
}

export interface BusinessVerificationResponse {
  verified: boolean;
  businessNumber: string;
  verifiedAt: string;
}

export function verifyBusiness(req: BusinessVerificationRequest) {
  return apiRequest<BusinessVerificationResponse>("/api/v1/sellers/business-verifications", {
    method: "POST",
    body: req,
  });
}

export interface AccountVerificationRequest {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
}

export interface AccountVerificationRequestResponse {
  verificationRequestId: string;
  expiresAt: string;
}

export function requestAccountVerification(req: AccountVerificationRequest) {
  return apiRequest<AccountVerificationRequestResponse>(
    "/api/v1/sellers/settlement-account/verification-requests",
    { method: "POST", body: req },
  );
}

export interface MockCodeResponse {
  verificationRequestId: string;
  code: string;
  expiresAt: string;
}

/** DEV 전용 — local/dev 프로파일에서만 동작. */
export function getMockVerificationCode(verificationRequestId: string) {
  return apiRequest<MockCodeResponse>(
    `/api/v1/sellers/settlement-account/verification-requests/${verificationRequestId}/mock-code`,
  );
}

export interface VerifyAccountResponse {
  verified: boolean;
  accountVerifiedAt: string;
}

export function verifyAccountCode(verificationRequestId: string, verificationCode: string) {
  return apiRequest<VerifyAccountResponse>(
    `/api/v1/sellers/settlement-account/verification-requests/${verificationRequestId}/verify`,
    { method: "POST", body: { verificationCode } },
  );
}

export interface ApplySellerRequest {
  bakeryName: string;
  businessNumber: string;
  businessAddress: string;
  businessRepresentativeName: string;
}

export interface ApplySellerResponse {
  sellerId: number;
  memberId: number;
  bakeryName: string;
  applicationStatus: ApplicationStatus;
}

export function applySeller(req: ApplySellerRequest) {
  return apiRequest<ApplySellerResponse>("/api/v1/sellers/apply", {
    method: "POST",
    body: req,
  });
}

export interface UpdateSellerStatusRequest {
  applicationStatus: "APPROVED" | "REJECTED";
  rejectReason?: string;
}

export interface UpdateSellerStatusResponse {
  sellerId: number;
  applicationStatus: ApplicationStatus;
  rejectReason: string | null;
  updatedAt: string;
}

export function updateSellerStatus(sellerId: number, req: UpdateSellerStatusRequest) {
  return apiRequest<UpdateSellerStatusResponse>(`/api/v1/sellers/${sellerId}/status`, {
    method: "PATCH",
    body: req,
  });
}

export interface Seller {
  sellerId: number;
  memberId: number;
  bakeryName: string;
  businessNumber: string;
  applicationStatus: ApplicationStatus;
  settlementBankCode: string;
  settlementAccountNumberMasked: string;
  accountVerified: boolean;
  accountVerifiedAt: string | null;
}

/** 인증 불필요 — 공개 조회 API. */
export function getSeller(sellerId: number) {
  return apiRequest<Seller>(`/api/v1/sellers/${sellerId}`, { auth: false });
}
