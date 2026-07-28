# 백엔드 API 요청 목록

프론트엔드를 개발하면서 필요한데 백엔드에 아직 없는 API를 여기에 기록합니다. 각 항목은 프론트가 필요에 의해 제안하는 스펙이며, 실제 구현 형태는 백엔드팀 판단에 따라 달라질 수 있습니다.

백엔드에 구현되면 이 목록에서 해당 항목을 "해결됨"으로 옮기고, 실제 스펙을 해당 도메인 문서(`docs/*-api.md`)에 정식으로 반영·동기화합니다.

---

## 미해결

### 1. 내 판매자 신청 조회

- **요청일:** 2026-07-28
- **관련 도메인:** seller (`docs/seller-api.md`)
- **배경:** 입점 신청(`POST /sellers/apply`) 성공 응답에 `sellerId`가 오긴 하지만, 그 값을 어딘가에 저장해두지 않으면(다른 기기/브라우저로 접속, 로컬 저장값 삭제 등) 프론트가 "이 회원이 이미 신청했는지, 신청했다면 sellerId가 몇인지"를 알아낼 방법이 없습니다. `GET /sellers/{id}`는 sellerId를 이미 알아야만 호출 가능한 공개 조회 API라 이 문제를 풀지 못합니다. 지금 프론트는 신청 성공 시점에만 `sellerId`를 로컬스토리지에 memberId별로 저장해두는 임시방편(`lib/seller/seller-storage.ts`)으로 우회하고 있습니다 — 신청을 처리한 바로 그 브라우저에서만 대시보드가 정상 동작하는 근본적 한계가 있습니다.
- **요청:** 로그인한 회원 본인의 판매자 신청 정보를 memberId 기준으로 조회하는 인증 API.
- **호출 시점(예상):** 판매자 대시보드 진입 시.
- **통신 기본 규격(제안):**
    - **Method:** `GET`
    - **Path:** `/api/v1/sellers/me`
    - Header: `Authorization` Bearer 토큰 (토큰의 memberId로 본인 Seller를 조회)

**요청 명세(제안)**

| 구분 | 필드명 | 타입 | 필수 | 설명 |
| --- | --- | --- | --- | --- |
| Header | `Authorization` | String | Y | Bearer 토큰 |

**응답 명세(제안)**

- `200 OK` — `GET /sellers/{id}`와 동일한 필드에 `rejectReason`을 추가. `GET /sellers/{id}`는 공개 API라 반려 사유를 의도적으로 뺐지만, 이건 본인 조회이므로 노출해도 됩니다.

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

**에러 처리(제안)**

| HTTP Status | 코드 | 메시지 | 발생 시나리오 |
| --- | --- | --- | --- |
| 401 | ME002 | 유효하지 않은 인증 토큰입니다. | 토큰 만료/서명 오류 |
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

**해결되면 프론트에서 할 일**

- `lib/seller/seller-storage.ts`(로컬스토리지로 sellerId를 추적하던 워크어라운드) 제거하고 `GET /sellers/me` 단일 호출로 대체.
- `app/seller/dashboard`가 이 API로 직접 조회하도록 교체(현재의 memberId 일치 방어 로직도 함께 정리 가능).
- `app/seller/register` 진입 시에도 이 API로 기존 신청 여부를 먼저 확인해서, 폼을 다 채운 뒤 서버가 `SE005`(이미 신청 완료)로 거부하는 대신 진입 시점에 바로 대시보드로 돌려보낼 수 있게 됨.

---

## 해결됨

(아직 없음)
