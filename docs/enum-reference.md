# 상태값(enum) 참조표

프론트에서 UI 분기(뱃지 색상, 버튼 노출 여부 등)에 쓰는 도메인 enum을 한 곳에 모았습니다. 값은 전부 대문자 그대로 JSON에 직렬화됩니다(소문자로 내려오지 않음). 각 도메인 API 문서(`docs/*-api.md`)의 응답 예시와 필드가 겹치면 그쪽이 최신인지 이 표가 최신인지 날짜를 비교해서 확인하세요 — 원본은 항상 아래 소스 파일입니다.

---

## 회원 (member-service)

### Role — `member-service/.../domain/Role.java`
| 값 | 의미 |
| --- | --- |
| `ADMIN` | 관리자 |
| `CUSTOMER` | 일반 회원 (기본값) |

### MemberStatus — `.../domain/MemberStatus.java`
| 값 | 의미 | 비고 |
| --- | --- | --- |
| `ACTIVE` | 정상 활동 중 | |
| `SUSPENDED` | 정지 | ⚠️ 현재 로그인 차단 로직 미구현 — 정지 상태여도 로그인 가능 (`member-auth-api.md` 참고) |
| `WITHDRAWN` | 탈퇴(soft delete) | |

### AuthProvider — `.../domain/AuthProvider.java`
| 값 | 의미 |
| --- | --- |
| `LOCAL` | 이메일/비밀번호 가입 |
| `GOOGLE` | Google OAuth |

---

## 판매자 (seller)

### ApplicationStatus — `seller/domain/ApplicationStatus.java`
| 값 | 의미 |
| --- | --- |
| `PENDING` | 입점 신청 접수, 관리자 승인 대기 |
| `APPROVED` | 승인 완료 |
| `REJECTED` | 반려 |

> ⚠️ 승인/반려 API(`PATCH /api/v1/sellers/{id}/status`)에 `PENDING`을 보내면 서버가 `== APPROVED`만 확인하고 나머지는 전부 반려로 처리합니다. `APPROVED`/`REJECTED`만 보내세요.

---

## 드롭 (drop)

### DropStatus — `drop/domain/DropStatus.java`
| 값 | 의미 |
| --- | --- |
| `UPCOMING` | 시작 전 |
| `ACTIVE` | 진행중 (응모 가능) |
| `COMPLETED` | 마감 |

### EntryStatus — `drop/domain/EntryStatus.java`
회원 한 명이 특정 드롭에 참여한 이력(`DropEntry`)의 상태입니다. 대기열 순번 조회(6·7번 API)의 `status`(`WAITING`/`ACTIVE`)와는 **다른 값**이니 혼동하지 마세요 — 그쪽은 enum이 아니라 코드에서 직접 만드는 문자열입니다(`QueueRankResponse.java`).

| 값 | 의미 |
| --- | --- |
| `ENTERED` | 대기열 통과 후 드롭 상세 페이지 입장 성공 |
| `RESERVED` | 수량 선택 후 재고 선점 성공 (`lock-start` 호출 완료) |
| `COMPLETED` | 결제까지 완료 (재진입 불가) |
| `FAILED` | 재고 소진/타임아웃 등으로 응모 실패 |
| `CANCELLED` | 주문 취소로 재고가 복구된 상태 |

### 대기열 조회 응답의 `status` (enum 아님)
| 값 | 의미 |
| --- | --- |
| `WAITING` | 대기 중 |
| `ACTIVE` | 입장 허용 (순번 0) |
| `NOT_FOUND` | 대기열 진입 기록 없음 (`rank: -1`과 함께) — 7번 API에서만 내려옴, 6번 응답 설명에는 누락돼 있었음 |

---

## 주문 (order)

### OrderState — `order/domain/OrderState.java`
| 값 | 의미 |
| --- | --- |
| `PAID` | 결제 완료 (주문 생성 시 기본값) |
| `CONFIRMED` | 구매 확정 (판매자가 픽업 확인) |
| `CANCELED` | 취소 |

> 주문 목록 조회(`GET /api/v1/orders?orderState=`)에 이 값 그대로(대문자) 넘겨야 합니다. 다른 값을 보내면 `400 OR008`.

### PaymentStatus — `payment/domain/PaymentStatus.java` (내부용, API 응답에 직접 노출 안 됨)
`OrderPayment` 엔티티 내부 상태로, 주문 결제와 정산 연동에 쓰입니다. 현재 어떤 응답 DTO에도 이 값 자체가 그대로 내려가지 않으니 프론트가 직접 참조할 일은 없지만, `OrderState`와 이름이 비슷해 헷갈리기 쉬워 참고용으로 남겨둡니다.

| 값 | 의미 |
| --- | --- |
| `PAID` | 결제 완료 (예치금 차감됨) |
| `CONFIRMED` | 구매 확정 (정산 대상) |
| `REFUNDED` | 환불 완료 |

---

## 결제/예치금 (payment)

### ChargeStatus — `payment/domain/ChargeStatus.java`
충전 상태 조회(`GET /api/v1/deposit/charges/{id}`)의 `status` 필드.

| 값 | 의미 | 프론트 처리 |
| --- | --- | --- |
| `READY` | 결제창 대기 중 | 대기 |
| `IN_PROGRESS` | 승인 요청 보냈으나 결과 미확인 | 폴링 (최대 1분) |
| `DONE` | 충전 완료 | 잔액 갱신 |
| `FAILED` | 승인 실패 | `failureReason` 표시 |
| `EXPIRED` | 30분 내 미완료로 만료 | "다시 시도해주세요" |

### TransactionType — `payment/domain/TransactionType.java`
예치금 거래 내역(`GET /api/v1/deposit/transactions`)의 `transactionType` 필드 및 쿼리 파라미터.

| 값 | 의미 | 금액 부호 |
| --- | --- | --- |
| `CHARGE` | PG 충전 | + |
| `PAYMENT` | 주문 결제 | − |
| `REFUND` | 주문 취소 환불 | + |

### ReferenceType — `payment/domain/ReferenceType.java`
거래 내역의 `referenceType` 필드 (해당 거래가 왜 생겼는지).

| 값 | 의미 |
| --- | --- |
| `CHARGE_REQUEST` | 충전 요청으로 발생 |
| `ORDER_PAYMENT` | 주문 결제/환불로 발생 |

### AccountType / PgProvider (내부용, API 응답에 노출 안 됨)
- `AccountType`: `MEMBER`(회원 예치금 계좌) / `PLATFORM`(시스템 판매대금 원장, 회원 API 조회 결과에는 안 나타남)
- `PgProvider`: `TOSS` 하나뿐 (다른 PG 미지원)

---

## 정산 (settlement)

### SettlementStatus — `settlement/domain/SettlementStatus.java`
판매자 정산 목록/상세(`GET /api/v1/sellers/me/settlements...`)의 `status` 필드.

| 값 | 의미 |
| --- | --- |
| `READY` | 집계 완료, 지급 가능 |
| `ON_HOLD` | 계좌 미검증 등으로 지급 보류 |
| `PAYING` | 지급 진행 중 |
| `FAILED` | 지급 실패 (재처리 필요) |
| `COMPLETED` | 지급까지 완료 |

### SettlementPayoutStatus — `settlement/domain/SettlementPayoutStatus.java`
정산 지급(payout) API들의 `status` 필드. **정산 상태(`SettlementStatus`)와 이름이 비슷하지만 값이 다른 별개의 enum**입니다.

| 값 | 의미 |
| --- | --- |
| `REQUESTED` | 지급 원장 생성 직후 |
| `PROCESSING` | 지급 처리 중 (start API 호출 시 바로 이 상태가 됨) |
| `COMPLETED` | 지급 성공 |
| `FAILED` | 지급 실패 |

### SettlementTargetStatus — `settlement/domain/SettlementTargetStatus.java` (내부용, 정산 API 응답에 직접 노출 안 됨)
| 값 | 의미 |
| --- | --- |
| `PENDING` | 구매확정 후 정산 대기 |
| `ASSIGNED` | 월 정산 배치에 포함됨 |
| `EXCLUDED` | 취소/환불 등으로 정산 대상에서 제외 |

---

## 이름은 같지만 값이 다른 enum 주의

같은 이름(`PENDING`, `READY`, `PROCESSING` 등)이 도메인마다 다른 enum에 재사용되니, 프론트에서 상태값으로 분기할 때 반드시 **어느 API의 어느 필드인지**까지 같이 확인하세요.

| 이름이 겹치는 값 | 등장하는 enum들 |
| --- | --- |
| `PENDING` | `ApplicationStatus`(판매자), `SettlementTargetStatus`(정산 대상, 내부용) |
| `READY` | `ChargeStatus`(충전), `SettlementStatus`(정산) |
| `PROCESSING` | `SettlementPayoutStatus` |
| `FAILED` | `ChargeStatus`, `SettlementStatus`, `SettlementPayoutStatus` — 셋 다 있지만 각각 다른 API 응답에 나옵니다 |
| `COMPLETED` | `DropStatus`, `SettlementStatus`, `SettlementPayoutStatus` |
| `CANCELED`/`CANCELLED` | `OrderState`(`CANCELED`, L 하나), `EntryStatus`(`CANCELLED`, L 두 개) — **철자가 다릅니다.** 문자열 비교 시 주의 |
