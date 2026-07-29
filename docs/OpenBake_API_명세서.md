# OpenBake API 명세서

- 문서 생성일: 2026-07-29
- API 버전: v1
- 기준 서버: http://localhost:8080
- 출처: Swagger UI (/v3/api-docs)
- 공통 응답 포맷: 대부분의 API는 `{ success: boolean, data: ..., error: ApiError }` 형태의 공통 래퍼(ApiResponse)를 사용합니다.

---

## 1. 인증 (Auth)

### `POST` /api/v1/auth/signup

**설명**: 로컬 회원가입

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **email**: string — 로그인 이메일 (UNIQUE)
- **password**: string — 비밀번호 (8자 이상 20자 이하)
- **name**: string — 이름
- **phoneNumber**: string — 휴대폰 번호

**응답 (Response)**:
없음

---

### `POST` /api/v1/auth/reissue

**설명**: Access Token 재발급

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **refreshToken**: string — 발급받은 refresh token

**응답 (Response)**:
없음

---

### `POST` /api/v1/auth/oauth/{provider}

**설명**: OAuth 로그인/가입

**Path/Query 파라미터**: `provider`(path, 필수, string)

**요청 바디 (Request Body)**:
- **idToken**: string — OAuth 공급자가 발급한 ID 토큰 (인가 코드 아님)

**응답 (Response)**:
없음

---

### `POST` /api/v1/auth/logout

**설명**: 로그아웃

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **refreshToken**: string — 무효화할 refresh token

**응답 (Response)**:
없음

---

### `POST` /api/v1/auth/login

**설명**: 로컬 로그인

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **email**: string — 가입한 이메일
- **password**: string — 비밀번호

**응답 (Response)**:
없음

---

## 2. 회원 (Member)

### `GET` /api/v1/members/{id}

**설명**: 회원 조회

**Path/Query 파라미터**: `id`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `DELETE` /api/v1/members/{id}

**설명**: 회원 탈퇴

**Path/Query 파라미터**: `id`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `PATCH` /api/v1/members/{id}

**설명**: 회원정보 수정

**Path/Query 파라미터**: `id`(path, 필수, integer)

**요청 바디 (Request Body)**:
- **name**: string — 변경할 이름 (선택)
- **phoneNumber**: string — 변경할 전화번호 (선택)

**응답 (Response)**:
없음

---

### `PATCH` /api/v1/members/{id}/password

**설명**: 비밀번호 변경

**Path/Query 파라미터**: `id`(path, 필수, integer)

**요청 바디 (Request Body)**:
- **currentPassword**: string — 본인 확인용 현재 비밀번호
- **newPassword**: string — 변경할 새 비밀번호

**응답 (Response)**:
없음

---

## 3. 판매자 (Seller)

### `POST` /api/v1/sellers/settlement-account/verification-requests

**설명**: 계좌 인증 요청 (1원 송금 mock)

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **bankCode**: string — 은행 코드
- **accountNumber**: string — 계좌번호 (하이픈 없이)
- **accountHolder**: string — 예금주명

**응답 (Response)**:
없음

---

### `POST` /api/v1/sellers/settlement-account/verification-requests/{verificationRequestId}/verify

**설명**: 계좌 인증 확인

**Path/Query 파라미터**: `verificationRequestId`(path, 필수, string)

**요청 바디 (Request Body)**:
- **verificationCode**: string — 계좌 거래내역에서 확인한 4자리 인증 코드

**응답 (Response)**:
없음

---

### `POST` /api/v1/sellers/business-verifications

**설명**: 사업자 정보 인증 (mock)

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **businessNumber**: string — 사업자등록번호
- **businessAddress**: string — 사업장 주소
- **businessRepresentativeName**: string — 사업자등록증 상 대표자명

**응답 (Response)**:
없음

---

### `POST` /api/v1/sellers/apply

**설명**: 판매자 입점 신청

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **bakeryName**: string — 베이커리 상호명
- **businessNumber**: string — 사업자등록번호
- **businessAddress**: string — 사업장 주소
- **businessRepresentativeName**: string — 사업자등록증 상 대표자명

**응답 (Response)**:
없음

---

### `PATCH` /api/v1/sellers/{id}/status

**설명**: 입점 승인/반려 처리 (admin)

**Path/Query 파라미터**: `id`(path, 필수, integer)

**요청 바디 (Request Body)**:
- **applicationStatus**: string — 변경할 입점 신청 상태
- **rejectReason**: string — 반려 사유 (반려 시)

**응답 (Response)**:
없음

---

### `GET` /api/v1/sellers

**설명**: 판매자 입점 신청 목록 조회 (admin)

**Path/Query 파라미터**: `applicationStatus`(query, string)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `GET` /api/v1/sellers/{id}

**설명**: 판매자 조회

**Path/Query 파라미터**: `id`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `GET` /api/v1/sellers/settlement-account/verification-requests/{verificationRequestId}/mock-code

**설명**: [DEV 전용] 목업 인증 코드 조회

**Path/Query 파라미터**: `verificationRequestId`(path, 필수, string)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `GET` /api/v1/sellers/me

**설명**: 내 판매자 신청 조회

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

## 4. 드롭 (Drop)

### `POST` /api/v1/drops/register

**설명**: 드롭 등록

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **name**: string
- **description**: string
- **imageUrl**: string
- **pickUpAvailableDates**: array
- **dropStart**: string
- **dropEnd**: string
- **limitQuantity**: integer
- **price**: integer
- **totalQuantity**: integer

**응답 (Response)**:
없음

---

### `DELETE` /api/v1/drops/{dropId}

**설명**: 드롭 삭제

**Path/Query 파라미터**: `dropId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 204)**:
없음

---

### `PATCH` /api/v1/drops/{dropId}

**설명**: 드롭 수정

**Path/Query 파라미터**: `dropId`(path, 필수, integer)

**요청 바디 (Request Body)**:
- **name**: string
- **description**: string
- **imageUrl**: string
- **pickUpAvailableDates**: array
- **dropStart**: string
- **dropEnd**: string
- **limitQuantity**: integer
- **price**: integer
- **totalQuantity**: integer

**응답 (Response)**:
없음

---

### `GET` /api/v1/drops/{dropId}/info

**설명**: 드롭 상세 조회

**Path/Query 파라미터**: `dropId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `GET` /api/v1/drops/mine

**설명**: 내 드롭 목록 조회

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: array
- **error**: ApiError

---

## 4-1. 드롭 재고 선점 (Drop Lock)

### `POST` /api/v1/drops/{dropId}/lock-start

**설명**: 드롭 재고 선점

**Path/Query 파라미터**: `dropId`(path, 필수, integer)

**요청 바디 (Request Body)**:
- **quantity**: integer

**응답 (Response)**:
없음

---

## 4-2. 드롭 대기열 (Drop Entry)

### `POST` /api/v1/drops/{dropId}/enter

**설명**: 드롭 대기열 진입

**Path/Query 파라미터**: `dropId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `POST` /api/v1/drops/{dropId}/confirm-entry

**설명**: 드롭 입장 확정

**Path/Query 파라미터**: `dropId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `GET` /api/v1/drops/{dropId}/queue/rank

**설명**: 내 대기열 순번 조회

**Path/Query 파라미터**: `dropId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: QueueRankResponse
- **error**: ApiError

---

### `GET` /api/v1/drops/today/drop

**설명**: 오늘 진행하는 드롭 ID 조회

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

## 5. 장바구니 (Cart)

### `GET` /api/v1/cart

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: CartDetailResponse
- **error**: ApiError

---

### `POST` /api/v1/cart

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **dropId**: integer
- **quantity**: integer

**응답 (Response 201)**:
- **success**: boolean
- **data**: CartCreateResponse
- **error**: ApiError

---

### `DELETE` /api/v1/cart

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
없음

**응답 (Response 204)**:
없음

---

### `PATCH` /api/v1/cart/pickup-date

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **pickupDate**: string

**응답 (Response 200)**:
- **success**: boolean
- **data**: CartPickupDateResponse
- **error**: ApiError

---

## 6. 주문 (Order)

### `GET` /api/v1/orders

**Path/Query 파라미터**: `orderState`(query, string), `page`(query, integer), `size`(query, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: OrderPageResponse
- **error**: ApiError

---

### `POST` /api/v1/orders

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **termsAgreed**: boolean

**응답 (Response 201)**:
- **success**: boolean
- **data**: OrderCreateResponse
- **error**: ApiError

---

### `PATCH` /api/v1/orders/{orderId}/confirm

**Path/Query 파라미터**: `orderId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: OrderConfirmResponse
- **error**: ApiError

---

### `PATCH` /api/v1/orders/{orderId}/cancel

**Path/Query 파라미터**: `orderId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: OrderCancelResponse
- **error**: ApiError

---

### `GET` /api/v1/orders/{orderId}

**Path/Query 파라미터**: `orderId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: OrderDetailResponse
- **error**: ApiError

---

## 7. 예치금 (Deposit)

### `POST` /api/v1/deposit/dev/charge

**설명**: [DEV 전용] PG 없이 예치금 직접 충전

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **amount**: number — 충전 금액

**응답 (Response)**:
없음

---

### `GET` /api/v1/deposit/transactions

**설명**: 거래 내역 조회

**Path/Query 파라미터**: `transactionType`(query, string), `page`(query, integer), `size`(query, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

### `GET` /api/v1/deposit/account

**설명**: 예치금 잔액 조회

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

## 7-1. 충전 (Charge)

### `POST` /api/v1/deposit/charges

**설명**: 충전 요청 생성

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **amount**: number — 충전 금액 (1,000원 단위, 최소 1,000원, 최대 500,000원)

**응답 (Response)**:
없음

---

### `POST` /api/v1/deposit/charges/confirm

**설명**: 충전 승인

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **paymentKey**: string — 토스페이먼츠가 발급한 결제 키
- **orderId**: string — 충전 요청 시 생성한 주문번호 (pgOrderId)
- **amount**: number — 결제 금액 (위변조 검증용)

**응답 (Response)**:
없음

---

### `GET` /api/v1/deposit/charges/{chargeRequestId}

**설명**: 충전 상태 조회

**Path/Query 파라미터**: `chargeRequestId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response)**:
없음

---

## 8. 웹훅 (Webhook)

### `POST` /api/v1/webhooks/pg/toss

**설명**: 토스페이먼츠 웹훅 수신

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **eventType**: string — 이벤트 유형
- **data**: TossWebhookData — 웹훅 데이터

**응답 (Response 200)**:
없음

---

## 9. 월 정산 배치 (Internal)

### `POST` /internal/v1/settlement-batches/monthly

**설명**: 시나리오 2. 월 정산 배치 실행

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **periodStart**: string
- **periodEnd**: string

**응답 (Response 200)**:
없음

---

### `GET` /internal/v1/settlement-batches

**설명**: 시나리오 3. 월 정산 배치 실행 목록 조회

**Path/Query 파라미터**: `page`(query, integer), `size`(query, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: MonthlySettlementBatchListResponse
- **error**: ApiError

---

### `GET` /internal/v1/settlement-batches/{jobExecutionId}

**설명**: 시나리오 3. 월 정산 배치 실행 상세 조회

**Path/Query 파라미터**: `jobExecutionId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: MonthlySettlementBatchExecutionResponse
- **error**: ApiError

---

## 9-1. 정산 이벤트 (Internal)

### `POST` /internal/v1/settlement-events/purchase-confirmed

**설명**: 시나리오 1. 구매확정 이벤트 수신

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **eventId**: string
- **orderId**: integer
- **orderItemId**: integer
- **sellerId**: integer
- **dropId**: integer
- **productNameSnapshot**: string
- **quantity**: integer
- **grossAmount**: number
- **purchaseConfirmedAt**: string

**응답 (Response 201)**:
없음

---

## 9-2. 월별 정산 생성 (Internal)

### `POST` /internal/v1/settlements/monthly

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
- **periodStart**: string
- **periodEnd**: string

**응답 (Response 200)**:
- **periodStart**: string
- **periodEnd**: string
- **settlementCount**: integer
- **targetCount**: integer
- **totalPayoutAmount**: number

---

## 9-3. 정산 지급 Payout (Internal)

### `GET` /internal/v1/settlements/{settlementId}/payouts

**Path/Query 파라미터**: `settlementId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: SettlementPayoutListResponse
- **error**: ApiError

---

### `POST` /internal/v1/settlements/{settlementId}/payouts

**설명**: 시나리오 5. 정산 지급 시작

**Path/Query 파라미터**: `settlementId`(path, 필수, integer)

**요청 바디 (Request Body)**:
- **idempotencyKey**: string

**응답 (Response 200)**:
없음

---

### `POST` /internal/v1/settlement-payouts/{payoutId}/fail

**설명**: 시나리오 6-B. 지급 실패 처리

**Path/Query 파라미터**: `payoutId`(path, 필수, integer)

**요청 바디 (Request Body)**:
- **failureReason**: string

**응답 (Response 200)**:
없음

---

### `POST` /internal/v1/settlement-payouts/{payoutId}/complete

**설명**: 시나리오 6-A. 지급 성공 처리

**Path/Query 파라미터**: `payoutId`(path, 필수, integer)

**요청 바디 (Request Body)**:
- **externalTransactionId**: string

**응답 (Response 200)**:
없음

---

### `GET` /internal/v1/settlement-payouts/{payoutId}

**Path/Query 파라미터**: `payoutId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: SettlementPayoutResponse
- **error**: ApiError

---

## 9-4. 정산 결제 (Internal)

### `POST` /internal/v1/settlements/{settlementId}/payments/start

**Path/Query 파라미터**: `settlementId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: SettlementPaymentResponse
- **error**: ApiError

---

### `POST` /internal/v1/settlements/{settlementId}/payments/fail

**Path/Query 파라미터**: `settlementId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: SettlementPaymentResponse
- **error**: ApiError

---

### `POST` /internal/v1/settlements/{settlementId}/payments/complete

**Path/Query 파라미터**: `settlementId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: SettlementPaymentResponse
- **error**: ApiError

---

## 10. 판매자 정산 조회

### `GET` /api/v1/sellers/me/settlements

**설명**: 시나리오 4. 내 정산 목록 조회

**Path/Query 파라미터**: -

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
없음

---

### `GET` /api/v1/sellers/me/settlements/{settlementId}

**설명**: 시나리오 4. 내 정산 상세 조회

**Path/Query 파라미터**: `settlementId`(path, 필수, integer)

**요청 바디 (Request Body)**:
없음

**응답 (Response 200)**:
- **success**: boolean
- **data**: SellerSettlementDetailResponse
- **error**: ApiError

---

