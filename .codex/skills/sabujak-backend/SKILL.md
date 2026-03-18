---
name: sabujak-backend
description: Sabujak 백엔드 저장소에서 API 명세, ERD, Express/Zod/Drizzle 기반 백엔드 구현 규칙을 적용할 때 사용하는 프로젝트 스킬.
metadata:
  short-description: Sabujak backend conventions
---

# Sabujak Backend Skill

## Use This When

- 사부작 백엔드 프로젝트에서 API 명세서나 ERD를 작성하거나 갱신할 때
- Express, TypeScript, Zod, Drizzle 기반의 서버 코드를 생성하거나 수정할 때
- 코드 리뷰 시 프로젝트 고유 규칙과 체크리스트를 적용해야 할 때

## Workflow

1. 관련 문서와 코드를 먼저 읽어 현재 구조를 확인한다.
2. API 작업이면 `docs/API_SPEC.md`를, 데이터 모델 작업이면 `docs/ERD.md`를 우선 참조한다.
3. 외부 입력은 Zod로 검증하고, 타입은 스키마에서 추론되도록 유지한다.
4. DB 접근은 Drizzle Query Builder 중심으로 작성하고, 동시성 및 무결성 예외를 함께 고려한다.
5. 결과물을 작성한 뒤 체크리스트 기준으로 빠르게 점검한다.

## Guardrails

- `.env`, DB URI, API 키, 토큰 등 민감한 정보는 코드나 예시에 포함하지 않는다.
- 비밀번호나 토큰이 필요한 예시는 `***` 또는 `<REDACTED>`로 마스킹한다.
- 로그나 에러 예시의 로컬 경로, 내부 식별자는 필요 시 `<PATH>` 같은 플레이스홀더로 치환한다.

## Project Conventions

- [Backend Rules](references/backend-rules.md)
- [Review Checklist](references/review-checklist.md)

## Output Expectations

- 문서는 공유 가능한 형태의 Markdown으로 정리한다.
- 코드는 프로젝트 스택과 일관된 스타일을 유지한다.
- 설명보다 실행 가능한 결과물과 위험 요소를 우선한다.
