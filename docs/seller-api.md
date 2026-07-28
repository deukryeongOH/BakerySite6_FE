# 판매자

담당자: [단기심화7]이세종

> 에러 코드는 `common/src/main/java/com/openbake/common/exception/ErrorCode.java`가 원본입니다. `applicationStatus`처럼 enum을 그대로 JSON으로 주고받는 필드는 대소문자 무시 설정이 없으므로 **`PENDING`/`APPROVED`/`REJECTED`처럼 항상 대문자 enum 이름 그대로** 보내야 합니다.

# 1. Seller 도메인

## API 목록

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/sellers/business-verifications` | 사업자 정보 인증 (mock) |
| POST | `/api/v1/sellers/settlement-account/verification-requests` | 계좌 인증 요청 (1원 송금 mock) |
| GET | `/api/v1/sellers/settlement-account/verification-requests/{verificationRequestId}/mock-code` | **[DEV 전용]** 목업 인증 코드 조회 |
| POST | `/api/v1/sellers/settlement-account/verification-requests/{verificationRequestId}/verify` | 계좌 인증 확인 (인증 코드 검증) |
| POST | `/api/v1/sellers/apply` | 판매자 입점 신청 |
| PATCH | `/api/v1/sellers/{id}/status` | 입점 승인/반려 (admin) |
| GET | `/api/v1/sellers/{id}` | 판매자 조회 |
| GET | `/api/v1/sellers/me` | 내 판매자 신청 조회 |

> 사업자 인증(1-1)은 상태를 저장하지 않는 단순 대조 검증입니다. `apply`(1-4) 요청에 사업자 정보를 다시 담아 보내면, 그 시점에 서버가 한 번 더 대조합니다.
계좌 인증(1-2/1-3)은 판매자 신청 이전, 로그인한 회원(memberId) 기준으로 Redis에 임시 저장됩니다. 아직 Seller가 생성되기 전이라 sellerId가 없기 때문입니다. 인증이 끝난 상태로 `apply`를 호출하면 그 시점에 저장된 계좌 정보로 Seller가 생성됩니다.
계좌 인증 요청 API는 승인 이후 계좌 정보를 변경할 때도 동일하게 재사용합니다 (이미 Seller가 있으면 그 자리에서 계좌 정보를 갱신하고 `accountVerified`를 다시 `false`로 리셋합니다).
> 

## API 상세

---

### 1-1. 사업자 정보 인증

## 1. 기본 정보

- **설명:** 회원이 사업자등록번호/사업장 주소/대표자명을 입력하고 [인증] 버튼을 눌렀을 때 호출합니다. 결과를 저장하지 않는 단순 대조 검증으로, 입력값이 등록된 사업자 정보와 일치하는지만 즉시 확인합니다. 1-4(입점 신청)에서 동일한 정보로 다시 한 번 대조합니다.
    - **[목업 안내]** 실제 사업자등록 진위 확인(국세청 API 연동 등) 대신, 서버에 미리 등록해둔 사업자번호-대표자명 목록과 대조합니다. 나중에 실제 연동으로 교체하면 이 API 내부 검증 로직만 바꾸면 됩니다.
- **호출 시점:** 입점 신청 폼에서 사업자번호/주소를 입력하고 [인증] 버튼 클릭 시
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/sellers/business-verifications`
    - **요청 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Body | `businessNumber` | String | Y | 사업자등록번호 |
| Body | `businessAddress` | String | Y | 사업장 주소 |
| Body | `businessRepresentativeName` | String | Y | 사업자등록증 상 대표자명 |

```json
{
  "businessNumber": "123-45-67890",
  "businessAddress": "서울시 ...",
  "businessRepresentativeName": "이세종"
}
```

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "verified": true,
    "businessNumber": "123-45-67890",
    "verifiedAt": "2026-07-23T11:00:00"
  }
}
```

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | C001 | 잘못된 요청입니다. | 사업자등록번호 형식 오류 |
| 400 | SE001 | 사업자 인증에 실패했습니다. | mock 검증 로직 실패 (형식은 맞지만 검증 불통과) |

```json
{
  "success": false,
  "error": {
    "code": "SE001",
    "message": "사업자 인증에 실패했습니다."
  }
}
```

---

### 1-2. 계좌 인증 요청 (1원 송금)

## 1. 기본 정보

- **설명:** 계좌 정보를 제출하면 1원을 송금하고, 입금자명에 4자리 인증 코드를 실어 보냅니다. 회원(memberId) 기준으로 동작하므로 다음 두 경우에 모두 쓰입니다.
    1. 아직 Seller가 없는 상태(입점 신청 전) — 계좌 정보와 인증 결과를 memberId 기준으로 임시 저장해뒀다가 1-4에서 사용
    2. 이미 Seller가 있는 상태(승인 이후 계좌 변경) — 즉시 Seller의 계좌 정보를 갱신하고 `accountVerified=false`로 리셋한 뒤 인증 프로세스를 다시 시작
    - **[목업 안내]** 실제 은행 송금 대신, 서버가 생성한 인증 코드를 로그로 남기고 Redis에 TTL(3분)로 저장합니다. 1-2-1(DEV 전용) API로 코드를 조회할 수 있으며, `local`/`dev` 프로파일에서만 활성화하고 운영 배포 시에는 반드시 제거하거나 비활성화해야 합니다.
- **호출 시점:** 계좌 정보 입력 후 [인증하기] 버튼 클릭 시 (신청 전/후 공통)
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/sellers/settlement-account/verification-requests`
    - **요청 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Body | `bankCode` | String | Y | 은행 코드 (예: 088 - 신한) |
| Body | `accountNumber` | String | Y | 계좌번호 (하이픈 없이, 숫자 10~14자리만 허용 — `@Pattern(\d{10,14})`) |
| Body | `accountHolder` | String | Y | 예금주명 |

```json
{
  "bankCode": "088",
  "accountNumber": "110123456789",
  "accountHolder": "이세종"
}
```

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "verificationRequestId": "vr_20260723_001",
    "expiresAt": "2026-07-23T11:03:00"
  }
}
```

> 인증 코드 자체는 이 응답으로 내려주지 않습니다. 목업 단계에서는 서버 로그 또는 1-2-1(DEV 전용) API로 확인합니다.
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | C001 | 잘못된 요청입니다. | `accountNumber`가 10~14자리 숫자 형식을 벗어남 — DTO validation 단계에서 걸러지므로 SE002가 아니라 공통 코드로 내려갑니다. |
| 400 | SE002 | 은행 코드 또는 계좌번호 형식이 올바르지 않습니다. | `bankCode`가 `MockBankRegistry`에 등록되지 않은 코드인 경우. 실제 코드상 SE002는 **은행 코드 오류에만** 쓰이고, 계좌번호 형식 오류는 위 C001로 처리됩니다. |

```json
{
  "success": false,
  "error": {
    "code": "SE002",
    "message": "은행 코드 또는 계좌번호 형식이 올바르지 않습니다."
  }
}
```

---

### 1-2-1. [DEV 전용] 목업 인증 코드 조회

## 1. 기본 정보

- **설명:** 목업 구현 단계에서, 1-2로 생성된 인증 코드를 개발/데모 목적으로 조회합니다. **`local`/`dev` 프로파일에서만 노출되어야 하며, 운영(`prod`) 환경에서는 반드시 비활성화하거나 제거해야 합니다.**
- **호출 시점:** 개발/발표 시연 중, 실제 은행 문자를 대신해 코드를 확인할 때
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/sellers/settlement-account/verification-requests/{verificationRequestId}/mock-code`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Path | `verificationRequestId` | String | Y | 1-2에서 발급받은 요청 ID |

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "verificationRequestId": "vr_20260723_001",
    "code": "3821",
    "expiresAt": "2026-07-23T11:03:00"
  }
}
```

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 404 | C003 | 대상을 찾을 수 없습니다. | verificationRequestId가 존재하지 않거나 만료되어 Redis에서 삭제됨 |

```json
{
  "success": false,
  "error": {
    "code": "C003",
    "message": "대상을 찾을 수 없습니다."
  }
}
```

---

### 1-3. 계좌 인증 확인

## 1. 기본 정보

- **설명:** 입력한 인증 코드가 발송된 코드와 일치하는지 확인합니다. 성공 시 회원 기준 인증 상태가 완료로 표시되고, 이미 Seller가 있다면 그 Seller의 `accountVerified=true`, `accountVerifiedAt`도 즉시 반영됩니다.
- **호출 시점:** 계좌 거래내역에서 확인한 4자리 코드를 입력하고 [확인] 클릭 시
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/sellers/settlement-account/verification-requests/{verificationRequestId}/verify`
    - **요청 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Path | `verificationRequestId` | String | Y | 1-2에서 발급받은 요청 ID |
| Body | `verificationCode` | String | Y | 계좌 거래내역에서 확인한 4자리 코드 |

```json
{
  "verificationCode": "3821"
}
```

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "verified": true,
    "accountVerifiedAt": "2026-07-23T11:02:30"
  }
}
```

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | SE003 | 인증 코드가 일치하지 않습니다. | 코드 불일치 |
| 410 | SE004 | 인증 유효 시간이 만료되었습니다. | 1-2 요청 후 유효 시간(3분) 초과 |
| 404 | C003 | 대상을 찾을 수 없습니다. | verificationRequestId가 존재하지 않음. **다른 회원이 발급받은 verificationRequestId로 요청한 경우도 403이 아니라 이 404로 처리됩니다** (`SellerService.verifyAccount`가 memberId 불일치를 존재하지 않는 요청과 동일하게 취급). |

```json
{
  "success": false,
  "error": {
    "code": "SE003",
    "message": "인증 코드가 일치하지 않습니다."
  }
}
```

---

### 1-4. 판매자 입점 신청

## 1. 기본 정보

- **설명:** 회원이 판매자(베이커리) 입점을 신청합니다. 사업자 정보는 이 요청에 포함해서 서버가 다시 대조하고, 계좌 정보는 1-3(계좌 인증)이 미리 완료되어 있어야 합니다. 초기 `applicationStatus`는 `pending`. 회원당 1건만 신청 가능(0..1).
- **호출 시점:** 사업자 인증, 계좌 인증을 모두 마친 뒤 [신청하기] 클릭 시
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/sellers/apply`
    - **요청 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Body | `bakeryName` | String | Y | 베이커리 상호명 |
| Body | `businessNumber` | String | Y | 사업자등록번호 |
| Body | `businessAddress` | String | Y | 사업장 주소 |
| Body | `businessRepresentativeName` | String | Y | 사업자등록증 상 대표자명 |

```json
{
  "bakeryName": "세종베이커리",
  "businessNumber": "123-45-67890",
  "businessAddress": "서울시 ...",
  "businessRepresentativeName": "이세종"
}
```

> `settlementBankCode`/`settlementAccountNumber`/`settlementAccountHolder`는 요청 바디로 받지 않습니다. 계좌 인증(1-2/1-3)은 미리 완료되어 있어야 하고, 서버가 그때 memberId 기준으로 저장해둔 인증 완료 정보를 그대로 사용합니다 (클라이언트가 인증 여부를 임의로 조작할 수 없도록, 계좌 인증 상태는 항상 서버가 판단합니다). 사업자 정보는 상태를 저장하지 않으므로 이 요청에 다시 담아 보내고, 서버가 이 시점에 한 번 더 대조합니다.
> 

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "sellerId": 1,
    "memberId": 1,
    "bakeryName": "세종베이커리",
    "applicationStatus": "PENDING"
  }
}
```

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | C001 | 잘못된 요청입니다. | `bakeryName` 등 필수값 누락/형식 오류 |
| 400 | SE001 | 사업자 인증에 실패했습니다. | 요청에 담긴 사업자 정보가 등록된 정보와 불일치 |
| 409 | SE005 | 이미 판매자 신청을 완료한 회원입니다. | 0..1 위반 |
| 409 | SE006 | 계좌 인증이 완료되지 않았습니다. | 1-3을 거치지 않고 신청 시도 |

```json
{
  "success": false,
  "error": {
    "code": "SE005",
    "message": "이미 판매자 신청을 완료한 회원입니다."
  }
}
```

---

### 1-5. 입점 승인/반려 처리

## 1. 기본 정보

- **설명:** 관리자가 판매자 입점 신청을 승인/반려합니다. pending 상태에서만 처리 가능. (사업자/계좌 인증은 1-4 신청 시점에 이미 완료가 보장되므로, 승인 처리에서 별도로 재검증하지 않습니다.)
- **호출 시점:** 관리자가 입점 신청 목록에서 [승인]/[반려] 클릭 시
- **통신 기본 규격:**
    - **Method:** `PATCH`
    - **Path:** `/api/v1/sellers/{id}/status`
    - **요청 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 (admin) |
| Path | `id` | Long | Y | 대상 판매자 ID |
| Body | `applicationStatus` | String | Y | `APPROVED` / `REJECTED` (대문자 enum 이름 그대로. 대소문자 무시 설정이 없어 `"rejected"`처럼 소문자로 보내면 역직렬화 자체가 실패해 400 C001로 떨어집니다) |
| Body | `rejectReason` | String | N | 반려 시 사유 |

```json
{
  "applicationStatus": "REJECTED",
  "rejectReason": "제출한 사업장 주소가 실제 등록 주소와 일치하지 않습니다."
}
```

> ⚠️ `applicationStatus`가 `APPROVED`가 아니면 코드상 무조건 반려(reject) 분기를 탑니다(`SellerService.updateApplicationStatus`가 `== APPROVED`만 확인하고 나머지는 전부 `else`). 즉 `PENDING`을 보내도 반려 처리되어 버리므로, 프론트는 반드시 `APPROVED`/`REJECTED` 둘 중 하나만 보내야 합니다.
> 

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "sellerId": 1,
    "applicationStatus": "REJECTED",
    "rejectReason": "제출한 사업장 주소가 실제 등록 주소와 일치하지 않습니다.",
    "updatedAt": "2026-07-23T11:00:00"
  }
}
```

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | C001 | 잘못된 요청입니다. | `applicationStatus`에 enum에 없는 값(소문자 포함)을 보낸 경우 |
| 403 | SE007 | 권한이 없습니다. | admin이 아닌 사용자의 요청 |
| 409 | C002 | 처리할 수 없는 상태입니다. | pending이 아닌 신청 건에 대한 처리 시도 (`Seller.approve()`/`reject()` 내부 가드) |
| 404 | C003 | 대상을 찾을 수 없습니다. | 존재하지 않는 판매자 ID |

```json
{
  "success": false,
  "error": {
    "code": "C002",
    "message": "처리할 수 없는 상태입니다."
  }
}
```

---

### 1-6. 판매자 조회

## 1. 기본 정보

- **설명:** 판매자 ID로 상세 정보를 조회합니다. 인증 없이 누구나 조회 가능한 공개 상점 페이지용 API입니다.
- **호출 시점:** 판매자 프로필/상점 페이지 진입 시
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/sellers/{id}`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Path | `id` | Long | Y | 조회할 판매자 ID |

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "sellerId": 1,
    "memberId": 1,
    "bakeryName": "세종베이커리",
    "businessNumber": "123-45-67890",
    "applicationStatus": "APPROVED",
    "settlementBankCode": "088",
    "settlementAccountNumberMasked": "110-****-5678",
    "accountVerified": true,
    "accountVerifiedAt": "2026-07-10T09:00:00"
  }
}
```

> 계좌번호는 암호화 컬럼이라 복호화 후 마스킹 처리해서 내려줍니다. 원본 전체 번호는 어떤 조회 API에서도 그대로 반환하지 않습니다 (본인이라도 마스킹된 값만 확인 - 재등록 시에는 새로 입력).
`rejectReason`은 공개 API인 이 응답에는 포함하지 않습니다. 신청자 본인에게 반려 사유를 보여주는 기능은 1-7(내 판매자 신청 조회)에서 제공합니다.
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 404 | C003 | 대상을 찾을 수 없습니다. | 존재하지 않는 판매자 ID |

```json
{
  "success": false,
  "error": {
    "code": "C003",
    "message": "대상을 찾을 수 없습니다."
  }
}
```

### 1-7. 내 판매자 신청 조회

## 1. 기본 정보

- **설명:** 로그인한 회원 본인의 판매자 신청 정보를 memberId 기준으로 조회합니다. 신청 이력이 없으면(Seller-Member는 0..1 관계) 404. 본인 조회이므로 1-6과 달리 `rejectReason`을 포함합니다.
- **호출 시점:** 마이페이지/판매자 대시보드 진입 시, 본인의 sellerId를 모르는 상태에서 신청 여부·상태를 확인할 때.
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/sellers/me`
    - Header: `Authorization` Bearer 토큰

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
    "sellerId": 1,
    "memberId": 1,
    "bakeryName": "세종베이커리",
    "businessNumber": "123-45-67890",
    "applicationStatus": "REJECTED",
    "rejectReason": "제출한 사업장 주소가 실제 등록 주소와 일치하지 않습니다.",
    "settlementBankCode": "088",
    "settlementAccountNumberMasked": "110-****-5678",
    "accountVerified": true,
    "accountVerifiedAt": "2026-07-10T09:00:00"
  }
}
```

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 404 | C003 | 대상을 찾을 수 없습니다. | 이 회원이 아직 판매자 신청을 한 적 없음 |

```json
{
  "success": false,
  "error": {
    "code": "C003",
    "message": "대상을 찾을 수 없습니다."
  }
}
```

> ⚠️ `SecurityConfig`에 `GET /api/v1/sellers/*`(단일 세그먼트 와일드카드)가 `permitAll()`로 열려있어, `/sellers/me`도 그 패턴에 그대로 매치된다. `/sellers/me`를 그 위에 `authenticated()`로 먼저 매칭시켜두지 않으면 인증 없이 통과되고, `CurrentMemberProvider.getId()`가 익명 principal(String)을 `Long`으로 캐스팅하려다 `ClassCastException`이 난다 — 이미 반영 완료(`SecurityConfig.java`).