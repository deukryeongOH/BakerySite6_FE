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

### 2. 예정된 드롭 목록 조회 (날짜별)

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

### 3. 관리자용 전체 정산 목록 조회

- **요청일:** 2026-07-29
- **관련 도메인:** settlement (`docs/settlement-api.md`)
- **배경:** 관리자 정산 화면(`app/admin/settlements/page.tsx`)에서 지급(payout) 시작/완료/실패 처리를 하려면 `settlementId`를 알아야 하는데, 이걸 조회할 방법이 없습니다. 판매자 본인 정산 조회(`GET /api/v1/sellers/me/settlements`, SET-API-002)는 로그인 토큰의 `sellerId`로만 동작해 관리자가 다른 판매자의 정산을 볼 수 없고, 월 정산 배치 실행/조회 API(SET-API-004/005/005b)는 `jobExecutionId`만 돌려줄 뿐 그 배치로 생성된 `settlementId` 목록을 알려주지 않습니다. 지금은 관리자가 정산 ID를 직접 입력하는 임시 UI로 우회했습니다(`app/admin/approvals/page.tsx`가 승인 대기 목록 API 생기기 전 판매자 ID 직접 입력 방식이었던 것과 동일한 패턴).
- **요청:** 기간/판매자/상태 기준으로 `Settlement` 레코드(`settlementId`, `sellerId`, `periodStart`/`periodEnd`, 금액 필드들, `status`)를 나열하는 관리자 전용 목록 API.
- **호출 시점(예상):** 관리자 정산 화면의 "지급 관리" 탭 진입 시.
- **통신 기본 규격(제안):**
    - **Method:** `GET`
    - **Path:** `/internal/v1/settlements`
    - Query: `periodStart`, `periodEnd`(선택), `sellerId`(선택), `status`(선택), `page`/`size`(기존 배치 목록 API와 동일한 페이지네이션 관례)

**해결되면 프론트에서 할 일**

- `app/admin/settlements/page.tsx`의 "지급 관리" 탭을 정산 ID 직접 입력에서 목록 API 기반 리스트 UI로 교체.

---

### 4. `/internal/v1/settlement-*` 관리자 권한 검사 부재

- **요청일:** 2026-07-29
- **관련 도메인:** settlement (`docs/settlement-api.md`)
- **배경:** `docs/settlement-api.md`에 이미 명시돼 있듯, `/internal/v1/...` 아래 컨트롤러(배치 실행, 지급 시작/완료/실패 등) 어디에도 관리자 role 체크나 내부 서비스 토큰 검증이 코드에 없습니다. 현재는 네트워크 레벨(사내망 등)로만 보호된다고 가정하는 것으로 보입니다. 프론트는 `app/admin/layout.tsx`에서 클라이언트 사이드 role 가드만 걸어뒀는데, 이건 우회 가능한 방어라 실제 접근 제어는 아닙니다.
- **요청:** 배포 전 `/internal/v1/settlement-*` 엔드포인트에 관리자 인증/권한 검사(또는 최소한 내부망 전용 배포 구성) 확인이 필요합니다.
- **선행 조건:** 없음 — 배포 전 반드시 확인.

---

### 5. 판매자 재신청 엔드포인트

- **요청일:** 2026-07-29
- **관련 도메인:** seller (`docs/seller-api.md`)
- **배경:** `Seller`-`Member`가 0..1 관계라, 신청 이력이 있으면(반려 포함) `POST /sellers/apply`가 `SE005`로 거부됩니다. `REJECTED` 상태에서 재신청할 방법이 없어, 사업자번호 오타 하나로 그 계정은 영구히 판매자가 될 수 없습니다(`app/seller/register/page.tsx:28-41`가 신청 이력이 있으면 무조건 `/seller/dashboard`로 리다이렉트). 사용자 플로우 개선 분석(2026-07-29)에서 발견된 판매자 온보딩 데드엔드입니다.
- **요청:** `REJECTED` 상태의 신청을 다시 `PENDING`으로 되돌리는 재신청 API. 사업자/계좌 정보를 새로 받아 검증 절차를 처음부터 다시 밟게 하거나, 최소한 상태만 되돌리고 프론트가 폼을 다시 채우게 하는 방식 등 구체적 형태는 백엔드팀 판단에 맡깁니다.
- **호출 시점(예상):** `app/seller/dashboard/page.tsx`의 반려 카드에 "다시 신청하기" 버튼을 눌렀을 때.
- **통신 기본 규격(제안):**
    - **Method:** `PATCH`
    - **Path:** `/api/v1/sellers/me/reapply`

**해결되면 프론트에서 할 일**

- `app/seller/dashboard/page.tsx`의 반려 카드에 "다시 신청하기" 버튼 추가.
- `app/seller/register/page.tsx`의 "신청 이력 있으면 무조건 리다이렉트" 로직에서 `REJECTED`는 예외 처리(재신청 폼으로 진입 허용).

---

### 6. 주문 상세 응답에 판매자 연락처/주소 추가

- **요청일:** 2026-07-29
- **관련 도메인:** order (`docs/order-api.md`)
- **배경:** `app/(shop)/orders/[orderId]/page.tsx:100-111`에 "지도 보기"/"전화하기" 버튼이 있지만 `onClick`이 없어 동작하지 않습니다. `OrderDetail.seller`(`lib/api/order.ts:60`)에 주소/전화번호 필드 자체가 없어서 애초에 구현이 불가능한 상태입니다. 픽업 직전에 가장 많이 눌릴 만한 버튼이 장식으로만 남아있는 상황입니다.
- **요청:** 주문 상세 조회(`GET /api/v1/orders/{id}`) 응답의 `seller` 객체에 `address`, `phoneNumber` 필드 추가.
- **호출 시점(예상):** 주문 상세 화면 진입 시(기존 API 그대로, 응답 필드만 추가).

**해결되면 프론트에서 할 일**

- "지도 보기" 버튼에 주소 기반 지도 연결(또는 좌표 표시), "전화하기" 버튼에 `tel:` 링크 연결.

---

### 7. (동작 확인 요청) `DELETE /cart` 호출 시 `DropEntry` 상태 복원 여부

- **요청일:** 2026-07-29
- **관련 도메인:** cart, drop (`docs/cart-api.md`, `docs/drop-api.md`)
- **배경:** 결제 화면(`app/order/order-view.tsx`)에서 이탈하면 프론트가 `DELETE /cart`를 호출해 재고 선점만 해제합니다. 그런데 대기열 참여 이력(`DropEntry`)이 그대로 남아있다면, 드롭 상세로 돌아가 다시 "구매하기"를 눌렀을 때 `enterQueue`가 409 `DR006`("이미 참여 중이거나 구매가 완료된 드롭입니다")을 반환해서 그 드롭을 그 계정으로 다시는 살 수 없게 됩니다(하루 1드롭 구조라 영향이 큼). 이건 새 API 요청이 아니라 실제 코드/DB 동작 확인 요청입니다.
- **확인해줄 내용:** `DELETE /cart`(또는 재고 선점 해제 로직) 호출 시 연결된 `DropEntry`의 상태가 재입장 가능한 상태로 되돌아가는지, 아니면 그대로 남는지.
- **이후 조치(확인 결과에 따라 분기):**
  - 복원이 안 된다면 ① `DELETE /cart` 시 `DropEntry`도 함께 복원하도록 백엔드 수정, 또는 ② `enterQueue`가 "이미 참여 이력이 있으면 `confirmEntry`/`lock-start`부터 재개"하도록 허용 — 둘 중 하나가 필요합니다. 결정되면 이 항목을 확정 스펙으로 갱신합니다.

---

## 해결됨

### 1. 내 판매자 신청 조회

- **요청일:** 2026-07-28 / **해결일:** 2026-07-28
- **관련 도메인:** seller (`docs/seller-api.md` 1-7)
- **최종 스펙:** `GET /api/v1/sellers/me` (Bearer 토큰, memberId 기준 조회). 응답은 `GET /sellers/{id}`와 같은 필드에 `rejectReason`을 추가. 신청 이력 없으면 404 `C003`.
- **프론트 반영 완료(2026-07-28):** `lib/seller/seller-storage.ts`(로컬스토리지 워크어라운드) 삭제하고 `sellerApi.getMySeller()`로 전면 교체 — `app/(shop)/mypage/page.tsx`, `app/seller/dashboard/page.tsx`, `app/seller/register/page.tsx`, `app/seller/drops/new/page.tsx` 모두 이 API로 조회. `retry: false` + `error.code === "C003"` 판별로 "신청 이력 없음" 상태를 구분(`app/(shop)/page.tsx`의 기존 패턴과 동일).

---

### 2. 판매자 승인 대기 목록 조회

- **요청일:** 2026-07-28 / **해결일:** 2026-07-29
- **관련 도메인:** seller (`docs/seller-api.md`)
- **최종 스펙:** `GET /api/v1/sellers` (Bearer 토큰, admin 전용). Query `applicationStatus`(생략 시 `PENDING`)로 필터링. 응답은 `MySellerResponse`(`GET /sellers/me`와 동일 필드, `rejectReason` 포함)의 배열. 제안했던 스펙 그대로 구현됨.
- **프론트 반영 완료(2026-07-29):** `lib/api/seller.ts`에 `getPendingSellers(applicationStatus?)` 추가. `app/admin/approvals/page.tsx`를 판매자 ID 직접 입력 방식에서 이 목록 API 기반 카드 리스트 UI로 교체 — 카드를 클릭하면 승인/반려 컨트롤이 펼쳐지고, 처리 성공 시 `["sellers", "pending"]` 쿼리를 invalidate해서 처리된 항목이 목록에서 자동으로 빠짐.
