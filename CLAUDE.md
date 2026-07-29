# CLAUDE.md

이 파일은 이 저장소에서 작업하는 Claude Code(claude.ai/code)에게 가이드를 제공합니다.

## 프로젝트 상태: M0 완료 (스캐폴딩 + 테마 이식)

Next.js(App Router, TS, Tailwind v4) 스캐폴딩과 다크 테마(`docs/DarkArtisanBakeryDesign/src/styles/theme.css`) 이식이 끝났습니다. 다음 작업은 `docs/frontend-migration-plan.md`의 M1(라우팅 골격)부터.

```
npm run dev      # http://localhost:3000
npm run build
npm run lint
```

테스트 러너는 아직 없음 — 추가되면 이 섹션에 채워 넣을 것.

`tsconfig.json`/`eslint.config.mjs`는 `docs/DarkArtisanBakeryDesign`(이식 원본, 별도 Vite 프로젝트)을 타입체크·린트 대상에서 제외하도록 설정돼 있음 — 그 디렉터리는 참고용일 뿐 이 Next.js 앱의 일부가 아님.

## 이 레포가 뭔지

OpenBake(베이커리 "드롭"(한정판매) 쇼핑몰) 모바일 웹 프론트엔드(Next.js, App Router). Figma에서 뽑은 인터랙티브 프로토타입(`docs/DarkArtisanBakeryDesign/`, Vite+React, 단일 1837줄 `App.tsx`에 14개 화면과 인메모리 mock 리듀서가 들어있음)을 실제 백엔드와 연동되는 진짜 라우트로 이식하는 작업입니다.

백엔드는 **별도 git 레포**인 `../beadv7_7_BakerySite6_BE`(형제 디렉터리)에 있는 Spring Boot 모놀리스입니다. 이 레포는 백엔드 코드를 절대 건드리지 않습니다. 프론트 플로우를 엔드투엔드로 테스트하려면 먼저 백엔드 자체 README대로 로컬에서 띄워야 합니다(`docker compose up -d` → `./gradlew bootRun`, `:8080`에서 서빙).

## 소스 오브 트루스: `docs/frontend-migration-plan.md`

새 세션을 시작할 때 이 문서부터 읽으세요. 전체 계획이 담겨 있습니다: 라우팅 맵(화면 → 라우트), 서버/클라이언트 컴포넌트 경계, API 클라이언트 설계(BFF 없이 백엔드 직접 호출 — CORS는 `allowedOrigins("*")`로 이미 열려 있음), 토큰 저장 방식(`localStorage`, 백엔드가 refresh token을 httpOnly 쿠키가 아니라 JSON body로 내려주기 때문), mock 액션 → 실제 API 매핑표, 그리고 마일스톤 순서(M0 스캐폴딩 → M1 라우팅 골격 → M2 인증 → M3 판매자 → M4 결제 → M5 드롭/장바구니/주문 → M6 판매자 대시보드, 백엔드 도메인별 완성도 순).

그 계획에서 이미 확정된 사항들(재논의 없이 그대로 따를 것):
- shadcn/ui 컴포넌트는 처음부터 전부 설치하지 않고, 실제로 필요해질 때마다 `npx shadcn add <component>`로 하나씩 추가.
- 하단 탭바가 없는 주문 상세류 화면도 탭바 있는 화면과 *같은* 라우트 그룹에 둠 — 별도 URL 프리픽스가 아니라 공통 레이아웃 안에서 `usePathname()`으로 탭바를 숨기는 방식.
- 인증 가드는 `middleware.ts`가 아니라 클라이언트 레이아웃 가드(토큰이 `localStorage`에 있어서 Edge 미들웨어가 읽을 수 없음).
- 서버 상태 관리는 TanStack Query(대기열 순번, 충전 상태 등 폴링이 필요한 화면이 여럿 있음).

## 참고 문서 (`docs/`)

백엔드 레포의 `docs/`에서 복사해온 것들입니다(그쪽은 `.gitignore`로 제외돼 있어서, 여기가 유일하게 git으로 추적되는 위치). 스펙만 보고 쓴 게 아니라 실제 백엔드 코드와 대조 검증된 문서들이니 복사 시점까지는 정확하다고 봐도 되지만, **백엔드가 바뀌면 백엔드 레포에서 다시 복사해 동기화해야 함**(시간이 지나면 어긋날 수 있음).

- `*-api.md`(member-auth, seller, cart, order, drop, payment, settlement) — 도메인별 엔드포인트/요청/응답/에러코드 레퍼런스, 검증 과정에서 발견한 백엔드 TODO·함정에는 ⚠️ 표시. API가 이름/설명대로 동작할 거라고 가정하기 전에 해당 도메인 문서부터 확인할 것.
- `enum-reference.md` — 백엔드 enum 값 전체, 그리고 도메인 간 "이름은 같은데 값이 다른" 함정 표(예: `OrderState.CANCELED` vs `EntryStatus.CANCELLED` — 철자가 다름).

## 코드 작성 전에 알아둘 만한 API 연동 함정

- 프로토타입의 "즉시 구매" 단일 액션은 실제로는 백엔드에서 5단계 흐름임: 대기열 진입 → 순번 폴링 → 입장 확정 → 재고 선점(`lock-start`) → 장바구니(`POST /cart`) → 픽업일 선택 → 결제. migration plan의 mock 액션 매핑표 참고.
- `lock-start`(drop 도메인)와 `POST /cart`(cart 도메인)의 관계는 **2026-07-28 확정됨**: `lock-start`가 실제 재고 선점을 수행하고(`DropEntry`를 `RESERVED` 상태로 전환), `POST /cart`는 그 선점이 됐는지만 확인한 뒤 장바구니 행을 기록함(직접 재고를 만지지 않음). 선점 안 된 상태로 `POST /cart`만 단독 호출하면 `CA006`(`CART_STOCK_NOT_RESERVED`) 에러.
- 백엔드에 wishlist(찜) API 자체가 없음. 일단은 `localStorage`만으로 구현하는 게 계획.
- **cart 쪽 TODO는 대부분 해결됨(2026-07-28, `2cd4d8b`/`c5fcf15` 커밋):** `GET /cart` 응답의 `drop`/`seller`/`estimatedAmount`/`pickupDates`가 이제 실제 값으로 채워짐, 픽업일 위조 방어(`CA004`)와 삭제/만료 시 재고 복구도 구현됨.
- **drop 쪽도 대부분 해결됨(`d678dad`/`3ef5001` 커밋):** `GET /{dropId}/info`(응답이 다른 API와 달리 `ApiResponse` 래퍼 없이 최상위로 바로 옴, 주의), `GET /mine`, `PATCH /{dropId}`, `DELETE /{dropId}` 전부 구현됨. **`GET /drops/history`(참여 내역 조회)만 아직 없음.**
- **order 도메인 진행 상황(`docs/order-api.md` 2026-07-28/29 갱신 참고):** 스텁 데이터 제거·주문 취소 시 재고 복구·자동 구매확정 배치·구매확정→정산 이벤트 발행은 구현됨. `GET /api/v1/sellers/me/orders`(판매자 본인 판매내역 목록)도 2026-07-29 구현 완료(`docs/backend-api-requests.md` #6 해결됨). **여전히 미구현:** 주문 취소 시 드롭 마감 체크(마감 이후에도 취소 성공함), `Idempotency-Key`/중복요청 방지(`OrderController.create`가 헤더를 읽지 않음) — order를 건드릴 때는 `docs/order-api.md`의 ⚠️ 문단을 먼저 확인할 것.
- 모든 API 응답은 하나의 envelope 형태를 씀: 성공 시 `{success, data}`, 실패 시 `{success:false, error:{code, message}}`. 에러 코드는 도메인별 prefix가 붙음(`ME`, `CA`, `OR`, `DR`, `P`, `SE`, `ST`, 공통 코드는 `C001`/`C003`처럼 `C`). 단 `GET /drops/{dropId}/info`는 예외적으로 이 래퍼 없이 데이터가 최상위로 옴.
