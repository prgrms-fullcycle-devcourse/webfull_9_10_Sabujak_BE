# 사부작 API v3 명세서

사부작 백엔드의 MVP 기준 REST API 명세입니다.

- Base URL: `/api/v3`
- Content-Type: `application/json`
- 시간 타입: UTC ISO 8601 문자열
- 내부 PK: ULID
- 사용자 노출 식별자: `slugId`
- 외부 입력(`body`, `query`, `params`)은 모두 Zod로 검증합니다.

## 1. 도메인 규칙

### 1.1 Capsule 상태 규칙

- 캡슐은 생성 시 `openAt`을 기준으로 `expiresAt = openAt + 7일`로 저장합니다.
- `openAt`이 수정되면 `expiresAt`도 같은 규칙으로 함께 재계산합니다.
- `updatedAt` 필드는 캡슐 정보의 수정뿐만 아니라, 새로운 메시지 수신 시에도 갱신되는 '최근 활동 시각'을 의미합니다.
- `expiresAt`이 지난 캡슐은 만료 상태로 간주하며, 열람 및 작성 정책은 아래 엔드포인트 규칙을 따릅니다.
- 캡슐 삭제는 Hard Delete로 처리합니다.

### 1.2 Slug 예약 규칙

- 슬러그 확인 버튼은 예약 생성 API 하나만 사용합니다.
- 슬러그 선점은 상태를 변경하는 동작이므로 `GET`이 아니라 `POST`를 사용합니다.
- `POST /capsules/slug-reservations` 요청 안에서 중복 확인과 5분 예약 생성을 함께 처리합니다.
- 서버는 DB의 기존 `slugId` 사용 여부와 Redis 활성 예약을 모두 확인한 뒤, 사용 가능할 때만 Redis `SET NX EX 300`으로 선점합니다.
- 발급/저장되는 `reservationToken`은 사용자 인증(로그인 등)과 무관한, **슬러그 선점 소유권 확인용 임시(익명) 토큰**입니다.
- TTL 내에서만 유효하며, 만료되면 다시 선점 요청이 필요합니다.
- `reservationToken`은 이후 `POST /capsules` 요청에서 필수로 제출해야 합니다. (누락 시 `400 INVALID_INPUT`으로 즉시 거절)
- 생성 요청자는 `slugId`와 `reservationToken`의 조합으로 선점 소유권을 증명합니다.
- DB의 `slugId` unique constraint는 동시성 문제 등 만일의 예외 상황에 대비한 최후의 방어선으로만 사용합니다.

### 1.3 메시지 조회 정책

- MVP 단계에서는 메시지 목록 조회 시 페이지네이션을 적용하지 않습니다.
- 대신 캡슐당 메시지 최대 개수를 `300`건으로 제한합니다.
- 메시지 수 상한에 도달하면 원칙적으로 추가 작성을 거절합니다. (단, 동시 요청 시 301~302건 등 낙관적 예외 허용)
- MVP 이후 `cursor` 기반 페이지네이션을 도입할 예정입니다.

### 1.4 메시지 작성 규칙

- 같은 캡슐 내에서는 닉네임 중복을 허용하지 않습니다.
- 닉네임은 trim 이후 `1~20자`여야 합니다.
- 편지 내용은 trim 이후 `1~1000자`여야 합니다.
- 닉네임 중복 검사는 저장 기준값으로 비교하며, 중복 시 `"중복된 닉네임입니다"` 메시지와 함께 오류를 반환합니다.

## 2. 엔드포인트 목록

| 도메인  | 기능                 | 메서드   | URI                           | 설명                            |
| ------- | -------------------- | -------- | ----------------------------- | ------------------------------- |
| System  | 헬스체크             | `GET`    | `/health`                     | 서버 상태 확인                  |
| Capsule | 슬러그 예약 생성     | `POST`   | `/capsules/slug-reservations` | 중복 확인 후 5분 예약 토큰 발급 |
| Capsule | 캡슐 생성            | `POST`   | `/capsules`                   | 신규 타임캡슐 생성              |
| Capsule | 캡슐 기본 정보 조회  | `GET`    | `/capsules/{slugId}`          | 대기 화면 및 공개 상태 조회     |
| Capsule | 관리자 비밀번호 확인 | `POST`   | `/capsules/{slugId}/verify`   | 수정/삭제 진입용 비밀번호 검증  |
| Capsule | 캡슐 수정            | `PATCH`  | `/capsules/{slugId}`          | 비밀번호 검증 후 수정           |
| Capsule | 캡슐 삭제            | `DELETE` | `/capsules/{slugId}`          | 비밀번호 검증 후 Hard Delete    |
| Message | 메시지 작성          | `POST`   | `/capsules/{slugId}/messages` | 익명 메시지 작성                |
| Message | 메시지 목록 조회     | `GET`    | `/capsules/{slugId}/messages` | MVP에서는 전체 조회             |

## 3. 엔드포인트 상세

### 3.1 헬스체크

`GET /health`

Response `200 OK`

```json
{
  "ok": true
}
```

### 3.2 슬러그 예약 생성

`POST /capsules/slug-reservations`

Request Body

```json
{
  "slugId": "our-graduation-2025"
}
```

Response `201 Created`

```json
{
  "slugId": "our-graduation-2025",
  "reservationToken": "01HQX7Y8J6R8J2E5W4C2R9A1BC",
  "reservedUntil": "2026-03-18T02:10:21.000Z"
}
```

규칙:

- 클라이언트의 "중복 확인" 버튼은 이 API 하나만 호출합니다.
- 서버는 요청을 받으면 다음 순서로 처리합니다.
- `slugId` 형식 검증
- DB에서 기존 캡슐 `slugId` 중복 여부 확인
- Redis에서 활성 예약 여부 확인
- 사용 가능하면 Redis key `capsule:slug-reservation:{slugId}`에 `SET NX EX 300`으로 선점
- Redis value에는 예약 소유권 검증용 임시 토큰(`reservationToken`)을 저장합니다.
- 이미 사용 중인 `slugId`이면 `409 SLUG_ALREADY_IN_USE`
- 다른 사용자가 예약 중이면 `409 SLUG_RESERVED`

### 3.3 캡슐 생성

`POST /capsules`

Request Body

```json
{
  "slugId": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "password": "plain-text-password",
  "openAt": "2025-12-25T12:00:00.000Z",
  "reservationToken": "01HQX7Y8J6R8J2E5W4C2R9A1BC"
}
```

Response `201 Created`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slugId": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-03-18T02:05:21.000Z"
}
```

규칙:

- 응답의 `updatedAt` 필드는 캡슐 정보 수정 및 신규 메시지 수신 내역이 모두 반영된 '최근 활동 시각'을 의미합니다. (생성 시에는 `createdAt`과 동일)
- `title`은 trim 이후 `1~100자`여야 합니다.
- `password`는 `8~64자`이며 공백이 불가합니다. 이 값은 캡슐 관리자 비밀번호 원문 값으로, 저장 전 bcrypt hash 처리합니다.
- `reservationToken`은 필수(Required)입니다. 누락 시 `400 INVALID_INPUT`을 반환합니다.
- `reservationToken`이 Redis 예약 정보와 일치해야 합니다.
- 예약 토큰이 만료되었거나, 정보 불일치로 예약 검증에 실패하면 `409 SLUG_RESERVATION_MISMATCH`를 반환합니다.
- 최종 저장 시 `slugId` unique constraint 충돌이 발생하면 `409 SLUG_ALREADY_IN_USE`를 반환합니다.

### 3.4 캡슐 기본 정보 조회

`GET /capsules/{slugId}`

Response `200 OK`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slugId": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-03-18T02:05:21.000Z",
  "isOpen": false,
  "messageCount": 12
}
```

규칙:

- 만료 상태이면 `410 CAPSULE_EXPIRED`
- 응답의 `updatedAt` 필드는 캡슐 정보 수정 및 신규 메시지 수신 내역이 반영된 '최근 활동 시각'을 의미합니다.

### 3.5 관리자 비밀번호 확인

`POST /capsules/{slugId}/verify`

Request Body

```json
{
  "password": "plain-text-password"
}
```

Response `200 OK`

```json
{
  "verified": true
}
```

규칙:

- `password`는 `8~64자`이며 공백이 불가합니다. (캡슐 관리자 비밀번호 원문 입력값)
- 비밀번호 불일치 시 `403 FORBIDDEN_PASSWORD`
- 동일 IP 또는 동일 `slugId`에 대한 연속 실패는 rate limit 대상입니다.

### 3.6 캡슐 수정

`PATCH /capsules/{slugId}`

Request Body

```json
{
  "password": "plain-text-password",
  "title": "수정된 졸업 축하 방",
  "openAt": "2025-12-25T12:00:00.000Z"
}
```

Response `200 OK`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slugId": "our-graduation-2025",
  "title": "수정된 졸업 축하 방",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

규칙:

- `password`는 필수입니다. (`8~64자`, 공백 불가 원문 입력값)
- 수정 가능한 필드는 `title`(trim 이후 `1~100자`), `openAt`입니다.
- `openAt`이 변경되면 `expiresAt`도 즉시 재계산합니다.
- 캡슐 내용이 수정되면 '최근 활동 시각'을 의미하는 `updatedAt`이 갱신됩니다.
- 이미 만료된 캡슐은 수정할 수 없습니다.
- 공개 여부와 무관하게 수정 허용 여부는 운영 정책으로 고정해야 하며, MVP에서는 `openAt` 이전까지만 수정 가능으로 정의합니다.

### 3.7 캡슐 삭제

`DELETE /capsules/{slugId}`

Request Body

```json
{
  "password": "plain-text-password"
}
```

Response `200 OK`

```json
{
  "deleted": true
}
```

규칙:

- `password`는 `8~64자`이며 공백이 불가합니다. (캡슐 관리자 비밀번호 원문 입력값)
- Hard Delete로 처리합니다.
- 캡슐 삭제 시 연관 메시지는 함께 삭제됩니다.

### 3.8 메시지 작성

`POST /capsules/{slugId}/messages`

Request Body

```json
{
  "nickname": "익명의 멘토",
  "content": "졸업을 진심으로 축하합니다!"
}
```

Response `201 Created`

```json
{
  "id": 1,
  "nickname": "익명의 멘토",
  "content": "졸업을 진심으로 축하합니다!",
  "createdAt": "2025-12-24T15:30:00.000Z"
}
```

규칙:

- 존재하지 않거나 이미 삭제된 캡슐에는 작성할 수 없습니다.
- `nickname`은 trim 이후 `1~20자`여야 합니다.
- `content`는 trim 이후 `1~1000자`여야 합니다.
- 같은 캡슐 내에서 이미 사용 중인 `nickname`이면 `409 DUPLICATE_NICKNAME`
- 중복 닉네임 오류 메시지는 `"중복된 닉네임입니다"`를 반환합니다.
- 메시지 수가 `300`건에 도달하면 원칙상 `409 MESSAGE_LIMIT_EXCEEDED`를 반환합니다. (구현 메모의 낙관적 동시성 예외 정책 참고)
- **메시지 작성 성공 시 연관된 캡슐의 `updatedAt` 필드를 갱신하여 방의 최신 활동(최신 메시지 수신) 상태를 반영합니다.**

### 3.9 메시지 목록 조회

`GET /capsules/{slugId}/messages`

설명:

- MVP 단계에서는 페이지네이션 없이 전체 메시지를 반환합니다. (추후 확장을 고려하여 비페이지네이션이라도 id 기준 정렬을 사용합니다.)
- 운영 안정성을 위해 캡슐당 메시지 수는 최대 `300`건입니다.
- 정렬 기준은 `id ASC`입니다.
- 캡슐 공개 전에는 `content`를 마스킹해서 반환합니다.

Response `200 OK`

```json
{
  "data": [
    {
      "id": 1,
      "nickname": "익명의 멘토",
      "content": "아직 열어볼 수 없는 편지입니다.",
      "createdAt": "2025-12-24T15:30:00.000Z"
    },
    {
      "id": 2,
      "nickname": "동기 A",
      "content": "아직 열어볼 수 없는 편지입니다.",
      "createdAt": "2025-12-24T16:00:00.000Z"
    }
  ],
  "meta": {
    "totalCount": 2,
    "pagination": "none-mvp"
  }
}
```

공개 이후 Response 예시

```json
{
  "data": [
    {
      "id": 1,
      "nickname": "익명의 멘토",
      "content": "졸업을 진심으로 축하합니다!",
      "createdAt": "2025-12-24T15:30:00.000Z"
    }
  ],
  "meta": {
    "totalCount": 1,
    "pagination": "none-mvp"
  }
}
```

## 4. 공통 에러 규격

에러 응답 형식

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "요청 값을 확인해 주세요."
  }
}
```

| 상태 코드 | 에러 코드                   | 설명                                |
| --------- | --------------------------- | ----------------------------------- |
| `400`     | `INVALID_INPUT`             | Zod 검증 실패                       |
| `403`     | `FORBIDDEN_PASSWORD`        | 비밀번호 불일치                     |
| `404`     | `CAPSULE_NOT_FOUND`         | 존재하지 않는 `slugId`              |
| `409`     | `SLUG_ALREADY_IN_USE`       | DB에 이미 존재하는 `slugId`         |
| `409`     | `SLUG_RESERVED`             | 다른 사용자가 `slugId` 예약 중      |
| `409`     | `SLUG_RESERVATION_MISMATCH` | 예약 토큰이 없거나 소유권 검증 실패 |
| `409`     | `DUPLICATE_NICKNAME`        | 같은 캡슐 내 닉네임 중복            |
| `409`     | `MESSAGE_LIMIT_EXCEEDED`    | 캡슐당 최대 메시지 수 초과          |
| `410`     | `CAPSULE_EXPIRED`           | `expiresAt` 경과                    |
| `429`     | `TOO_MANY_REQUESTS`         | 비밀번호 검증 또는 반복 요청 제한   |

## 5. 구현 메모

- 비밀번호 검증, 수정, 삭제 API는 `catchAsync` 래퍼 또는 동등한 방식으로 비동기 에러를 누락 없이 처리합니다.
- 슬러그 선점 API에서 DB 중복 검사와 Redis 예약 확인을 함께 수행하는 설계는, 버튼이 하나인 현재 UX와 잘 맞습니다.
- Redis 예약과 DB insert 사이에는 race condition이 있을 수 있으므로, DB unique constraint를 최종 방어선으로 둡니다.
- 캡슐 당 최대 300건의 메시지 수 제한은 애플리케이션 레벨 비즈니스 정책입니다. 따라서, 많은 사용자가 동시에 메시지를 작성할 때 발생하는 동시성 충돌(`race condition`)로 인해 `301~302` 건 수준으로 소폭 허용되는 부분은 낙관적으로 허용합니다. 엄격하게 트랜잭션 락을 걸지 않습니다.
- DB 내부 오류와 쿼리 상세는 클라이언트에 노출하지 않습니다.
