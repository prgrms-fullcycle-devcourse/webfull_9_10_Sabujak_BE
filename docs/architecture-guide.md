# Sabujak BE 아키텍처 가이드

이 문서는 현재 저장소의 실제 구조를 기준으로, 요청이 어떤 순서로 흘러가고 어떤 파일을 먼저 보면 되는지 정리한 가이드입니다.

이 프로젝트는 NestJS가 아니라 **Express 기반의 모듈형 계층 구조**를 사용합니다. 핵심 흐름은 `Route -> Controller -> Service -> Repository -> DB/Redis` 입니다.

---

## 1. 요청 흐름

앱 시작점은 `src/main.ts` 입니다. 여기서 환경 변수를 읽고, 필요하면 DB 스키마 자동 보정 후 서버를 띄웁니다.

그다음 `src/app.ts` 에서 Express 인스턴스를 만들고 JSON 파싱, CORS, 에러 핸들러를 붙입니다.

`src/routes.ts` 는 기능별 라우터를 한 곳에 모아 연결합니다.

- `src/modules/system/system.routes.ts`
- `src/modules/capsules/capsules.routes.ts`

즉 실제 HTTP 요청은 아래 순서로 흘러갑니다.

`Express app` -> `routes.ts` -> `module routes` -> `controller` -> `service` -> `repository` -> `db / redis`

---

## 2. 각 계층의 역할

### Controller

Controller는 HTTP 요청과 응답을 다루는 얇은 계층입니다.

- `req.body`, `req.params`를 Zod DTO로 검증합니다.
- 성공 시 적절한 HTTP status와 JSON body를 반환합니다.
- 비즈니스 로직과 쿼리 작성은 여기서 하지 않습니다.

예를 들면 `src/modules/capsules/capsules.controller.ts` 는 캡슐 생성, 조회, 수정, 삭제, 메시지 작성, SSE 연결을 담당합니다.

### Service

Service는 여러 저장소 작업을 엮고, 도메인 규칙을 적용하는 계층입니다.

- DB 준비 상태를 먼저 확인합니다.
- 메시지 작성 후 SSE publish 같은 후처리를 담당합니다.
- 비즈니스 흐름을 조립하지만, HTTP 세부사항은 알지 못하게 유지합니다.

현재는 `CapsulesService` 처럼 클래스와 생성자 주입을 함께 쓰지만, 외부 DI 컨테이너는 사용하지 않습니다. 싱글톤 인스턴스를 export 해서 연결하는 단순한 방식입니다.

### Repository

Repository는 실제 데이터 접근 계층입니다.

- PostgreSQL은 `drizzle-orm`으로 조회/삽입/수정을 수행합니다.
- 예약 토큰이나 일부 상태는 Redis를 함께 사용합니다.
- DB 제약 위반이나 도메인 예외를 애플리케이션 예외로 변환합니다.

캡슐 도메인의 실제 예시는 `src/modules/capsules/capsules.repository.ts` 입니다.

---

## 3. DTO 와 OpenAPI

입력/출력 규격은 `src/modules/*/dto/` 아래의 Zod 스키마가 기준입니다.

대표 경로는 다음과 같습니다.

- `src/modules/capsules/dto/shared.dto.ts`
- `src/modules/capsules/dto/create-capsule.dto.ts`
- `src/modules/capsules/dto/get-capsule.dto.ts`
- `src/modules/capsules/dto/slug-reservation.dto.ts`

이 DTO들은 다음 두 곳에서 재사용됩니다.

- Controller의 요청 검증
- `src/openapi/registry.ts`의 OpenAPI 등록

즉 이 저장소에서는 Zod 스키마가 사실상의 계약 원본입니다. `openapi.json`은 그 계약을 외부 도구와 공유하기 위한 산출물입니다.

---

## 4. 실제 모듈 구성

### System 모듈

`src/modules/system/` 는 서버 상태와 문서 진입점을 제공합니다.

- `/` : 기본 확인 응답
- `/healthCheck` : DB/Redis 상태 점검
- `/openapi.json` : OpenAPI JSON
- `/api-docs` : Swagger UI

### Capsules 모듈

`src/modules/capsules/` 는 서비스의 핵심 기능을 담당합니다.

- 슬러그 예약 생성
- 타임캡슐 생성
- 타임캡슐 상세 조회
- 타임캡슐 수정/삭제
- 익명 메시지 작성
- 상태 집계 및 SSE 스트림

---

## 5. 문서와 코드의 연결

문서를 볼 때는 아래 순서가 가장 빠릅니다.

1. `README.md`에서 전체 구조와 실행 방법을 확인합니다.
2. `docs/API_SPEC.md`에서 계약을 확인합니다.
3. `src/modules/capsules/dto/`에서 실제 Zod 스키마를 확인합니다.
4. `src/openapi/registry.ts`에서 OpenAPI 경로와 예시를 확인합니다.
5. `src/modules/capsules/`의 controller, service, repository를 따라가며 동작을 확인합니다.

---

## 6. 새 기능을 넣을 때의 순서

새 API를 추가하거나 기존 API를 바꿀 때는 아래 순서를 추천합니다.

1. `docs/API_SPEC.md` 와 필요한 경우 `docs/ERD.md` 를 먼저 갱신합니다.
2. `src/modules/{domain}/dto/` 에 Zod 스키마를 추가하거나 수정합니다.
3. Repository에 데이터 접근 함수를 추가합니다.
4. Service에서 비즈니스 흐름을 연결합니다.
5. Controller에서 요청 검증과 응답 변환을 마무리합니다.
6. `src/modules/{domain}/*.routes.ts` 에 라우트를 연결합니다.
7. `src/openapi/registry.ts` 에 OpenAPI 경로와 예시를 맞춥니다.
8. 필요한 테스트를 추가하고 `openapi.json` 과 실제 응답이 일치하는지 확인합니다.

---

## 7. 이 저장소를 볼 때 기억할 점

- `drizzle-zod` 기반 자동 생성 흐름은 현재 사용하지 않습니다.
- 계약의 중심은 `src/modules/*/dto/` 의 Zod 스키마입니다.
- Redis는 캡슐 슬러그 예약과 일부 SSE 흐름에 사용됩니다.
- 문서가 실제 코드와 다르면 코드가 아니라 문서를 먼저 고치는 편이 유지보수에 더 좋습니다.
