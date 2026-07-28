# 백엔드 버그 리포트

프론트엔드(M5: 드롭/장바구니/주문) 개발 및 브라우저 e2e 검증 중 발견한 백엔드 버그를 여기에 기록합니다. 전부 2026-07-28에 로컬 백엔드(`beadv7_7_BakerySite6_BE`)에서 재현·수정했지만, **백엔드 레포에는 커밋하지 않았습니다** — 이 레포(FE)는 백엔드 코드를 직접 건드리지 않는다는 원칙 때문에, 로컬 검증용으로만 임시 수정하고 정식 반영은 백엔드팀 판단에 맡깁니다. 아래 수정 내용은 실제로 적용해 문제가 해결되는 것까지 확인했으니, 백엔드팀이 그대로 반영하거나 참고해서 고치면 됩니다.

백엔드에 정식 반영되면 이 목록에서 "해결됨"으로 옮겨주세요.

---

## 미해결 (로컬 임시 수정만 함, 백엔드 레포 미반영)

### 1. `GET /drops/{id}/info`, `GET /drops/mine` — 500 (LazyInitializationException)

- **발견일:** 2026-07-28
- **관련 도메인:** drop (`docs/drop-api.md`)
- **증상:** 두 엔드포인트 모두 항상 500(`C500`, "서버 오류가 발생했습니다")을 반환. 재현율 100%.
- **재현:**
  ```bash
  curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/drops/{dropId}/info
  curl -H "Authorization: Bearer $TOKEN" http://localhost:8080/api/v1/drops/mine
  ```
- **서버 로그:**
  ```
  org.springframework.http.converter.HttpMessageNotWritableException: Could not write JSON:
  Cannot lazily initialize collection of role 'com.openbake.drop.domain.Drop.pickUpAvailableDate'
  with key '1' (no session)
  ...
  Caused by: org.hibernate.LazyInitializationException: Cannot lazily initialize collection of role
  'com.openbake.drop.domain.Drop.pickUpAvailableDate' with key '1' (no session)
  ```
- **원인:** `Drop.pickUpAvailableDate`는 LAZY 컬렉션인데, 두 매핑 코드 모두 이 컬렉션을 한 번도 접근(touch)하지 않고 프록시 참조 그대로 DTO에 담아 넘깁니다. 실제 초기화(=DB 조회)는 Jackson이 응답을 직렬화하는 시점에 처음 일어나는데, 그때는 이미 트랜잭션/세션이 끝난 뒤라 실패합니다.
  - `DropService.getDropProductInfo`(`/info`가 사용) — `@Transactional` 자체가 없어서 세션 자체가 없는 상태로 지연 컬렉션을 참조.
  - `DropService.getMyDrops`(`/mine`이 사용) — `@Transactional(readOnly = true)`는 있지만, `DropProductInfoResponse.of()` 안에서 `drop.getPickUpAvailableDate()`를 그냥 필드 대입만 하고 `.size()`/순회 등으로 실제 초기화를 유발하지 않아서 트랜잭션 안에서도 여전히 "미초기화" 상태로 DTO에 담김.
  - → **`@Transactional` 유무와 별개로, "지연 컬렉션을 세션 안에서 실제로 강제 로딩하지 않고 그대로 DTO에 흘려보내는" 게 공통 원인.**
- **적용한 수정 (로컬 전용):**

  `DropService.java`:
  ```java
  // getDropProductInfo에 @Transactional 추가 + 컬렉션 복사
  @Transactional(readOnly = true)
  public DropProductInfo getDropProductInfo(Long dropId) {
      Drop findDrop = findDrop(dropId);
      DropInventory dropInventory = dropInventoryRepository.findByDropId(dropId);
      return DropProductInfo.of(..., new HashSet<>(findDrop.getPickUpAvailableDate()));
  }
  ```

  `DropProductInfoResponse.java` (`getMyDrops`/`updateDropProduct`/`registerDropProduct`가 공유하는 정적 팩토리라 여기 한 곳만 고치면 전부 적용됨):
  ```java
  public static DropProductInfoResponse of(Drop drop, DropInventory inventory) {
      return new DropProductInfoResponse(
              drop.getDropProduct().getName(),
              drop.getDropProduct().getDescription(),
              drop.getDropProduct().getImageUrl(),
              new HashSet<>(drop.getPickUpAvailableDate()), // ← 참조 대신 복사
              ...
      );
  }
  ```

### 2. `POST /drops/{id}/confirm-entry` — 500 (동일한 LazyInitializationException)

- **발견일:** 2026-07-28 (1번 수정 후 브라우저로 대기열→입장확정 플로우 재검증하다 발견)
- **증상:** 위와 동일한 스택트레이스, 이번엔 `ConfirmEntryResponse["pickupDates"]` 직렬화 중 발생.
- **원인:** `DropEnterService.confirmEntry`는 `@Transactional`이 있지만, `ConfirmEntryResponse.of(..., findDrop.getPickUpAvailableDate())` 호출도 1번과 똑같이 참조만 넘겨서 같은 문제가 재현됨.
- **적용한 수정 (로컬 전용):**

  `ConfirmEntryResponse.java`:
  ```java
  public static ConfirmEntryResponse of(DropProduct dropProduct, int limitQuantity, int remainQuantity, Set<LocalDate> pickupDates){
      return new ConfirmEntryResponse(
              dropProduct.getName(), dropProduct.getDescription(),
              dropProduct.getImageUrl(), dropProduct.getPrice(), limitQuantity, remainQuantity,
              new HashSet<>(pickupDates) // ← 참조 대신 복사
      );
  }
  ```
- **⚠️ 참고:** `Drop.pickUpAvailableDate`를 참조하는 다른 DTO/서비스 메서드가 더 있다면 같은 패턴을 의심해볼 것 — 증상은 항상 "이유 없이 500" 또는 (프론트에서 결과를 못 받았을 때) "화면이 조용히 빈 화면으로 보임".

### 3. `drop_entries` 테이블 CHECK 제약이 `EntryStatus` enum과 어긋남 (DB 스키마 드리프트)

- **발견일:** 2026-07-28 (2번 수정 후 confirm-entry 재시도하다 발견)
- **증상:** `POST /drops/{id}/confirm-entry`가 500. 로그에 SQL 예외.
- **서버 로그:**
  ```
  org.postgresql.util.PSQLException: ERROR: new row for relation "drop_entries" violates check constraint "drop_entries_entry_status_check"
  Detail: Failing row contains (1, 1, ENTERED, 2026-07-28 20:58:31.775768, 21).
  ```
- **원인:** DB의 `drop_entries_entry_status_check` 제약이 `['ENTRY', 'RESERVED', 'COMPLETED']`만 허용하는데, 실제 `EntryStatus` 자바 enum(`drop/domain/EntryStatus.java`)은 `ENTERED, RESERVED, COMPLETED, FAILED, CANCELLED`입니다(철자도 `ENTRY`→`ENTERED`로 다름, `FAILED`/`CANCELLED`도 누락). `ddl-auto: update`는 기존 컬럼의 CHECK 제약을 자동으로 갱신하지 않는 게 원인으로 보입니다 — enum이 예전엔 `ENTRY` 3개짜리였다가 이후 `ENTERED`/`FAILED`/`CANCELLED` 포함하는 5개짜리로 바뀌었는데, 로컬 DB는 최초 생성 시점 스키마 그대로 남아있던 것으로 추정.
- **적용한 수정 (로컬 DB 직접 ALTER, 마이그레이션 파일은 찾지 못함 — 있다면 그쪽도 확인 필요):**
  ```sql
  ALTER TABLE drop_entries DROP CONSTRAINT drop_entries_entry_status_check;
  ALTER TABLE drop_entries ADD CONSTRAINT drop_entries_entry_status_check
    CHECK (entry_status::text = ANY (ARRAY['ENTERED','RESERVED','COMPLETED','FAILED','CANCELLED']::text[]));
  ```
- **⚠️ 참고:** 이건 코드 버그가 아니라 로컬 DB에만 있는 스키마 드리프트라, 다른 팀원의 로컬 DB나 배포 환경에도 같은 문제가 있는지 확인이 필요합니다. Flyway/Liquibase 같은 정식 마이그레이션 도구가 없어서(`ddl-auto: update` 사용 중) 이런 드리프트가 재발할 수 있음 — 다른 enum 컬럼들(order_state, application_status 등)도 같은 문제가 있는지 점검해볼 가치가 있습니다.

---

## 문서-실제 동작 불일치 (버그는 아니지만 `docs/drop-api.md` 수정 필요)

### 4. `GET /drops/{id}/info`, `GET /drops/today/drop` 인증 요구사항

- 문서: "인증 없이 누구나 조회 가능한 공개 API입니다."
- 실제: 토큰 없이 호출하면 `403`. 토큰이 있어야 정상 동작.
- 프론트는 이미 실제 동작에 맞춰 구현함(항상 토큰을 실어 보냄).

### 5. `GET /drops/{id}/info` 응답 래퍼 형태

- 문서: "응답이 `ApiResponse` 래퍼 없이 이 객체 그대로 옵니다 — `{"success": true, "data": {...}}`가 아니라 아래 필드가 최상위에 바로 온다는 뜻입니다."
- 실제: 다른 API와 동일하게 `{"success": true, "data": {...}}` 래퍼가 있음.
- **영향:** 프론트가 처음에 이 문서를 믿고 래퍼 없는 파싱으로 구현했다가, 모든 필드가 `undefined`가 되면서 홈/드롭상세 화면이 **에러 메시지 하나 없이 조용히 빈 화면**으로 보이는 버그로 이어졌습니다(콘솔 에러도 없고 API 응답도 200이라 원인 파악에 시간이 걸림). 지금은 일반 파싱으로 고쳤습니다.

### 6. 드롭 등록 "하루 1개 제한"이 판매자별이 아니라 플랫폼 전체 기준으로 동작함

- **발견일:** 2026-07-28 (M6 브라우저 e2e 테스트 중 — seller01로 로그인해 2026-08-05에 드롭을 등록하려는데 `DR004`가 남. seller01은 그 날짜에 드롭이 없는데도 충돌이 나서 코드를 확인함. `DevSellerDropSeeder`가 seller08의 시드 드롭을 정확히 2026-08-05로 심어놨었음 — seller01과 무관한 다른 판매자의 드롭 때문에 막힌 것)
- **관련 도메인:** drop (`docs/drop-api.md`, `docs/drop-api-2.md`)
- **코드:** `DropService.java:86-100` (`validateOneDropPerDay`)
  ```java
  private void validateOneDropPerDay(Long sellerId, LocalDateTime dropStart) {
      ...
      // 91: 먼저 하루에 드롭은 한 번으로 제한되므로 먼저 검증
      if (dropRepository.existsByDropStartBetween(startOfDay, endOfDay)) {      // 판매자 무관 — 전역 검사
          throw new BusinessException(ErrorCode.DUPLICATE_DROP_DATE);
      }

      // 96: (확장성을 고려한 판매자 드롭 등록 제한 / 추후 하루에 드롭이 여러 개일 경우)
      if (dropRepository.existsBySellerIdAndDropStartBetween(sellerId, startOfDay, endOfDay)) {  // 판매자별 검사
          throw new BusinessException(ErrorCode.DUPLICATE_DROP_DATE);
      }
  }
  ```
  수정(`PATCH`)용 `validateOneDropPerDayExcludingSelf`(104-116번 줄)도 동일한 구조.
- **증상:** 91번 줄의 전역 검사(`existsByDropStartBetween`, sellerId 없음)가 먼저 걸려서, **판매자 A가 특정 날짜에 등록하려 할 때 그 날짜에 판매자 B의 드롭이 이미 있어도 `DR004`로 막힙니다.** 96번 줄의 판매자별 검사(`existsBySellerIdAndDropStartBetween`)는 91번이 통과해야만 도달 가능한데, 91번이 통과했다는 건 이미 "그날 어떤 판매자의 드롭도 없다"는 뜻이라 96번은 현재 시점엔 도달할 수 없는 죽은 코드입니다.
- **코드에 남은 의도 추정:** 96번 줄 주석("확장성을 고려한 판매자 드롭 등록 제한 / **추후** 하루에 드롭이 여러 개일 경우")을 보면, 원래 의도는 "판매자당 하루 1개"이고 91번의 전역 검사는 "현재는 플랫폼 전체에서도 하루 1개만 허용"하는 별개의 임시 제약으로 보입니다. 다만 이게 의도적인 임시 정책인지, 91번 줄을 지워야 하는데 못 지운 실수인지는 코드만으로는 판단이 안 됩니다.
- **영향:** 프론트(홈 화면 "오늘의 드롭" 단일 카드, `GET /drops/today/drop`)는 이 전역 제약을 전제로 만들어져 있어서 지금 동작은 자연스럽게 맞물립니다. 다만 "판매자당 하루 1개"가 진짜 의도라면, 홈 화면이 여러 판매자의 드롭 중 하나만 보여주는 지금 UX(`/drops/today/drop`이 Long 하나만 반환)도 함께 재설계가 필요합니다 — 리스트 API로 바꿔야 함.
- **확인 요청:** 91번 줄(플랫폼 전체 제한)이 의도된 정책인지, 아니면 96번 줄(판매자별 제한)만 남기고 91번은 제거해야 하는지 백엔드팀 확인 필요.

---

## 해결됨

(아직 없음)
