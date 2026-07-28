# 드롭 Drop

담당자: [단기심화7]오득령

> 에러 코드는 `common/src/main/java/com/openbake/common/exception/ErrorCode.java`가 원본입니다(`DR001~DR017`).
> 
> **2026-07-28 갱신:** `/{dropId}/info`, `/mine`, `PATCH /{dropId}`, `DELETE /{dropId}`가 새로 구현됐습니다(`d678dad`, `3ef5001` 커밋). 이제 **`/history`(참여 내역 조회) 하나만 미구현**으로 남았습니다.

## API 목록

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/drops/{dropId}/info` | 드롭 상세 정보 표시 |
| GET | `/api/v1/drops/history` | ⚠️ 미구현 — 드롭 참여 내역 조회 |
| POST | `/api/v1/drops/register` | 판매자 드롭 등록 |
| POST | `/api/v1/drops/{dropId}/confirm-entry` | 대기열 통과 후 드롭 입장 |
| POST | `/api/v1/drops/{dropId}/enter` | 드롭 대기열 진입 |
| GET | `/api/v1/drops/{dropId}/queue/rank` | 내 대기열 순번 확인 |
| GET | `/api/v1/drops/today/drop` | 오늘 진행하는 드롭 ID조회 (단순 값 가져오기) |
| POST | `/api/v1/drops/{dropId}/lock-start` | 수량 선택 후 재고 선점 |
| GET | `/api/v1/drops/mine` | 판매자 본인이 등록한 드롭 목록 조회 |
| PATCH | `/api/v1/drops/{dropId}` | 판매자 본인이 등록한 드롭 수정 (시작 전만 가능) |
| DELETE | `/api/v1/drops/{dropId}` | 판매자 본인이 등록한 드롭 삭제 (시작 전만 가능) |

## 2. 드롭 상세 정보 표시

### 2.1 기본 정보

- 설명: 드롭 상품 상세 페이지에 표시할 정보를 조회합니다. 인증 없이 누구나 조회 가능한 공개 API입니다.
- 호출 시점: 메인 화면에서 상세 정보 페이지 이동 시 호출.

### 2.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Path | `dropId` | Long | Y | 드롭 상품의 정보를 보기 위해선 ID 필요 |

### 2.2.1 요청 예시

```
GET /api/v1/drops/12/info HTTP/1.1
```

### 2.3 응답 파라미터

`DropProductInfo.of(...)`(`DropService.getDropProductInfo`)가 조립합니다. 응답이 `ApiResponse` 래퍼 없이 이 객체 그대로 옵니다 — `{"success": true, "data": {...}}`가 아니라 아래 필드가 최상위에 바로 온다는 뜻입니다(다른 대부분의 API와 다름, 확인 필요한 지점).

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
| `name` | String | Y | 상품명 |
| `description` | String | Y | 상품 설명 |
| `imageUrl` | String | Y | 이미지 URL |
| `dropStart` | LocalDateTime | Y | 드롭 시작 시각 |
| `dropEnd` | LocalDateTime | Y | 드롭 마감 시각 |
| `limitQuantity` | int | Y | 1인당 구매 제한 수량 |
| `price` | int | Y | 단가 |
| `totalQuantity` | int | Y | 총 발매 수량 |
| `remainQuantity` | int | Y | 남은 재고 |
| `dropStatus` | String | Y | `UPCOMING`/`ACTIVE`/`COMPLETED` |
| `pickupDates` | Array | Y | 픽업 가능 날짜 목록 (`Set<LocalDate>`, 정렬 순서 보장 안 됨) |

### 2.3.1 응답 예시

```json
{
  "name": "시그니처 소금빵",
  "description": "버터를 많이 써서 향이 좋고 쫀득해요.",
  "imageUrl": "https://cdn.openbake.com/drops/12.jpg",
  "dropStart": "2026-08-01T10:00:00",
  "dropEnd": "2026-08-01T14:00:00",
  "limitQuantity": 5,
  "price": 3000,
  "totalQuantity": 200,
  "remainQuantity": 137,
  "dropStatus": "ACTIVE",
  "pickupDates": ["2026-08-02", "2026-08-03"]
}
```

### 2.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **404 Not Found** | `DR001` | "존재하지 않는 드롭입니다." | 요청한 dropId에 해당하는 드롭이 없을 때 |

### 2.4.1 에러 응답 예시

```json
{
  "error": {
    "code": "DR001",
    "message": "존재하지 않는 드롭입니다."
  }
}
```

## 3. 드롭 참여 내역 조회 ⚠️ 미구현

> 코드에 없는 엔드포인트입니다. 아래는 설계안으로만 참고하세요.
> 

### 3.1 기본 정보

- 설명: 드롭에 참여했던 내역을 조회
- 호출 시점: 메인 화면에서 드롭 참여 내역 조회 이동 시 호출.

### 3.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `customUserDetails` | CustomUserDetails | Y | Token에서 userId 추출 |

### 3.2.1 요청 예시

```
GET /api/v1/drops/history HTTP/1.1

Content-Type: application/json        

{}
```

### 3.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
| drops | List<DropDto> | Y | 참여했던 드롭의 정보들 |

### 3.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **404 Not Found** | `RESOURCE_NOT_FOUND` | "존재하지 않는 정보입니다." | 요청한 ID에 해당하는 데이터가 DB에 없을 때 |
| **401 Unauthorized** | `EXPIRED_TOKEN` | "만료된 토큰입니다." | 세션/JWT 토큰이 만료된 상태로 요청 시 |

### 3.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "NOT_FOUND",
    "message": "존재하지 않는 정보입니다.",
    "details": "드롭이 존재하지 않습니다."
  }
}
```

## 4. 드롭 상품 등록

### 4.1 기본 정보

- 설명: 판매자가 드롭 상품 등록
- 호출 시점: 판매자가 드롭 상품을 등록하려고 할 때 호출

### 4.2 요청 파라미터

> ⚠️ 2026-07-28 실제 컨트롤러(`DropController.registerDropProduct`) 확인 결과, `POST /register`는 2-2절(수정)과 **완전히 동일한 `DropProductInfoRequest`** DTO를 그대로 받습니다. 이전 버전 문서에는 등록 전용으로 `pickUpAvailableDateList`/`dropPeriodStart`/`dropPeriodEnd` 필드명이 적혀 있었으나 실제 코드에는 존재하지 않는 필드였습니다(프론트가 이 문서를 그대로 구현했다가 `C001`/`NotEmpty` 검증 실패로 발견). 아래 필드명이 정확한 스펙입니다.

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 (승인된 판매자) |
| Body | `name` | String | Y | 상품명 |
| Body | `description` | String | Y | 상품 설명 |
| Body | `imageUrl` | String | Y | 이미지 URL |
| Body | `pickUpAvailableDates` | Set\<LocalDate\> | Y | 픽업 가능 날짜 목록 (비어있으면 안 됨) |
| Body | `dropStart` | LocalDateTime | Y | 드롭 시작 일시 |
| Body | `dropEnd` | LocalDateTime | Y | 드롭 종료 일시 |
| Body | `limitQuantity` | int | Y | 1인당 제한 수량(1 이상, 한정 수량 아님) |
| Body | `price` | int | Y | 단가 (0보다 커야 함) |
| Body | `totalQuantity` | int | Y | 총 수량 (0보다 커야 함) |

### 4.2.1 요청 예시

```
POST /api/v1/drops/register HTTP/1.1
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
	"name": "버터떡",
	"description": "버터를 많이 써서 향이 좋고 쫀득해요.",
	"imageUrl": "https://cdn.openbake.com/drops/new.jpg",
	"pickUpAvailableDates": ["2026-08-01", "2026-08-02", "2026-08-03"],
	"dropStart": "2026-07-25T13:00:00",
	"dropEnd": "2026-07-25T14:00:00",
	"limitQuantity": 5,
	"price": 3000,
	"totalQuantity": 200
}
```

### 4.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
| dropProductInfoResponse | DropProductInfoResponse | Y | 드롭 등록 성공한 내용 |

### 4.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **404 Not Found** | `C003` | "대상을 찾을 수 없습니다." | 요청한 ID에 해당하는 데이터가 DB에 없을 때 |
| **401 Unauthorized** | `ME002` | "유효하지 않은 인증 토큰입니다." | 토큰 만료/서명 오류 |
| 400 Bad Request | `DR002` | `"드롭 시작 시간 또는 마감 시간이 유효하지 않습니다."` |  |
| 400 Bad Request | `DR003` | `"픽업 가능 날짜는 드롭 마감일 이후여야 합니다."` |  |
| 409 Conflict | `DR004` | `"해당 날짜에는 이미 등록된 드롭이 존재합니다."` | ⚠️ 판매자별이 아니라 **플랫폼 전체 기준**(다른 판매자의 드롭도 그 날짜를 막음) — `docs/backend-bug-reports.md` §6 참고 |
| 400 Bad Request | `DR005` | `"1인당 제한 수량은 총 수량보다 클 수 없습니다."` |  |

### 4.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "C003",
    "message": "대상을 찾을 수 없습니다."
  }
}
```

## 5. 대기열 통과 후 드롭 입장

### 5.1 기본 정보

- 설명: 대기열을 통과한 유저가 드롭 상세(참여) 페이지에 진입하며 참여를 확정한다. DropEntry를 ENTERED 상태로 생성하고 상품 정보를 반환한다.
- 호출 시점: 대기열 순번이 0(ACTIVE)이 되어 입장이 허용된 유저가 드롭 참여 페이지로 진입할 때

### 5.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Header | `customUserDetails` | CustomUserDetails | Y | Token에서 memberId 추출 |
| Path | dropId | Long | Y | 참여를 확정할 드롭 ID |

### 5.2.1 요청 예시

```
POST /api/v1/drops/12/confirm-entry HTTP/1.1

Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImV4cCI6MTgwMTIzNDU2N30...

Content-Type: application/json

{}
```

### 5.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
| response | ConfirmEntryResponse | Y | 드롭 입장 시 보여줄 상품 상세 정보 |

### 5.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **400 Bad Request** | DR009 | "드롭에 입장 할 수 없습니다. 조금만 더 기다려주세요." | 대기열 순번이 아직 도달하지 않은 유저가 요청할 경우 (`ErrorCode.java:60`에서 400으로 정의됨 — 이전 문서의 "404"는 오기재) |
| **404 Not Found** | `DR001` | "존재하지 않는 드롭입니다." | 요청한 dropId에 해당하는 드롭이 없을 시 |

### 4.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "DR009",
    "message": "드롭에 입장 할 수 없습니다. 조금만 더 기다려주세요."
  }
}
```

## 6. 드롭 대기열 진입

### 6.1 기본 정보

- 설명: 드롭 참여 페이지 진입을 위해 대기열에 진입 요청을 보낸다. 이미 대기열/입장 상태라면 중복 등록 없이 현재 순번을 반환한다.
- 호출 시점: 유저가 드롭 참여 버튼을 눌러 대기열에 진입할 때 (1회성 호출, 이후 순번 확인은 getQueueRank로 폴링)

### 6.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Path | `dropId` | Long | Y | 대기열에 진입할 드롭 ID |
| HEADER | `customUserDetails`  | CustomUserDetails | Y | 토큰에 저장된 로그인한 유저의 정보 |

### 6.2.1 요청 예시

```
POST /api/v1/drops/12/enter HTTP/1.1                                                                                                                                                                   
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImV4cCI6MTgwMTIzNDU2N30...                                                                                                  
  Content-Type: application/json                                                                                                                                                                         
                                                                                                                                                                                                     
{} 
```

### 6.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
| rank | Long | Y | 현재 대기 순번. 0이면 입장 허용 상태 |
| status | String | Y | `WAITING` \| `ACTIVE` 중 하나 |

> 입장 허용은 즉시 반영되지 않습니다. `QueueScheduler`가 1초 주기로 한 번에 최대 100명씩 `WAITING → ACTIVE` 전환을 처리하므로(`QueueScheduler.java:23,58-79`), 순번이 0이 되어도 최대 1초 정도의 지연이 있을 수 있습니다.
> 

### 6.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **404 Not Found** | `DR001` | "존재하지 않는 드롭입니다." | 요청한 ID에 해당하는 드롭이 없을 때 |
| 400 Bad Request | `DR008` | “현재 응모 가능한 드롭 기간이 아닙니다.” | 드롭 진행 기간이 아닐때 |
| 409 Conflict | DR006 | “이미 참여 중이거나 구매가 완료된 드롭입니다.” | 이미 입장 or 재고 선점 or 구매 완료 상태로 이미 참여 이력이 있는 유저가 재 입장 시도 시 |

### 6.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "DR008",
    "message": "현재 응모 가능한 드롭 기간이 아닙니다."
  }
}
```

## 7. 내 대기열 순번 확인

### 7.1 기본 정보

- 설명: 현재 내 대기열 순번을 조회
- 호출 시점: enterQueue 호출 이후, 입장이 허용될 때까지 클라이언트가 주기적으로 반복 호출

### 7.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Path | dropId | Long | Y | 순번을 조회할 드롭 ID |
| HEADER | `customUserDetails`  | CustomUserDetails | Y | 토큰에 저장된 로그인한 유저의 정보 |

### 7.2.1 요청 예시

```
GET /api/v1/drops/12/queue/rank HTTP/1.1                                                                                                                                                               
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjUsImV4cCI6MTgwMTIzNDU2N30...                                                                                                  
  Content-Type: application/json {}
```

### 7.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
| rank | Long | Y | 현재 대기 순번 0이면 입장 허용 -1이면 대기열에 없음 |
| status | String | Y | WAITING | ACTIVE | NOT_FOUND |

### 7.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
|  |  |  | DB를 조회하지 않기에 별도의 비즈니스 예외 없음. |

### 

## 8. 오늘의 드롭 ID 조회

### 8.1 기본 정보

- 설명: 오늘 진행되는 드롭의 ID를 조회한다. 대기열 진입(enterQueue) 전 선행 작업으로, 이 dropId를 확보해야 이후 대기열 관련 API를 호출할 수 있다.
- 호출 시점: 메인 화면 진입 시, 드롭 참여 플로우를 시작하기 전 최초 1회 호출

### 8.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
|  |  |  |  | 별도의 요청 파라미터 없음 |

### 8.2.1 요청 예시

```
GET /api/v1/drops/today/drop HTTP/1.1                                                                                                                                                                  
  Content-Type: application/json                                                                                                                                                                         
                                                                                                                                                                                                         
  {}
```

### 8.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
| data | Long | Y | 오늘 진행하는 드롭의 ID |

### 8.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 404 NOT FOUND | C003 | “대상을 찾을 수 없습니다.” | 오늘 시작하는 드롭이 DB에 하나도 없을 때 |

### 8.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "C003",
    "message": "대상을 찾을 수 없습니다",
    "details": ""
  }
}
```

## 9. 선택한 수량 재고 선점

### 9.1 기본 정보

- 설명: 수량 선택 후 장바구니 가기 버튼 누를 시 락을 통한 재고 선점 로직 실행
- 호출 시점: 수량 선택 후 장바구니 가기 버튼 누를 시 호출.

### 9.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Path | `dropId` | Long | Y | 드롭 상품의 정보를 보기 위해선 ID 필요 |
| Body | `quantity` | int | Y | 선점할 수량 (실제 필드명은 `request`가 아니라 `quantity`입니다) |

> ⚠️ **요청 필드가 실제와 다릅니다.** `DropReserveRequest.java`의 필드는 `quantity`(int)이고 `DropLockController.java:20-22`도 `request.getQuantity()`를 씁니다. 이전 문서처럼 `{"request": "10"}`(필드명 `request`, 문자열)로 보내면 역직렬화에 실패합니다.
> 

### 9.2.1 요청 예시

```
POST /api/v1/drops/12/lock-start HTTP/1.1

Content-Type: application/json        

{
	"quantity": 10
}
```

### 9.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
|  | String | N | 완료 메시지만 반환 |

### 9.4 예외 및 에러 처리

> ⚠️ 이전 문서에는 `RESOURCE_NOT_FOUND`(존재하지 않는 코드) 하나만 있었지만, 실제로는 `DropLockFacade`/`DropLockService`/`DropInventory`(`DropLockFacade.java:22-52`, `DropLockService.java:28-63`, `DropInventory.java:52-53`)에서 아래처럼 훨씬 다양한 케이스가 발생합니다.

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 404 Not Found | `DR001` | "존재하지 않는 드롭입니다." | 수량 검증 시점에 드롭을 찾지 못함 |
| 400 Bad Request | `DR0013` | "1인당 제한 수량보다 많이 선택했습니다." | 1인당 구매 제한 초과 |
| 404 Not Found | `DR011` | "드롭에 참여한 기록이 없습니다. 드롭에 참여한 후 다시 시도해주세요." | 대기열을 통과(`confirm-entry`)한 이력이 없는 유저가 요청 |
| 400 Bad Request | `DR014` | "재고를 선점할 수 있는 상태가 아닙니다." | 이미 `RESERVED` 등 재고 선점이 불가능한 상태 |
| 500 Internal Server Error | `DR012` | "락을 획득하는 과정에서 시스템 오류가 발생했습니다." | 락 획득 3초 타임아웃 |
| 400 Bad Request | `DR007` | "준비된 재고가 모두 소진되었습니다." | 재고 부족 |

> ⚠️ **재고 선점 락은 "분산 락"이 아니라 프로세스 로컬 락입니다.** `DropLockFacade.java:27-53`가 `dropId`별로 JVM 안의 `ConcurrentHashMap<Long, ReentrantLock>` + `tryLock(3, SECONDS)`를 씁니다. 코드 주석은 "분산 락"이라 되어있지만 실제로는 서버 인스턴스가 여러 대면 동시성이 보장되지 않고, 3초 안에 락을 못 잡으면 `DR012`로 실패합니다.
> 

### 9.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "DR007",
    "message": "준비된 재고가 모두 소진되었습니다."
  }
}
```

## 1. 판매자 본인이 등록한 드롭 목록 조회

### 1.1 기본 정보

- **설명**: 로그인한 판매자 본인이 등록한 모든 드롭 상품 목록과 재고 정보를 조회합니다.
- **호출 시점**: 판매자 마이페이지 또는 드롭 관리 페이지 진입 시 호출.

### 1.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 (판매자로 승인된 회원) |

### 1.2.1 요청 예시

```
GET /api/v1/drops/mine HTTP/1.1
Authorization: Bearer eyJhbGciOi...
```

### 1.3 응답 파라미터

`ApiResponse<List<DropProductInfoResponse>>` — `data`가 배열입니다. `DropProductInfoResponse`는 2.3절의 `DropProductInfo`와 필드가 거의 같지만 **`dropId`가 추가로 포함**되고(목록에서 각 드롭을 구분해야 하므로), 필드명이 `pickUpAvailableDates`(2.3절의 `pickupDates`와 이름이 다름 — 두 응답 DTO가 서로 다른 클래스라 이름이 안 맞춰져 있음)입니다.

| **필드명** | **타입** | **필수 여부** | **설명** |
| --- | --- | --- | --- |
| `data[].dropId` | Long | Y | 드롭 ID |
| `data[].name` | String | Y | 상품명 |
| `data[].description` | String | Y | 상품 설명 |
| `data[].imageUrl` | String | Y | 이미지 URL |
| `data[].pickUpAvailableDates` | Array | Y | 픽업 가능 날짜 목록 |
| `data[].dropStart` | LocalDateTime | Y | 시작 시각 |
| `data[].dropEnd` | LocalDateTime | Y | 마감 시각 |
| `data[].limitQuantity` | int | Y | 1인당 제한 수량 |
| `data[].price` | int | Y | 단가 |
| `data[].totalQuantity` | int | Y | 총 수량 |
| `data[].remainQuantity` | int | Y | 남은 재고 |
| `data[].dropStatus` | String | Y | `UPCOMING`/`ACTIVE`/`COMPLETED` |

### 1.3.1 응답 예시

```json
{
  "success": true,
  "data": [
    {
      "dropId": 12,
      "name": "시그니처 소금빵",
      "description": "버터를 많이 써서 향이 좋고 쫀득해요.",
      "imageUrl": "https://cdn.openbake.com/drops/12.jpg",
      "pickUpAvailableDates": ["2026-08-02", "2026-08-03"],
      "dropStart": "2026-08-01T10:00:00",
      "dropEnd": "2026-08-01T14:00:00",
      "limitQuantity": 5,
      "price": 3000,
      "totalQuantity": 200,
      "remainQuantity": 137,
      "dropStatus": "ACTIVE"
    }
  ]
}
```

### 1.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 400 Bad Request | `C002` | "처리할 수 없는 상태입니다." | 로그인한 계정이 승인된 판매자가 아님(`CurrentSellerProvider.getSellerId()`가 비어있을 때 `INVALID_STATE` 예외) |

```json
{
  "error": {
    "code": "C002",
    "message": "처리할 수 없는 상태입니다."
  }
}
```

## 2. 판매자 본인의 드롭 수정

### 2.1 기본 정보

- **설명**: 판매자 본인이 등록한 특정 드롭 상품의 정보를 수정합니다. **`UPCOMING`(시작 전) 상태인 드롭만 수정 가능**하며, 필드는 전체 교체(PATCH지만 실제로는 PUT처럼 전체 필드 필수)입니다. 등록(4번)과 요청 바디가 동일한 `DropProductInfoRequest`를 씁니다.
- **호출 시점**: 판매자 드롭 관리 페이지에서 드롭 정보 수정 후 저장 버튼 클릭 시 호출.

### 2.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 (판매자) |
| Path | `dropId` | Long | Y | 수정할 드롭 ID |
| Body | `name` | String | Y | 상품명 |
| Body | `description` | String | Y | 상품 설명 |
| Body | `imageUrl` | String | Y | 이미지 URL |
| Body | `pickUpAvailableDates` | Set\<LocalDate\> | Y | 픽업 가능 날짜 목록 (비어있으면 안 됨) |
| Body | `dropStart` | LocalDateTime | Y | 드롭 시작 일시 |
| Body | `dropEnd` | LocalDateTime | Y | 드롭 종료 일시 |
| Body | `limitQuantity` | int | Y | 1인당 제한 수량 (1 이상) |
| Body | `price` | int | Y | 단가 (0보다 커야 함) |
| Body | `totalQuantity` | int | Y | 총 수량 (0보다 커야 함) — **주의: 수정 시 남은 재고를 이 값으로 리셋합니다**(`DropInventory.resetQuantity`), 이미 판매된 수량과 무관하게 재고가 통째로 바뀝니다 |

### 2.2.1 요청 예시

```
PATCH /api/v1/drops/12 HTTP/1.1
Authorization: Bearer eyJhbGciOi...
Content-Type: application/json

{
  "name": "시그니처 소금빵",
  "description": "버터를 많이 써서 향이 좋고 쫀득해요.",
  "imageUrl": "https://cdn.openbake.com/drops/12.jpg",
  "pickUpAvailableDates": ["2026-08-06", "2026-08-07"],
  "dropStart": "2026-08-01T10:00:00",
  "dropEnd": "2026-08-05T18:00:00",
  "limitQuantity": 2,
  "price": 8000,
  "totalQuantity": 100
}
```

### 2.3 응답 파라미터

`ApiResponse<DropProductInfoResponse>` — 1.3절과 동일한 필드 구조(`dropId` 포함).

### 2.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 400 Bad Request | `C001` | "잘못된 요청입니다." | 필수 필드 누락/형식 오류 |
| 400 Bad Request | `DR002` | "드롭 시작 시간 또는 마감 시간이 유효하지 않습니다." | |
| 400 Bad Request | `DR003` | "픽업 가능 날짜는 드롭 마감일 이후여야 합니다." | |
| 400 Bad Request | `DR005` | "1인당 제한 수량은 총 수량보다 클 수 없습니다." | |
| 403 Forbidden | `DR016` | "본인이 등록한 드롭이 아닙니다." | 다른 판매자의 드롭을 수정 시도 |
| 404 Not Found | `DR001` | "존재하지 않는 드롭입니다." | |
| 409 Conflict | `DR004` | "해당 날짜에는 이미 등록된 드롭이 존재합니다." | 날짜 변경 시 그 날짜에 이미 다른 드롭이 있음 (수정 대상 자기 자신은 제외하고 검사). ⚠️ 판매자별이 아니라 플랫폼 전체 기준 — `docs/backend-bug-reports.md` §6 참고 |
| 409 Conflict | `DR017` | "이미 시작되었거나 종료된 드롭은 수정/삭제할 수 없습니다." | 드롭 상태가 `UPCOMING`이 아님 |

```json
{
  "error": {
    "code": "DR017",
    "message": "이미 시작되었거나 종료된 드롭은 수정/삭제할 수 없습니다."
  }
}
```

## 3. 판매자 본인의 드롭 삭제

### 3.1 기본 정보

- **설명**: 판매자 본인이 등록한 특정 드롭 상품을 삭제합니다. (**`UPCOMING` 상태인 드롭만 삭제 가능**). `DropInventory`도 함께 삭제됩니다.
- **호출 시점**: 판매자 드롭 관리 페이지에서 드롭 삭제 버튼 클릭 시 호출.

### 3.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약조건** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 (판매자) |
| Path | `dropId` | Long | Y | 삭제할 드롭 ID |

### 3.2.1 요청 예시

```
DELETE /api/v1/drops/12 HTTP/1.1
Authorization: Bearer eyJhbGciOi...
```

### 3.3 응답 파라미터

`204 No Content` (본문 없음).

### 3.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 403 Forbidden | `DR016` | "본인이 등록한 드롭이 아닙니다." | 다른 판매자의 드롭을 삭제 시도 |
| 404 Not Found | `DR001` | "존재하지 않는 드롭입니다." | |
| 409 Conflict | `DR017` | "이미 시작되었거나 종료된 드롭은 수정/삭제할 수 없습니다." | 드롭 상태가 `UPCOMING`이 아님 (이미 대기열이 생겼거나 재고가 선점된 드롭도 삭제 못 함) |

```json
{
  "error": {
    "code": "DR016",
    "message": "본인이 등록한 드롭이 아닙니다."
  }
}
```