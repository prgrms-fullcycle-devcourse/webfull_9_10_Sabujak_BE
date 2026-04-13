# DB Schema Workflow Guide

## 공식 기준 자산

사부작 백엔드의 DB 스키마 정본은 아래 두 가지입니다.

1. `src/db/schema.ts`
2. `drizzle/*` migration 산출물

`docs/schema.sql`은 위 자산에서 생성한 참조용 스냅샷이며 직접 실행하지 않습니다.
스키마 변경은 반드시 Drizzle 명령으로만 반영합니다.

## 신규 DB 초기화

로컬 Docker DB의 최초 초기화는 `drizzle/0000_faulty_mariko_yashida.sql`을 사용합니다.
`postgres_data` 볼륨이 이미 있으면 초기화 SQL은 다시 실행되지 않습니다.

새 DB를 완전히 다시 만들고 싶다면 아래 순서로 진행합니다.

```bash
docker compose down -v
docker compose up -d db
docker compose up -d api
```

주의: `docker compose down -v`는 로컬 Postgres 데이터를 모두 삭제합니다.

## 기존 DB 마이그레이션

이미 존재하는 DB에는 Drizzle migration만 적용합니다.
로컬이든 배포 환경이든 `DATABASE_URL`이 올바르게 설정되어 있어야 합니다.

```bash
pnpm run db:migrate
```

앱 서버 시작만으로 스키마를 자동 수정하지 않습니다.

## 배포 환경 반영 절차

Render + Neon 환경에서는 애플리케이션 배포와 DB migration을 분리해서 다룹니다.
운영 DB 반영 순서는 아래 원칙을 따릅니다.

1. 배포할 커밋에서 `src/db/schema.ts`와 `drizzle/*`가 함께 준비되어 있어야 합니다.
2. 운영 `DATABASE_URL`을 기준으로 `pnpm run db:migrate`를 먼저 실행합니다.
3. migration이 성공한 뒤에만 애플리케이션을 배포하거나 재시작합니다.

운영 규칙:

- 앱 서버 시작은 migration을 대체하지 않습니다.
- 운영 DB에 수동 SQL을 직접 적용하지 않습니다.
- migration 실패 시 서버를 반복 재기동하지 말고, 실패한 migration과 `drizzle/meta` 상태를 먼저 확인합니다.
- 여러 인스턴스가 동시에 뜨는 환경에서는 앱 프로세스가 아니라 배포 파이프라인 또는 단일 운영 절차에서 migration을 한 번만 실행합니다.

권장 체크 순서:

```bash
pnpm run db:schema:check
pnpm run db:migrate
pnpm run build
```

운영 반영 후에는 Swagger/OpenAPI와 핵심 캡슐 조회 흐름이 정상인지 확인합니다.

## 스키마 변경 절차

DB 스키마를 수정할 때는 아래 순서를 고정합니다.

```bash
pnpm run db:generate
pnpm run db:migrate
pnpm run db:schema:export
pnpm run db:schema:check
```

실제 작업 순서:

1. `src/db/schema.ts`를 수정합니다.
2. `pnpm run db:generate`로 migration을 생성합니다.
3. 적용 대상 DB에 `pnpm run db:migrate`를 실행합니다.
4. `pnpm run db:schema:export`로 `docs/schema.sql` 참조 스냅샷을 갱신합니다.
5. `pnpm run db:schema:check`로 Drizzle 전용 워크플로우가 유지되는지 검증합니다.
6. 배포가 필요한 변경이면 운영 DB에 `pnpm run db:migrate`를 선적용한 뒤 애플리케이션을 배포합니다.

## 긴급 복구

기존 로컬 볼륨이나 오래된 개발 DB에서만 발생하는 legacy drift를 정리해야 한다면
one-off 복구 스크립트를 수동으로 실행할 수 있습니다.

```bash
pnpm run db:repair:legacy-drift
```

이 명령은 표준 스키마 반영 경로가 아닙니다.
새 변경사항 배포나 일반적인 마이그레이션에는 사용하지 않습니다.

## 참조 스냅샷과 검증

- `docs/schema.sql`: Drizzle 기준으로 생성한 참조용 SQL 스냅샷
- `pnpm run db:schema:export`: 참조 스냅샷 갱신
- `pnpm run db:schema:check`: migration 메타데이터, 참조 스냅샷, 금지된 런타임 경로를 함께 검증

수동 SQL 파일(`docs/migrations/*`)이나 앱 기동 시 자동 복구 플로우는 더 이상 공식 절차가 아닙니다.
