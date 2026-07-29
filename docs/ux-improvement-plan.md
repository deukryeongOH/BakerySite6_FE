# UX/안전장치 개선 계획 (2026-07-29)

`docs/frontend-migration-plan.md`로 M5(드롭/장바구니/주문)·M6(판매자 대시보드) 실연동이 끝난 뒤, 실제 사용자 플로우(일반 회원/판매자/관리자)를 코드 기준으로 다시 훑어보며 찾은 개선점 정리. 항목마다 완료되면 아래 체크박스를 채우고, 착수 여부는 각 항목의 "상태" 줄에 메모.

관련 문서: `docs/backend-api-requests.md`(§1~§7이 이 계획과 얽혀 있음), `docs/backend-bug-reports.md`.

## 핵심 리스크 요약

1. 구매 퍼널에 "빠져나올 수 없는 상태"가 3곳 있다 — 대기열 `NOT_FOUND` 무한폴링, 결제 이탈 후 `DR006` 데드엔드, 장바구니 TTL 만료 시 복구 경로 없음.
2. 관리자 정산 지급(payout)이 대상 정보 확인 없이 손으로 친 ID에 그대로 실행된다. 게다가 백엔드 `/internal/v1/*`에 권한 검사가 없어(`docs/backend-api-requests.md` §4) FE role 가드가 뚫리면 실제 송금 처리까지 이어진다.

---

## Phase 1 — 구매 퍼널 데드엔드 제거 (P0, 백엔드 불필요)

- [ ] **1. 대기열 순번 폴링이 `NOT_FOUND`를 처리하지 않아 영구 정지**
  - 파일: `app/(shop)/drops/[dropId]/drop-detail-view.tsx:93-111`
  - 문제: `getQueueRank`가 `NOT_FOUND`를 반환해도 처리 로직이 없어 `rankPollingEnabled`가 계속 true → 1초마다 무한 폴링, CTA는 "입장 처리 중..."에 영구 고정. 취소/타임아웃 버튼 없음.
  - 조치: `NOT_FOUND` 도달 시 폴링 중단 + "대기열에서 이탈되었습니다. 다시 시도해주세요" + 재진입 버튼. 폴링 전체에 상한(예: 10분) 및 "대기 취소" 버튼 상시 노출.
  - 난이도: Low

- [ ] **2. 결제 페이지 이탈 후 재구매 시 `DR006` 데드엔드**
  - 파일: `app/order/order-view.tsx:53-79`, `app/(shop)/drops/[dropId]/drop-detail-view.tsx:82-91`
  - 문제: `/order` 이탈 시 `deleteCart()`로 재고 선점만 풀림. `DropEntry`(참여 이력)는 남아 재진입 시 409 `DR006`. 하루 1드롭 구조라 그 드롭을 그 계정으로 영영 못 삼.
  - 조치: ① 이탈 확인 다이얼로그("선점된 재고가 해제됩니다") ② `enterMutation`이 `DR006`이면 자동으로 `confirmEntry`→`lock-start` 재시도(이어서 진행하기) ③ 그래도 실패 시 명시적 안내+홈 링크.
  - 선행 확인: `docs/backend-api-requests.md` §7 — `DELETE /cart` 시 `DropEntry` 복원 여부 백엔드 확인 필요(결과에 따라 ②의 구현 방식이 달라짐).
  - 난이도: Medium

- [ ] **3. `/order`가 실제 장바구니(`GET /cart`)를 한 번도 조회하지 않음**
  - 파일: `app/order/order-view.tsx:22-47`, `lib/api/cart.ts:25-39`
  - 문제: URL 쿼리 + 드롭 정보만으로 화면 구성, 장바구니 TTL/실제 금액을 확인 안 함. TTL 만료 시 복구 경로 없이 `CA002`/`CA003` 빨간 텍스트만 노출(충전까지 마친 사용자의 이탈 손실이 가장 큼). URL `qty` 조작 시 표시금액≠청구금액. 잔액 로딩 중엔 결제 버튼이 활성 상태.
  - 조치: 마운트 시 `getCart()` 조회 → 수량/픽업일/금액을 서버 값 기준으로 표시, `remainingSeconds` 기반 만료 카운트다운 배너, 만료 시 "다시 담기" CTA, 잔액 로딩 중 버튼 비활성화.
  - 난이도: Medium

- [ ] **4. 카운트다운이 0이 돼도 드롭 상태가 갱신되지 않음**
  - 파일: `app/(shop)/page.tsx:18-52`, `app/(shop)/drops/[dropId]/drop-detail-view.tsx:26-48`
  - 문제: `now`만 갱신되고 `dropStatus`는 최초 쿼리 그대로. 오픈 시각 도달해도 수동 새로고침 전까지 "찜하고 알림받기"만 표시 — 구매 의도가 가장 높은 순간에 전환이 막힘.
  - 조치: 카운트다운이 0을 넘길 때 관련 쿼리 invalidate. `ON_SALE` 동안 짧은 `refetchInterval`(3~5초) 적용.
  - 난이도: Low

- [ ] **5. `/order`·`/wallet`·`/seller`에 인증 가드 없음**
  - 파일: 가드 있는 곳 — `app/(shop)/layout.tsx`, `app/admin/layout.tsx`뿐. `app/seller/*`, `app/order/*`, `app/wallet/*`엔 없음.
  - 문제: 비로그인 접근 시 `lib/api/client.ts:96`의 빈 바디 처리가 스킵되며 raw SyntaxError 발생 → 각 화면 fallback 문구만 뜸 + QueryClient 기본 retry로 몇 초간 무의미하게 로딩.
  - 조치: `app/seller/layout.tsx`, `app/order/layout.tsx`, `app/wallet/layout.tsx`에 `(shop)`과 동일한 클라이언트 가드 추가(공용 `<AuthGuard>` 추출 권장).
  - 난이도: Low

- [ ] **6. 세션 만료 시 원래 위치를 잃음**
  - 파일: `lib/api/client.ts:89, 109, 122`, `app/(auth)/login/page.tsx:25`
  - 문제: 토큰 갱신 실패 시 무조건 `window.location.href = "/login"` → 로그인 성공 후 항상 홈으로. 드롭 상세/주문 도중이었으면 처음부터 다시.
  - 조치: 리다이렉트 시 `?next=<현재경로>` 부착, 로그인 성공 후 해당 경로로 복귀.
  - 난이도: Low

---

## Phase 2 — 관리자 안전장치 (P0, 돈이 움직이는 화면)

- [ ] **7. 정산 지급이 대상 정보 없이 손으로 친 ID에 실행 + 멱등키가 매번 달라짐**
  - 파일: `app/admin/settlements/page.tsx:200-296`, `lib/api/settlement.ts:82-88`
  - 문제: 정산 ID 입력 후 버튼 하나로 실제 송금 시작 — 판매자/기간/금액 확인 없음(오타로 엉뚱한 판매자에게 지급될 수 있음). `PAYOUT-${settlementId}-${Date.now()}`라 재시도해도 멱등키가 매번 새로 생성돼 멱등성이 실질적으로 없음. 확인 다이얼로그 전무, 빈 값도 그대로 전송.
  - 조치: 지급 시작 전 대상 확인(정산 ID 재입력 확인 + 금액 확인 다이얼로그), 멱등키를 결정적으로 생성(`PAYOUT-{settlementId}`) 또는 최초 생성 키 재사용, `externalTransactionId`/실패 사유 필수화.
  - 완전 해결: `docs/backend-api-requests.md` §3(관리자 정산 목록 API) 필요 — 나오면 목록 UI로 교체.
  - 난이도: Low(가드) / Medium(목록 UI 전환)

- [ ] **8. ADMIN 가드가 localStorage `role` 값을 그대로 신뢰**
  - 파일: `app/admin/layout.tsx:9-20`, `lib/auth/token-storage.ts:23`
  - 문제: `role`이 localStorage 평문 — 아무 로그인 사용자나 값 조작 시 `/admin/settlements` 진입 가능. `docs/backend-api-requests.md` §4에 따르면 `/internal/v1/settlement-*`엔 서버 권한검사가 없어 **실제 정산 배치/지급까지 실행됨**.
  - 조치(FE): role을 localStorage 대신 accessToken JWT claim에서 파생.
  - 조치(BE, 근본 해결): `/internal/v1/*` 권한 검사 — **배포 블로커로 승격 권고**.
  - 난이도: Low(FE) / 백엔드 필수

- [ ] **9. 판매자 승인/반려에 확인 절차·반려 사유 강제 없음**
  - 파일: `app/admin/approvals/page.tsx:119-141`
  - 문제: 원탭으로 즉시 실행, 반려 사유 미입력 시 `undefined` 전송 → 판매자는 사유도 모른 채 데드엔드(§10과 연결).
  - 조치: 반려 사유 필수화(빈 값이면 버튼 비활성화), 승인/반려 확인 다이얼로그(대상 판매자명 명시).
  - 난이도: Low

---

## Phase 3 — 판매자 온보딩 마찰 (P1)

- [ ] **10. 반려된 판매자는 영구 데드엔드 (재신청 경로 없음)**
  - 파일: `app/seller/dashboard/page.tsx:138-145`, `app/seller/register/page.tsx:28-41`
  - 문제: 신청 이력 있으면(REJECTED 포함) `/seller/register`가 무조건 대시보드로 리다이렉트, 재신청 API도 없음.
  - 조치(즉시): REJECTED 카드에 안내/문의 블록.
  - 조치(백엔드 요청): `docs/backend-api-requests.md` §5(재신청 엔드포인트) — 해결되면 "다시 신청하기" 버튼 추가.
  - 난이도: Low(안내) / Medium(재신청 UI, 백엔드 선행)

- [ ] **11. 3단계 신청 폼이 새로고침 한 번에 초기화됨**
  - 파일: `app/seller/register/page.tsx:26-54`
  - 문제: 폼 상태가 전부 로컬 state — 새로고침/탭전환 시 1단계로 리셋(1원 송금 재요청 유발). 이전 단계 버튼 없음. 3단계 확인화면에 계좌 정보가 안 보임(정산 계좌를 확인 없이 확정).
  - 조치: `sessionStorage`로 폼 상태 유지, 단계별 이전 버튼, 3단계 요약에 은행/마스킹 계좌/예금주 포함.
  - 난이도: Low

- [ ] **12. 판매자 대시보드에 운영 정보 부재**
  - 파일: `app/seller/dashboard/page.tsx`
  - 문제: 신청상태 카드+드롭목록(탭)뿐. 이미 있는 데이터도 활용 안 함: 진행중 드롭 실시간 판매율(텍스트만, 폴링 없음), 다음 예정 드롭까지 남은 시간, 최근 정산 요약("내 정산" 링크 한 줄뿐).
  - 조치: 위 항목으로 상단 요약 섹션 구성. "오늘 픽업 예정" 위젯은 `docs/backend-api-requests.md` §1 해결 후 추가.
  - 난이도: Low~Medium(일부는 §1 선행)

- [ ] **13. 판매자 픽업확정(구매확정) 화면 없음**
  - 파일: 없음(`lib/api/order.ts`에 해당 함수 없음), 백엔드 API는 `docs/order-api.md`에 존재(`PATCH /orders/{id}/confirm`)
  - 문제: 판매자가 실제로 빵을 건네고도 확정할 방법이 없음(1일 자동확정 배치에만 의존) — 정산이 실제 수령과 무관하게 진행됨.
  - 선행 조건: `docs/backend-api-requests.md` §1(판매자 주문 목록) — 주문 ID를 알 방법이 없어 목록 없이는 UI 불가.
  - 난이도: Medium(백엔드 §1 선행)

- [ ] **14. 드롭 수정 페이지에 판매자 승인 가드 없음**
  - 파일: `app/seller/drops/[dropId]/edit/page.tsx`(가드 없음) vs `app/seller/drops/new/page.tsx:36-41`(있음)
  - 조치: `new`의 가드 로직을 §5의 공용 `app/seller/layout.tsx`로 승격해 공통 적용.
  - 난이도: Low

---

## Phase 4 — 공통 안전장치·UX (P1~P2)

- [ ] **15. 비가역 액션 확인 절차 불일치** — 주문취소(확인없음)/지급(확인없음) vs 드롭삭제·탈퇴(`window.confirm`). 공용 `<ConfirmDialog>` 추출 후 4곳 통일.
- [ ] **16. 홈 화면 에러 분기 없음** — `noDropToday` 외 실패(500 등)엔 빈 화면. 에러+재시도 버튼 추가, wishlist 등 다른 목록화면도 점검.
- [ ] **17. QueryClient 기본값 미설정** — `app/providers.tsx`, retry 3회+지수백오프로 확정적 실패도 수 초 로딩. `retry`를 `ApiException`이면 즉시 중단하도록, 화면별 `staleTime` 지정.
- [ ] **18. 충전 금액 클라이언트 검증 없음** — `app/wallet/charge/page.tsx`, 안내문(1,000원 단위/최소·최대)만 있고 실제 체크는 `<=0`뿐. 결제창 열기 전 인라인 검증 추가.
- [ ] **19. 찜(wishlist) 고아 항목·상태 누락** — 삭제된 드롭이 localStorage에 영구 잔존, 판매중 항목은 상세 진입해야만 삭제 가능, 로딩/에러 상태 없음.
- [ ] **20. 회원가입 후 재로그인 강제** — 가입 성공 후 이메일 프리필/자동로그인 없음, 비밀번호 확인 필드 없음.

---

## Phase 5 — 접근성·코드 품질 (P2)

- [ ] **21. 접근성 기본기 부재(전 화면)** — `role="alert"`/`aria-live`/`focus-visible`/`<label>` 전무. 공통 `<ErrorText role="alert">`, 입력 라벨 강제, 전역 focus-visible 링, TabBar `<nav>`+`aria-current`, 터치 타깃 확대(현재 28px→44px), SOLD OUT 스탬프 색상 대비 개선.
- [ ] **22. 공용 프리미티브 부재로 인한 코드 중복** — `errorMessage()` 5곳 재정의, 에러색 `#E0554F` 12개 파일 하드코딩, `inputStyle` 5곳 복붙, 페이지네이션 2곳 중복 구현(기준마저 다름), `fmtDateTime`이 `app/wallet/page.tsx`에서 별도로 재정의됨. `COLORS.danger`, `getErrorMessage`, `<ErrorText>`/`<TextField>`/`<Pagination>` 추출.
- [ ] **23. 주문상세 "지도 보기"/"전화하기" 버튼 동작 안 함** — `onClick` 없음 + 백엔드 응답에 필드 자체가 없음. `docs/backend-api-requests.md` §6에 필드 추가 요청 등록됨. 해결 전까지는 버튼 숨김 또는 "준비 중" 처리 권장.
- [ ] **24. 이미지 로드 실패 폴백 없음** — `components/bread-box.tsx`, 판매자가 자유 입력한 URL 깨짐 시 대비 없음. `onError` 폴백 + 등록 폼에 미리보기 추가.
- [ ] **25. 24시간 넘는 카운트다운 레이아웃 깨짐** — `lib/format.ts`의 `msToHMS`가 시(hour)를 나머지 없이 반환. 지금은 "오늘 드롭"만 있어 안 드러나지만 `docs/backend-api-requests.md` §2(예정 드롭 목록) 해결 시 바로 문제화. "D-3 · 14:00 오픈" 형태로 전환 필요.

---

## 백엔드 의존 항목 정리

| 문서 항목 | 이 계획에서 막고 있는 것 | 시급도 |
|---|---|---|
| §1 판매자 주문/픽업 집계 | §12(대시보드 픽업위젯), §13(픽업확정 화면) | 중 |
| §2 예정 드롭 목록 | §25(카운트다운 레이아웃)와 연동 — 아직 안 급함 | 낮음 |
| §3 관리자 정산 목록 | §7의 완전한 해결(임시 가드는 FE만으로 가능) | 중 |
| §4 `/internal/v1/*` 권한 검사 부재 | §8 — **§8 FE 가드가 뚫리면 실제 악용 가능** | **높음(배포 블로커)** |
| §5 판매자 재신청 엔드포인트 | §10 | 중 |
| §6 주문상세 판매자 연락처/주소 | §23 | 낮음 |
| §7 `DELETE /cart` 시 `DropEntry` 복원 확인 | §2 | 중 |

---

## 권장 실행 순서

1. **Sprint 1 (전환 직결, 전부 FE만으로 가능):** §1, §3, §4, §5, §6
2. **Sprint 2 (돈 사고 방지):** §7, §8(FE 부분), §9, §15 — 백엔드팀에 §4 배포 블로커 승격 요청 병행
3. **Sprint 3 (판매자 유입):** §10(안내만 우선), §11, §14, §12
4. **Sprint 4 (품질):** §16~§20
5. **Sprint 5 (a11y/리팩터):** §22(공용 컴포넌트 추출) → §21(적용) → §23~§25

## 성공 기준

- [ ] 대기열/주문 화면에서 어떤 실패 경로로도 "재시도 또는 복귀" 액션 없이 멈추는 상태가 없다
- [ ] 장바구니 만료 전까지 남은 시간이 결제 화면에 항상 보이고, 만료 시 재담기 경로가 있다
- [ ] 비로그인으로 어떤 라우트에 진입해도 로그인으로 리다이렉트되고, 로그인 후 원래 위치로 돌아온다
- [ ] 지급/승인/반려/취소 등 비가역 액션은 예외 없이 대상 정보가 표시된 확인을 거친다
- [ ] 반려된 판매자에게 반려 사유와 다음 행동이 항상 제시된다
- [ ] 키보드만으로 구매 플로우 완주 가능하고, 모든 에러가 스크린리더에 전달된다
