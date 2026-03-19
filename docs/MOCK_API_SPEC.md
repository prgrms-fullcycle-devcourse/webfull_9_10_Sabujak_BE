# 사부작 프론트 연동용 Mock API 명세서

프론트엔드 팀이 mock 데이터로 화면을 빠르게 붙여볼 수 있도록, 현재 서버에 구현된 mock 응답 기준으로 정리한 문서입니다.

- 기준일: `2026-03-18`
- Base URL: `/`
- Content-Type: `application/json`
- 목적: 프론트 화면 연동 및 mock 데이터 실험
- 범위: controller 레벨에서 바로 반환하는 현재 mock 응답 기준

## 1. 공통 안내

### 1.1 현재 mock API의 특징

- 모든 응답은 DB 없이 고정 mock 데이터 또는 요청값을 섞어서 반환합니다.
- 아직 Zod 유효성 검사, Drizzle 스키마, Redis/DB 연동은 붙어 있지 않습니다.
- 일부 필드는 요청 body가 없으면 서버 기본값으로 대체됩니다.
- 실패 케이스는 대부분 아직 구현되어 있지 않습니다.

### 1.2 프론트에서 꼭 알아야 하는 임시 규칙

- 캡슐 조회는 `GET /capsules/{slug}` 한 개 엔드포인트로 공개 전/후 화면을 분기합니다.
- `slug`가 정확히 `opened-capsule`일 때만 공개 후 응답이 내려옵니다.
- `opened-capsule`이 아닌 모든 slug는 공개 전 응답이 내려옵니다.
- 공개 후 응답의 `messages` 배열은 현재 5개 고정입니다.
- 비밀번호 확인 API는 현재 어떤 값이 와도 항상 성공합니다.
- 슬러그 예약 API도 현재 어떤 값이 와도 항상 성공합니다.

### 1.3 기본 mock 값

| 필드               | 값                           |
| ------------------ | ---------------------------- |
| `id`               | `01ARZ3NDEKTSV4RRFFQ69G5FAV` |
| `reservationToken` | `01HQX7Y8J6R8J2E5W4C2R9A1BC` |
| `reservedUntil`    | `2026-03-18T02:10:21.000Z`   |
| `openAt`           | `2025-12-25T12:00:00.000Z`   |
| `expiresAt`        | `2026-01-01T12:00:00.000Z`   |
| `createdAt`        | `2025-03-18T02:05:21.000Z`   |
| `updatedAt`        | `2025-03-18T02:05:21.000Z`   |

## 2. 엔드포인트 목록

| 도메인  | 기능                 | 메서드   | URI                           |
| ------- | -------------------- | -------- | ----------------------------- |
| Capsule | 슬러그 예약 생성     | `POST`   | `/capsules/slug-reservations` |
| Capsule | 캡슐 생성            | `POST`   | `/capsules`                   |
| Capsule | 캡슐 조회            | `GET`    | `/capsules/{slug}`            |
| Capsule | 관리자 비밀번호 확인 | `POST`   | `/capsules/{slug}/verify`     |
| Capsule | 캡슐 수정            | `PATCH`  | `/capsules/{slug}`            |
| Capsule | 캡슐 삭제            | `DELETE` | `/capsules/{slug}`            |
| Message | 메시지 작성          | `POST`   | `/capsules/{slug}/messages`   |

## 3. 엔드포인트 상세

### 3.1 슬러그 예약 생성

`POST /capsules/slug-reservations`

Request Body

```json
{
  "slug": "our-graduation-2025"
}
```

Response `201 Created`

```json
{
  "slug": "our-graduation-2025",
  "reservationToken": "01HQX7Y8J6R8J2E5W4C2R9A1BC",
  "reservedUntil": "2026-03-18T02:10:21.000Z"
}
```

현재 mock 동작:

- `slug`가 body에 있으면 그대로 응답에 반영합니다.
- `slug`가 없으면 기본값 `our-graduation-2025`를 반환합니다.
- 중복 확인 실패, 이미 사용 중인 slug, 토큰 만료 같은 오류 응답은 아직 없습니다.

### 3.2 캡슐 생성

`POST /capsules`

Request Body

```json
{
  "slug": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "password": "1234",
  "openAt": "2025-12-25T12:00:00.000Z",
  "reservationToken": "01HQX7Y8J6R8J2E5W4C2R9A1BC"
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
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-03-18T02:05:21.000Z"
}
```

현재 mock 동작:

- `slug`, `title`, `openAt`는 body 값이 있으면 그대로 응답에 반영합니다.
- `password`, `reservationToken`은 현재 응답 생성에는 사용되지 않습니다.
- body 값이 없으면 아래 기본값을 사용합니다.

```json
{
  "slug": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "openAt": "2025-12-25T12:00:00.000Z"
}
```

### 3.3 캡슐 조회

`GET /capsules/{slug}`

현재 mock에서는 실제 시간 계산 대신 `slug` 문자열로 공개 여부를 분기합니다.

#### 공개 전 응답

조건:

- `slug !== "opened-capsule"`

Response `200 OK`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slug": "our-graduation-2025",
  "title": "졸업 축하 타임캡슐",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-03-18T02:05:21.000Z",
  "isOpen": false,
  "messageCount": 12
}
```

현재 mock 동작:

- 응답의 `slug`는 path param 값을 그대로 씁니다.
- 공개 전 응답에는 `messages` 필드가 없습니다.

#### 공개 후 응답

조건:

- `slug === "opened-capsule"`

Response `200 OK`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slug": "opened-capsule",
  "title": "졸업 축하 타임캡슐",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-06-01T10:00:00.000Z",
  "isOpen": true,
  "messageCount": 5,
  "messages": [
    {
      "id": 1,
      "nickname": "익명의 멘토",
      "content": "졸업을 진심으로 축하합니다!",
      "createdAt": "2025-12-24T15:30:00.000Z"
    },
    {
      "id": 2,
      "nickname": "친구A",
      "content": "우리 같이 고생한 시간 잊지 말자.",
      "createdAt": "2025-12-24T16:00:00.000Z"
    },
    {
      "id": 3,
      "nickname": "동아리 회장",
      "content": "함께 만든 추억이 오래 남았으면 좋겠어.",
      "createdAt": "2025-12-24T16:30:00.000Z"
    },
    {
      "id": 4,
      "nickname": "프로젝트 팀원",
      "content": "너 덕분에 끝까지 잘 해낼 수 있었어.",
      "createdAt": "2025-12-24T17:00:00.000Z"
    },
    {
      "id": 5,
      "nickname": "익명의 응원단",
      "content": "다음 시작도 멋지게 해낼 거라고 믿어!",
      "createdAt": "2025-12-24T17:30:00.000Z"
    }
  ]
}
```

현재 mock 동작:

- `opened-capsule`일 때만 공개 후 응답을 돌려줍니다.
- `messages` 배열은 현재 항상 5개 고정입니다.

### 3.4 관리자 비밀번호 확인

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

현재 mock 동작:

- `slug`, `password` 값과 무관하게 항상 성공 응답을 반환합니다.

### 3.5 캡슐 수정

`PATCH /capsules/{slug}`

Request Body

```json
{
  "password": "1234",
  "title": "수정된 졸업 축하 방",
  "openAt": "2025-12-25T12:00:00.000Z"
}
```

Response `200 OK`

```json
{
  "id": "01ARZ3NDEKTSV4RRFFQ69G5FAV",
  "slug": "our-graduation-2025",
  "title": "수정된 졸업 축하 방",
  "openAt": "2025-12-25T12:00:00.000Z",
  "expiresAt": "2026-01-01T12:00:00.000Z",
  "createdAt": "2025-03-18T02:05:21.000Z",
  "updatedAt": "2025-03-18T02:05:21.000Z"
}
```

현재 mock 동작:

- `slug`는 path param 값을 사용합니다.
- `title`, `openAt`는 body 값이 있으면 그대로 반영합니다.
- `password`는 아직 검증에 사용되지 않습니다.

### 3.6 캡슐 삭제

`DELETE /capsules/{slug}`

Response `200 OK`

```json
{
  "deleted": true,
  "slug": "our-graduation-2025"
}
```

현재 mock 동작:

- 요청한 `slug`를 그대로 응답에 담아 반환합니다.

### 3.7 메시지 작성

`POST /capsules/{slug}/messages`

Request Body

```json
{
  "nickname": "익명의 친구",
  "content": "앞으로도 좋은 일만 가득하길 바랄게!"
}
```

Response `201 Created`

```json
{
  "id": 13,
  "nickname": "익명의 친구",
  "content": "앞으로도 좋은 일만 가득하길 바랄게!",
  "createdAt": "2025-03-18T02:05:21.000Z"
}
```

현재 mock 동작:

- `nickname`, `content`가 body에 있으면 그대로 응답에 반영합니다.
- 값이 없으면 아래 기본값을 사용합니다.

```json
{
  "nickname": "익명의 친구",
  "content": "앞으로도 좋은 일만 가득하길 바랄게!"
}
```

## 4. 프론트 테스트용 추천 호출

### 공개 전 화면 확인

`GET /capsules/our-graduation-2025`

### 공개 후 화면 확인

`GET /capsules/opened-capsule`

### 생성 플로우 확인

1. `POST /capsules/slug-reservations`
2. `POST /capsules`

현재는 예약 토큰 검증이 없으므로, 프론트는 응답 shape 위주로 화면 연결을 진행하면 됩니다.

## 5. 이후 실제 구현에서 달라질 수 있는 부분

- Zod 기반 요청값 검증
- Drizzle 스키마 및 실제 DB 저장
- Redis 기반 slug 예약 충돌 처리
- 비밀번호 검증 실패 응답
- 수정/삭제 실패 응답
- 메시지 수 제한 및 닉네임 중복 처리
