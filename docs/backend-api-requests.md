# 백엔드 API 요청 목록

프론트엔드를 개발하면서 필요한데 백엔드에 아직 없는 API를 여기에 기록합니다. 각 항목은 프론트가 필요에 의해 제안하는 스펙이며, 실제 구현 형태는 백엔드팀 판단에 따라 달라질 수 있습니다.

백엔드에 구현되면 이 목록에서 해당 항목을 "해결됨"으로 옮기고, 실제 스펙을 해당 도메인 문서(`docs/*-api.md`)에 정식으로 반영·동기화합니다.

---

## 미해결

### 1. 예정된 드롭 목록 조회 (날짜별)

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

### 2. 관리자용 전체 정산 목록 조회

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

### 3. 판매자 재신청 엔드포인트

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

### 4. 주문 상세 응답에 판매자 연락처/주소 추가

- **요청일:** 2026-07-29
- **관련 도메인:** order (`docs/order-api.md`)
- **배경:** `app/(shop)/orders/[orderId]/page.tsx:100-111`에 "지도 보기"/"전화하기" 버튼이 있지만 `onClick`이 없어 동작하지 않습니다. `OrderDetail.seller`(`lib/api/order.ts:60`)에 주소/전화번호 필드 자체가 없어서 애초에 구현이 불가능한 상태입니다. 픽업 직전에 가장 많이 눌릴 만한 버튼이 장식으로만 남아있는 상황입니다.
- **요청:** 주문 상세 조회(`GET /api/v1/orders/{id}`) 응답의 `seller` 객체에 `address`, `phoneNumber` 필드 추가.
- **호출 시점(예상):** 주문 상세 화면 진입 시(기존 API 그대로, 응답 필드만 추가).

**해결되면 프론트에서 할 일**

- "지도 보기" 버튼에 주소 기반 지도 연결(또는 좌표 표시), "전화하기" 버튼에 `tel:` 링크 연결.

---

### 5. 판매자에게 정산 실패 사유 노출

- **요청일:** 2026-07-29
- **관련 도메인:** settlement
- **배경:** `SellerSettlementDetailResponse`(`GET /api/v1/sellers/me/settlements/{settlementId}`)에는 `status`만 있고 실패 사유가 없다. 실제 사유는 `SettlementPayout.failureReason`에 저장되지만 이건 admin 전용 `/internal/v1/settlement-payouts/{payoutId}` 계열로만 조회 가능하다. 정산이 `FAILED`가 되면 판매자는 빨간 "FAILED" 배지 하나만 보고 원인도, 다음 조치도 알 수 없는 상태로 남는다.
- **요청:** 판매자 정산 상세 응답에 가장 최근 payout의 `failureReason`/`failedAt`(또는 그에 준하는 안내 문구 필드)을 포함.
- **호출 시점(예상):** 판매자 정산 상세 화면 진입 시(기존 API 응답 필드만 추가).

**해결되면 프론트에서 할 일**

- `app/seller/settlements/[settlementId]/page.tsx`의 `FAILED` 상태 분기에 실패 사유 텍스트 노출.

---

## 해결됨

### 6. 판매자 본인 판매내역(주문) 목록 조회 (대시보드 픽업 집계 포함)

- **요청일:** 2026-07-28 / 2026-07-29 (아래 두 요청을 통합) / **해결일:** 2026-07-29
- **관련 도메인:** order (`docs/order-api.md`)
- **배경:** 판매자가 자신의 드롭에 걸린 주문을 확인하고 픽업 수령 후 [구매확정] 버튼을 누르려면, 먼저 자신의 판매내역을 주문 단위로 목록 조회할 수 있어야 했습니다. `GET /api/v1/orders`는 buyer 스코프라 재사용할 수 없고, `GET /drops/mine`으로는 개별 주문의 `orderId`를 알 방법이 없었습니다. 같은 갭에서 나온 대시보드용 "오늘 픽업 예정"/"날짜별 픽업 집계" 요청(원본 디자인 `SellerDashboardScreen`, M6에서 보류됨)과 통합해서 하나의 API로 요청했습니다.
- **최종 스펙:** `GET /api/v1/sellers/me/orders` (`SellerOrderController`). Query `orderState`(선택, `PAID`/`CONFIRMED`/`CANCELED`), `page`(기본 0), `size`(기본 10, 최대 캡 적용). 판매자 권한 판정은 `PATCH /orders/{id}/confirm`과 동일하게 `CurrentSellerProvider.getSellerId()` 존재 여부로(미등록 계정은 403 `ME004`). 응답은 제안했던 스펙 그대로 구현됨 — `content[]`에 `orderId`/`dropId`/`dropName`/`buyerName`/`quantity`/`totalAmount`/`orderState`/`pickupDate`/`paidAt`/`confirmedAt`/`canceledAt`, `buyerName`은 `order.memberId`로 `Member`를 조회해서 채움.
- **검증(2026-07-29):** 백엔드 유닛/컨트롤러 테스트(`OrderServiceTest`, `SellerOrderControllerTest`) 통과 확인. 로컬 서버(`:8080`)에 실제 로그인 토큰으로 호출해 정상 목록·필터 응답과 `PATCH /orders/{id}/confirm` 이후 목록에 `CONFIRMED`로 반영되는 것까지 실제 확인함(검증용으로 만든 임시 판매자/드롭/회원 데이터는 확인 후 정리함. 기존 판매자 `sellerId=6`의 `orderId=5`는 검증 과정에서 `CONFIRMED`로 확정됐고, 대신 동일 판매자에 새 `PAID` 주문 `orderId=7`을 만들어 남겨둠 — 브라우저에서 "구매확정" 버튼을 직접 눌러볼 수 있는 테스트 주문으로 사용 가능).
- **프론트 반영 완료(2026-07-29):** `lib/api/seller-order.ts`의 `getSellerOrders`/`SellerOrderListItem`이 실제 응답과 이미 일치해 타입 변경 불필요(미구현 경고 주석만 제거). `app/seller/orders/page.tsx`(판매내역 화면)가 이 API로 정상 동작. `app/seller/dashboard/page.tsx`에 "오늘 픽업 예정"/"날짜별 픽업 집계" 위젯 추가(이 API 응답을 `pickupDate` 기준으로 그룹핑해서 클라이언트에서 계산).

---

### 관리자용 정산 단건 상세 조회

- **요청일:** 2026-07-29 / **해결일:** 2026-07-29
- **관련 도메인:** settlement (`docs/settlement-api.md`)
- **배경:** `app/admin/settlements/page.tsx`의 지급 관리 탭이 정산 ID만으로 지급 이력만 보여주고, 판매자·기간·금액을 확인할 방법이 없어 관리자가 대상을 눈으로 확인하지 못한 채 지급을 시작하는 문제였습니다.
- **최종 스펙:** `GET /internal/v1/settlements/{settlementId}` → `ApiResponse<SettlementResponse>`. 필드: `settlementId`, `sellerId`, `periodStart`, `periodEnd`, `grossSalesAmount`, `commissionAmount`, `netSalesAmount`, `adjustmentAmount`, `payoutAmount`, `targetCount`, `status`, `createdAt`, `completedAt` — 제안했던 스펙 그대로 구현됨(`AdminSettlementController`/`SettlementQueryService`). `settlementId`≤0이면 400, 없으면 404.
- **프론트 반영 완료(2026-07-29):** `lib/api/settlement.ts`에 `getSettlement(settlementId)` 추가. `app/admin/settlements/page.tsx`의 `PayoutTab`이 ID 조회 시 이 API로 정산 요약 카드(판매자, 기간, 금액, 상태 배지)를 지급 이력 위에 먼저 보여주고, 조회에 성공한 뒤에만 지급 이력/지급 시작 컨트롤이 나타나도록 변경. "지급 시작" 확인 다이얼로그에도 실제 판매자 ID·지급액을 포함.

---

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

---

### 3. `/internal/v1/settlement-*` 관리자 권한 검사 부재

- **요청일:** 2026-07-29 / **해결일:** 2026-07-28 (요청 시점 이전에 이미 반영됨)
- **관련 도메인:** settlement (`docs/settlement-api.md`)
- **배경:** `/internal/v1/...` 아래 컨트롤러(배치 실행, 지급 시작/완료/실패 등)에 관리자 role 체크나 내부 서비스 토큰 검증이 없다는 우려였습니다.
- **확인 결과:** `SecurityConfig.java:42`에 `.requestMatchers("/internal/v1/**").hasRole("ADMIN")`이 이미 적용돼 있습니다(커밋 `52ddca6` "feat(settlement): SecurityConfig 정산 관리자 전용 추가", 2026-07-28). `app/admin/layout.tsx`의 클라이언트 사이드 role 가드는 여전히 우회 가능한 방어이므로 UX용으로만 취급하고, 실제 접근 제어는 서버의 `hasRole("ADMIN")`이 담당합니다.

---

### 4. `DELETE /cart` 호출 시 `DropEntry` 상태 복원 여부 (동작 확인 완료)

- **요청일:** 2026-07-29 / **확인일:** 2026-07-29
- **관련 도메인:** cart, drop (`docs/cart-api.md`, `docs/drop-api.md`)
- **배경:** 결제 화면(`app/order/order-view.tsx`)에서 이탈하면 프론트가 `DELETE /cart`를 호출해 재고 선점만 해제하는데, 대기열 참여 이력(`DropEntry`)이 그대로 남아있다면 재입장 시 `enterQueue`가 409 `DR006`을 반환해 그 드롭을 다시는 살 수 없게 될 것을 우려했습니다.
- **확인 결과:** `CartService.deleteCart`(`CartService.java:233-238`)가 삭제 전 `DropLockService.rollbackStock`을 호출하고, 여기서 `DropEntry.failEntry()`로 상태를 `FAILED`로 전환합니다(`DropLockService.java:48-56`). `DropEnterService.enterQueue`의 재입장 차단 조건(`blockStatuses`)은 `RESERVED`, `COMPLETED`만 포함하고(`DropEnterService.java:60`) `FAILED`는 애초에 포함된 적이 없습니다 — 즉 `DELETE /cart` 이후 같은 드롭에 다시 `enterQueue`를 호출해도 차단되지 않습니다. (부가적으로 오늘 커밋 `4b79d46`에서 `ENTERED` 상태도 blockStatuses에서 제외되어, 대기열 통과 후 상세만 보고 나간 경우의 재진입도 함께 허용되도록 정리됐습니다.)
- **프론트 반영:** 별도 작업 불필요 — 우려했던 데드엔드가 현재 코드상 발생하지 않음을 확인.
