# QA 보고서 위치 안내

이 디렉터리는 더 이상 QA 결과 보고서의 정본 저장소로 사용하지 않는다.

백엔드 유닛 테스트를 넘어서는 QA 결과물은 QA 전용 레포에서 관리한다.

- QA 보고서 정본 위치: `/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_QA/docs/reports/README.md`
- 백엔드 API 대상 보고서 폴더: `/Users/a2485/PJ/programmers/webfull_9_10_Sabujak_QA/docs/reports/backend`

## 저장 위치 기준

| 산출물 | 저장 위치 | 이유 |
| --- | --- | --- |
| 백엔드 unit 테스트 결과와 코드 | 백엔드 레포 | 구현과 함께 변경됨 |
| 백엔드 integration 테스트 코드 | 백엔드 레포 | 런타임 계약을 코드로 보장 |
| 블랙박스 QA 결과 보고서 | QA 레포 `docs/reports/backend/` | 실행 대상 기준의 검증 기록 |
| 장애보고서 / 대응 계획 | QA 레포 `docs/reports/backend/` | QA 흐름과 함께 누적 관리 |

현재 이관된 문서:

- `2026-03-25-backend-main-qa-incident-report.md`
- `2026-03-25-backend-main-qa-countermeasure-plan.md`
- `2026-03-25-backend-fix-61-duplicate-nickname-409-qa-incident-report.md`

백엔드 레포에는 구현과 함께 버전 관리되어야 하는 테스트 코드, 통합 테스트, 기술 문서만 남긴다.
