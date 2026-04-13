# [Refactor]: `drizzle-orm/zod` 기반 DB-DTO 스키마 단일화 및 Zod 중복 제거

### 📄 설명

현재 백엔드는 Drizzle로 DB 스키마를 정의하고, Zod로 API 요청/응답 스키마를 별도로 관리하고 있습니다.

이 구조는 명확하지만, 동일한 도메인 필드(`slug`, `title`, `openAt`, `createdAt` 등)를 DB 스키마와 Zod DTO 양쪽에 중복 정의해야 해 변경 시 drift가 발생할 여지가 있습니다. 컬럼 길이, nullable 여부, 응답 필드 구성이 바뀔 때마다 두 계층을 함께 수정해야 하므로 유지보수 비용도 점점 커질 수 있습니다.

기존에는 `drizzle-zod` 도입을 기준으로 검토했지만, 현재 Drizzle 공식 문서 기준으로는 `drizzle-orm/zod`가 권장 경로입니다. 따라서 이번 작업은 단순히 deprecated 패키지를 추가하는 대신, Drizzle schema를 단일 진실 공급원으로 두고 `drizzle-orm/zod`로 base Zod schema를 생성한 뒤, API 계층에서는 필요한 필드만 `pick / omit / extend / partial` 방식으로 조합하는 방향으로 정리합니다.

이번 이슈는 단순 패키지 교체가 아니라 다음 결정을 포함합니다.

- Drizzle 테이블 스키마를 도메인 공통 필드의 단일 진실 공급원으로 사용
- DB base schema와 API schema의 역할을 명확히 분리
- API 전용 필드(`password`, `reservationToken`, `isOpen`, `messageCount`, `messages` 등)는 DTO 레이어에서만 유지
- 응답 example, OpenAPI 설명, discriminated union 계약은 최종 DTO schema root 기준으로 유지
- 시간 필드는 DB에서는 `timestamp`를 사용하지만, API 계약은 기존과 동일하게 UTC ISO 8601 문자열로 유지

추가로 현재 안정판 `drizzle-orm`에서는 `drizzle-orm/zod` export가 없어, 실제 적용 시에는 공식 export가 포함된 버전 라인으로의 업그레이드까지 함께 검토해야 합니다. 따라서 이 이슈는 “deprecated 패키지 추가”가 아니라 “공식 schema 파이프라인으로의 정렬 + 관련 의존성 검토” 성격을 가집니다.

기대 효과는 다음과 같습니다.

- DB 스키마와 검증 스키마 간 중복 최소화
- 컬럼 변경 시 타입/검증 스키마 동기화 비용 감소
- Swagger/OpenAPI 생성에 사용하는 Zod 스키마의 일관성 향상
- CRUD 확장 시 반복 코드 감소
- 향후 DTO 계층 정리와 유지보수성 개선

### ✅ 작업할 내용

- [ ] `drizzle-orm/zod` 기반 적용 가능 버전 검토 및 의존성 전략 결정
- [ ] `src/db/schema.ts`의 `capsules`, `messages`를 기준으로 base select / insert Zod 스키마 생성 구조 추가
- [ ] 공통 DB 필드와 API 전용 필드의 역할을 분리할 schema 구성 방향 정리
- [ ] `capsules` 관련 DTO를 DB base schema 재사용 방식으로 점진 리팩터링
- [ ] `messages` 관련 DTO를 DB base schema 재사용 방식으로 점진 리팩터링
- [ ] API 전용 필드(`password`, `reservationToken`, `isOpen`, `messageCount`, `messages` 등)는 `extend` 기반으로 분리 유지
- [ ] discriminated union, 응답 example, OpenAPI 메타데이터가 기존 계약을 유지하는지 확인
- [ ] `pnpm run typecheck`, `pnpm run lint`, 관련 테스트, `pnpm run openapi:check` 검증
- [ ] base schema와 API schema의 역할 분리를 README 또는 관련 문서에 간단히 정리
- [ ] 기존 `drizzle-zod` 기준 논의 이슈와의 관계 정리

### ⚠️ 결정 메모

- 이 이슈는 기존 `drizzle-zod` 기반 논의를 대체하거나 supersede 하는 성격입니다.
- 공식 문서 기준 권장 경로는 `drizzle-orm/zod`입니다.
- 다만 저장소의 현재 `drizzle-orm` 버전에서 `drizzle-orm/zod`가 바로 export되지 않을 수 있으므로, 적용 시 ORM/Kit 업그레이드 영향도 함께 검토해야 합니다.
- OpenAPI 산출물은 “기존과 완전히 같은 JSON 구조”보다 “기존 API 계약과 문서 의미를 유지”하는 것을 우선 목표로 삼습니다.

### 🙋🏻 참고 자료

- 기존 이슈: #40
- #39 레이어드 아키텍처 개편 이슈
- `src/db/schema.ts`
- `src/modules/capsules/dto/shared.dto.ts`
- `src/modules/capsules/dto/create-capsule.dto.ts`
- `src/modules/capsules/dto/get-capsule.dto.ts`
- `src/modules/capsules/dto/create-message.dto.ts`
- `src/openapi/registry.ts`
- [Drizzle Zod 공식 문서](https://orm.drizzle.team/docs/zod)
