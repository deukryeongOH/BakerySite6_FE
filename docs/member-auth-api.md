# 회원

담당자: [단기심화7]이세종

> 에러 코드는 `common/src/main/java/com/openbake/common/exception/ErrorCode.java`가 원본입니다. Member 도메인 에러는 `ME001~ME004` 4개로 통합되어 있으니, 코드가 바뀌면 그쪽을 먼저 확인하세요.

# 1. Auth 도메인

## API 목록

| Method | Path | 설명 |
| --- | --- | --- |
| POST | `/api/v1/auth/signup` | 로컬 회원가입 |
| POST | `/api/v1/auth/login` | 로컬 로그인 |
| POST | `/api/v1/auth/oauth/{provider}` | OAuth 로그인 |
| POST | `/api/v1/auth/reissue` | Access Token 재발급 |
| POST | `/api/v1/auth/logout` | 로그아웃 |

## API 상세

---

### 1-1. 로컬 회원가입

## 1. 기본 정보

- **설명:** 이메일/비밀번호로 신규 회원가입을 처리합니다. Member와 Auth(provider=LOCAL)를 함께 생성합니다.
- **호출 시점:** 사용자가 회원가입 폼을 작성하고 [가입하기]를 클릭했을 때
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/auth/signup`
    - **요청 포맷:** `application/json`
    - **응답 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Body | `name` | String | Y | 이름 (길이 제약 없음, 공백만 아니면 됨) |
| Body | `phoneNumber` | String | Y | 휴대폰 번호 |
| Body | `email` | String | Y | 로그인 이메일 (UNIQUE, `@Email` 형식 검증) |
| Body | `password` | String | Y | 비밀번호 (8자 이상 20자 이하, 문자 구성 제약 없음) |

```json
{
  "name": "이세종",
  "phoneNumber": "010-1234-5678",
  "email": "sejong@example.com",
  "password": "password123!"
}
```

## 3. 응답 명세

- `201 Created`

```json
{
  "success": true,
  "data": {
    "memberId": 1,
    "email": "sejong@example.com"
  }
}
```

> `role`/`status`는 응답에 포함되지 않습니다 (`SignupResponse`는 `memberId`, `email` 두 필드뿐).
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 400 | C001 | 잘못된 요청입니다. | 필수값 누락/형식 오류 |
| 409 | ME001 | 이미 존재하는 리소스입니다. | email 중복 |

```json
{
  "success": false,
  "error": {
    "code": "ME001",
    "message": "이미 존재하는 리소스입니다."
  }
}
```

---

### 1-2. 로컬 로그인

## 1. 기본 정보

- **설명:** 이메일/비밀번호로 로그인하고 access/refresh 토큰을 발급합니다.
- **호출 시점:** 로그인 폼에서 [로그인] 클릭 시
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/auth/login`
    - **요청 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Body | `email` | String | Y | 가입한 이메일 |
| Body | `password` | String | Y | 비밀번호 |

```json
{
  "email": "sejong@example.com",
  "password": "password123!"
}
```

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "memberId": 1,
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "role": "CUSTOMER"
  }
}
```

> `role`은 `Role` enum(`ADMIN`/`CUSTOMER`)이 그대로 직렬화되어 대문자로 내려갑니다.
> 

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 401 | ME003 | 이메일 또는 비밀번호가 일치하지 않습니다. | 자격 증명 불일치, 혹은 해당 이메일이 OAuth 전용 계정(password_hash null)인 경우 |

> ⚠️ **정지/탈퇴 계정 로그인 차단은 아직 구현되어 있지 않습니다.** `AuthService.localLogin()`(member-service/.../AuthService.java:85-99)에 `MemberStatus` 체크 로직이 없어서, `SUSPENDED`/`WITHDRAWN` 상태인 회원도 비밀번호만 일치하면 정상적으로 access/refresh 토큰이 발급됩니다. 프론트에서 상태별 로그인 차단 UX를 기대하고 있다면 백엔드에 먼저 반영이 필요합니다.
> 

```json
{
  "success": false,
  "error": {
    "code": "ME003",
    "message": "이메일 또는 비밀번호가 일치하지 않습니다."
  }
}
```

---

### 1-3. **OAuth 로그인/가입**

### **1. 기본 정보**

- **설명:** 클라이언트가 Google에서 발급받은 ID 토큰을 검증합니다. `providerId`(Google `sub`)로 기존 회원이면 로그인, 없으면 Member+AuthCredential(provider=GOOGLE)을 새로 생성합니다.
- **호출 시점:** 클라이언트가 Google Identity Services 등으로 ID 토큰을 발급받은 직후
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/auth/oauth/{provider}`
    - **요청 포맷:** `application/json`

### **2. 요청 명세**

| **구분** | **필드명** | **타입** | **필수** | **설명** |
| --- | --- | --- | --- | --- |
| Path | `provider` | String | Y | 현재 `google`만 지원 (enum에 `LOCAL`, `GOOGLE`만 존재) |
| Body | `idToken` | String | Y | 공급자가 발급한 ID 토큰 (인가 코드 아님) |

```json
{
  "idToken":"eyJhbGciOi..."
}
```

### **3. 응답 명세**

- **항상 `200 OK`** (신규 가입도 201이 아닌 200으로 통일 — `ApiResponse` 규격 유지를 위해 상태 코드 분기를 두지 않기로 결정)
- **`accessToken`/`refreshToken`이 로그인/가입 여부와 관계없이 항상 포함됩니다.** 이 브랜치에서 신원 확인·회원 조회/생성과 자체 로그인 토큰 발급까지 함께 처리하도록 구현되어 있습니다.

```json
{
  "success": true,
  "data": {
    "memberId": 1,
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "email": "user@gmail.com",
    "name": "홍길동",
    "newMember": false
  }
}
```

### **4. 에러 처리**

| **HTTP Status** | **코드** | **메시지** | **발생 시나리오** |
| --- | --- | --- | --- |
| 400 | C001 | 잘못된 요청입니다. | `idToken` 누락/공백, 또는 `provider` 경로변수가 `AuthProvider` enum에 아예 없는 값 |
| 409 | C002 | 처리할 수 없는 상태입니다. | `provider`가 유효한 enum 값이긴 하지만(예: `local`) OIDC 디코더가 등록되지 않은 경우 (`OidcIdTokenVerifier.java:22`) |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | ID 토큰 서명/만료/issuer/audience 검증 실패 |
| 409 | ME001 | 이미 존재하는 리소스입니다. | 동일 이메일이 이미 LOCAL 계정으로 가입되어 있음 (자동 연동하지 않음) |
| 404 | C003 | 대상을 찾을 수 없습니다. | AuthCredential은 있는데 연동된 Member가 없는 정합성 오류 (사실상 발생하지 않아야 함) |

```json
{
  "success": false,
  "error": {
    "code": "ME002",
    "message": "유효하지 않은 인증 토큰입니다."
  }
}
```

---

### 1-4. Access Token 재발급

## 1. 기본 정보

- **설명:** 만료된 access token을 refresh token으로 재발급합니다.
- **호출 시점:** 프론트에서 access token 만료(401) 응답을 받았을 때 자동 호출
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/auth/reissue`
    - **요청 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Body | `refreshToken` | String | Y | 발급받은 refresh token |

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | 만료/변조, 서버(Redis)에 저장된 값과 불일치, 혹은 이미 사용(회전)된 refresh token 재사용 시도 — 세 경우 모두 별도 코드 없이 동일하게 처리됩니다. |

```json
{
  "success": false,
  "error": {
    "code": "ME002",
    "message": "유효하지 않은 인증 토큰입니다."
  }
}
```

---

### 1-5. 로그아웃

## 1. 기본 정보

- **설명:** 서버에 저장된 refresh token을 무효화하고, 발급된 access token을 블랙리스트 처리합니다.
- **호출 시점:** [로그아웃] 클릭 시
- **통신 기본 규격:**
    - **Method:** `POST`
    - **Path:** `/api/v1/auth/logout`
    - **요청 포맷:** `application/json`

## 2. 요청 명세

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Body | `refreshToken` | String | Y | 무효화할 refresh token |

> 이전 버전 문서에는 Body 요구사항이 빠져 있었습니다. `LogoutRequest`는 `refreshToken`을 필수 Body 필드로 받습니다.
> 

```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

## 3. 응답 명세

- `200 OK`

```json
{
  "success": true
}
```

## 4. 에러 처리

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | Body의 `refreshToken`이 만료/변조되어 검증 실패 |

```json
{
  "success": false,
  "error": {
    "code": "ME002",
    "message": "유효하지 않은 인증 토큰입니다."
  }
}
```

---

# **2. Member 도메인**

## **API 목록**

| **Method** | **Path** | **설명** |
| --- | --- | --- |
| GET | `/api/v1/members/{id}` | 회원 조회 |
| PATCH | `/api/v1/members/{id}` | 회원정보 수정 (이름/전화번호) |
| PATCH | `/api/v1/members/{id}/password` | 비밀번호 변경 (LOCAL 계정만) |
| DELETE | `/api/v1/members/{id}` | 회원 탈퇴 (본인, Soft delete) |

> ⚠️ 이전 버전 문서에 있던 `PATCH /api/v1/members/{id}/status`(관리자 회원 상태 변경)는 `MemberController`에 구현되어 있지 않습니다. 필요한 스펙이면 문서 하단 "미구현 API" 참고.
> 

## **API 상세**

---

### **2-1. 회원 조회**

## **1. 기본 정보**

- **설명:** 회원 ID로 상세 정보를 조회합니다. 본인 또는 admin만 조회 가능합니다.
- **호출 시점:** 마이페이지 진입, 또는 관리자의 회원 상세 화면 진입 시
- **통신 기본 규격:**
    - **Method:** `GET`
    - **Path:** `/api/v1/members/{id}`

## **2. 요청 명세**

| **구분** | **필드명** | **타입** | **필수** | **설명** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Path | `id` | Long | Y | 조회할 회원 ID |

## **3. 응답 명세**

- `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "이세종",
    "email": "sejong@example.com",
    "phoneNumber": "010-1234-5678",
    "role": "CUSTOMER",
    "status": "ACTIVE"
  }
}
```

> `email`은 `Member`가 아닌 `AuthCredential`에 저장돼 있어, 조회 시 두 테이블을 조합해 반환합니다. `role`/`status`는 각각 `Role`/`MemberStatus` enum이 대문자 그대로 직렬화됩니다.
> 

## **4. 에러 처리**

| **HTTP Status** | **코드** | **메시지** | **발생 시나리오** |
| --- | --- | --- | --- |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | 토큰 만료/서명 오류 등 |
| 403 | ME004 | 권한이 없습니다. | 본인/admin이 아닌 접근 |
| 404 | C003 | 대상을 찾을 수 없습니다. | 존재하지 않는 회원 ID |

```json
{
  "success": false,
  "error": {
    "code": "ME004",
    "message": "권한이 없습니다."
  }
}
```

---

### **2-2. 회원정보 수정**

## **1. 기본 정보**

- **설명:** 이름, 전화번호를 수정합니다. **본인만** 가능하며, **이메일은 수정 대상이 아닙니다.** 비밀번호 변경은 별도 API(2-3)에서 처리합니다.
- **호출 시점:** 마이페이지에서 [정보 수정] 저장 시
- **통신 기본 규격:**
    - **Method:** `PATCH`
    - **Path:** `/api/v1/members/{id}`
    - **요청 포맷:** `application/json`

## **2. 요청 명세**

| **구분** | **필드명** | **타입** | **필수** | **설명** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Path | `id` | Long | Y | 대상 회원 ID (본인 ID와 일치해야 함) |
| Body | `name` | String | N | 변경할 이름 (값을 보내면 최소 1자 이상) |
| Body | `phoneNumber` | String | N | 변경할 전화번호 (값을 보내면 최소 1자 이상) |

```json
{
  "name": "이세종",
  "phoneNumber": "010-9999-8888"
}
```

> GOOGLE 전용 회원(비밀번호 없음)도 이 API는 그대로 사용할 수 있습니다 — 비밀번호와 무관한 정보만 다루기 때문입니다.
> 

## **3. 응답 명세**

- `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "이세종",
    "phoneNumber": "010-9999-8888"
  }
}
```

## **4. 에러 처리**

| **HTTP Status** | **코드** | **메시지** | **발생 시나리오** |
| --- | --- | --- | --- |
| 400 | C001 | 잘못된 요청입니다. | `name`/`phoneNumber`를 빈 문자열로 보내는 등 형식 오류 |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | 토큰 만료/서명 오류 등 |
| 403 | ME004 | 권한이 없습니다. | 본인이 아닌 회원 ID로 요청 |
| 404 | C003 | 대상을 찾을 수 없습니다. | 존재하지 않는 회원 ID |

```json
{
  "success": false,
  "error": {
    "code": "ME004",
    "message": "권한이 없습니다."
  }
}
```

---

### **2-3. 비밀번호 변경**

## **1. 기본 정보**

- **설명:** 현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다. **LOCAL 계정에만 적용**되며, GOOGLE 전용 회원(비밀번호 없음)은 이 API를 사용할 수 없습니다.
- **호출 시점:** 마이페이지에서 [비밀번호 변경] 저장 시
- **통신 기본 규격:**
    - **Method:** `PATCH`
    - **Path:** `/api/v1/members/{id}/password`
    - **요청 포맷:** `application/json`

## **2. 요청 명세**

| **구분** | **필드명** | **타입** | **필수** | **설명** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Path | `id` | Long | Y | 대상 회원 ID (본인 ID와 일치해야 함) |
| Body | `currentPassword` | String | Y | 본인 확인용 현재 비밀번호 (8~20자) |
| Body | `newPassword` | String | Y | 변경할 새 비밀번호 (8~20자) |

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

## **3. 응답 명세**

- `200 OK` (Body 없음)

```json
{
  "success": true
}
```

## **4. 에러 처리**

| **HTTP Status** | **코드** | **메시지** | **발생 시나리오** |
| --- | --- | --- | --- |
| 400 | C001 | 잘못된 요청입니다. | 필드 누락/형식 오류(8~20자 범위 위반 등) |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | 토큰 만료/서명 오류 등 |
| 401 | ME003 | 이메일 또는 비밀번호가 일치하지 않습니다. | `currentPassword` 불일치 — 별도 코드 없이 로그인 실패와 같은 코드를 재사용합니다. |
| 403 | ME004 | 권한이 없습니다. | 본인이 아닌 회원 ID로 요청, 또는 GOOGLE 전용 회원의 요청 |
| 404 | C003 | 대상을 찾을 수 없습니다. | 존재하지 않는 회원 ID |

```json
{
  "success": false,
  "error": {
    "code": "ME003",
    "message": "이메일 또는 비밀번호가 일치하지 않습니다."
  }
}
```

---

### **2-4. 회원 탈퇴**

## **1. 기본 정보**

- **설명:** 본인 계정을 탈퇴 처리합니다(Soft delete). `status=WITHDRAWN`, `deletedAt` 기록, 개인정보 익명화, Redis에 저장된 Access/Refresh Token을 모두 삭제합니다. 주문/결제 이력은 삭제하지 않고 그대로 보존합니다.
- **호출 시점:** 마이페이지에서 [회원 탈퇴] 확정 시
- **통신 기본 규격:**
    - **Method:** `DELETE`
    - **Path:** `/api/v1/members/{id}`

## **2. 요청 명세**

| **구분** | **필드명** | **타입** | **필수** | **설명** |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |
| Path | `id` | Long | Y | 탈퇴할 회원 ID (본인 ID와 일치해야 함) |

## **3. 응답 명세**

- `200 OK` (Body 없음)

```json
{
  "success": true
}
```

> **Access Token도 즉시 무효화됩니다.** 로그인/재발급 시 발급된 Access Token을 memberId 기준으로 Redis에 같이 기록해두고, 탈퇴 시 그 값을 블랙리스트로 전환합니다. `JwtAuthenticationFilter`가 서명/만료 검증을 통과한 요청에 대해 블랙리스트 여부를 추가로 확인하므로, 탈퇴 이후엔 기존에 발급받은 Access Token으로도 어떤 요청도 인증되지 않습니다.
> 

## **4. 에러 처리**

| **HTTP Status** | **코드** | **메시지** | **발생 시나리오** |
| --- | --- | --- | --- |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | 토큰 만료/서명 오류 등 |
| 403 | ME004 | 권한이 없습니다. | 본인이 아닌 회원 ID로 요청 |
| 404 | C003 | 대상을 찾을 수 없습니다. | 존재하지 않는 회원 ID |
| 409 | C002 | 처리할 수 없는 상태입니다. | 이미 탈퇴(`WITHDRAWN`) 처리된 회원의 재탈퇴 시도 |

```json
{
  "success": false,
  "error": {
    "code": "C002",
    "message": "처리할 수 없는 상태입니다."
  }
}
```

> **이메일 재사용 정책 미정:** 탈퇴 후 같은 이메일로 재가입을 허용할지(해시 처리 후 유니크 제약 유지 vs 별도 컬럼 분리)는 아직 결정되지 않았습니다.
> 

---

## 미구현 API (참고용 — 코드에 없음)

### 회원 상태 변경 (admin)

- 이전 버전 문서에는 `PATCH /api/v1/members/{id}/status`로 관리자가 회원을 정지/정지해제/강제 탈퇴시키는 API가 정의되어 있었지만, 현재 `MemberController`/`MemberService`에는 해당 엔드포인트가 구현되어 있지 않습니다.
- 관리자 화면에서 회원 상태 변경 기능이 필요하다면 백엔드에 먼저 구현을 요청해야 합니다. 아래는 예전 문서에 있던 설계안(요청/응답 형태 참고용, 실제 동작 아님)입니다.

```json
// 요청 예시 (미구현)
{
  "status": "suspended"
}
```

```json
// 응답 예시 (미구현)
{
  "success": true,
  "data": {
    "id": 1,
    "status": "suspended",
    "updatedAt": "2026-07-16T11:00:00"
  }
}
```
