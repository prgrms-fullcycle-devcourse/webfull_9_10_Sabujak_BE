# 사부작 백엔드

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Express](https://img.shields.io/badge/Express-5-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-8+-F69220?style=for-the-badge&logo=pnpm&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![OpenAPI](https://img.shields.io/badge/OpenAPI-Swagger_UI-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)

</div>

사부작의 타임캡슐 생성, 조회, 수정, 삭제와 익명 메시지 작성을 담당하는 Express + TypeScript 기반 백엔드 서버입니다.  
Zod 기반 입력 검증, OpenAPI 문서 생성, PostgreSQL 연동을 중심으로 MVP API를 구성하고 있습니다.

## Overview

> "미래의 나와 우리에게 남기는 메시지"

사부작은 특정 시점에 열리는 타임캡슐을 만들고, 그 안에 익명 메시지를 모아 공개 시점 이후 함께 확인하는 서비스입니다.  
이 저장소는 프론트엔드와 협업하기 위한 REST API, OpenAPI 문서, 로컬 개발 환경 구성을 포함합니다.

## Live Links

| Service    | URL                                                                                                    |
| ---------- | ------------------------------------------------------------------------------------------------------ |
| Frontend   | [webfull-9-10-sabujak-fe.vercel.app](https://webfull-9-10-sabujak-fe.vercel.app/)                      |
| Swagger UI | [webfull-9-10-sabujak-be.onrender.com/api-docs](https://webfull-9-10-sabujak-be.onrender.com/api-docs) |

## Key Features

- 타임캡슐 생성 및 공개 시점 기반 상태 관리
- 슬러그 예약 기반 중복 방지 흐름
- 공개 전/후 단일 조회 API 제공
- 익명 메시지 작성 및 닉네임 중복 제어
- Swagger UI와 OpenAPI JSON 제공
- Docker Compose 기반 로컬 개발 환경 지원

## Tech Stack

| Category   | Stack                                        |
| ---------- | -------------------------------------------- |
| Runtime    | Node.js 20+, TypeScript                      |
| Server     | Express 5                                    |
| Validation | Zod                                          |
| API Docs   | `@asteasolutions/zod-to-openapi`, Swagger UI |
| Database   | PostgreSQL, Redis                            |
| Tooling    | pnpm, ESLint, Prettier, Husky                |
| Infra      | Docker Compose                               |

## Architecture

```mermaid
flowchart LR
    FE["Frontend Client"] -->|HTTP Request| API["Express API Server"]
    API --> ROUTER["Route Layer"]
    ROUTER --> VALID["Zod Validation"]
    ROUTER --> SERVICE["Capsule / Message Logic"]
    SERVICE --> DB[("PostgreSQL")]
    API --> DOCS["Swagger UI / OpenAPI"]
    DOCS --> SPEC["openapi.json"]
    API --> ENV[".env Configuration"]

    subgraph PIPE["Schema-to-Client Pipeline"]
        DRIZZLE["Drizzle Schema"] --> DZ["drizzle-zod"]
        DZ --> ZOD["Zod Schema"]
        ZOD --> OPENAPI["OpenAPI Registry"]
        OPENAPI --> ORVAL["Orval Client Generation"]
        ORVAL --> FECLIENT["Frontend API Client"]
    end

    subgraph DEPLOY["Deployment Architecture"]
        VERCEL["Vercel Frontend"] --> RENDER["Render Backend"]
        RENDER --> NEON[("Neon PostgreSQL")]
    end

    ZOD --> VALID
    OPENAPI --> DOCS
    FECLIENT --> FE
    VERCEL -.client requests.-> FE
    RENDER -.runtime environment.-> API
    NEON -.managed database.-> DB
```

사부작 백엔드는 프론트엔드 요청을 Express 서버에서 받아 Zod로 검증하고, 캡슐 및 메시지 도메인 로직을 거쳐 PostgreSQL에 저장합니다.  
추가로 `Drizzle -> drizzle-zod -> Zod -> OpenAPI -> Orval`로 이어지는 스키마 파이프라인과 `Vercel -> Render -> Neon` 배포 흐름을 함께 보여주도록 구성했습니다.

## Project Structure

```text
.
├── src
│   ├── app
│   ├── openapi
│   ├── schemas
│   └── index.ts
├── docs
│   ├── API_SPEC.md
│   ├── ERD.md
│   └── MOCK_API_SPEC.md
├── scripts
├── openapi.json
├── docker-compose.yml
└── README.md
```

## Documents

- [API 명세서](./docs/API_SPEC.md)
- [ERD](./docs/ERD.md)
- [Mock API 명세서](./docs/MOCK_API_SPEC.md)
- [OpenAPI JSON](./openapi.json)

## Development Workflow

1. 기능 요구사항을 기준으로 `docs/API_SPEC.md`와 필요 시 `docs/ERD.md`를 먼저 갱신합니다.
2. DB 모델과 스키마 구조를 Drizzle 기준으로 정리하고, `drizzle-zod`와 Zod 스키마 흐름에 맞게 입력/응답 형태를 맞춥니다.
3. 서버 라우트와 도메인 로직을 구현한 뒤 OpenAPI 산출물을 생성하거나 검증합니다.
4. 생성된 OpenAPI 스펙을 기준으로 프론트엔드에서 Orval 클라이언트를 연동해 API 타입과 호출 코드를 동기화합니다.
5. Swagger UI, 로컬 실행, 배포 환경(Render/Neon)에서 최종 동작을 확인합니다.

## Getting Started

### 1. Prerequisites

- Node.js `20+`
- pnpm `8+`
- Docker / Docker Compose

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

필요 시 `.env`에서 포트, DB 연결 정보, CORS 허용 출처를 프로젝트 환경에 맞게 수정합니다.

### 4. Run with Docker Compose

```bash
docker compose up --build
```

기본적으로 API 서버, PostgreSQL, Redis가 함께 실행됩니다.

### 5. Run Locally

DB와 Redis가 준비되어 있다면 아래 명령으로 개발 서버를 실행할 수 있습니다.

```bash
pnpm run dev
```

## Available Scripts

| Command                     | Description                   |
| --------------------------- | ----------------------------- |
| `pnpm run dev`              | 개발 서버 실행                |
| `pnpm run build`            | 프로덕션 번들 생성            |
| `pnpm run start`            | 빌드 결과 실행                |
| `pnpm run typecheck`        | 타입 검사                     |
| `pnpm run lint`             | 린트 검사                     |
| `pnpm run lint:fix`         | 린트 자동 수정                |
| `pnpm run openapi:generate` | OpenAPI 문서 생성             |
| `pnpm run openapi:check`    | OpenAPI 산출물 검증           |
| `pnpm run test:rate-limit`  | rate limit 관련 스크립트 실행 |

## API Entry Points

로컬 실행 기준 주요 접근 경로입니다.

| Path            | Description            |
| --------------- | ---------------------- |
| `/`             | 기본 확인용 엔드포인트 |
| `/healthCheck`  | 서버 상태 확인         |
| `/openapi.json` | OpenAPI 스펙           |
| `/api-docs`     | Swagger UI             |
| `/capsules/*`   | 타임캡슐 관련 API      |

## Environment Variables

자세한 예시는 [`.env.example`](./.env.example)에 정리되어 있습니다.

| Variable              | Description                     |
| --------------------- | ------------------------------- |
| `NODE_ENV`            | 실행 환경                       |
| `API_PORT`            | API 서버 포트                   |
| `POSTGRES_USER`       | 로컬 PostgreSQL 계정            |
| `POSTGRES_PASSWORD`   | 로컬 PostgreSQL 비밀번호        |
| `POSTGRES_DB`         | 로컬 PostgreSQL DB 이름         |
| `DATABASE_URL`        | DB 연결 문자열                  |
| `REDIS_URL`           | 로컬 Redis 연결 문자열          |
| `CORS_ORIGIN`         | 허용할 CORS origin 목록         |
| `CHOKIDAR_USEPOLLING` | Docker 개발 환경 파일 감시 옵션 |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL       |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST 토큰     |

## Team

| 프로필                                                          | 이름   | 역할     | GitHub                                                 |
| --------------------------------------------------------------- | ------ | -------- | ------------------------------------------------------ |
| <img src="https://github.com/labyrinth30.png" width="50" />     | 이윤하 | Backend  | [@labyrinth30](https://github.com/labyrinth30)         |
| <img src="https://github.com/insu1170.png" width="50" />        | 김인수 | Backend  | [@insu1170](https://github.com/insu1170)               |
| <img src="https://github.com/s576air.png" width="50" />         | 한재민 | Frontend | [@s576air](http://github.com/s576air)                  |
| <img src="https://github.com/supersoldier132.png" width="50" /> | 송창욱 | Frontend | [@supersoldier132](https://github.com/supersoldier132) |
| <img src="https://github.com/yomiyoni.png" width="50" />        | 이연희 | Frontend | [@yomiyoni](https://github.com/yomiyoni)               |

## Collaboration Guide

- API 변경 시 `docs/API_SPEC.md`와 `openapi.json`을 함께 갱신합니다.
- 데이터 모델 변경 시 `docs/ERD.md`도 함께 반영합니다.
- 외부 입력은 Zod 스키마로 검증하는 규칙을 유지합니다.
- 민감 정보는 `.env.example`이 아닌 실제 `.env` 또는 배포 환경 변수로 관리합니다.

## License

[MIT](./LICENSE)
