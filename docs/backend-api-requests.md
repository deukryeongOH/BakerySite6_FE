# 백엔드 API 요청 목록

프론트엔드를 개발하면서 필요한데 백엔드에 아직 없는 API를 여기에 기록합니다. 각 항목은 프론트가 필요에 의해 제안하는 스펙이며, 실제 구현 형태는 백엔드팀 판단에 따라 달라질 수 있습니다.

백엔드에 구현되면 이 목록에서 해당 항목을 "해결됨"으로 옮기고, 실제 스펙을 해당 도메인 문서(`docs/*-api.md`)에 정식으로 반영·동기화합니다.

---

## 미해결

### 1. 판매자 본인 주문/픽업 집계 조회

- **요청일:** 2026-07-28
- **관련 도메인:** order (`docs/order-api.md`)
- **배경:** 판매자 대시보드 원본 디자인(`docs/DarkArtisanBakeryDesign/src/app/App.tsx`의 `SellerDashboardScreen`)에는 "오늘 픽업 예정" 목록과 "날짜별 픽업 집계" 차트가 있는데, 둘 다 판매자 소유 드롭에 걸린 주문 데이터가 있어야 계산할 수 있습니다. 그런데 판매자용 주문 조회 API 자체가 없고(`GET /api/v1/seller/orders` 미구현), order 도메인은 여전히 주문 데이터가 스텁 상수(`OrderService.STUB_*`)로 고정돼 있어(`docs/order-api.md` ⚠️ 참고) 설령 목록 API가 생겨도 픽업일별 집계가 실제 값을 반영하지 못합니다. 이번 M6 작업에서는 이 두 위젯을 프론트에서 구현하지 않고 건너뛰었습니다(마이그레이션 플랜 M6 항목 참고).
- **요청:** 판매자 본인이 등록한 드롭에 걸린 주문을 픽업일 기준으로 조회하는 API. 최소한 `pickupDate`, `dropId`/`dropName`, `quantity`, `orderState`가 필요합니다.
- **호출 시점(예상):** 판매자 대시보드 진입 시.
- **선행 조건:** order 도메인 스텁 데이터(`OrderService.STUB_*`)가 실제 주문 데이터로 교체되지 않으면, 이 API가 생겨도 집계 결과가 무의미합니다 — order 도메인 정리가 먼저 필요합니다.

**해결되면 프론트에서 할 일**

- `app/seller/dashboard/page.tsx`에 "오늘 픽업 예정"/"날짜별 픽업 집계" 위젯 추가(원본 디자인의 `SellerDashboardScreen` 참고).

---

### 2. 판매자 승인 대기 목록 조회

- **요청일:** 2026-07-28
- **관련 도메인:** seller (`docs/seller-api.md`)
- **배경:** 관리자 승인/반려 화면(`app/admin/approvals/page.tsx`)이 판매자 ID를 직접 입력받아 `GET /sellers/{id}`로 단건 조회하는 방식으로 구현돼 있습니다. 승인 대기 중인 신청을 목록으로 조회하는 API가 없어서, 관리자가 새로 들어온 신청의 ID를 알 방법이 없고(다른 채널로 별도 전달받아야 함) 어떤 신청이 대기 중인지 한눈에 파악할 수도 없습니다.
- **요청:** `applicationStatus`(기본값 `PENDING`)로 필터링된 판매자 신청 목록을 조회하는 관리자 전용 API.
- **호출 시점(예상):** 관리자가 `/admin/approvals` 진입 시.
- **통신 기본 규격(제안):**
    - **Method:** `GET`
    - **Path:** `/api/v1/sellers`
    - Header: `Authorization` Bearer 토큰 (admin, `PATCH /sellers/{id}/status`와 동일한 권한 체크)

**요청 명세(제안)**

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 (admin) |
| Query | `applicationStatus` | String | N | `PENDING`/`APPROVED`/`REJECTED` 중 하나. 생략 시 `PENDING`만 반환 |

**응답 명세(제안)**

- `200 OK` — `GET /sellers/{id}` 응답 객체의 배열. 관리자 전용이므로 `rejectReason`도 포함.

```json
{
  "success": true,
  "data": [
    {
      "sellerId": 3,
      "memberId": 5,
      "bakeryName": "달빛베이커리",
      "businessNumber": "123-45-67891",
      "applicationStatus": "PENDING",
      "rejectReason": null,
      "settlementBankCode": "088",
      "settlementAccountNumberMasked": "110-****-1234",
      "accountVerified": true,
      "accountVerifiedAt": "2026-07-27T10:00:00"
    }
  ]
}
```

**에러 처리(제안)**

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | 토큰 만료/서명 오류 |
| 403 | SE007 | 관리자만 접근할 수 있습니다. | admin이 아닌 회원이 호출 |

```json
{
  "success": false,
  "error": {
    "code": "SE007",
    "message": "관리자만 접근할 수 있습니다."
  }
}
```

**해결되면 프론트에서 할 일**

- `app/admin/approvals/page.tsx`의 ID 직접 입력 폼을 이 목록 API 기반 리스트 UI로 교체(카드 클릭 시 기존 승인/반려 로직 재사용).
- 승인/반려 처리 후 목록 쿼리를 invalidate해서 처리된 항목이 자동으로 빠지도록 정리.

---

### 3. 예정된 드롭 목록 조회 (날짜별)

- **요청일:** 2026-07-28
- **관련 도메인:** drop (`docs/drop-api.md`)
- **배경:** 홈 화면은 지금 `GET /drops/today/drop`으로 "오늘의 드롭" 딱 하나만 보여줍니다. 사용자가 오늘 것 말고 앞으로 며칠간 어떤 드롭이 예정돼 있는지 미리 훑어보고 싶어 하는데, 날짜별로 여러 드롭을 한 번에 내려주는 조회 API가 없습니다. `GET /drops/mine`은 판매자 본인 것만 조회하는 인증 API라 고객용 화면에는 쓸 수 없고, `GET /drops/{dropId}/info`는 dropId를 이미 알아야 하는 단건 조회라 목록 화면의 대안이 되지 못합니다.
- **요청:** 특정 기간(또는 기본값: 오늘부터 N일) 동안 `UPCOMING`/`ACTIVE` 상태인 드롭을 `dropStart` 오름차순으로 내려주는 공개(또는 로그인) 조회 API. `docs/backend-bug-reports.md` §6에 따르면 현재 하루에 드롭이 플랫폼 전체 기준 최대 1개라, 응답은 사실상 "날짜 하나당 드롭 카드 하나" 형태가 됩니다 — 그 제약이 나중에 판매자별로 바뀌면 같은 날짜에 여러 드롭이 올 수 있으니 그때는 프론트에서 날짜별로 그룹핑하는 처리가 필요합니다.
- **호출 시점(예상):** 홈 화면 진입 시.
- **통신 기본 규격(제안):**
    - **Method:** `GET`
    - **Path:** `/api/v1/drops/upcoming`
    - Query: `days`(선택, 기본값 7 등 — 오늘부터 며칠치를 볼지)
    - Header: `Authorization` Bearer 토큰 (⚠️ `docs/backend-bug-reports.md` §4에 따르면 `/today/drop`, `/{dropId}/info`도 문서상 "공개 API"라 적혀 있지만 실제로는 토큰 없이 403이 나므로, 이 API도 동일하게 인증이 필요할 가능성이 높음 — 구현 시 확인 필요)

**요청 명세(제안)**

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y(추정) | Bearer 토큰 |
| Query | `days` | int | N | 오늘부터 조회할 일수. 생략 시 서버 기본값 |

**응답 명세(제안)**

- `200 OK` — `GET /drops/mine`(`DropProductInfoResponse`)과 같은 필드 구성의 배열. `dropStart` 오름차순 정렬.

```json
{
  "success": true,
  "data": [
    {
      "dropId": 12,
      "name": "버터떡",
      "description": "버터를 많이 써서 향이 좋고 쫀득해요.",
      "imageUrl": "https://cdn.openbake.com/drops/12.jpg",
      "pickUpAvailableDates": ["2026-08-02", "2026-08-03"],
      "dropStart": "2026-08-01T14:00:00",
      "dropEnd": "2026-08-01T18:00:00",
      "limitQuantity": 5,
      "price": 3000,
      "totalQuantity": 200,
      "remainQuantity": 200,
      "dropStatus": "UPCOMING"
    }
  ]
}
```

**해결되면 프론트에서 할 일**

- 홈 화면(`app/(shop)/page.tsx`)을 "오늘의 드롭 카드 1개"에서 "날짜 헤더 + 그 날짜의 드롭 카드" 리스트로 교체.
- 기존 `GET /drops/today/drop` 단건 조회 로직은 그대로 두거나, 목록의 첫 항목(가장 가까운 날짜)으로 대체할지 결정.

---

## 해결됨

### 1. 내 판매자 신청 조회

- **요청일:** 2026-07-28 / **해결일:** 2026-07-28
- **관련 도메인:** seller (`docs/seller-api.md` 1-7)
- **최종 스펙:** `GET /api/v1/sellers/me` (Bearer 토큰, memberId 기준 조회). 응답은 `GET /sellers/{id}`와 같은 필드에 `rejectReason`을 추가. 신청 이력 없으면 404 `C003`.
- **프론트 반영 완료(2026-07-28):** `lib/seller/seller-storage.ts`(로컬스토리지 워크어라운드) 삭제하고 `sellerApi.getMySeller()`로 전면 교체 — `app/(shop)/mypage/page.tsx`, `app/seller/dashboard/page.tsx`, `app/seller/register/page.tsx`, `app/seller/drops/new/page.tsx` 모두 이 API로 조회. `retry: false` + `error.code === "C003"` 판별로 "신청 이력 없음" 상태를 구분(`app/(shop)/page.tsx`의 기존 패턴과 동일).
