## 로컬 DB 재초기화 방법

현재 Docker 로컬 DB의 최초 초기화는 `docs/schema.sql`이 아니라 Drizzle 산출물인 `drizzle/0000_faulty_mariko_yashida.sql`을 사용합니다.
또한 API 서버가 시작될 때 기존 로컬 DB의 핵심 드리프트(`capsules.created_at/updated_at`, `messages.id`, `messages.created_at`)를 자동으로 보정합니다.

기존 `postgres_data` 볼륨이 있는 경우 최초 초기화 SQL은 다시 실행되지 않습니다.
테이블을 완전히 새로 만들고 싶다면 아래 순서로 로컬 DB를 재초기화해주세요.

1. 실행 중인 컨테이너를 내립니다.
   `docker compose down -v`

2. DB 컨테이너를 다시 올립니다.
   `docker compose up -d db`

3. 필요하면 API 컨테이너도 다시 올립니다.
   `docker compose up -d api`

주의: `docker compose down -v`는 로컬 Postgres 데이터까지 삭제하므로, 기존 개발 데이터는 모두 사라집니다.

## 🚀 OS별 마이그레이션 실행 방법

현재 실행 중인 DB에 변경사항(인덱스 등)을 반영하려면 터미널 환경에 맞춰 입력하세요.

## V1

### 변경 사항

- **컬럼 수정**: `capsules` 테이블의 잘못된 컬럼명 수정 (`field` -> `updated_at`)
- **성능 최적화**: 캡슐 만료일(`expires_at`) 및 메시지 목록 조회(`capsule_id`, `id`) 인덱스 추가
- **데이터 무결성**: 동일 캡슐 내 중복 닉네임 방지 (`UNIQUE INDEX`)

---

### window cmd 기준

```bash
docker exec -i webfull_9_10_sabujak_be-db-1 psql -U sabujak_admin -d sabujak_local < docs/migrations/001_add_idx.sql
```

### 🍎 Mac / Linux

```bash
cat docs/migrations/001_add_idx.sql | docker exec -i webfull_9_10_sabujak_be-db-1 psql -U sabujak_admin -d sabujak_local
```
