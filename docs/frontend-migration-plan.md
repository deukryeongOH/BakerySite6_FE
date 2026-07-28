# DarkArtisanBakeryDesign → Next.js 프론트엔드 전환 계획

## Context

`docs/DarkArtisanBakeryDesign/`에 Figma에서 뽑은 완전한 인터랙티브 프로토타입(Vite+React18+TS, 단일 `App.tsx` 1837줄에 14개 화면 + mock 리듀서)이 있음. 백엔드(별도 레포 `beadv7_7_BakerySite6_BE`, 이 레포의 형제 디렉터리)에서 `docs/*-api.md` 7개 도메인 문서로 코드 기준 검증을 마쳤고(에러코드, 필드, 미구현 지점 전부 확인됨), `docs/enum-reference.md`(상태값)도 정리됨. 이 문서들과 프로토타입 원본은 이번에 `beadv7_7_BakerySite6_FE`(현재 레포) `docs/` 아래로 복사해 커밋 대상으로 가져왔음 — 백엔드 레포의 `docs/`는 `.gitignore`로 제외되어 있어 그쪽에서 직접 참조할 수 없었기 때문. **API가 바뀌면 백엔드 레포에서 다시 복사해 동기화해야 함.**

이제 이 프로토타입을 실제 Next.js(App Router) 프로덕션 프론트엔드로 전환한다. 이 레포는 **프론트엔드 전용**이며 백엔드 코드는 건드리지 않음 — 백엔드 TODO는 `beadv7_7_BakerySite6_BE`에서 별도로 진행 중이므로, 프론트는 현재 API 제약을 인지하고 우회/방어하며 진행한다.

사용자 확정 사항:
- **별도 git 레포**(`beadv7_7_BakerySite6_FE`)로 분리, 백엔드 레포(`beadv7_7_BakerySite6_BE`)와 형제 디렉터리
- 프레임워크: **Next.js (App Router)** — Vite+React Router 대신 최종 확정
- UI 컴포넌트: **shadcn/ui는 필요할 때만 CLI로 추가** (처음부터 전면 도입하지 않음, 프로토타입의 인라인 스타일을 우선 재사용)
- 라우팅: 하단 탭바 있는 화면과 상세(탭바 없음) 화면을 **같은 URL 그룹에 두고 `usePathname()`으로 탭바를 조건부 렌더링**

## 배치 및 초기 셋업

- 이 레포(`beadv7_7_BakerySite6_FE`) **루트 자체가 Next.js 프로젝트**임 (백엔드 레포 안의 하위 디렉터리가 아님).
- `create-next-app . --typescript --tailwind --app --no-src-dir --eslint`로 이 레포 루트에 스캐폴딩(이미 `docs/`와 `.git`이 있는 상태에서 실행하게 되므로, 기존 파일과 충돌 없는지 확인 후 진행).
- `.gitignore`에 Next.js 표준 패턴(`node_modules`, `.next`, `.env*.local` 등) 추가.
- `.env.local`에 `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080` — 백엔드 CORS가 `WebConfig.java`에서 `allowedOrigins("*")`로 전부 열려 있어 BFF/프록시 없이 **클라이언트가 백엔드를 직접 호출**하는 방식으로 진행 (이유: refresh token이 쿠키가 아닌 JSON body 방식이라 BFF를 둬도 httpOnly 쿠키 보안 이점을 못 살리고, 백엔드가 아직 활발히 바뀌는 중이라 프록시 라우트 이중 유지보수 비용만 커짐). 배포 시에는 실제 백엔드 배포 URL로 교체.

### 패키지 정리
`docs/DarkArtisanBakeryDesign/package.json` 대비 `App.tsx`가 실제 쓰는 외부 패키지는 `lucide-react` 하나뿐(나머지 46개 `@radix-ui/*` 등은 미사용 shadcn 컴포넌트 전용). 이식 시:
- **제거**: `@mui/*`, `@emotion/*`, `@popperjs/core`, `react-popper`, `react-router`(Next.js 라우팅으로 대체), `react-dnd*`, `react-responsive-masonry`, `react-slick`
- **유지**: `lucide-react`, `clsx`+`tailwind-merge`, `class-variance-authority`(추후 shadcn 추가 시 필요)
- **필요시 재설치**: `canvas-confetti`, `date-fns` 등은 화면 이식 중 필요해지면 그때 추가

### Tailwind v4 이식
프로토타입이 이미 Tailwind v4 CSS-first(`@theme`) 방식이라 `create-next-app --tailwind`(v4 기본 지원)와 궁합이 좋음. `docs/DarkArtisanBakeryDesign/src/styles/theme.css`(다크 팔레트 CSS 변수 + `@theme inline`)를 `app/globals.css`에 이식. Google Fonts(`fonts.css`: Playfair Display/Inter/JetBrains Mono)는 CDN `@import` 대신 `next/font/google`로 교체. `src/imports/*.png` 3개 이미지는 `public/images/`로 옮기고 `next/image` 사용.

## 서버/클라이언트 컴포넌트 경계

이 앱은 로그인 후 개인화 화면이 대부분이라 서버 컴포넌트 이득이 크지 않음. 방침:
- 루트 `layout.tsx`, `(shop)/layout.tsx`(탭바 셸)는 서버 컴포넌트로 유지, `TabBar` 자체만 client component로 분리(활성 탭 표시에 pathname 필요).
- 나머지 14개 화면은 전부 클라이언트 컴포넌트로 시작 (대기열 폴링, 인증 필요 데이터, 뮤테이션이 대부분).
- **2026-07-28 갱신:** `GET /drops/{id}/info`(인증 불필요, 공개 조회)가 이제 구현돼 있어서, 드롭 상세 화면의 "정적 정보"(상품명/설명/이미지/가격/재고/픽업가능일) 부분은 서버 컴포넌트로 초기 렌더하고, 대기열/재고선점처럼 인터랙티브한 부분만 클라이언트 컴포넌트로 감싸는 것도 M5에서 바로 시도해볼 수 있음(이전엔 API 자체가 없어서 미룬 항목이었음). 단 이 API는 `ApiResponse` 래퍼 없이 데이터가 최상위로 바로 오니 다른 API와 파싱 로직을 분리해야 함.

## 라우팅 설계

```
app/(auth)/login/page.tsx                → LoginScreen
app/(shop)/layout.tsx                    → TabBar 포함 공통 레이아웃 (usePathname으로 상세 페이지에서 탭바 숨김)
app/(shop)/page.tsx                      → HomeScreen
app/(shop)/drops/[dropId]/page.tsx       → DropDetailScreen
app/(shop)/wishlist/page.tsx             → WishlistScreen (localStorage 기반, 아래 참고)
app/(shop)/orders/page.tsx               → OrderListScreen (탭바 있음)
app/(shop)/orders/[orderId]/page.tsx     → OrderDetailScreen (같은 그룹, pathname 매칭 시 탭바 숨김)
app/(shop)/mypage/page.tsx               → MyPageScreen
app/order/page.tsx                       → OrderScreen (장바구니→결제, BackHeader만)
app/order/complete/page.tsx              → OrderCompleteScreen
app/wallet/page.tsx , app/wallet/charge/page.tsx  → WalletScreen, ChargeScreen
app/seller/register/page.tsx , app/seller/dashboard/page.tsx
app/admin/approvals/page.tsx
```

인증 가드는 `middleware.ts`가 아니라 **클라이언트 레이아웃 가드**(`(shop)/layout.tsx` 안 `AuthGuard`가 마운트 시 토큰 확인 후 없으면 `/login`으로 리다이렉트)로 구현 — 토큰을 localStorage에 두므로 Edge 미들웨어에서 접근 불가하기 때문. role 기반 라우트 보호는 로그인 응답의 `role` 필드로 판정하되, "판매자 여부"는 별도 조회 API가 없어(seller-api.md 참고) 판매자 등록 성공 여부를 로컬 상태로 임시 추적.

## API 클라이언트 레이어

- `lib/api/client.ts`: fetch 래퍼, 모든 요청에 `Authorization: Bearer <accessToken>` 부착.
- **토큰 저장**: accessToken/refreshToken 둘 다 `localStorage` (백엔드가 refresh token을 쿠키가 아닌 body로만 내려주므로 httpOnly 쿠키의 이점을 애초에 못 씀 — `lib/auth/token-storage.ts`에 `get/set/clearTokens` 래퍼로 캡슐화해 나중에 바꾸기 쉽게).
- **자동 재발급**: 401 + 에러코드 `ME002` 응답 시 모듈 스코프 Promise 캐시로 `POST /api/v1/auth/reissue`를 1회만 호출(동시 다발 401에도 중복 호출 방지) → 성공 시 원 요청 재시도, 실패 시 토큰 삭제 후 `/login` 리다이렉트.
- **공통 에러 처리**: `types/api.ts`에 `ApiResponse<T>`/`ApiError` 정의, `success:false`면 `ApiException`으로 throw해 TanStack Query `onError`에서 `error.code`(`ME002`, `CA003`, `OR005` 등 `ErrorCode.java` prefix)로 분기.
- **서버 상태 관리**: TanStack Query 도입 (대기열 순번 폴링, 충전 상태 폴링, 장바구니 만료 카운트다운 등 `refetchInterval` 기반 폴링이 여러 화면에 필요하고, 캐시 무효화 패턴이 잘 맞음). Server Actions는 비권장(백엔드가 별도 오리진이라 이점 없고 토큰이 클라이언트에 있어 서버 액션에서 접근 이점도 없음).

### mock 액션 → 실제 API 매핑

| 프로토타입 액션 | 실제 API 흐름 |
|---|---|
| `PURCHASE` | `POST /drops/{id}/enter`(대기열 진입) → 폴링 `GET /queue/rank` → `POST /confirm-entry` → `POST /drops/{id}/lock-start`(재고 실제 선점, `DropEntry`→`RESERVED`) → `POST /cart`(선점 확인 후 장바구니 기록, 재고는 안 건드림) → `PATCH /cart/pickup-date` → `POST /orders`(결제). `lock-start`/`POST /cart`의 역할 분담은 2026-07-28 백엔드 커밋(`2cd4d8b`)으로 확정됨 — 선점 없이 `POST /cart`만 부르면 `CA006` 에러 |
| `CANCEL_ORDER` | `PATCH /orders/{id}/cancel` → 성공 시 지갑 잔액 쿼리 invalidate |
| `TOGGLE_WISHLIST` | **대응 API가 백엔드에 없음.** `localStorage` 기반 클라이언트 전용 기능으로 구현(서버 상태 아님, TanStack Query 대상 아님). 나중에 API가 생기면 훅 내부 구현만 교체 |
| `CHARGE` | `POST /deposit/charges` → 토스 SDK `requestPayment()` → `POST /deposit/charges/confirm` → (504면) `GET /deposit/charges/{id}` 폴링. 웹훅은 로컬에서 검증 불가(공인 URL 필요) |

## enum/타입 매핑

`docs/enum-reference.md` 기준으로 `types/*.ts`를 작성. 프로토타입 값(예: `OrderStatus = "픽업대기"|"구매확정"|"취소"`)을 백엔드 enum(`OrderState = "PAID"|"CONFIRMED"|"CANCELED"`)으로 교체하고, 한글 표시는 별도 `*_LABEL` 매핑 상수로 분리(enum 값 자체를 한글로 바꾸지 않음 — API 파싱 시 변환 로직이 필요 없어짐). 특히 주의: `OrderState.CANCELED`(L 1개)와 `EntryStatus.CANCELLED`(L 2개) 철자가 다름.

## 단계별 마일스톤 (완성도 높은 백엔드 도메인부터)

1. **M0 스캐폴딩** — 프로젝트 생성, 패키지 정리, 테마 이식. 검증: 다크 배경으로 빈 페이지 렌더.
2. **M1 라우팅 골격** — 14개 라우트 + `TabBar`/`BackHeader`/`BreadBox`/`DropBadge`/`OrderStatusBadge` 이식, API 연동 없이 UI 뼈대. 검증: 탭 전환 클릭 경로 확인.
3. **M2 인증 (member-auth)** — `lib/api/auth.ts`, 재발급 인터셉터, `AuthContext`. `LoginScreen`을 이메일/비밀번호 폼으로 실연동(Google OAuth는 이후), `MyPageScreen` 조회/수정/탈퇴. 검증: 회원가입→로그인→새로고침 유지→로그아웃, 401→reissue→재시도 흐름 확인.
4. **M3 판매자 등록/승인 (seller)** — 사업자 인증→계좌 인증(DEV mock-code)→신청 3단계 폼, 관리자 승인/반려. 검증: 신청→승인까지 e2e.
5. **M4 예치금 (payment, 웹훅 제외)** — 잔액/거래내역(Spring `Page` 원본 노출 주의, `page`아니라 `number` 필드) + 토스 테스트 충전. 검증: 테스트 결제창→잔액 반영.
6. **M5 드롭/장바구니/주문 — 코드 완료, 브라우저 e2e까지 확인(2026-07-28).** 구현: `lib/api/drop.ts`/`cart.ts`/`order.ts`, 홈(오늘의 드롭), 드롭 상세(찜 + 대기열 진입→순번 폴링→입장확정), 주문/결제(`lock-start`→`POST /cart`→픽업일→`POST /orders`), 주문 완료/목록/상세(취소 포함), 찜(localStorage, memberId별). `npm run lint`/`npm run build` 통과.
   - ⚠️ **`GET /drops/{id}/info`, `GET /drops/today/drop`는 문서와 달리 실제로는 인증 필요** — 토큰 없이 호출하면 403(문서엔 "인증 불필요한 공개 API"로 돼 있음). 이 때문에 애초 계획했던 "정적 정보는 서버 컴포넌트로" 방식(위 서버/클라이언트 컴포넌트 경계 절 참고)은 포기하고 드롭 상세를 전부 클라이언트 컴포넌트로 되돌렸다(`app/(shop)/drops/[dropId]/page.tsx`).
   - ⚠️ **`GET /drops/{id}/info`의 "래퍼 없음" 문서 설명도 실제와 다르다** — 실측 결과 다른 API와 동일하게 `{success,data}` 래퍼가 있다. 처음엔 문서를 믿고 `unwrapped` 파싱을 했다가 모든 필드가 `undefined`가 되면서 홈/드롭상세가 에러 없이 조용히 빈 화면만 뜨는 버그가 났었다(2026-07-28 브라우저로 재현·수정). `lib/api/drop.ts`의 `getDropInfo`는 이제 일반 `apiRequest`(래퍼 있음 전제)로 파싱한다 — 이 API를 다시 건드릴 일이 있으면 문서보다 실측을 우선할 것.
   - ⚠️ **백엔드 버그, 2026-07-28 로컬에서 직접 수정함(커밋/푸시는 안 함, 백엔드 팀 공유 예정)**: `GET /drops/{id}/info`와 `GET /drops/mine`이 `LazyInitializationException`(`pickUpAvailableDate` 컬렉션을 세션 밖에서 직렬화)으로 500이 났었다. `DropService.getDropProductInfo`에 `@Transactional(readOnly=true)` 추가 + `DropProductInfo`/`DropProductInfoResponse` 생성 시 `pickUpAvailableDate`를 `new HashSet<>(...)`로 복사하도록 고쳐서 로컬에서는 해결됨. **백엔드 레포에 아직 커밋되지 않은 로컬 전용 수정**이므로, 백엔드를 새로 pull하거나 재클론하면 이 문제가 다시 나타남 — 팀 공유 후 정식 커밋 필요.
   - drop/cart 쪽 응답 스펙은 2026-07-28 백엔드 갱신으로 `GET /cart`의 `drop`/`seller`/`estimatedAmount`/`pickupDates`가 실제 값으로 채워짐. **order 쪽은 여전히 TODO 많음**: 주문 데이터가 스텁 상수(seller/가격/상품명), `dropCloseAt` 필드 자체가 응답에서 제거돼 `orderState==="PAID"`로만 취소 가능 여부 판단, 취소 시 재고는 복구됨(`OR002`/`OR003` 문서 참고).
7. **M6 판매자 대시보드 — 드롭 CRUD 실연동 완료(2026-07-28), 주문 집계는 보류.** `GET /drops/mine`이 이제 구현돼 있어(위 M5 항목 참고) 내 드롭 목록/등록(`app/seller/drops/new`)/수정(`app/seller/drops/[dropId]/edit`)/삭제를 전부 실연동했고, 대시보드에 예정/진행중/종료 탭 필터링도 추가함. `sellers/me`(신청 여부/상태 조회)도 새로 백엔드에 붙여서 `lib/seller/seller-storage.ts` 로컬스토리지 워크어라운드를 제거함(`docs/backend-api-requests.md` "해결됨" §1). **원본 디자인에 있던 "오늘 픽업 예정"/"날짜별 픽업 집계" 위젯은 구현하지 않음** — `GET /seller/orders`가 여전히 없고 order 도메인 자체가 스텁 데이터라 값이 무의미하므로, `docs/backend-api-requests.md` 미해결 §1에 요청만 기록해둠.

## 검증 방법 (전 마일스톤 공통)

1. 백엔드 레포(`../beadv7_7_BakerySite6_BE`)에서 `docker compose up -d`(postgres/redis) → `.env`에 필요한 시크릿 준비 → `./gradlew bootRun`(8080) → `curl localhost:8080/actuator/health`로 기동 확인.
2. 이 레포(FE) 루트에서 `npm run dev`(3000), `.env.local`의 `NEXT_PUBLIC_API_BASE_URL` 설정.
3. 브라우저 시나리오: 회원가입→로그인(DevTools에서 토큰 저장 확인)→드롭 대기열 진입/폴링/입장→재고 선점→장바구니→픽업일 선택→결제→주문내역 확인→취소→예치금 충전→판매자 등록→관리자 승인.
4. Network 탭에서 각 응답이 `docs/*-api.md`와 일치하는지, ⚠️ 표시된 null/스텁 필드를 프론트가 방어적으로 처리하는지 확인.
5. 401/재발급: DevTools에서 accessToken을 훼손 후 API 호출 → reissue 1회만 호출되고 원 요청이 재시도되는지 확인.
6. 화면 이식 중 발견되는 백엔드 제약(재고 미복구로 인한 재고 고갈, 스텁 상수로 인한 상품정보 불일치 등)은 프론트 버그와 구분해서 기록 — 각 도메인 `*-api.md`의 ⚠️ 표시 문단이 이런 제약의 원본.

## Critical Files

이 레포(FE) 기준:
- `docs/DarkArtisanBakeryDesign/src/app/App.tsx` — 이식 원본 (14개 화면, 리듀서, 공통 컴포넌트)
- `docs/DarkArtisanBakeryDesign/src/styles/theme.css` — Tailwind v4 테마 원본
- `docs/DarkArtisanBakeryDesign/package.json` — 패키지 정리 기준
- `docs/enum-reference.md` — 타입 정의 원본
- `docs/drop-api.md`, `docs/cart-api.md`, `docs/order-api.md` — 대기열/재고선점/주문 플로우 및 TODO 제약

백엔드 레포(`../beadv7_7_BakerySite6_BE`) 기준, 참고만 (이 레포에서 수정하지 않음):
- `src/main/java/com/openbake/common/config/WebConfig.java` — CORS 설정 (로컬 개발 시 FE 쪽 추가 조치 불필요 확인용)

배포 방식(Vercel vs 백엔드 레포의 기존 docker-compose/nginx와 통합)은 별도 논의 필요 — 이 계획은 로컬 개발까지만 다룸. 두 레포가 분리됐으므로 배포 시 프론트/백엔드 오리진이 달라지는 게 기본 전제가 되고, 그때는 `WebConfig.java`의 `allowedOrigins("*")`를 실제 FE 배포 도메인으로 좁히는 백엔드 쪽 작업이 별도로 필요함(이 레포 작업 범위 밖).
