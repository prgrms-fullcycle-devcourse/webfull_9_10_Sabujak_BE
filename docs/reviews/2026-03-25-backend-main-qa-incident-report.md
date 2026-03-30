# 백엔드 `main` 전수 QA 장애보고서

이 문서는 백엔드 레포의 코드 리뷰 문맥에 남아 있는 레거시 참조본이다.

정본 QA 보고서는 아래 QA 레포 문서를 사용한다.

- `/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_QA/docs/reports/backend/2026-03-25-backend-main-qa-incident-report.md`

아래 본문은 당시 기록 보존을 위해 유지한다.

- 점검 일시: 2026-03-25
- 점검 대상: `/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE`
- 기준 브랜치: `main`
- 점검 방식: 코드 리뷰, 서브에이전트 병렬 점검, 정적 검사, 단위 테스트, Docker Compose 런타임 QA

## 1. QA 수행 결과

| 항목 | 결과 | 비고 |
| --- | --- | --- |
| `pnpm run typecheck` | PASS | 타입 오류 없음 |
| `pnpm run lint` | PASS | ESLint 오류 없음 |
| `pnpm run test` | PASS | 2 suites, 30 tests 통과 |
| `pnpm run build` | PASS | `dist` 빌드 성공 |
| `pnpm run openapi:check` | PASS | `openapi.json` 최신 상태 |
| Docker Compose API 스모크 테스트 | FAIL | 기능/계약 위반 장애 확인 |

## 2. 핵심 장애

### 장애 1. `POST /capsules/{slug}/verify`가 비밀번호와 무관하게 항상 성공

- 심각도: Critical
- 재현:
  - 비밀번호 `1234`로 생성한 캡슐에 `POST /capsules/{slug}/verify`로 `9999` 전송
  - 실제 응답: `200 { "verified": true }`
- 기대 동작:
  - 문서 기준 비밀번호 불일치 시 `403 FORBIDDEN_PASSWORD`
- 근거:
  - [capsules.repository.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/capsules/capsules.repository.ts#L277)
  - [capsules.controller.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/capsules/capsules.controller.ts#L44)
  - [API_SPEC.md](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/docs/API_SPEC.md#L217)
- 원인:
  - 저장소 계층이 실제 캡슐 조회와 해시 검증을 수행하지 않고 `buildVerifyPasswordMock()`을 그대로 반환함
- 영향:
  - 수정/삭제 전 인증 게이트가 사실상 무력화됨
  - FE가 `verify` 성공을 신뢰할 경우 잘못된 UX 분기와 오탐 성공이 발생함

### 장애 2. 중복 닉네임 메시지 작성이 `409`가 아니라 `500`으로 실패

- 심각도: Critical
- 재현:
  - 동일 캡슐에 같은 `nickname`으로 두 번째 `POST /capsules/{slug}/messages` 요청
  - 실제 응답: `500 INTERNAL_SERVER_ERROR`
  - 서버 로그: `DrizzleQueryError` 내부 `cause.code = 23505`
- 기대 동작:
  - 문서 기준 `409 DUPLICATE_NICKNAME`
- 근거:
  - [capsules.repository.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/capsules/capsules.repository.ts#L424)
  - [error-handler.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/common/middlewares/error-handler.ts#L42)
  - [schema.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/db/schema.ts#L51)
  - [API_SPEC.md](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/docs/API_SPEC.md#L324)
- 원인:
  - 예외 변환 로직이 최상위 `error.code === "23505"`만 검사함
  - 실제 런타임에서는 Drizzle 래퍼 예외의 `cause.code`에 unique violation 코드가 들어와 변환에 실패함
- 영향:
  - 비즈니스 오류가 서버 장애처럼 보임
  - FE가 예상한 충돌 처리 로직을 사용할 수 없음
  - 운영 로그에 불필요한 500이 누적됨

### 장애 3. 과거 `openAt`으로 캡슐 생성이 가능하고 즉시 만료 상태가 됨

- 심각도: Major
- 재현:
  - `POST /capsules`에 `openAt = 2020-01-01T00:00:00.000Z` 전송
  - 실제 응답: `201 Created`
  - 직후 `GET /capsules/{slug}` 응답: `410 CAPSULE_EXPIRED`
- 기대 동작:
  - “특정 시점에 열리는 타임캡슐” 정책이라면 생성 시점에서 과거 `openAt`을 거부해야 함
- 근거:
  - [create-capsule.dto.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/capsules/dto/create-capsule.dto.ts#L11)
  - [capsules.repository.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/capsules/capsules.repository.ts#L150)
  - [README.md](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/README.md#L22)
- 원인:
  - 생성 DTO와 저장소 계층 어디에도 `openAt > now` 검증이 없음
- 영향:
  - 도메인 정책 우회 가능
  - 생성 직후 열람 불가한 “즉시 만료 캡슐” 데이터가 누적될 수 있음

## 3. 추가 리스크

### 리스크 1. 비밀번호 확인 rate limit 문서와 실제 구현이 다름

- 심각도: Moderate
- 근거:
  - [API_SPEC.md](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/docs/API_SPEC.md#L237)
  - [capsules.routes.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/capsules/capsules.routes.ts#L17)
  - [system.routes.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/system/system.routes.ts#L24)
- 내용:
  - 문서와 OpenAPI는 `verify`에 `429 TOO_MANY_REQUESTS`를 설명하지만 실제 `verify` 라우트에는 전용 limiter가 없음
  - 현재는 전역 `100 req/min`만 걸려 있어 비밀번호 대입 공격에 대한 방어 강도가 문서 기대보다 약함

### 리스크 2. healthCheck의 429 응답 포맷이 공통 오류 스키마와 다름

- 심각도: Moderate
- 재현:
  - 동일 IP로 `/healthCheck` 6회 호출 시 `429`
  - 실제 응답 본문: `{ "message": "Too Many Requests - /healthCheck rate limit exceeded. Please try again later." }`
- 근거:
  - [system.routes.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/system/system.routes.ts#L13)
  - [error-response.dto.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/common/dto/error-response.dto.ts)
- 내용:
  - 일반 도메인 오류는 `error.code`, `error.message` 구조를 쓰는데, rate limit은 별도 포맷을 반환함
  - FE/모니터링이 공통 에러 파서를 사용하면 429만 예외 처리해야 함

## 4. 테스트 사각지대

- [capsules.repository.test.ts](/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_BE/src/modules/capsules/capsules.repository.test.ts#L449) 는 중복 닉네임 예외를 `{ code: "23505" }` 형태로만 모킹해 실제 Drizzle 래핑 구조를 재현하지 못함
- `verify` 성공/실패를 보장하는 테스트가 없음
- `createCapsule`의 과거 `openAt` 거부 정책 테스트가 없음
- 현재 테스트는 저장소 단위에 집중되어 있어 Express 라우트와 실제 에러 응답 계약의 어긋남을 잡아내지 못함

## 5. 결론

- 정적 검증과 단위 테스트는 모두 통과했지만, 런타임 기준으로는 인증, 비즈니스 오류 계약, 생성 정책에서 운영 영향이 큰 장애가 확인됨
- 즉시 조치 우선순위는 다음 순서가 적절함
  - 1순위: `verify` 실제 비밀번호 검증 구현
  - 2순위: 중복 닉네임 예외 변환을 Drizzle 예외 구조까지 포함해 수정
  - 3순위: 캡슐 생성 시 과거 `openAt` 차단
