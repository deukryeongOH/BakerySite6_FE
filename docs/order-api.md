# 주문 Order

담당자: [단기심화7]이주희

> 에러 코드는 `common/src/main/java/com/openbake/common/exception/ErrorCode.java`가 원본입니다(`OR001~OR008`). 응답 envelope도 문서 예시의 `{"status": "SUCCESS", ...}`가 아니라 실제로는 `{"success": true, "data": {...}}` 형태(`ApiResponse`)이니 아래 예시 JSON을 그 기준으로 고쳤습니다.
> 

# 주문 API 명세서

## API 목록

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/orders` | 주문 생성 (결제) |
| GET | `/api/v1/orders` | 주문 목록 조회 |
| GET | `/api/v1/orders/{id}` | 주문 상세 조회 |
| PATCH | `/api/v1/orders/{id}/cancel` | 주문 취소 |
| PATCH | `/api/v1/orders/{id}/confirm` | 구매 확정 |

> ⚠️ `GET /api/v1/seller/orders`(판매자 주문 목록)는 `OrderController`/`SellerController` 어디에도 구현되어 있지 않습니다. 필요하면 백엔드에 먼저 요청이 필요합니다.
> 

---

## API 상세

### 1. 주문 생성

## 1. 기본 정보

- **설명:** 장바구니에 선점된 드롭을 예치금으로 결제하여 주문을 생성합니다. 예치금 차감/재고 선점 확정/주문 생성이 한 트랜잭션에서 처리됩니다. 성공 시 장바구니는 삭제됩니다(재고는 복구하지 않음).
- **호출 시점 (Trigger):**
    
    > 사용자가 주문(결제) 화면에서 예치금 잔액과 약관에 동의한 뒤 [결제하기] 버튼을 클릭했을 때 호출합니다.
    > 
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/orders`
    - **요청 포맷 (Content-Type):** `application/json`
    - **응답 포맷 (Accept):** `application/json`

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 |
| Body | `termsAgreed` | Boolean | Y | 약관 동의 여부 (true만 허용) |

> ⚠️ **`Idempotency-Key` 헤더는 미구현입니다.** `OrderController.create`도 `OrderService.create`도 이 헤더를 읽지 않고 중복요청 판정 로직 자체가 없습니다. 동일 요청을 연속으로 보내면(더블클릭 등) 중복 주문이 생성될 수 있습니다 — 프론트에서 버튼 비활성화 등으로 직접 막아야 합니다.
> 

### 요청 예시 (Request JSON)

```json
{
  "termsAgreed": true
}
```

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `success` | Boolean | Y | 처리 성공 여부 |
| `data` | Object | Y | 실제 반환 데이터 객체 |
| `data.orderId` | Long | Y | 생성된 주문 ID |
| `data.orderState` | String | Y | 주문 상태 (생성 시 `PAID` 고정) |
| `data.totalAmount` | Number | Y | 총 결제 금액 (원) |
| `data.balanceAfter` | Number | Y | 결제 후 예치금 잔액 |
| `data.paidAt` | String | Y | 결제 완료 시각 |

### 응답 예시 (Response JSON - 201 Created)

```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "orderState": "PAID",
    "totalAmount": 5000,
    "balanceAfter": 15000,
    "paidAt": "2026-07-16T11:00:00"
  }
}
```

> ⚠️ **`sellerId`/단가/드롭명이 실제 드롭 조회 없이 상수로 고정되어 있습니다** (`OrderService.java:51-53` `STUB_SELLER_ID=1L`, `STUB_PRICE=10000`, `STUB_DROP_NAME="임시 상품명"`). 드롭 조회 포트가 아직 없어서 생기는 임시 처리로, 지금은 어떤 드롭을 주문하든 `totalAmount`가 항상 `단가 10000원 × 수량`으로 계산되고 실제 판매자/상품명과 무관합니다.
> 

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **400 Bad Request** | `C001` | "잘못된 요청입니다." | 필수 파라미터 누락 혹은 포맷 불일치 |
| **400 Bad Request** | `OR004` | "약관에 동의해야 합니다." | `termsAgreed`가 false 또는 누락 |
| **401 Unauthorized** | `ME002` | "유효하지 않은 인증 토큰입니다." | 토큰 만료/서명 오류 |
| **404 Not Found** | `CA002` | "장바구니가 없습니다." | 장바구니를 만들지 않았거나 만료 배치로 이미 삭제된 경우 |
| **409 Conflict** | `CA003` | "장바구니가 만료되었습니다. 다시 담아주세요." | 만료 시각 경과로 선점 재고가 이미 복구된 경우 |
| **409 Conflict** | `OR005` | "픽업 날짜를 선택해야 합니다." | 날짜 미선택 상태로 결제 시도 |
| **409 Conflict** | `P010` | "예치금 잔액이 부족합니다." | 잔액 < 총 결제 금액 |

> `OR006`(`DUPLICATE_REQUEST`)은 `ErrorCode.java`에 정의는 돼 있지만, 위에서 설명한 대로 실제로 이 요청을 던지는 코드가 없어 절대 발생하지 않습니다.
> 

### 에러 응답 예시 (Error Response JSON)

```json
{
  "success": false,
  "error": {
    "code": "CA003",
    "message": "장바구니가 만료되었습니다. 다시 담아주세요."
  }
}
```

---

### 2. 주문 목록 조회

## 1. 기본 정보

- **설명:** 로그인한 사용자의 주문 목록을 최신순으로 페이징 조회합니다. 주문 상태별 필터를 지원합니다.
- **호출 시점 (Trigger):**
    
    > 사용자가 마이페이지에서 [주문 내역] 메뉴에 진입했을 때, 또는 목록에서 스크롤 / 페이지 이동 / 상태 필터를 변경했을 때 호출합니다.
    > 
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/orders`
    - **요청 포맷 (Content-Type):** 없음
    - **응답 포맷 (Accept):** `application/json`

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 |
| Query | `orderState` | String | N | 상태 필터. `OrderState` enum 이름 그대로(`PAID`/`CONFIRMED`/`CANCELED` 등, 대문자) 전달해야 함. 미지정 시 전체 |
| Query | `page` | Integer | N | 페이지 번호 (Default: 0) |
| Query | `size` | Integer | N | 페이지 크기 (Default: 10, 최대 50) |

> ⚠️ `page`가 음수여도, `size`가 50을 초과해도 에러가 나지 않습니다. `size`는 그냥 `Math.min(size, 50)`으로 조용히 캡될 뿐이고(`OrderService.java:122`), `page` 음수 검증 자체가 없습니다.
> 

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `success` | Boolean | Y | 처리 성공 여부 |
| `data` | Object | Y | 실제 반환 데이터 객체 |
| `data.content` | Array | Y | 주문 목록 |
| `data.content[].orderId` | Long | Y | 주문 ID |
| `data.content[].dropName` | String | Y | 드롭명 (주문 시점 스냅샷) |
| `data.content[].sellerName` | String | Y | 판매자(스토어)명 |
| `data.content[].quantity` | Integer | Y | 주문 수량 |
| `data.content[].totalAmount` | Number | Y | 총 결제 금액 |
| `data.content[].orderState` | String | Y | 주문 상태 |
| `data.content[].pickupDate` | String | Y | 픽업 날짜 (구매자 선택값, YYYY-MM-DD) |
| `data.content[].paidAt` | String | Y | 결제 완료 시각 |
| `data.page` | Integer | Y | 현재 페이지 번호 |
| `data.size` | Integer | Y | 페이지 크기 |
| `data.totalElements` | Long | Y | 전체 주문 건수 |
| `data.totalPages` | Integer | Y | 전체 페이지 수 |

### 응답 예시 (Response JSON - 200 OK)

```json
{
  "success": true,
  "data": {
    "content": [
      {
        "orderId": 101,
        "dropName": "시그니처 소금빵",
        "sellerName": "성수베이커리",
        "quantity": 2,
        "totalAmount": 5000,
        "orderState": "PAID",
        "pickupDate": "2026-07-17",
        "paidAt": "2026-07-16T11:00:00"
      }
    ],
    "page": 0,
    "size": 10,
    "totalElements": 1,
    "totalPages": 1
  }
}
```

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **400 Bad Request** | `OR008` | "유효하지 않은 주문 상태입니다." | `orderState`가 `OrderState` enum에 없을 때 |
| **401 Unauthorized** | `ME002` | "유효하지 않은 인증 토큰입니다." | 토큰 만료/서명 오류 |

### 에러 응답 예시 (Error Response JSON)

```json
{
  "success": false,
  "error": {
    "code": "OR008",
    "message": "유효하지 않은 주문 상태입니다."
  }
}
```

---

### 3. 주문 상세 조회

## 1. 기본 정보

- **설명:** 주문 1건의 전체 정보를 조회합니다. 본인의 주문만 조회할 수 있습니다.
- **호출 시점 (Trigger):**
    
    > 사용자가 주문 내역 목록에서 특정 주문 카드를 클릭하여 상세 화면에 진입했을 때 호출합니다.
    > 
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/orders/{id}`
    - **요청 포맷 (Content-Type):** 없음
    - **응답 포맷 (Accept):** `application/json`

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 |
| Path | `id` | Long | Y | 조회할 주문 ID |

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `success` | Boolean | Y | 처리 성공 여부 |
| `data` | Object | Y | 실제 반환 데이터 객체 |
| `data.orderId` | Long | Y | 주문 ID |
| `data.orderState` | String | Y | 주문 상태 |
| `data.totalAmount` | Number | Y | 총 결제 금액 |
| `data.orderItem` | Object | Y | 주문 항목 (드롭 1종류) |
| `data.orderItem.dropId` | Long | Y | 드롭 ID |
| `data.orderItem.dropName` | String | Y | 드롭명 (주문 시점 스냅샷) |
| `data.orderItem.price` | Number | Y | 단가 (주문 시점 스냅샷) |
| `data.orderItem.quantity` | Integer | Y | 수량 |
| `data.seller` | Object | Y | 판매자 정보 |
| `data.seller.sellerId` | Long | Y | 판매자 ID |
| `data.seller.sellerName` | String | N | 스토어명 (판매자가 조회 안 되면 `null`) |
| `data.pickupDate` | String | Y | 픽업 날짜 (구매자 선택값, YYYY-MM-DD) |
| `data.dropCloseAt` | String | N | 드롭 마감 시각 — **현재 항상 `null`** (아래 참고) |
| `data.cancelable` | Boolean | Y | 취소 가능 여부 |
| `data.paidAt` | String | Y | 결제 완료 시각 |
| `data.confirmedAt` | String | N | 구매 확정 시각 (미확정 시 null) |
| `data.canceledAt` | String | N | 취소 시각 (미취소 시 null) |

> ⚠️ `dropCloseAt`은 드롭 조회 포트가 아직 없어서 **항상 `null`**입니다(`OrderService.java:150-153`). `cancelable`도 원래 설계는 `PAID && now < dropCloseAt`이지만, 마감 시각을 못 읽어 지금은 **`orderState == PAID` 여부로만 판정**합니다. 즉 실제로 드롭이 마감된 뒤에도 `cancelable: true`가 내려올 수 있습니다.
> 

### 응답 예시 (Response JSON - 200 OK)

```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "orderState": "PAID",
    "totalAmount": 5000,
    "orderItem": {
      "dropId": 7,
      "dropName": "시그니처 소금빵",
      "price": 2500,
      "quantity": 2
    },
    "seller": {
      "sellerId": 3,
      "sellerName": "성수베이커리"
    },
    "pickupDate": "2026-07-17",
    "dropCloseAt": null,
    "cancelable": true,
    "paidAt": "2026-07-16T11:00:00",
    "confirmedAt": null,
    "canceledAt": null
  }
}
```

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **401 Unauthorized** | `ME002` | "유효하지 않은 인증 토큰입니다." | 토큰 만료/서명 오류 |
| **403 Forbidden** | `ME004` | "권한이 없습니다." | 본인의 주문이 아닌 주문을 조회 시도 |
| **404 Not Found** | `OR001` | "존재하지 않는 주문입니다." | 요청한 id에 해당하는 주문이 없을 때 |

### 에러 응답 예시 (Error Response JSON)

```json
{
  "success": false,
  "error": {
    "code": "OR001",
    "message": "존재하지 않는 주문입니다."
  }
}
```

---

### 4. 주문 취소

## 1. 기본 정보

- **설명:** 주문을 취소하고 전액 예치금 환불과 재고 복구를 처리합니다. `PAID` 상태이고 드롭 마감 시각 이전인 경우에만 가능합니다.
    - ⚠️ **재고 복구와 드롭 마감 체크는 미구현입니다** (`OrderService.java:189-190, 198`). 실제로는 `PAID` 상태이기만 하면 취소되고, 드롭이 이미 마감됐어도 막히지 않으며, 취소해도 선점했던 재고가 돌아오지 않습니다.
- **호출 시점 (Trigger):**
    
    > 사용자가 주문 상세 화면에서 [주문 취소] 버튼을 클릭했을 때 호출합니다.
    > 
- **통신 기본 규격:**
    - **Method:** `PATCH`
    - **Path:** `/api/v1/orders/{id}/cancel`
    - **요청 포맷 (Content-Type):** 없음
    - **응답 포맷 (Accept):** `application/json`

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 |
| Path | `id` | Long | Y | 취소할 주문 ID |

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `success` | Boolean | Y | 처리 성공 여부 |
| `data` | Object | Y | 실제 반환 데이터 객체 |
| `data.orderId` | Long | Y | 주문 ID |
| `data.orderState` | String | Y | 변경된 주문 상태 (`CANCELED` 고정) |
| `data.refundAmount` | Number | Y | 환불된 금액 (전액) |
| `data.balanceAfter` | Number | Y | 환불 후 예치금 잔액 |
| `data.canceledAt` | String | Y | 취소 시각 |

### 응답 예시 (Response JSON - 200 OK)

```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "orderState": "CANCELED",
    "refundAmount": 5000,
    "balanceAfter": 20000,
    "canceledAt": "2026-07-16T12:00:00"
  }
}
```

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **401 Unauthorized** | `ME002` | "유효하지 않은 인증 토큰입니다." | 토큰 만료/서명 오류 |
| **403 Forbidden** | `ME004` | "권한이 없습니다." | 본인의 주문이 아닌 주문을 취소 시도 |
| **404 Not Found** | `OR001` | "존재하지 않는 주문입니다." | 요청한 id에 해당하는 주문이 없을 때 |
| **409 Conflict** | `OR002` | "취소할 수 없는 주문입니다." | `PAID`가 아닌 상태 (이미 `CONFIRMED`/`CANCELED`, 중복 취소 포함) |

> `OR007`(`DROP_ALREADY_CLOSED`)은 위에서 설명한 대로 코드에서 검증하지 않아 현재 발생하지 않습니다.
> 

### 에러 응답 예시 (Error Response JSON)

```json
{
  "success": false,
  "error": {
    "code": "OR002",
    "message": "취소할 수 없는 주문입니다."
  }
}
```

---

### 5. 구매 확정

## 1. 기본 정보

- **설명:** 판매자가 구매자의 픽업 수령을 확인하고 구매를 확정합니다. 확정된 주문은 정산 대상으로 등록되며 취소/환불이 불가합니다. 미확정 주문은 픽업 날짜 + N일 경과 시 배치가 자동 확정합니다.
- **호출 시점 (Trigger):**
    
    > 구매자가 상품을 수령하면, 판매자가 판매자 페이지에서 [구매 확정] 버튼을 클릭했을 때 호출합니다.
    > 
- **통신 기본 규격:**
    - **Method:** `PATCH`
    - **Path:** `/api/v1/orders/{id}/confirm`
    - **요청 포맷 (Content-Type):** 없음
    - **응답 포맷 (Accept):** `application/json`

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 (판매자 권한 필요) |
| Path | `id` | Long | Y | 확정할 주문 ID |

> 판매자 판정은 `member`의 role이 아니라 로그인한 사용자의 `sellerId`가 주문의 `sellerId`와 같은지로 이뤄집니다(`OrderService.confirm`, `CurrentSellerProvider`). 판매자로 등록되지 않은 계정이 호출하면 `sellerId` 자체가 없어 바로 403이 납니다.
> 

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `success` | Boolean | Y | 처리 성공 여부 |
| `data` | Object | Y | 실제 반환 데이터 객체 |
| `data.orderId` | Long | Y | 주문 ID |
| `data.orderState` | String | Y | 변경된 주문 상태 (`CONFIRMED` 고정) |
| `data.confirmedAt` | String | Y | 구매 확정 시각 |

### 응답 예시 (Response JSON - 200 OK)

```json
{
  "success": true,
  "data": {
    "orderId": 101,
    "orderState": "CONFIRMED",
    "confirmedAt": "2026-07-17T13:20:00"
  }
}
```

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **401 Unauthorized** | `ME002` | "유효하지 않은 인증 토큰입니다." | 토큰 만료/서명 오류 |
| **403 Forbidden** | `ME004` | "권한이 없습니다." | 해당 주문의 판매자가 아닌 사용자가 확정 시도 (판매자로 등록되지 않은 계정 포함) |
| **404 Not Found** | `OR001` | "존재하지 않는 주문입니다." | 요청한 id에 해당하는 주문이 없을 때 |
| **409 Conflict** | `OR003` | "구매확정할 수 없는 주문입니다." | 이미 `CONFIRMED` 또는 `CANCELED` 상태 (배치 자동확정 후 중복 요청 포함) |

### 에러 응답 예시 (Error Response JSON)

```json
{
  "success": false,
  "error": {
    "code": "OR003",
    "message": "구매확정할 수 없는 주문입니다."
  }
}
```

---

## 배치

| 배치 | 주기 | 설명 |
| --- | --- | --- |
| 자동 구매확정 | N시간 | `PAID` 상태이면서 픽업 날짜 + N일이 경과한 주문을 자동으로 `CONFIRMED` 처리. 정산 누락 방지 |