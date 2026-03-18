# Backend Rules

## Stack

- Core: Node.js, Express, TypeScript
- Database: PostgreSQL (Neon DB, Serverless), Drizzle ORM
- Validation: Zod

## API and Validation

- 모든 외부 입력(`req.body`, `req.query`, `req.params`)은 Zod 스키마로 검증한다.
- `any` 타입은 사용하지 않는다.
- 요청 타입은 가능하면 Zod 스키마에서 직접 추론한다.

## Data Model

- 시스템 내부 PK는 ULID를 사용한다.
- 사용자 노출용 고유 식별자는 `slug`를 사용한다.
- 모든 날짜는 UTC 기준 `timestamptz`로 저장한다.

## Error Handling

- 적절한 HTTP 상태 코드를 사용한다: `400`, `401`, `403`, `404`, `409`, `410`, `429`.
- 비동기 컨트롤러는 `catchAsync` 같은 래퍼를 통해 에러를 `next()`로 전달한다.
- `ZodError`는 `400`과 검증 메시지로 분기 처리한다.
- DB 내부 구조나 쿼리 세부사항이 클라이언트에 노출되지 않도록 한다.

## Drizzle and Concurrency

- Raw SQL보다 Drizzle Query Builder를 우선한다.
- 동시 요청에서 생길 수 있는 race condition을 고려한다.
- 유니크 충돌 등 DB 예외는 비즈니스 예외로 변환해 처리한다.
