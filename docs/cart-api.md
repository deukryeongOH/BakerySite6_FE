# 장바구니 Cart

담당자: [단기심화7]이주희

> 에러 코드는 `common/src/main/java/com/openbake/common/exception/ErrorCode.java`가 원본입니다. 아래 표의 코드명은 실제 `error.code` 값(`CA001` 등)으로 정정했습니다.
> 
> **2026-07-28 갱신:** 이전 버전에서 TODO 스텁으로 남아있던 재고 검증/조회 정보 채우기/픽업일 위조 방어/재고 복구가 전부 실제 구현으로 교체됐습니다(`2cd4d8b`, `c5fcf15` 커밋). 다만 재고 선점 방식 자체가 설계 변경됐습니다 — cart는 더 이상 스스로 재고를 선점/검증하지 않고, **drop 도메인이 `lock-start`로 미리 선점했는지만 확인**합니다. 아래 1번 섹션 참고.

# 장바구니 API 명세서

## API 목록

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/cart` | 장바구니 생성 (재고 선점) |
| GET | `/api/v1/cart` | 장바구니 조회 |
| PATCH | `/api/v1/cart/pickup-date` | 픽업 날짜 선택 |
| DELETE | `/api/v1/cart` | 장바구니 삭제 (재고 복구) |

> 장바구니는 회원당 1개이므로 Path에 `cartId`를 두지 않습니다. 인증 토큰의 회원 정보로 대상을 특정합니다.
> 

### 만료 처리 규약

만료 배치는 N분 주기로 동작하므로, **만료 시각은 지났지만 배치가 아직 삭제하지 않은 구간**이 존재합니다. 두 상태를 구분해 응답합니다.

| 상태 | 응답 |
| --- | --- |
| 장바구니 행이 없음 (생성 안 함 / 배치가 이미 삭제) | `404 CA002 (CART_NOT_FOUND)` |
| 행은 있으나 `expiresAt` 경과 (배치 대기 중) | `409 CA003 (CART_EXPIRED)` |

> 두 경우 모두 사용자에게는 "다시 담아주세요"로 동일하게 안내하면 됩니다. 상태 코드를 나누는 이유는 서버 로그/디버깅 시 원인을 구분하기 위함입니다.
`DELETE`는 예외입니다. 만료된 장바구니도 삭제 대상이므로 `CART_EXPIRED`를 반환하지 않고 정상 처리합니다.
> 

---

## API 상세

### 1. 장바구니 생성

## 1. 기본 정보

- **설명:** 장바구니를 생성합니다. **재고 선점은 이 API가 하지 않습니다** — 드롭 상세에서 [담기]를 누르면 drop 도메인이 대기열 통과(`confirm-entry`) 후 `lock-start`로 이미 재고를 선점(`DropEntry.RESERVED`)한 상태여야 하고, 이 API는 그 선점 여부만 확인한 뒤 장바구니 행을 기록합니다. 즉 프론트 플로우 순서는 `enter` → `queue/rank` 폴링 → `confirm-entry` → `lock-start` → **`POST /cart`**(이 API) 입니다.
- **호출 시점 (Trigger):**
    
    > `lock-start`로 재고 선점에 성공한 직후 자동 호출합니다(사용자가 별도로 누르는 버튼이 아님).
    > 
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/cart`
    - **요청 포맷 (Content-Type):** `application/json`
    - **응답 포맷 (Accept):** `application/json`

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 |
| Body | `dropId` | Long | Y | `lock-start`로 이미 재고를 선점한 드롭 ID |
| Body | `quantity` | Integer | Y | 선점한 수량과 동일해야 함 (여기서 별도로 검증하지 않고 그대로 저장) |

### 요청 예시 (Request JSON)

```json
{
  "dropId": 7,
  "quantity": 2
}
```

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `success` | Boolean | Y | 처리 성공 여부 |
| `data` | Object | Y | 실제 반환 데이터 객체 |
| `data.cartId` | Long | Y | 생성된 장바구니 ID |
| `data.dropId` | Long | Y | 선점한 드롭 ID |
| `data.quantity` | Integer | Y | 선점한 수량 |
| `data.expiresAt` | String | Y | 만료 시각 (경과 시 자동 삭제 / 재고 복구) |
| `data.createdAt` | String | Y | 생성 시각 |

### 응답 예시 (Response JSON - 201 Created)

```json
{
  "success": true,
  "data": {
    "cartId": 1,
    "dropId": 7,
    "quantity": 2,
    "expiresAt": "2026-07-16T11:15:00",
    "createdAt": "2026-07-16T11:00:00"
  }
}
```

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **400 Bad Request** | `C001` | "잘못된 요청입니다." | 필수 파라미터 누락 또는 형식 오류 |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 없음/만료 |
| 409 Conflict | `CA001` | 이미 장바구니에 담긴 상품이 있습니다. | 만료되지 않은 장바구니가 이미 존재할 때 |
| 409 Conflict | `CA006` | 재고 선점이 확인되지 않았습니다. 다시 담아주세요. | `lock-start`로 재고를 선점한 이력(`DropEntry`)이 없거나, 있어도 상태가 `RESERVED`가 아닐 때 — 즉 이 API를 `lock-start` 없이 단독 호출하면 항상 이 에러가 남 |

> `DROP_NOT_FOUND`/재고 부족/1인 제한 검증은 이 API가 아니라 **`lock-start`(drop 도메인, `POST /api/v1/drops/{dropId}/lock-start`) 쪽에서 처리됩니다.** cart 생성 시점엔 이미 그 검증을 통과한 뒤이므로 여기서 다시 확인하지 않습니다.
> 
> `CART_ALREADY_EXISTS`(`CA001`)는 동시 요청([구매하기] 더블클릭)에 대비해 `carts` 테이블의 `UNIQUE(member_id)` 제약으로 최종 방어합니다.
> 
> **숨은 동작:** 기존 장바구니가 `CA001`을 던지는 건 "만료 안 된" 카트가 있을 때뿐입니다. 기존 카트가 이미 만료된 상태라면 에러 없이 자동으로 삭제 후 새 카트가 생성됩니다 (`CartService.java`).
> 

### 에러 응답 예시 (Error Response JSON)

```json
{
  "success": false,
  "error": {
    "code": "CA001",
    "message": "이미 장바구니에 담긴 상품이 있습니다."
  }
}
```

---

### 2. 장바구니 조회

## 1. 기본 정보

- **설명:** 장바구니 화면에 표시할 정보를 조회합니다. 드롭 정보 / 예상 결제금액 / 선택 가능한 픽업 날짜 목록 / 만료까지 남은 시간을 포함합니다.
- **호출 시점 (Trigger):**
    
    > 사용자가 [구매하기] 클릭 후 장바구니 화면에 진입했을 때, 주문(결제) 화면에 진입했을 때, 또는 화면을 새로고침했을 때 호출합니다.
    > 
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/cart`
    - **요청 포맷 (Content-Type):** 없음
    - **응답 포맷 (Accept):** `application/json`

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 |

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `success` | Boolean | Y | 처리 성공 여부 |
| `data` | Object | Y | 실제 반환 데이터 객체 |
| `data.cartId` | Long | Y | 장바구니 ID |
| `data.drop` | Object | Y | 선점한 드롭 정보 |
| `data.drop.dropId` | Long | Y | 드롭 ID |
| `data.drop.dropName` | String | Y | 드롭명 |
| `data.drop.price` | Number | Y | 단가 (조회 시점 최신값) |
| `data.drop.imageUrl` | String | N | 드롭 이미지 URL |
| `data.seller` | Object | Y | 판매자 정보 |
| `data.seller.sellerId` | Long | Y | 판매자 ID |
| `data.seller.sellerName` | String | Y | 스토어명 |
| `data.quantity` | Integer | Y | 선점한 수량 |
| `data.estimatedAmount` | Number | Y | 예상 결제금액 (단가 × 수량, 스냅샷 아님) |
| `data.pickupDates` | Array | Y | 선택 가능한 픽업 날짜 목록 (지난 날짜 제외, YYYY-MM-DD) |
| `data.selectedPickupDate` | String | N | 현재 선택한 픽업 날짜 (미선택 시 null) |
| `data.expiresAt` | String | Y | 만료 시각 |
| `data.remainingSeconds` | Integer | Y | 만료까지 남은 초 (0 이하가 되기 전에 `CART_EXPIRED` 응답) |

### 응답 예시 (Response JSON - 200 OK)

```json
{
  "success": true,
  "data": {
    "cartId": 1,
    "drop": {
      "dropId": 7,
      "dropName": "시그니처 소금빵",
      "price": 2500,
      "imageUrl": "https://cdn.openbake.com/drops/7.jpg"
    },
    "seller": {
      "sellerId": 3,
      "sellerName": "성수베이커리"
    },
    "quantity": 2,
    "estimatedAmount": 5000,
    "pickupDates": ["2026-07-17", "2026-07-18"],
    "selectedPickupDate": null,
    "expiresAt": "2026-07-16T11:15:00",
    "remainingSeconds": 780
  }
}
```

> `drop`/`seller`는 조회 시점에 drop/seller 테이블에서 다시 읽어 채웁니다(스냅샷 아님) — 선점 이후 판매자가 가격을 바꾸면 `estimatedAmount`도 그 최신값 기준으로 바뀝니다. `seller.sellerName`은 판매자가 조회 안 되면 `null`(방어 코드).
> `pickupDates`는 지난 날짜를 제외하고 오름차순 정렬해서 내려줍니다. 드롭을 못 찾으면(`DROP_NOT_FOUND`, `DR001`) 이 API 전체가 404로 실패합니다 — 아래 에러 표에는 없지만 실제로 발생 가능한 케이스입니다.
> 

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 없음/만료 |
| **404 Not Found** | `CA002` | "장바구니가 없습니다." | 장바구니를 만든 적이 없거나 만료 배치로 이미 삭제된 경우 |
| **404 Not Found** | `DR001` | "존재하지 않는 드롭입니다." | 장바구니에 담긴 `dropId`의 드롭이 그 사이 삭제된 경우 (드물지만 방어 필요) |
| **409 Conflict** | `CA003` | "장바구니가 만료되었습니다. 다시 담아주세요." | 행은 남아 있으나 `expiresAt`이 경과한 경우 (만료 배치 실행 전) |

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

### 3. 픽업 날짜 선택

## 1. 기본 정보

- **설명:** 장바구니에 픽업 날짜를 지정합니다. 선택한 날짜가 해당 드롭의 픽업 가능일인지 검증하며, 재선택 시 기존 선택을 덮어씁니다.
- **호출 시점 (Trigger):**
    
    > 사용자가 장바구니 화면에서 픽업 가능 날짜 중 하나를 선택했을 때 호출합니다.
    > 
- **통신 기본 규격:**
    - **Method:** `PATCH`
    - **Path:** `/api/v1/cart/pickup-date`
    - **요청 포맷 (Content-Type):** `application/json`
    - **응답 포맷 (Accept):** `application/json`

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 |
| Body | `pickupDate` | String | Y | 선택할 픽업 날짜 (YYYY-MM-DD). 장바구니에 담긴 드롭의 픽업 가능일이어야 함 |

### 요청 예시 (Request JSON)

```json
{
  "pickupDate": "2026-07-17"
}
```

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `success` | Boolean | Y | 처리 성공 여부 |
| `data` | Object | Y | 실제 반환 데이터 객체 |
| `data.cartId` | Long | Y | 장바구니 ID |
| `data.pickupDate` | String | Y | 선택된 픽업 날짜 |

### 응답 예시 (Response JSON - 200 OK)

```json
{
  "success": true,
  "data": {
    "cartId": 1,
    "pickupDate": "2026-07-17"
  }
}
```

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **400 Bad Request** | `C001` | "잘못된 요청입니다." | `pickupDate` 누락 또는 포맷 불일치 |
| **400 Bad Request** | `CA004` | "선택할 수 없는 픽업 날짜입니다." | 장바구니에 담긴 드롭의 픽업 가능일 목록에 없는 날짜 (위조 요청 방어) |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 없음/만료 |
| **404 Not Found** | `CA002` | "장바구니가 없습니다." | 장바구니를 만든 적이 없거나 만료 배치로 이미 삭제된 경우 |
| **404 Not Found** | `DR001` | "존재하지 않는 드롭입니다." | 장바구니에 담긴 드롭이 그 사이 삭제된 경우 |
| **409 Conflict** | `CA003` | "장바구니가 만료되었습니다. 다시 담아주세요." | 행은 남아 있으나 `expiresAt`이 경과한 경우 (만료 배치 실행 전) |
| **409 Conflict** | `CA005` | "이미 지난 픽업 날짜입니다." | 선택한 픽업 날짜 < 오늘. **과거 날짜 검증(`CA005`)이 드롭 픽업 가능일 검증(`CA004`)보다 먼저 돕니다** — 과거 날짜면 `CA005`가 먼저 남 |

> 검증 순서: ① 과거 날짜인가(`CA005`) → ② 드롭의 픽업 가능일 목록에 포함되는가(`CA004`). 둘 다 통과해야 저장됩니다.
> 
> `CA004`(`CART_INVALID_PICKUP_DATE`)와 이름이 비슷한 `INVALID_PICKUP_DATE`(실제 코드는 `DR003`, "픽업 가능 날짜는 드롭 마감일 이후여야 함"이라는 드롭 등록 시점의 전혀 다른 검증)가 별도로 있으니 코드값을 문자열로 비교할 때 헷갈리지 않도록 주의.
> 

### 에러 응답 예시 (Error Response JSON)

```json
{
  "success": false,
  "error": {
    "code": "CA005",
    "message": "이미 지난 픽업 날짜입니다."
  }
}
```

---

### 4. 장바구니 삭제

## 1. 기본 정보

- **설명:** 장바구니를 삭제하고 선점한 재고를 복구합니다. 사용자가 결제 전 이탈하거나 직접 취소할 때 호출됩니다. 만료된 장바구니도 정상 삭제 대상입니다.
    - 재고 복구는 `dropLockService.rollbackStock(dropId, memberId, quantity)`를 동기 호출해서 처리합니다 — drop 쪽 재고를 되돌리고, 해당 `DropEntry`를 `FAILED` 상태로 전환합니다. 삭제 전에 복구 요청을 먼저 보내는 순서로 구현돼 있습니다(카트 행을 먼저 지우면 `dropId`/`quantity`를 못 읽어 복구가 불가능하기 때문).
- **호출 시점 (Trigger):**
    
    > 사용자가 장바구니 화면에서 [취소] 버튼을 클릭하거나 이전 화면으로 이탈할 때 호출합니다. 브라우저 종료 등으로 호출되지 않은 장바구니는 만료 배치가 동일하게 처리합니다.
    > 
- **통신 기본 규격:**
    - **Method:** `DELETE`
    - **Path:** `/api/v1/cart`
    - **요청 포맷 (Content-Type):** 없음
    - **응답 포맷 (Accept):** 없음 (204 No Content)

## 2. 요청 명세 (Request)

### 요청 파라미터 (Parameters)

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 인증값 |

## 3. 응답 명세 (Response)

### 응답 파라미터 (Parameters)

| **HTTP Status** | **응답 본문** | **설명** |
| --- | --- | --- |
| **204 No Content** | 없음 | 삭제 및 재고 복구 완료. 삭제 후 프론트는 드롭 상세로 복귀하므로 반환할 데이터가 없음 |

## 4. 예외 및 에러 처리 (Error Handling)

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 401 | `ME002` | 유효하지 않은 인증 토큰입니다. | 토큰 없음/만료 |
| **404 Not Found** | `CA002` | "장바구니가 없습니다." | 장바구니가 없거나 만료 배치로 이미 삭제된 경우 (중복 삭제 요청 포함) |

### 에러 응답 예시 (Error Response JSON)

```json
{
  "success": false,
  "error": {
    "code": "CA002",
    "message": "장바구니가 없습니다."
  }
}
```

---

## 배치

| 배치 | 주기 | 설명 |
| --- | --- | --- |
| 장바구니 만료 | N분 | `expiresAt` 경과 장바구니를 삭제하고 선점 재고를 복구. `DELETE /api/v1/cart` 미호출(브라우저 종료 등) 시의 실질적 재고 복구 수단 |

---

## 미결 / 고려사항

1. 장바구니 만료 시간 (`expiresAt` = 생성 + N분) — 기획서 초안 기준 15분
2. 만료 배치 실행 주기 — 짧을수록 재고 회수가 빠르지만 부하 증가
3. 자동 구매확정 기준일 N (픽업 날짜 + N일)
4. 가격 잠금 여부 — 현재 재고만 선점하고 가격은 조회 시점 최신값(`estimatedAmount`). 선점 기간 중 판매자가 가격을 변경하면 화면 금액과 실제 결제 금액이 달라짐