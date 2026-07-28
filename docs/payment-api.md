# 결제

> 코드 기준 전면 재작성본입니다. 원본(2026-07-22 결정 사항 등)은 git 히스토리 없이 docs/ 자체가 로컬 전용이라 이 문서가 최신 유일본입니다.
> 
> 에러 코드는 `common/src/main/java/com/openbake/common/exception/ErrorCode.java`가 원본입니다(`P001~P014`).

# 5. Payment 도메인

## API 목록

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/deposit/account` | 예치금 잔액 조회 |
| GET | `/api/v1/deposit/transactions` | 예치금 거래 내역 조회 |
| POST | `/api/v1/deposit/charges` | 충전 요청 (PG 결제창 준비) |
| POST | `/api/v1/deposit/charges/confirm` | 충전 승인 (PG 리다이렉트 후) |
| GET | `/api/v1/deposit/charges/{chargeRequestId}` | 충전 상태 조회 |
| POST | `/api/v1/webhooks/pg/toss` | PG 웹훅 수신 (인증 없음) |

> **결제(`PaymentService.pay`)는 HTTP API가 아니다.** 주문 모듈이 같은 트랜잭션에서 직접 호출한다. 주문 도메인 상세 조회(`GET /api/v1/orders/{id}`)에 결제 관련 정보가 포함되어 있어 별도 API를 제공하지 않는다.
> 

## API 상세

---

### 5-1. 예치금 잔액 조회

## 1. 기본 정보

- **설명:** 로그인한 회원의 예치금 잔액을 조회합니다. 마이페이지, 주문(결제) 화면에서 사용합니다.
- **호출 시점:** 마이페이지 진입 시, 주문 화면 진입 시, 충전 완료 후 갱신 시
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/deposit/account`
    - **요청 포맷:** 없음
    - **응답 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "memberId": 1,
    "balance": 45000,
    "hasChargeInProgress": false
  }
}
```

| 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `memberId` | Long | Y | 계좌 소유 회원 ID (`DepositResponse`에 포함됨 — 이전 문서엔 없었음) |
| `balance` | BigDecimal | Y | 현재 예치금 잔액 (원). 정수처럼 보여도 실제 타입은 `BigDecimal`입니다 |
| `hasChargeInProgress` | Boolean | Y | 진행 중인 충전 존재 여부 (`READY`/`IN_PROGRESS`). 프론트가 중복 충전 버튼을 막는 데 사용 |

> 계좌는 조회 시점에 없으면 서버가 생성합니다(lazy creation, `DepositService.getBalance`). 그래서 `404`가 없습니다.
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 만료/서명 오류 |

---

### 5-2. 예치금 거래 내역 조회

## 1. 기본 정보

- **설명:** 로그인한 회원의 예치금 거래 내역을 최신순으로 페이징 조회합니다. 충전/결제/환불 이력이 모두 포함됩니다.
- **호출 시점:** 마이페이지 > [예치금] > [거래 내역] 진입 시, 스크롤·페이지 이동 시
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/deposit/transactions`
    - **요청 포맷:** 없음
    - **응답 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Query | `transactionType` | String | N | `CHARGE` / `PAYMENT` / `REFUND`. 미지정 시 전체 |
| Query | `page` | Integer | N | 페이지 번호 (Default: 0) |
| Query | `size` | Integer | N | 페이지 크기 (Default: 20, 최대 50) |

## 3. 응답 명세

- `200 OK`

> ⚠️ **`data`가 문서 설계처럼 정리된 모양이 아니라 Spring Data `Page` 객체가 그대로 직렬화됩니다.** `DepositController.getTransactions`가 `ApiResponse<Page<TransactionResponse>>`를 그대로 반환하기 때문입니다 (주문 도메인의 `OrderPageResponse`처럼 별도로 감싸지 않음). 그래서 페이지 번호 필드명이 `page`가 아니라 `number`이고, `pageable`/`sort`/`first`/`last`/`numberOfElements`/`empty` 같은 Spring 내부 필드가 그대로 노출됩니다.
> 

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": 1002,
        "transactionType": "PAYMENT",
        "amount": -5000,
        "balanceAfter": 45000,
        "description": "주문 결제",
        "referenceType": "ORDER_PAYMENT",
        "referenceId": 101,
        "createdAt": "2026-07-17T14:02:11"
      },
      {
        "id": 1001,
        "transactionType": "CHARGE",
        "amount": 50000,
        "balanceAfter": 50000,
        "description": "예치금 충전",
        "referenceType": "CHARGE_REQUEST",
        "referenceId": 1,
        "createdAt": "2026-07-17T13:58:40"
      }
    ],
    "pageable": { "pageNumber": 0, "pageSize": 20, "sort": { "sorted": true } },
    "totalElements": 2,
    "totalPages": 1,
    "number": 0,
    "size": 20,
    "first": true,
    "last": true,
    "numberOfElements": 2,
    "empty": false
  }
}
```

| 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `content[].id` | Long | Y | 거래 ID (문서 이전 버전은 `wt_...` 문자열 프리픽스 ID로 서술했으나 실제로는 `Long`) |
| `content[].transactionType` | String | Y | `CHARGE` / `PAYMENT` / `REFUND` |
| `content[].amount` | BigDecimal | Y | **부호 있는 금액.** 증가 `+`, 감소 `−` |
| `content[].balanceAfter` | BigDecimal | Y | 거래 후 잔액 |
| `content[].description` | String | Y | 서버가 생성한 표시용 문구 (`"예치금 충전"`/`"주문 결제"`/`"주문 환불"` 고정 — 상품명 등은 포함하지 않음) |
| `content[].referenceType` | String | Y | 원인 유형 |
| `content[].referenceId` | Long | Y | 원인 ID (역시 `Long`, 문자열 프리픽스 아님) |

> `PAYOUT`은 PLATFORM 계정 거래이므로 회원 조회 결과에 나타나지 않습니다.
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | `C001` | 잘못된 요청입니다. | `transactionType`에 enum에 없는 값 전달 (`page`/`size`는 검증 없이 조용히 처리 — `size`만 50으로 캡) |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 만료 |
| 404 | `P013` | 예치금 계좌를 찾을 수 없습니다. | **`/account`와 달리 이 API는 계좌를 자동 생성하지 않습니다** (`DepositService.getTransactions`). 신규 회원이 `/account`를 먼저 호출하지 않고 곧바로 `/transactions`부터 부르면 404가 납니다. |

> 이전 문서의 `INVALID_TRANSACTION_TYPE` 코드는 실제로 쓰이지 않습니다. `transactionType` 파싱 실패는 Spring의 `MethodArgumentTypeMismatchException`으로 잡혀 범용 `C001`로 내려갑니다.
> 

---

### 5-3. 충전 요청

## 1. 기본 정보

- **설명:** PG 결제창을 띄우기 위한 충전 요청을 생성합니다. **이 시점에는 돈이 나가지 않습니다.** 응답의 `pgOrderId`와 `amount`를 서버가 먼저 저장해 두고, 승인 단계에서 PG가 보내온 값과 대조해 금액 위조를 차단합니다.
- **호출 시점:** 사용자가 충전 화면에서 금액을 입력하고 [충전하기]를 클릭했을 때. 프론트는 응답을 받아 토스 SDK `requestPayment()`를 호출합니다.
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/deposit/charges`
    - **요청 포맷:** `application/json`
    - **응답 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Body | `amount` | BigDecimal | Y | 충전 금액. 1,000원 단위, 최소 1,000원, 최대 500,000원 (`ChargeService.java` 상수로 고정) |

```json
{
  "amount": 50000
}
```

## 3. 응답 명세

- `201 Created`

```json
{
  "success": true,
  "data": {
    "chargeRequestId": 1,
    "pgOrderId": "a3f1c2e8-9b4d-4c1a-8e5f-2d7b1c3a4e6f",
    "amount": 50000,
    "orderName": "예치금 50,000원 충전",
    "expiresAt": "2026-07-17T14:28:40"
  }
}
```

| 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `chargeRequestId` | Long | Y | 우리 시스템의 충전 요청 ID (`ch_...` 문자열이 아니라 DB PK `Long`) |
| `pgOrderId` | String | Y | **SDK `requestPayment()`의 `orderId`로 그대로 전달.** 서버가 발급한 UUID |
| `amount` | BigDecimal | Y | SDK에 전달할 금액 |
| `orderName` | String | Y | 결제창에 표시될 주문명 |
| `expiresAt` | String | Y | 충전 요청 만료 시각 (요청 + 30분). 경과 시 승인 불가 |

> `successUrl`/`failUrl`/`clientKey`는 응답에 포함하지 않습니다. 프론트가 직접 관리합니다.
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | `P001` | 충전 금액이 올바르지 않습니다. | `amount` 누락(`null`)이거나 최소(1,000원)/최대(500,000원)/단위(1,000원) 위반 — **필드 누락도 `C001`이 아니라 이 코드로 내려갑니다** |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 만료 |

> ⚠️ **이전 문서의 `CHARGE_ALREADY_IN_PROGRESS`(409)는 존재하지 않는 코드이자 존재하지 않는 동작입니다.** `ChargeService.createChargeRequest`(`ChargeService.java:53-58`)는 기존 `READY` 요청이 있으면 자동으로 `markExpired()` 처리하고 새 요청을 만들 뿐, `IN_PROGRESS` 건이 있어도 막지 않습니다(코드 주석: "IN_PROGRESS를 차단하면 배치가 못 푸는 건이 생겼을 때 회원이 영구히 충전 불가"). 즉 중복 충전 방지 UX는 5-1의 `hasChargeInProgress` 값을 보고 **프론트에서** 버튼을 막는 방식으로만 구현되어 있고, 서버가 막아주지 않습니다.
> 

---

### 5-4. 충전 승인 ★

## 1. 기본 정보

- **설명:** PG 인증이 끝난 결제를 **승인**합니다. **이 API가 성공해야 실제로 돈이 빠져나가고 예치금이 증가합니다.** 승인 전에 저장해 둔 `charge_requests`와 PG가 보내온 값을 대조해 금액·소유자·만료를 검증합니다.
- **호출 시점:** PG 인증 성공 후 프론트가 설정한 `successUrl`로 리다이렉트되었을 때, 프론트가 쿼리 파라미터(`paymentKey`, `orderId`, `amount`)를 그대로 담아 호출합니다.
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/deposit/charges/confirm`
    - **요청 포맷:** `application/json`
    - **응답 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Body | `paymentKey` | String | Y | PG가 발급한 결제 키 (리다이렉트 쿼리 파라미터) |
| Body | `orderId` | String | Y | 5-3에서 받은 `pgOrderId` (리다이렉트 쿼리 파라미터, PG의 UUID 문자열 — 5-3의 `chargeRequestId`와 다른 값) |
| Body | `amount` | BigDecimal | Y | PG가 돌려준 결제 금액 (리다이렉트 쿼리 파라미터) |

```json
{
  "paymentKey": "tviva20260717140212ABCD1",
  "orderId": "a3f1c2e8-9b4d-4c1a-8e5f-2d7b1c3a4e6f",
  "amount": 50000
}
```

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "chargeRequestId": 1,
    "status": "DONE",
    "chargedAmount": 50000,
    "balanceAfter": 50000,
    "method": "카드",
    "approvedAt": "2026-07-17T14:02:31"
  }
}
```

| 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- |
| `chargeRequestId` | Long | Y | |
| `status` | String | Y | `DONE` 고정 |
| `chargedAmount` | BigDecimal | Y | 실제 충전된 금액 |
| `balanceAfter` | BigDecimal | Y | 충전 후 예치금 잔액 |
| `method` | String | Y | **토스 승인 API가 내려주는 값 그대로**입니다. `PgApproveResponse.method`(주석: "결제 수단 (카드, 계좌이체 등)")를 별도 매핑 없이 그대로 저장·반환하므로, `CARD`/`EASY_PAY` 같은 고정 enum 값이 아니라 토스 원문 문자열(예: `"카드"`)이 내려올 수 있습니다. 프론트에서 `method`로 분기하려면 실제 토스 응답값을 먼저 확인해야 합니다. |
| `approvedAt` | String | Y | PG 승인 시각 |

> 중복 호출(새로고침 등) 시에도 `200`과 동일한 결과를 반환합니다. 잔액은 다시 증가하지 않습니다(`ChargeService.completeCharge`의 `isDone()` 가드).
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | `C001` | 잘못된 요청입니다. | 필수 파라미터 누락 |
| 400 | `P004` | 충전 금액이 일치하지 않습니다. | **금액 위조.** 저장된 `amount` ≠ 요청 `amount` |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 만료 |
| 403 | `P003` | 본인의 충전 요청이 아닙니다. | 남의 `pgOrderId`로 승인 시도 |
| 404 | `P002` | 존재하지 않는 충전 요청입니다. | `pgOrderId`에 해당하는 요청 없음 |
| 409 | `P006` | 만료된 충전 요청입니다. | `expiresAt` 경과 (30분) |
| 409 | `P005` | 승인할 수 없는 충전 상태입니다. | `READY`가 아닌 상태에서 재시도 (`FAILED`/`EXPIRED`/중복 호출로 인한 재진입 등) |
| 502 | `P007` | 결제 승인에 실패했습니다. | PG가 승인 거절 (한도 초과, 정지 카드 등). `charge_requests` → `FAILED` |
| 504 | `P008` | 결제 결과를 확인 중입니다. 잠시 후 내역을 확인해주세요. | PG 응답 타임아웃. `IN_PROGRESS` 유지 |

```json
{
  "success": false,
  "error": {
    "code": "P004",
    "message": "충전 금액이 일치하지 않습니다."
  }
}
```

### ⚠️ 504 `P008`(PG_TIMEOUT)을 실패로 처리하면 안 되는 이유

타임아웃은 **실패가 아니라 "모름"** 이다. PG는 이미 승인했는데 응답만 유실됐을 수 있다. 이때 `FAILED`로 확정하면 **사용자 돈은 나갔는데 예치금은 영영 안 늘어난다.** 따라서 `IN_PROGRESS`를 유지하고, `ChargeReconcileScheduler`(미결 충전 확인 배치)가 PG 조회 API로 실제 결과를 확인해 반영한다. 사용자에게는 "확인 중"으로 안내한다.

---

### 5-5. 충전 상태 조회

## 1. 기본 정보

- **설명:** 충전 요청 1건의 현재 상태를 조회합니다. `PG_TIMEOUT`(504) 이후 프론트가 결과를 폴링하거나, 사용자가 충전 내역에서 상태를 확인할 때 사용합니다.
- **호출 시점:** 5-4가 `504`를 반환한 후 프론트가 5초 간격으로 폴링할 때, 또는 충전 내역 화면 진입 시
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/deposit/charges/{chargeRequestId}`
    - **요청 포맷:** 없음
    - **응답 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Path | `chargeRequestId` | Long | Y | 조회할 충전 요청 ID |

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "chargeRequestId": 1,
    "amount": 50000,
    "status": "IN_PROGRESS",
    "method": null,
    "failureCode": null,
    "failureReason": null,
    "requestedAt": "2026-07-17T13:58:40",
    "approvedAt": null,
    "expiresAt": "2026-07-17T14:28:40"
  }
}
```

| `status` | 의미 | 프론트 처리 |
| --- | --- | --- |
| `READY` | 결제창 대기 중 | 대기 |
| `IN_PROGRESS` | 승인 요청은 보냈으나 결과 미확인 | 폴링 계속 (최대 1분) |
| `DONE` | 충전 완료 | 잔액 갱신 후 종료 |
| `FAILED` | 승인 실패 | `failureReason` 표시 |
| `EXPIRED` | 30분 미완료로 만료 | "다시 시도해주세요" |

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 만료 |
| 403 | `P003` | 본인의 충전 요청이 아닙니다. | 남의 충전 요청 조회 |
| 404 | `P002` | 존재하지 않는 충전 요청입니다. | 해당 ID 없음 |

---

### 5-6. PG 웹훅 수신

## 1. 기본 정보

- **설명:** PG의 결제 상태 변경 알림을 수신합니다. **콜백 승인(5-4)이 유실됐을 때를 위한 안전망**이며, 주 경로가 아닙니다.
- **호출 시점:** PG가 결제 상태 변경 시 호출 (사용자 요청과 무관)
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/webhooks/pg/toss`
    - **요청 포맷:** `application/json`
    - **응답 포맷:** 없음
- **인증:** Bearer 토큰 없음. `SecurityConfig.java:35`에서 `/api/v1/webhooks/**`를 `permitAll()`로 열어둡니다.

> ⚠️ **"IP 화이트리스트로 보호"는 실제로 구현되어 있지 않습니다.** 코드 어디에도 IP 필터링 로직이 없고, 인증 자체가 아예 없는 완전 공개 엔드포인트입니다. 대신 아래처럼 **웹훅 바디를 신뢰하지 않고 PG 재조회로만 상태를 확정**하는 방식으로 위조를 방어합니다 — 이게 실질적인 보안 장치입니다.
> 

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Body | `eventType` | String | Y | `PAYMENT_STATUS_CHANGED` |
| Body | `data.paymentKey` | String | Y | PG 결제 키 — **실제로 사용하는 유일한 필드** |
| Body | `data.orderId` | String | N | 우리가 발급한 `pgOrderId` — 파싱만 하고 로직에서 쓰지 않음 |
| Body | `data.status` | String | N | 웹훅 바디의 이 값은 신뢰하지 않고 무시함 (아래 처리 순서 참고) |

```json
{
  "eventType": "PAYMENT_STATUS_CHANGED",
  "data": {
    "paymentKey": "tviva20260717140212ABCD1",
    "orderId": "a3f1c2e8-9b4d-4c1a-8e5f-2d7b1c3a4e6f",
    "status": "DONE",
    "totalAmount": 50000
  }
}
```

## 3. 응답 명세

- `200 OK` (본문 없음)

> **어떤 경우에도 `200`을 반환합니다.** `WebhookController.handleTossWebhook`이 모든 예외를 잡아 로그만 남기고 무조건 200을 돌려줍니다 (`WebhookController.java` catch(Exception e)).
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 200 | — | — | 정상 / 우리 것 아님 / 중복 / 내부 예외 — **전부 200** |

### 처리 순서 (실제 코드 기준)

```
1. eventType/paymentKey 로깅
2. data 또는 data.paymentKey 가 없으면 무시하고 200
3. ChargeReconcileService.reconcileByPaymentKey(paymentKey) 호출
   → 웹훅 body의 status/orderId 는 읽지 않고, paymentKey로 PG 조회 API를
     다시 호출해 실제 상태를 확인한 뒤 반영한다 (5-4 트랜잭션 2와 동일 로직)
4. 예외 발생 시 로그만 남기고 무조건 200
```

### ⚠️ 로컬 환경 제약

웹훅은 PG가 우리를 호출하므로 공인 URL이 필요합니다. `localhost`로는 수신 불가하며, 개발 중에는 ngrok 등으로 테스트하거나 미결 충전 확인 배치(`ChargeReconcileScheduler`)에 의존해야 합니다.
