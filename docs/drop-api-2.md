# 드롭 Drop

담당자: [단기심화7]오득령

## API 목록

| Method | Path | 설명 |
| --- | --- | --- |
| GET | `/api/v1/drops/{dropId}/info` | 드롭 상세 정보 표시 (사용자들이 드롭입장 전 오늘의 드롭 상품 정보 조회) |
| GET | `/api/v1/drops/history` | 드롭 참여 내역 조회 (사용자가 지금까지 본인이 참여한 드롭 내역 조회) |
| POST | `/api/v1/drops/register` | 판매자 드롭 등록 |
| POST | /api/v1/drops/{dropId}/confirm-entry | 대기열 통과 후 드롭 입장 |
| POST | /api/v1/drops/{dropId}/enter | 드롭 대기열 진입 |
| GET | /api/v1/drops/{dropId}/queue/rank | 내 대기열 순번 확인 |
| GET | /api/v1/drops/today/drop | 오늘 진행하는 드롭 ID조회 (단순 값 가져오기) |
|  POST | /api/v1/drops`/{dropId}/lock-start` | 수량 선택 후 주문하기? 장바구니로 가기? 버튼 클릭 시 재고 선점 |
| GET | /api/v1/drops/mine | 판매자 본인이 등록한 드롭 조회 |
| PATCH | /api/v1/drops/{dropId} | 판매자 본인이 등록한 드롭 수정 |
| DELETE | /api/v1/drops/{dropId} | 판매자 본인이 등록한 드롭 삭제 |

## 2. 드롭 상세 정보 표시

### 2.1 기본 정보

- 설명: 드롭 상품 상세 페이지로 이동 (정말 정보만 보여줌)
- 호출 시점: 메인 화면에서 상세 정보 페이지 이동 시 호출.

### 2.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| Path | `dropId` | Long | Y | 드롭 상품의 정보를 보기 위해선 ID 필요 |

### 2.2.1 요청 예시

```
GET /api/v1/drops/12/info HTTP/1.1

Content-Type: application/json        

{}
```

### 2.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
| productInfo | ProductInfo | N | 드롭 상품의 정보 |

### 2.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **404 Not Found** | `RESOURCE_NOT_FOUND` | "존재하지 않는 정보입니다." | 요청한 ID에 해당하는 데이터가 DB에 없을 때 |

### 2.4.1 에러 응답 예시

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

## 3. 드롭 참여 내역 조회

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

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- | --- |
| BODY | `dropProductInfo`  | DropProductInfo | Y | 드롭 정보 및 상품 정보 |
| HEADER | `customUserDetails`  | CustomUserDetails | Y | 토큰에 저장된 로그인한 유저의 정보 |

### 4.2.1 요청 예시

```
POST /api/v1/drops/register HTTP/1.1

Content-Type: application/json        

{
	"name": "버터떡",
	"description": "버터를 많이 써서 향이 좋고 쫀득해요.",
	"imageUrl": "gtLisBCgoKDg0OGhAQFy0lICUv...",
	"pickUpAvailableDateList": ["2026-08-01",
        "2026-08-02",
        "2026-08-03"],
	"dropPeriodStart: "2026-07-25T13:00:00",
	"dropPeriodEnd": "2026-07-25T14:00:00",
	"limitQuantity": 5 // 한정 수량 (1인당 구매 제한 아님),
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
| **404 Not Found** | `ENTITY_NOT_FOUND` | "존재하지 않는 정보입니다." | 요청한 ID에 해당하는 데이터가 DB에 없을 때 |
| **401 Unauthorized** | `EXPIRED_TOKEN` | "만료된 토큰입니다." | 세션/JWT 토큰이 만료된 상태로 요청 시 |
| 400 Bad Request | `INVALID_DROP_TIME` | `"드롭 시작 시간 또는 마감 시간이 유효하지 않습니다."` |  |
| 400 Bad Request | `INVALID_PICKUP_DATE` | `"픽업 가능 날짜는 드롭 마감일 이후여야 합니다."` |  |
| 409 Conflict | `DUPLICATE_DROP_DATE` | `"해당 날짜에는 이미 등록된 드롭이 존재합니다."` |  |
| 400 Bad Request | `INVALID_QUANTITY_LIMIT` | `"1인당 제한 수량은 총 수량보다 클 수 없습니다."` |  |

### 4.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "존재하지 않는 드롭입니다.",
    "details": "다음 드롭을 기다려주세요."
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
| **404 BAD REQUEST** | DR009 | "드롭에 입장 할 수 없습니다. 조금만 더 기다려주세요." | 대기열 순번이 아직 도달하지 않은 유저가 요청할 경우 |
| **404 Not Found** | `DR001` | "존재하지 않는 드롭입니다.." | 요청한 dropId에 해당하는 드롭이 없을 시 |

### 4.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "DR009",
    "message": "드롭에 입장 할 수 없습니다 조금만 더 기다려주세요.",
    "details": ""
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
| status | String | Y | WAITIN | ACTIVE 중 하나 |

### 6.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **404 Not Found** | DRO001 | "존재하지 않는 드롭입니다." | 요청한 ID에 해당하는 드롭이 없을 때 |
| 400 Bad Request | `DR008` | “현재 응모 가능한 드롭 기간이 아닙니다.” | 드롭 진행 기간이 아닐때 |
| 409 Conflict | DR006 | “이미 참여 중이거나 구매가 완료된 드롭입니다.” | 이미 입장 or 재고 선점 or 구매 완료 상태로 이미 참여 이력이 있는 유저가 재 입장 시도 시 |

### 6.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "DR008",
    "message": "현재 응모 가능ㅎ한 드롭 기간이 아닙니다.",
    "details": ""
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
| Body | request | DropReserveRequest | Y | 선택한 수량 |

### 9.2.1 요청 예시

```
POST /api/v1/drops/12/lock-start HTTP/1.1

Content-Type: application/json        

{
	"request": "10"
}
```

### 9.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약 조건** |
| --- | --- | --- | --- |
|  | String | N | 완료 메시지만 반환 |

### 9.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| **404 Not Found** | `RESOURCE_NOT_FOUND` | "존재하지 않는 정보입니다." | 요청한 ID에 해당하는 데이터가 DB에 없을 때 |

### 9.4.1 에러 응답 예시

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

## 10. 판매자 본인이 등록한 드롭 목록 조회

### 10.1 기본 정보

- **설명**: 로그인한 판매자 본인이 등록한 모든 드롭 상품 목록과 재고 정보를 조회합니다.
- **호출 시점**: 판매자 마이페이지 또는 드롭 관리 페이지 진입 시 호출.

10.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약조건** |
| --- | --- | --- | --- | --- |
|  |  |  |  |  |

10.2.1 요청 예시

HTTP

```
GET /api/v1/drops/mine HTTP/1.1
Content-Type:application/json

{}
```

10.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약조건** |
| --- | --- | --- | --- |
| code | String | Y | 응답 코드 |
| message | String | Y | 응답 메시지 |
| data | List<DropProductInfoResponse> | Y | 판매자가 등록한 드롭 상품 및 재고 정보 리스트 |

10.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 400 Bad Request | `INVALID_STATE` | "유효하지 않은 상태입니다." | 로그인한 판매자 인증 정보를 찾을 수 없거나 상태가 올바르지 않을 때 |

10.4.1 에러 응답 예시

JSON

```
{
  "error": {
    "code": "INVALID_STATE",
    "message": "유효하지 않은 상태입니다.",
    "details": "판매자 인증 정보를 찾을 수 없습니다."
  }
}
```

## 11. 판매자 본인의 드롭 수정

### 11.1 기본 정보

- **설명**: 판매자 본인이 등록한 특정 드롭 상품의 정보를 수정합니다. (**시작 전인 드롭만 수정 가능**)
- **호출 시점**: 판매자 드롭 관리 페이지에서 드롭 정보 수정 후 저장 버튼 클릭 시 호출.

### **11.2 요청 파라미터**

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약조건** |
| --- | --- | --- | --- | --- |
| Path | `dropId` | Long | Y | 수정할 드롭 ID |
| Body | `dropStart` | LocalDateTime | Y | 드롭 시작 일시 |
| Body | `dropEnd` | LocalDateTime | Y | 드롭 종료 일시 |
| Body | `limitQuantity` | Integer | Y | 인당 구매 제한 수량 |
| Body | `totalQuantity` | Integer | Y | 드롭 전체 재고 수량 |
| Body | `pickUpAvailableDates` | List<LocalDate> | Y | 픽업 가능 날짜 목록 |
| Body | imageUrl | String | Y | 이미지 경로 |
| Body | price | int | Y | 가 |

**11.2.1 요청 예시**

PATCH /api/v1/drops/12 HTTP/1.1
Authorization: Bearer
Content-Type: application/json

{
"dropStart": "2026-08-01T10:00:00",
"dropEnd": "2026-08-05T18:00:00",
"limitQuantity": 2,
"totalQuantity": 100,
"pickUpAvailableDates": [
"2026-08-06",
"2026-08-07"
]

“price”: 8000,
”imageUrl”: “[이미지 경로]”
}

11.3 응답 파라미터

| **필드명** | **타입** | **필수 여부** | **설명 / 제약조건** |
| --- | --- | --- | --- |
| code | String | Y | 응답 코드 |
| message | String | Y | 응답 메시지 |
| data | DropProductInfoResponse | Y | 수정이 완료된 드롭 상품 상세 정보 |

11.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 400 Bad Request | `INVALID_STATE` | "유효하지 않은 상태입니다." | 판매자 인증 정보를 찾을 수 없을 때 |
| 400 Bad Request | `DROP_NOT_EDITABLE` | "수정할 수 없는 드롭입니다." | 이미 시작되었거나 종료된 드롭을 수정하려 할 때 |
| 400 Bad Request | `INVALID_INPUT_VALUE` | "잘못된 수량 설정입니다." | 제한 수량이 전체 수량보다 크게 설정된 경우 등 |
| 403 Forbidden | `DROP_OWNER_MISMATCH` | "드롭 소유자가 일치하지 않습니다." | 본인이 등록한 드롭이 아닌 타인의 드롭을 수정하려 할 때 |
| 404 Not Found | `DROP_NOT_FOUND` | "존재하지 않는 드롭입니다." | 요청한 `dropId`에 해당하는 데이터가 DB에 없을 때 |

11.4.1 에러 응답 예시

{
"error": {
"code": "DROP_NOT_EDITABLE",
"message": "수정할 수 없는 드롭입니다.",
"details": "이미 진행 중이거나 종료된 드롭은 수정할 수 없습니다."
}
}

## 12. 판매자 본인의 드롭 삭제

### 12.1 기본 정보

- **설명**: 판매자 본인이 등록한 특정 드롭 상품을 삭제합니다. (**시작 전인 드롭만 삭제 가능**)
- **호출 시점**: 판매자 드롭 관리 페이지에서 드롭 삭제 버튼 클릭 시 호출.

12.2 요청 파라미터

| **구분** | **필드명** | **타입** | **필수 여부** | **설명 / 제약조건** |
| --- | --- | --- | --- | --- |
| Path | `dropId` | Long | Y | 삭제할 드롭 ID |

12.2.1 요청 예시

DELETE /api/v1/drops/12 HTTP/1.1
Authorization: Bearer
Content-Type: application/json

{}

### 12.3 응답 파라미터

*(해당 API는 `@ResponseStatus(HttpStatus.NO_CONTENT)`를 사용하므로 Body 응답 데이터가 없습니다.)*

- **HTTP Status**: `204 No Content`

12.4 예외 및 에러 처리

| **HTTP Status** | **에러 코드** | **에러 메시지 (Message)** | **발생 시나리오** |
| --- | --- | --- | --- |
| 400 Bad Request | `INVALID_STATE` | "유효하지 않은 상태입니다." | 판매자 인증 정보를 찾을 수 없을 때 |
| 400 Bad Request | `DROP_NOT_EDITABLE` | "삭제할 수 없는 드롭입니다." | 이미 시작되었거나 진행 중인 드롭을 삭제하려 할 때 |
| 403 Forbidden | `DROP_OWNER_MISMATCH` | "드롭 소유자가 일치하지 않습니다." | 본인이 등록한 드롭이 아닌 타인의 드롭을 삭제하려 할 때 |
| 404 Not Found | `DROP_NOT_FOUND` | "존재하지 않는 드롭입니다." | 요청한 `dropId`에 해당하는 데이터가 DB에 없을 때 |

12.4.1 에러 응답 예시

{
"error": {
"code": "DROP_OWNER_MISMATCH",
"message": "드롭 소유자가 일치하지 않습니다.",
"details": "해당 드롭을 삭제할 권한이 없습니다."
}
}