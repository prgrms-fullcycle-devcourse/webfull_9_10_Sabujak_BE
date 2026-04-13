# 사부작 API v3 명세서

사부작 백엔드의 MVP 기준 REST API 명세입니다.

- Base URL: `/api/v3`
- 기본 Content-Type: `application/json` (`/healthCheck` 제외)
- 시간 타입: UTC ISO 8601 문자열
- 내부 PK: ULID
- 사용자 노출 식별자: `slug`
- 외부 입력(`body`, `query`, `params`)은 모두 Zod로 검증합니다.

## 1. 도메인 규칙

### 1.1 Capsule 상태 규칙

- 캡슐은 생성 시 `openAt`을 기준으로 `expiresAt = openAt + 7일`로 저장합니다.
- `openAt`이 수정되면 `expiresAt`도 같은 규칙으로 함께 재계산합니다.
- `updatedAt` 필드는 캡슐 정보의 수정뿐만 아니라, 새로운 메시지 수신 시에도 갱신되는 '최근 활동 시각'을 의미합니다.
- `version` 필드는 캡슐 메타데이터 수정 시마다 1씩 증가하며, 수정 충돌 감지에 사용합니다.
- `expiresAt`이 지난 캡슐은 만료 상태로 간주하며, 열람 및 작성 정책은 아래 엔드포인트 규칙을 따릅니다.
- 캡슐 삭제는 Hard Delete로 처리합니다.

### 1.2 공통 입력 검증 규칙 (Zod 기준)

- `slug`
  - 적용 위치: `POST /capsules/slug-reservations` body, `POST /capsules` body, `GET/PATCH/DELETE /capsules/{slug}` path, `POST /capsules/{slug}/verify` path, `POST /capsules/{slug}/messages` path
  - 조건: `string`, trim 이후 `1~50자`, 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`
  - 의미: 소문자 영문, 숫자, 단일 하이픈(`-`)만 허용하며 시작/끝 하이픈 및 연속 하이픈은 허용하지 않습니다.
- `title`
  - 적용 위치: `POST /capsules`, `PATCH /capsules/{slug}` body
  - 조건: `string`, trim 이후 `1~100자`
- `password`
  - 적용 위치: `POST /capsules`, `POST /capsules/{slug}/verify`, `PATCH /capsules/{slug}`, `DELETE /capsules/{slug}` body
  - 조건: `string`, 정규식 `^\d{4}$`
  - 의미: 숫자 `4자리`만 허용합니다.
- `openAt`
  - 적용 위치: `POST /capsules`, `PATCH /capsules/{slug}` body
  - 조건: `string`, Zod `datetime()` 기준의 UTC ISO 8601 일시 문자열
- `version`
  - 적용 위치: `PATCH /capsules/{slug}` body, `GET /capsules/{slug}` response, `POST /capsules`/`PATCH /capsules/{slug}` success response
  - 조건: `number`, `int`, `1 이상`
  - 의미: 캡슐 메타데이터 수정 충돌 감지를 위한 optimistic locking 버전입니다.
- `reservationToken`
  - 적용 위치: `POST /capsules` body
  - 조건: `string`
  - 비고: Zod 레벨에서는 필수 문자열까지만 검증하며, 길이/패턴 제약은 없습니다.
- `reservationSessionToken`
  - 적용 위치: `POST /capsules/slug-reservations` body, `POST /capsules` body
  - 조건: `string`
  - 비고: 선택값이며, 같은 생성 흐름에서 선점한 후보 slug를 묶는 세션 식별자로 사용합니다.
- `nickname`
  - 적용 위치: `POST /capsules/{slug}/messages` body
  - 조건: `string`, trim 이후 `1~20자`
- `content`
  - 적용 위치: `POST /capsules/{slug}/messages` body
  - 조건: `string`, trim 이후 `1~1000자`

### 1.3 Slug 예약 규칙

- 슬러그 확인 버튼은 예약 생성 API 하나만 사용합니다.
- 슬러그 선점은 상태를 변경하는 동작이므로 `GET`이 아니라 `POST`를 사용합니다.
- `POST /capsules/slug-reservations` 요청 안에서 중복 확인과 5분 예약 생성을 함께 처리합니다.
- 서버는 DB의 기존 `slug` 사용 여부와 Redis 활성 예약을 모두 확인한 뒤, 사용 가능할 때만 Redis `SET NX EX 300`으로 선점합니다.
- 발급/저장되는 `reservationToken`은 사용자 인증(로그인 등)과 무관한, **슬러그 선점 소유권 확인용 임시(익명) 토큰**입니다.
- 발급/저장되는 `reservationSessionToken`은 같은 생성 흐름에서 확인한 후보 slug들을 하나의 그룹으로 묶기 위한 임시 세션 토큰입니다.
- TTL 내에서만 유효하며, 만료되면 다시 선점 요청이 필요합니다.
- `reservationToken`은 이후 `POST /capsules` 요청에서 필수로 제출해야 합니다. (누락 시 `400 INVALID_INPUT`으로 즉시 거절)
- 생성 요청자는 `slug`와 `reservationToken`의 조합으로 선점 소유권을 증명합니다.
- DB의 `slug` unique constraint는 동시성 문제 등 만일의 예외 상황에 대비한 최후의 방어선으로만 사용합니다.

### 1.4 공개 전/후 조회 정책

- 같은 캡슐 URL에 진입했을 때, `openAt` 이전이면 기본 정보 화면을 보여주고 `openAt` 이후이면 메시지 화면을 보여줍니다.
- API 기준 메인 조회 엔드포인트는 `GET /capsules/{slug}` 하나로 정의합니다.
- `openAt` 이전에는 캡슐 기본 정보만 반환하고 메시지 목록은 반환하지 않습니다.
- `openAt` 이후에는 같은 응답에 메시지 목록 배열을 포함하여 반환합니다.

### 1.5 메시지 조회 정책

- MVP 문서 범위에서 메시지 목록에 대한 페이지네이션은 미적용입니다.
- 메시지 목록은 별도 `meta` 없이 단순 배열로 반환합니다.
- 캡슐당 메시지 최대 개수를 `300`건으로 제한합니다.
- 메시지 수 상한에 도달하면 원칙적으로 추가 작성을 거절합니다. (단, 동시 요청 시 301~302건 등 낙관적 예외 허용)
- 메시지 목록은 `id ASC` 순으로 정렬합니다.

### 1.6 메시지 작성 규칙

- 같은 캡슐 내에서는 닉네임 중복을 허용하지 않습니다.
- 닉네임은 trim 이후 `1~20자`여야 합니다.
- 편지 내용은 trim 이후 `1~1000자`여야 합니다.
- 닉네임 중복 검사는 저장 기준값으로 비교하며, 중복 시 `"중복된 닉네임입니다"` 메시지와 함께 오류를 반환합니다.

## 2. 엔드포인트 목록

| 도메인  | 기능                    | 메서드   | URI                                     | 설명                            |
| ------- | ----------------------- | -------- | --------------------------------------- | ------------------------------- |
| System  | 헬스체크❤️              | `GET`    | `/healthCheck`                          | 서버 상태 확인                  |
| Capsule | 슬러그 예약 생성❤️      | `POST`   | `/capsules/slug-reservations`           | 중복 확인 후 5분 예약 토큰 발급 |
| Capsule | 캡슐 생성❤️             | `POST`   | `/capsules`                             | 신규 타임캡슐 생성              |
| Capsule | 캡슐 조회❤️             | `GET`    | `/capsules/{slug}`                      | 공개 전/후 화면용 통합 조회     |
| Capsule | messageCount SSE 구독❤️ | `GET`    | `/capsules/{slug}/message-count/stream` | messageCount 실시간 구독        |
| Capsule | 관리자 비밀번호 확인❤️  | `POST`   | `/capsules/{slug}/verify`               | 수정/삭제 진입용 비밀번호 검증  |
| Capsule | 캡슐 수정❤️             | `PATCH`  | `/capsules/{slug}`                      | 비밀번호 검증 후 수정           |
| Capsule | 캡슐 삭제❤️             | `DELETE` | `/capsules/{slug}`                      | 비밀번호 검증 후 Hard Delete    |
| Message | 메시지 작성❤️           | `POST`   | `/capsules/{slug}/messages`             | 익명 메시지 작성                |

## 3. 엔드포인트 상세

### 3.1 헬스체크❤️

`GET /healthCheck`

Response `200 OK` (`text/plain`)

```text
healthCheck: OK
```

Response `500 Internal Server Error` (`text/plain`)

```text
healthCheck: false
```

### 3.2 슬러그 예약 생성❤️

`POST /capsules/slug-reservations`

Request Body

```json
{
  "slug": "our-graduation-2025",
  "reservationSessionToken": "01HQX7Y8J6R8J2E5W4C2R9A1ZZ"
}
```

Response `201 Created`

```json
{
  "slug": "our-graduation-2025",
  "reservationToken": "01HQX7Y8J6R8J2E5W4C2R9A1BC",
  "reservationSessionToken": "01HQX7Y8J6R8J2E5W4C2R9A1ZZ",
  "reservedUntil": "2026-03-18T02:10:21.000Z"
}
```

규칙:

- 클라이언트의 "중복 확인" 버튼은 이 API 하나만 호출합니다.
- 서버는 요청을 받으면 다음 순서로 처리합니다.
- `slug`는 필수이며 trim 이후 `1~50자`여야 합니다.
- `slug`는 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`를 만족해야 합니다.
- `reservationSessionToken`은 선택값이며, 같은 생성 흐름에서 다른 후보 slug를 계속 확인할 때 이전 응답값을 다시 보냅니다.
- DB에서 기존 캡슐 `slug` 중복 여부 확인
- Redis에서 활성 예약 여부 확인
- 사용 가능하면 Redis key `capsule:slug-reservation:{slug}`에 `SET NX EX 300`으로 선점
- Redis value에는 예약 소유권 검증용 임시 토큰(`reservationToken`)과 생성 흐름 식별용 `reservationSessionToken`을 함께 저장합니다.
- 세션 key에는 같은 생성 흐름에서 선점한 후보 slug 목록을 저장합니다.
- 이미 사용 중이거나 현재 예약 중인 `slug`이면 `409 SLUG_ALREADY_IN_USE`

### 3.3 캡슐 생성❤️

`POST /capsules`

Request Body

```json
{
  "slug": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "password": "1234",
  "openAt": "2025-12-25T12:00:00.000Z",
  "reservationToken": "01HQX7Y8J6R8J2E5W4C2R9A1BC",
  "reservationSessionToken": "01HQX7Y8J6R8J2E5W4C2R9A1ZZ"
}
```

Response `201 Created`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slug": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "version": 1,
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-03-18T02:05:21.000Z"
}
```

규칙:

- 응답의 `updatedAt` 필드는 캡슐 정보 수정 및 신규 메시지 수신 내역이 모두 반영된 '최근 활동 시각'을 의미합니다. (생성 시에는 `createdAt`과 동일)
- 응답의 `version` 필드는 최초 생성 시 `1`로 시작합니다.
- `slug`는 필수이며 trim 이후 `1~50자`여야 합니다.
- `slug`는 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`를 만족해야 합니다.
- `title`은 trim 이후 `1~100자`여야 합니다.
- `password`는 숫자 `4자리`여야 합니다. 이 값은 캡슐 관리자 비밀번호 원문 값으로, 저장 전 hash 처리합니다.
- `openAt`은 Zod `datetime()` 기준의 UTC ISO 8601 일시 문자열이어야 합니다.
- `reservationToken`은 필수(Required)입니다. 누락 시 `400 INVALID_INPUT`을 반환합니다.
- `reservationToken`은 Zod 레벨에서 필수 `string`까지만 검증합니다. 길이/패턴 제약은 없습니다.
- `reservationSessionToken`은 선택값이며, 전달 시 slug 예약 정보에 저장된 세션과 일치해야 합니다.
- `reservationToken`이 Redis 예약 정보와 일치해야 합니다.
- 예약 토큰이 만료되었거나, 정보 불일치로 예약 검증에 실패하면 `409 SLUG_RESERVATION_MISMATCH`를 반환합니다.
- 캡슐 생성이 성공하면 해당 생성 세션에 묶인 후보 slug들의 Redis 예약 정보를 즉시 정리합니다.
- 최종 저장 시 `slug` unique constraint 충돌이 발생하면 `409 SLUG_ALREADY_IN_USE`를 반환합니다.

### 3.4 캡슐 조회❤️

`GET /capsules/{slug}`

설명:

- 하나의 API 엔드포인트로 공개 전/후 화면 흐름을 지원합니다.
- 같은 캡슐 URL 진입 시 D-day(`openAt`) 전에는 기본 정보 화면, 이후에는 메시지 화면이 노출됨에 맞춰 응답이 달라집니다.
- 공개 전(`openAt` 이전)에는 캡슐 기본 정보만 반환합니다.
- 공개 후(`openAt` 이상, 만료 전)에는 캡슐 정보와 함께 메시지 목록을 `messages` 단순 배열 필드로 포함하여 반환합니다.

공개 전 Response `200 OK`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slug": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "version": 1,
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-03-18T02:05:21.000Z",
  "isOpen": false,
  "messageCount": 12
}
```

공개 후 Response `200 OK`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slug": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "version": 3,
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z",
  "isOpen": true,
  "messageCount": 12,
  "messages": [
    {
      "id": 1,
      "nickname": "익명의 멘토",
      "content": "졸업을 진심으로 축하합니다!",
      "createdAt": "2025-12-24T15:30:00.000Z"
    }
  ]
}
```

규칙:

- path parameter `slug`는 필수이며 trim 이후 `1~50자`여야 합니다.
- path parameter `slug`는 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`를 만족해야 합니다.
- 만료 상태이면 기존 정책대로 `410 CAPSULE_EXPIRED`
- 응답의 `updatedAt` 필드는 캡슐 정보 수정 및 신규 메시지 수신 내역이 모두 반영된 '최근 활동 시각'을 의미합니다. (공개 후 응답의 `messages` 배열 포함 여부와 무관하게 캡슐의 최종 업데이트 시간을 나타냄)
- 공개 후 응답에서 각 메시지는 `id ASC` 순으로 정렬됩니다.
- MVP 문서 범위에서 메시지 목록에 대한 페이지네이션은 미적용입니다.

### 3.4.1 messageCount SSE 구독❤️

`GET /capsules/{slug}/message-count/stream`

설명:

- 기존 `GET /capsules/{slug}` 응답은 초기 화면 로딩용으로 그대로 유지합니다.
- 클라이언트는 이후 이 endpoint에 SSE로 연결해 `messageCount` 숫자만 실시간 동기화합니다.
- 연결 직후 현재 최신 `messageCount`를 1회 전송합니다.
- 같은 capsule에서 메시지 생성이 성공할 때마다 DB 기준 최신 count를 다시 계산해 push합니다.
- 서버는 heartbeat comment를 주기적으로 내려 연결 유지를 돕습니다.

예시 이벤트

```text
event: messageCount
data: {"messageCount":12}
```

규칙:

- `slug` 형식 검증
- 존재하지 않는 capsule이면 `404 CAPSULE_NOT_FOUND`
- 만료된 capsule이면 `410 CAPSULE_EXPIRED`
- count는 기존 `GET /capsules/{slug}` 와 동일하게 DB 기준으로 계산합니다.

### 3.5 관리자 비밀번호 확인❤️

`POST /capsules/{slug}/verify`

Request Body

```json
{
  "password": "1234"
}
```

Response `200 OK`

```json
{
  "verified": true
}
```

규칙:

- path parameter `slug`는 필수이며 trim 이후 `1~50자`여야 합니다.
- path parameter `slug`는 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`를 만족해야 합니다.
- `password`는 숫자 `4자리`여야 합니다. (캡슐 관리자 비밀번호 원문 입력값)
- 비밀번호 불일치 시 `403 FORBIDDEN_PASSWORD`
- 동일 IP 또는 동일 `slug`에 대한 연속 실패는 rate limit 대상입니다.

### 3.6 캡슐 수정❤️

`PATCH /capsules/{slug}`

Request Body

```json
{
  "password": "1234",
  "title": "수정된 졸업 축하 방",
  "version": 1,
  "openAt": "2025-12-25T12:00:00.000Z"
}
```

Response `200 OK`

```json
{
  "createdAt": "2025-03-18T02:05:21.000Z",
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slug": "our-graduation-2025",
  "title": "수정된 졸업 축하 방",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "version": 2,
  "updatedAt": "2025-06-01T10:00:00.000Z"
}
```

규칙:

- path parameter `slug`는 필수이며 trim 이후 `1~50자`여야 합니다.
- path parameter `slug`는 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`를 만족해야 합니다.
- Request Body의 `password`, `title`, `version`, `openAt`은 모두 필수입니다.
- `password`는 숫자 `4자리`여야 합니다. (캡슐 관리자 비밀번호 원문 입력값)
- `title`은 trim 이후 `1~100자`여야 합니다.
- `version`은 조회 응답에서 받은 최신 정수값이어야 합니다.
- `openAt`은 Zod `datetime()` 기준의 UTC ISO 8601 일시 문자열이어야 합니다.
- `openAt`은 현재 시각 이후여야 합니다.
- `openAt`이 변경되면 `expiresAt`도 즉시 재계산합니다.
- 수정 성공 시 응답의 `version`은 기존 값보다 1 증가합니다.
- 캡슐 내용이 수정되면 '최근 활동 시각'을 의미하는 `updatedAt`이 갱신됩니다.
- 이미 만료된 캡슐은 수정할 수 없습니다.
- 공개 여부와 무관하게 수정 허용 여부는 운영 정책으로 고정해야 하며, MVP에서는 `openAt` 이전까지만 수정 가능으로 정의합니다.
- 다른 사용자가 먼저 수정해 `version`이 달라지면 `409 CAPSULE_UPDATE_CONFLICT`를 반환합니다.
- `409 CAPSULE_UPDATE_CONFLICT` 응답은 기존 에러 구조만 유지하며, 최신 `title`, `openAt`, `version`은 `GET /capsules/{slug}` 재조회로 갱신합니다.

### 3.7 캡슐 삭제❤️

`DELETE /capsules/{slug}`

Request Body

```json
{
  "password": "1234"
}
```

Response `204 No Content`

규칙:

- path parameter `slug`는 필수이며 trim 이후 `1~50자`여야 합니다.
- path parameter `slug`는 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`를 만족해야 합니다.
- Request Body의 `password`는 필수입니다.
- `password`는 숫자 `4자리`여야 합니다. (캡슐 관리자 비밀번호 원문 입력값)
- Hard Delete로 처리합니다.
- 캡슐 삭제 시 연관 메시지는 함께 삭제됩니다.

### 3.8 메시지 작성❤️

`POST /capsules/{slug}/messages`

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
- path parameter `slug`는 필수이며 trim 이후 `1~50자`여야 합니다.
- path parameter `slug`는 정규식 `^[a-z0-9]+(?:-[a-z0-9]+)*$`를 만족해야 합니다.
- Request Body의 `nickname`, `content`는 모두 필수입니다.
- `nickname`은 trim 이후 `1~20자`여야 합니다.
- `content`는 trim 이후 `1~1000자`여야 합니다.
- 같은 캡슐 내에서 이미 사용 중인 `nickname`이면 `409 DUPLICATE_NICKNAME`
- 중복 닉네임 오류 메시지는 `"중복된 닉네임입니다"`를 반환합니다.
- 메시지 수가 `300`건에 도달하면 원칙상 `409 MESSAGE_LIMIT_EXCEEDED`를 반환합니다. (구현 메모의 낙관적 동시성 예외 정책 참고)
- **메시지 작성 성공 시 연관된 캡슐의 `updatedAt` 필드를 갱신하고, SSE 구독 중인 클라이언트에는 DB 기준 최신 `messageCount`를 push 합니다.**

## 4. 공통 에러 규격

에러 응답 형식

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "요청 값을 확인해 주세요.",
    "details": [
      {
        "field": "slug",
        "message": "Invalid"
      }
    ]
  }
}
```

- `details`는 Zod 검증 실패 시에만 포함되는 선택 필드입니다.

| 상태 코드 | 에러 코드                   | 설명                                     |
| --------- | --------------------------- | ---------------------------------------- |
| `400`     | `INVALID_INPUT`             | Zod 검증 실패 (`details` 포함 가능)      |
| `403`     | `FORBIDDEN_PASSWORD`        | 비밀번호 불일치                          |
| `404`     | `CAPSULE_NOT_FOUND`         | 존재하지 않는 `slug`                     |
| `409`     | `SLUG_ALREADY_IN_USE`       | 이미 사용 중이거나 현재 예약 중인 `slug` |
| `409`     | `SLUG_RESERVATION_MISMATCH` | 예약 토큰이 없거나 소유권 검증 실패      |
| `409`     | `DUPLICATE_NICKNAME`        | 같은 캡슐 내 닉네임 중복                 |
| `409`     | `MESSAGE_LIMIT_EXCEEDED`    | 캡슐당 최대 메시지 수 초과               |
| `410`     | `CAPSULE_EXPIRED`           | `expiresAt` 경과                         |
| `429`     | `TOO_MANY_REQUESTS`         | 비밀번호 검증 또는 반복 요청 제한        |

## 5. 구현 메모

- 비밀번호 검증, 수정, 삭제 API는 `catchAsync` 래퍼 또는 동등한 방식으로 비동기 에러를 누락 없이 처리합니다.
- 슬러그 선점 API에서 DB 중복 검사와 Redis 예약 확인을 함께 수행하는 설계는, 버튼이 하나인 현재 UX와 잘 맞습니다.
- Redis 예약과 DB insert 사이에는 race condition이 있을 수 있으므로, DB unique constraint를 최종 방어선으로 둡니다.
- 캡슐 당 최대 300건의 메시지 수 제한은 애플리케이션 레벨 비즈니스 정책입니다. 따라서, 많은 사용자가 동시에 메시지를 작성할 때 발생하는 동시성 충돌(`race condition`)로 인해 `301~302` 건 수준으로 소폭 허용되는 부분은 낙관적으로 허용합니다. 엄격하게 트랜잭션 락을 걸지 않습니다.
- DB 내부 오류와 쿼리 상세는 클라이언트에 노출하지 않습니다.
