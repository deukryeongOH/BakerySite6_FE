# 정산

담당자: [단기심화7]양이슬

> 코드 기준 전면 재작성본입니다. 이전 버전은 경로·에러코드·응답 필드가 실제 코드와 거의 대부분 달랐습니다(설계 문서 단계에서 코드가 많이 바뀐 것으로 보임). 에러 코드는 `common/src/main/java/com/openbake/common/exception/ErrorCode.java`가 원본입니다.
> 
> **가장 중요한 차이:** 정산 도메인 대부분은 `Objects.requireNonNull`/`IllegalArgumentException`/`IllegalStateException`으로 검증하고, `GlobalExceptionHandler`가 이걸 각각 `C001`(400)/`C001`(400)/`C002`(409)로 변환합니다. `ErrorCode.java`에 있는 `ST001~ST500`은 **Spring Batch 실행(월 정산 배치)에만** 쓰이고, 나머지 시나리오(정산 없음/판매자 없음/권한 없음 등)에 대응하는 전용 코드는 대부분 존재하지 않습니다.
> 
> **관리자 인증/권한 검사가 코드에 없습니다.** `/internal/v1/...` 아래 컨트롤러 어디에도 관리자 role 체크나 `X-Internal-Service-Token` 검증이 없습니다. 지금은 이 경로들이 네트워크 레벨(사내망, API Gateway 등)로만 보호된다고 가정하고 있는 것으로 보입니다 — 배포 전에 반드시 확인이 필요합니다.
> 

### API 목록

| API ID | Method | Path | 설명 | 프론트 대상 |
| --- | --- | --- | --- | --- |
| `SET-API-001` | POST | `/internal/v1/settlement-events/purchase-confirmed` | 구매확정 이벤트 수신 | 아니오 (주문 도메인 내부 호출용) |
| `SET-API-002` | GET | `/api/v1/sellers/me/settlements` | 내 정산 목록 조회 | **예** |
| `SET-API-003` | GET | `/api/v1/sellers/me/settlements/{settlementId}` | 내 정산 상세 조회 (주문 항목까지 포함) | **예** |
| `SET-API-004` | POST | `/internal/v1/settlement-batches/monthly` | 월 정산 배치 실행 | 아니오 (관리자/배치) |
| `SET-API-005` | GET | `/internal/v1/settlement-batches/{jobExecutionId}` | 배치 실행 상세 조회 | 아니오 |
| `SET-API-005b` | GET | `/internal/v1/settlement-batches` | 배치 실행 목록 조회 (이전 문서에 없던 API) | 아니오 |
| `SET-API-006` | POST | `/internal/v1/settlements/{settlementId}/payouts` | 판매자 지급 시작 | 아니오 |
| `SET-API-007` | POST | `/internal/v1/settlement-payouts/{payoutId}/complete` | 지급 완료 처리 | 아니오 |
| `SET-API-008` | POST | `/internal/v1/settlement-payouts/{payoutId}/fail` | 지급 실패 처리 | 아니오 |
| `SET-API-009` | GET | `/internal/v1/settlement-payouts/{payoutId}` | 지급 결과 단건 조회 | 아니오 |
| `SET-API-010` | GET | `/internal/v1/settlements/{settlementId}/payouts` | 정산별 지급 목록 조회 | 아니오 |
| — | POST | `/internal/v1/settlements/monthly` | 월 정산 동기 실행 (검증/테스트용, Batch를 안 거침) | 아니오 |
| — | POST/GET | `/internal/v1/settlements/{settlementId}/payments/start|complete|fail` | `AdminSettlementPaymentController` — payout과 별개의 결제 상태 API. 실제 화면에서 쓰이는지 불명확, 정리 필요 | 아니오 |

> 이전 문서의 `SET-API-002~004`(`/api/v1/settlements?sellerId=...`, `/settlements/{id}`, `/settlements/{id}/lines`)는 실제로 존재하지 않는 경로입니다. 판매자 정산은 로그인 토큰 기반의 `/api/v1/sellers/me/settlements`로 통합돼 있고, "주문 항목별 상세"는 별도 API가 아니라 상세 조회 응답의 `lines` 배열에 포함됩니다.
> 

### API 상세

---

#### 1. 구매확정 이벤트 수신 (`SET-API-001`)

##### 1.1. 기본 정보

- **설명:** 주문 도메인에서 발생한 구매확정 이벤트를 받아 정산 대상 원장(`SettlementTarget`)을 생성합니다.
- **호출 시점:** ⚠️ **2026-07-28 갱신:** 주문 상태가 구매확정으로 바뀌면 이제 실제로 정산 대상이 생성되지만, **이 HTTP 엔드포인트를 거치지 않습니다.** `OrderService.confirm()`(수동/자동 확정 공통)이 `PurchaseConfirmedEvent`를 Spring `ApplicationEventPublisher`로 발행하고, `PurchaseConfirmedEventListener`가 `AFTER_COMMIT` 시점에 별도 트랜잭션에서 `SettlementEventService.receive()`를 **인프로세스로 직접 호출**합니다. 즉 이 `POST /internal/v1/...` API는 주문→정산 자동 연동 경로에서 실제로 쓰이지 않고, 외부에서 수동/테스트 호출하는 용도로만 남아있습니다(둘 다 결국 같은 `SettlementEventService.receive()`를 타므로 동작은 동일).
- **통신 기본 규격:**
    - **Method:** POST
    - **Path:** `/internal/v1/settlement-events/purchase-confirmed`
    - **요청/응답 포맷:** `application/json`
    - **응답 envelope 주의:** 이 API는 `ApiResponse` 래퍼를 쓰지 않습니다. `SettlementEventController.receivePurchaseConfirmed`가 `ResponseEntity<SettlementEventResponse>`를 그대로 반환하므로, 응답 바디에 `success`/`data`가 없고 `SettlementEventResponse` 필드가 최상위에 바로 옵니다.

##### 1.2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 여부 | 설명 |
| --- | --- | --- | --- | --- |
| Body | `eventId` | String | Y | 이벤트 고유 ID, 중복 처리 판단 기준 (유일하게 서비스 레벨에서 검증하는 필드) |
| Body | `orderId` | Long | Y | 주문 ID |
| Body | `orderItemId` | Long | Y | 주문 항목 ID (이전 문서의 `orderLineId`가 아님) |
| Body | `sellerId` | Long | Y | 판매자 ID |
| Body | `dropId` | Long | Y | 드롭 판매 ID |
| Body | `productNameSnapshot` | String | Y | 주문 당시 상품명 |
| Body | `quantity` | Integer | Y | 주문 수량 |
| Body | `grossAmount` | BigDecimal | Y | 정산 기준 판매금액 |
| Body | `purchaseConfirmedAt` | OffsetDateTime | Y | 구매확정 시각 |

> ⚠️ **`eventVersion`, `occurredAt`, `commissionRateSnapshot` 필드는 요청에 없습니다.** 수수료율은 요청으로 받지 않고 서버가 `SettlementEventService.DEFAULT_COMMISSION_RATE = 0.1000`(10% 고정)을 항상 사용합니다. `X-Internal-Service-Token` 헤더도 검증하지 않습니다.
> 

```json
{
  "eventId": "ff0cf3b2-03b9-4f61-960a-d540760d2fc9",
  "orderId": 1001,
  "orderItemId": 2001,
  "sellerId": 10,
  "dropId": 301,
  "productNameSnapshot": "딸기 생크림 케이크",
  "quantity": 1,
  "grossAmount": 30000,
  "purchaseConfirmedAt": "2026-07-25T14:30:00+09:00"
}
```

##### 1.3. 처리 순서 (실제 코드 기준)

```
1. eventId 없으면 400 (C001)
2. eventId가 이미 처리된 이벤트면 → 기존 SettlementTarget을 찾아 duplicate=true로 200 반환
3. eventId는 다르지만 (orderId, orderItemId) 조합이 이미 정산 대상으로 등록돼 있으면
   → 새 SettlementTarget을 만들지 않고 duplicate=true로 200 반환
   (이때 grossAmount 등이 기존 값과 달라도 비교/충돌 검사를 하지 않습니다)
4. 둘 다 아니면 새 SettlementTarget 생성, status=PENDING, settlementId=null → 201
```

##### 1.4. 응답 명세

```json
{
  "eventId": "ff0cf3b2-03b9-4f61-960a-d540760d2fc9",
  "settlementTargetId": 1,
  "duplicate": false
}
```

| 필드명 | 타입 | 설명 |
| --- | --- | --- |
| `eventId` | String | 요청한 이벤트 ID |
| `settlementTargetId` | Long | 생성되었거나 기존에 있던 정산 대상 ID |
| `duplicate` | Boolean | 신규 생성이면 `false`(201), 중복이면 `true`(200) |

##### 1.5. 예외 및 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | `C001` | 잘못된 요청입니다. | `eventId` 누락, 또는 `SettlementTarget` 도메인 검증 실패(`grossAmount`≤0, `quantity`≤0 등) |

> ⚠️ 이전 문서의 `INVALID_SETTLEMENT_EVENT`/`INVALID_GROSS_AMOUNT`/`INVALID_COMMISSION_RATE`/`INVALID_INTERNAL_TOKEN`/`SETTLEMENT_TARGET_CONFLICT`/`SETTLEMENT_TARGET_SAVE_FAILED`는 전부 `ErrorCode.java`에 없는 코드입니다. 이 API에서 발생 가능한 에러는 사실상 `C001` 하나뿐입니다.
> 

---

#### 2. 내 정산 목록 조회 (`SET-API-002`)

##### 2.1. 기본 정보

- **설명:** 로그인한 판매자 본인의 월별 정산 목록을 조회합니다. `sellerId`는 요청 파라미터가 아니라 로그인 토큰(`CurrentSellerProvider`)에서 가져옵니다.
- **통신 기본 규격:**
    - **Method:** GET
    - **Path:** `/api/v1/sellers/me/settlements`
    - **응답 envelope:** `ApiResponse<SellerSettlementListResponse>` — `{"success": true, "data": {...}}`

##### 2.2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 (판매자로 승인된 회원) |

> 이전 문서의 `Query sellerId` 파라미터는 없습니다. 다른 판매자의 정산을 쿼리 파라미터로 조회하는 시나리오 자체가 불가능합니다.
> 

##### 2.3. 응답 명세

```json
{
  "success": true,
  "data": {
    "settlements": [
      {
        "settlementId": 501,
        "periodStart": "2026-07-01",
        "periodEnd": "2026-08-01",
        "grossSalesAmount": 500000,
        "commissionAmount": 50000,
        "adjustmentAmount": 0,
        "payoutAmount": 450000,
        "targetCount": 18,
        "status": "COMPLETED",
        "createdAt": "2026-08-01T00:10:00+09:00",
        "completedAt": "2026-08-05T10:20:00+09:00"
      }
    ]
  }
}
```

> `data`가 배열이 아니라 `{"settlements": [...]}` 객체입니다. `status`는 `SettlementStatus` enum(`READY`/`ON_HOLD`/`PAYING`/`FAILED`/`COMPLETED`) 그대로 대문자로 내려갑니다. `netSalesAmount`는 목록 응답에는 없고 상세(2-3)에만 있습니다.
> 

##### 2.4. 예외 및 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 404 | `C003` | 대상을 찾을 수 없습니다. | 로그인 계정이 승인된 판매자가 아님 (`CurrentSellerProvider.getSellerId()`가 비어있을 때) |

> 이전 문서의 `INVALID_SELLER_ID`/`SELLER_NOT_FOUND`도 존재하지 않는 코드입니다.
> 

---

#### 3. 내 정산 상세 조회 (`SET-API-003`)

##### 3.1. 기본 정보

- **설명:** 정산 ID 하나의 합계와, 거기 포함된 주문 항목별 정산 내역(`lines`)을 한 번에 조회합니다. 이전 문서의 `SET-API-004`(주문 항목 조회)는 별도 API가 아니라 이 응답에 통합돼 있습니다.
- **통신 기본 규격:**
    - **Method:** GET
    - **Path:** `/api/v1/sellers/me/settlements/{settlementId}`
    - **응답 envelope:** `ApiResponse<SellerSettlementDetailResponse>`

##### 3.2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Path | `settlementId` | Long | Y | 조회할 정산 ID |

##### 3.3. 응답 명세

```json
{
  "success": true,
  "data": {
    "settlementId": 501,
    "sellerId": 10,
    "periodStart": "2026-07-01",
    "periodEnd": "2026-08-01",
    "grossSalesAmount": 500000,
    "commissionAmount": 50000,
    "netSalesAmount": 450000,
    "adjustmentAmount": 0,
    "payoutAmount": 450000,
    "targetCount": 18,
    "status": "COMPLETED",
    "createdAt": "2026-08-01T00:10:00+09:00",
    "completedAt": "2026-08-05T10:20:00+09:00",
    "lines": [
      {
        "settlementLineId": 9001,
        "targetId": 1,
        "orderId": 1001,
        "orderItemId": 2001,
        "dropId": 301,
        "productName": "딸기 생크림 케이크",
        "quantity": 1,
        "grossAmount": 30000,
        "commissionRate": 0.1000,
        "commissionAmount": 3000,
        "netAmount": 27000,
        "purchaseConfirmedAt": "2026-07-25T14:30:00+09:00"
      }
    ]
  }
}
```

> 필드명이 이전 문서와 여럿 다릅니다: `orderLineId`→`orderItemId`, `commissionRateSnapshot`→`commissionRate`, `payoutId`/`payoutStatus`는 이 응답에 없습니다(지급 정보가 필요하면 `SET-API-009/010`을 따로 호출).
> 

##### 3.4. 예외 및 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | `C001` | 잘못된 요청입니다. | `settlementId`가 0 이하 |
| 404 | `C003` | 대상을 찾을 수 없습니다. | 정산이 없거나, **다른 판매자의 정산 ID인 경우도 403이 아니라 이 404**로 처리됨(`settlementRepository.findByIdAndSellerId`가 sellerId까지 함께 조건으로 조회하므로 타인 정산은 애초에 "없음"으로 취급) |

> 이전 문서의 `403 SETTLEMENT_ACCESS_DENIED`는 실제로 발생하지 않습니다.
> 

---

#### 4. 월 정산 배치 실행 (`SET-API-004`)

##### 4.1. 기본 정보

- **설명:** 지정 기간의 `PENDING` 정산 대상을 판매자별로 집계해 `Settlement`/`SettlementLine`을 생성하는 Spring Batch Job을 실행합니다.
- **통신 기본 규격:**
    - **Method:** POST
    - **Path:** `/internal/v1/settlement-batches/monthly`
    - **응답 envelope:** `ApiResponse<MonthlySettlementBatchResponse>`

##### 4.2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Body | `periodStart` | LocalDate | Y | 정산 시작일 (포함) |
| Body | `periodEnd` | LocalDate | Y | 정산 종료일 (미포함) |

```json
{
  "periodStart": "2026-07-01",
  "periodEnd": "2026-08-01"
}
```

##### 4.3. 응답 명세

```json
{
  "success": true,
  "data": {
    "jobExecutionId": 101,
    "jobName": "monthlySettlementJob",
    "status": "STARTING"
  }
}
```

> ⚠️ **`periodStart`/`periodEnd`는 응답에 없습니다.** `MonthlySettlementBatchResponse`는 `jobExecutionId`/`jobName`/`status` 3개 필드뿐입니다 — 기간을 다시 확인하려면 4-5(상세 조회)를 호출해야 합니다.
> 

##### 4.4. 예외 및 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | `C001` | 잘못된 요청입니다. | `periodStart`/`periodEnd` 누락, 또는 `periodStart`가 `periodEnd`보다 늦거나 같음 |
| 409 | `ST001` | 동일한 정산 기간의 배치가 이미 완료됐습니다. | 같은 `periodStart`/`periodEnd`로 이미 완료된 Job이 있음 (Spring Batch `JobInstanceAlreadyCompleteException`) |
| 409 | `ST002` | 동일한 정산 기간의 배치가 이미 실행 중입니다. | 같은 파라미터의 Job이 실행 중 (`JobExecutionAlreadyRunningException`) |
| 409 | `ST003` | 정산 배치를 재시작할 수 없습니다. | `JobRestartException` |
| 400 | `ST004` | 정산 배치 파라미터가 올바르지 않습니다. | `InvalidJobParametersException` |
| 500 | `ST500` | 월 정산 배치 실행 중 오류가 발생했습니다. | 그 외 Job 실행 실패 |

> 이전 문서의 `SETTLEMENT_JOB_ALREADY_RUNNING`/`SETTLEMENT_JOB_FAILED`, 403 `FORBIDDEN`(관리자 아님)은 존재하지 않습니다 — 이 API는 관리자 권한을 검증하지 않습니다.
> 

---

#### 5. 배치 실행 상세/목록 조회 (`SET-API-005`, `SET-API-005b`)

##### 5.1. 기본 정보

- **설명:** Spring Batch Job 실행 상태를 조회합니다. 단건(`{jobExecutionId}`)과 목록(페이지네이션) 둘 다 있습니다 — 목록 조회는 이전 문서에 없던 API입니다.
- **통신 기본 규격:**
    - **Method:** GET
    - **Path:** `/internal/v1/settlement-batches/{jobExecutionId}` 또는 `/internal/v1/settlement-batches?page=0&size=20`

##### 5.2. 응답 명세 — 단건

```json
{
  "success": true,
  "data": {
    "jobExecutionId": 101,
    "jobInstanceId": 55,
    "jobName": "monthlySettlementJob",
    "status": "COMPLETED",
    "startTime": "2026-08-01T02:00:00",
    "endTime": "2026-08-01T02:00:03",
    "exitCode": "COMPLETED",
    "exitDescription": null,
    "periodStart": "2026-07-01",
    "periodEnd": "2026-08-01"
  }
}
```

> 이전 문서에 없던 필드가 많습니다: `jobInstanceId`, `exitCode`, `exitDescription`(500자 초과 시 잘림). `exitDescription`은 실패 스택 트레이스 노출 방지를 위해 500자로 잘려서 내려갑니다.
> 

##### 5.3. 응답 명세 — 목록 (`GET /internal/v1/settlement-batches`)

```json
{
  "success": true,
  "data": {
    "executions": [
      { "jobExecutionId": 101, "jobInstanceId": 55, "jobName": "monthlySettlementJob", "status": "COMPLETED", "startTime": "2026-08-01T02:00:00", "endTime": "2026-08-01T02:00:03", "exitCode": "COMPLETED", "periodStart": "2026-07-01", "periodEnd": "2026-08-01" }
    ],
    "page": 0,
    "size": 20,
    "hasNext": false
  }
}
```

##### 5.4. 예외 및 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | `C001` | 잘못된 요청입니다. | `jobExecutionId`≤0, 목록의 `page`<0 또는 `size`가 1~100 범위 밖 |
| 404 | `C003` | 대상을 찾을 수 없습니다. | 해당 `jobExecutionId`의 실행 이력 없음 |

> 이전 문서의 `SETTLEMENT_JOB_NOT_FOUND`, 403 `FORBIDDEN`은 존재하지 않습니다.
> 

---

#### 6. 판매자 지급 시작 (`SET-API-006`)

##### 6.1. 기본 정보

- **설명:** 정산 금액을 판매자 계좌로 지급하는 절차를 시작합니다(Mock 지급 게이트웨이 연동 전 단계 — 실제 송금 실행은 하지 않고 원장만 `PROCESSING`으로 만듭니다. 성공/실패 확정은 7·8번 API를 별도로 호출해야 합니다).
- **통신 기본 규격:**
    - **Method:** POST
    - **Path:** `/internal/v1/settlements/{settlementId}/payouts`

##### 6.2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Path | `settlementId` | Long | Y | 지급할 정산 ID |
| Body | `idempotencyKey` | String | Y | 멱등키 (최대 100자). **이전 문서의 `PAYOUT-{settlementId}` 같은 고정 규칙은 코드에 없고, 호출하는 쪽이 자유롭게 만들어 보내는 값입니다.** |

```json
{
  "idempotencyKey": "PAYOUT-501"
}
```

##### 6.3. 처리 순서 (실제 코드 기준)

```
1. settlementId, idempotencyKey 검증
2. 같은 idempotencyKey로 이미 만든 Payout이 있으면
   - 그 Payout이 같은 settlementId면 → 기존 결과 그대로 반환 (재시도 허용)
   - 다른 settlementId면 → 409(C002) "다른 정산에서 이미 사용된 멱등키입니다"
3. Settlement 조회 (없으면 404)
4. 판매자 정산 계좌 조회 (SellerSettlementAccountReader)
5. Settlement.startPaying() — READY 또는 FAILED 상태에서만 가능, 아니면 409(C002)
6. SettlementPayout 생성 (REQUESTED → 즉시 PROCESSING)
```

> ⚠️ **이전 문서의 "실행 조건"(`Seller.status = APPROVED`, 계좌 검증 여부, `Payout.status != SUCCEEDED/UNKNOWN` 체크)은 코드에 없습니다.** 판매자 승인 상태나 계좌 인증 여부를 이 시점에 다시 검사하지 않고, 계좌 정보는 `SellerSettlementAccountReader`로 조회만 해서 스냅샷으로 저장합니다.
> 

##### 6.4. 응답 명세

```json
{
  "success": true,
  "data": {
    "payoutId": 701,
    "settlementId": 501,
    "sellerId": 10,
    "payoutAmount": 450000,
    "idempotencyKey": "PAYOUT-501",
    "status": "PROCESSING",
    "externalTransactionId": null,
    "failureReason": null,
    "requestedAt": "2026-08-05T10:19:55+09:00",
    "completedAt": null,
    "failedAt": null
  }
}
```

> `status`는 `SettlementPayoutStatus` enum: `REQUESTED`/`PROCESSING`/`FAILED`/`COMPLETED` 4개뿐입니다. 이전 문서의 `READY`/`SUCCEEDED`/`UNKNOWN`은 존재하지 않는 값입니다. `providerTransactionId`도 실제 필드명은 `externalTransactionId`입니다.
> 

##### 6.5. 예외 및 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | `C001` | 잘못된 요청입니다. | `settlementId`≤0, `idempotencyKey` 누락/100자 초과 |
| 404 | `C003` | 대상을 찾을 수 없습니다. | 정산 없음 |
| 409 | `C002` | 처리할 수 없는 상태입니다. | 다른 정산에서 이미 쓰인 멱등키, 또는 `Settlement`가 `READY`/`FAILED`가 아닌 상태 |

> 이전 문서의 `PAYOUT_NOT_ALLOWED`/`PAYOUT_ALREADY_SUCCEEDED`/`PAYOUT_RESULT_UNKNOWN`/`SELLER_NOT_APPROVED`/`SELLER_ACCOUNT_NOT_VERIFIED`/`PAYOUT_PROVIDER_FAILED`는 모두 존재하지 않는 코드입니다.
> 

---

#### 7. 지급 완료 처리 (`SET-API-007`)

- **Method/Path:** `POST /internal/v1/settlement-payouts/{payoutId}/complete`
- **요청 Body:** `{ "externalTransactionId": "TX-20260805-001" }` (필수, 최대 100자)
- **처리:** `SettlementPayout`을 `PROCESSING → COMPLETED`, 같은 트랜잭션에서 `Settlement`를 `PAYING → COMPLETED`로 전이. `PROCESSING`이 아닌 상태에서 호출하면 409(`C002`).
- **응답:** 6-4와 동일한 `SettlementPayoutResponse` 형태, `status: "COMPLETED"`, `completedAt` 채워짐.

#### 8. 지급 실패 처리 (`SET-API-008`)

- **Method/Path:** `POST /internal/v1/settlement-payouts/{payoutId}/fail`
- **요청 Body:** `{ "failureReason": "등록된 계좌를 찾을 수 없습니다." }` (필수, 최대 500자)
- **처리:** `SettlementPayout`을 `PROCESSING → FAILED`, `Settlement`를 `PAYING → FAILED`로 전이. `PROCESSING`이 아니면 409(`C002`).
- **응답:** `status: "FAILED"`, `failedAt`/`failureReason` 채워짐, `externalTransactionId`는 `null`.

> ⚠️ 7·8번 다 `retryCount`, `failureCode` 필드는 응답에 없습니다(이전 문서엔 있었음). 재시도 횟수를 저장하는 컬럼 자체가 없습니다.
> 

---

#### 9. 지급 결과 단건/목록 조회 (`SET-API-009`, `SET-API-010`)

- **단건:** `GET /internal/v1/settlement-payouts/{payoutId}` → `ApiResponse<SettlementPayoutResponse>` (6-4와 동일 필드)
- **목록:** `GET /internal/v1/settlements/{settlementId}/payouts` → `ApiResponse<{"payouts": [SettlementPayoutResponse, ...]}>`
- **에러:** 404 `C003`(지급 이력 없음), 400 `C001`(`payoutId`≤0). 이전 문서의 403 `FORBIDDEN`/`PAYOUT_NOT_FOUND`는 없고 `PAYOUT_NOT_FOUND` 대신 공통 `C003`이 쓰입니다.

---

### 문서화되지 않은 추가 엔드포인트

아래는 이전 문서에 전혀 없었지만 코드에 존재하는 API입니다. 실제로 프론트/운영에서 쓰이는지 확인이 필요합니다.

- `POST /internal/v1/settlements/monthly` (`MonthlySettlementController`) — Spring Batch를 거치지 않고 동기적으로 월 정산을 실행하는 별도 경로. 응답도 `ApiResponse` 래퍼 없이 `MonthlySettlementResponse`(`periodStart`, `periodEnd`, `settlementCount`, `targetCount`, `totalPayoutAmount`)를 그대로 반환합니다. 배치 API(4번)와 무엇이 다른지, 어느 쪽이 실제 운영 경로인지 팀 확인이 필요해 보입니다.
- `POST /internal/v1/settlements/{settlementId}/payments/start|complete|fail` (`AdminSettlementPaymentController`) — payout 흐름과 별개로 `SettlementPaymentService`를 호출하는 API. payout(6~8번)과 기능이 겹쳐 보이는데 두 흐름이 병존하는 이유가 불명확합니다.
