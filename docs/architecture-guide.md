# 🏛 Sabujak BE 아키텍처 & DI 온보딩 가이드

새롭게 도입된 **NestJS 스타일의 계층형 아키텍처(Layered Architecture)** 와 **의존성 주입(Dependency Injection, DI)** 패턴에 익숙하지 않은 팀원분들을 위한 가이드입니다.

---

## 1. 계층형 아키텍처 (Layered Architecture)란?

기존에는 라우팅, HTTP 요청 파싱, 비즈니스 로직, DB 조작이 단일 파일이나 산발적인 구조에 섞여 있었습니다. 이를 **역할(관심사)에 따라 3개의 계층**으로 분리하여 코드의 가독성과 유지보수성을 극대화하는 아키텍처입니다.

### 🛡 3 Tier 계층의 역할

1. **Controller (표현 계층)**
   - HTTP 요청(`req`)과 응답(`res`)만을 처리합니다.
   - 클라이언트가 보낸 데이터를 검증(DTO, Zod)하고, 성공/실패에 따른 적절한 HTTP Status 코드를 반환합니다.
   - ❌ _이곳에는 핵심 비즈니스 로직이나 DB 쿼리가 직접 들어가서는 안 됩니다._
2. **Service (비즈니스 계층)**
   - 서비스의 핵심적인 **비즈니스 로직**을 담당합니다. (예: 슬러그 중복 검증, 권한 체크, 데이터 가공 등)
   - Controller로부터 데이터를 받아 판단을 내리고, 필요시 Repository에 DB 조작을 요청합니다.
   - ❌ _이곳에서는 Express의 `req`, `res` 등의 웹 프레임워크 종속적인 객체를 직접 다루지 않습니다._
3. **Repository (데이터 접근 계층)**
   - **데이터베이스(DB)와 통신**하는 유일한 계층입니다.
   - Drizzle ORM 등을 통해 쿼리를 실행하고 데이터를 삽입/조회하여 Service로 결과만 반환합니다.

---

## 2. 의존성 주입 (Dependency Injection, DI) 이란?

**의존성 주입(DI)** 은 클래스가 내부에서 사용할 객체(예: DB를 다루는 Repository)를 자기 스스로 생성(`new`)하는 것이 아니라, **외부에서 생성자로 주입(전달)받아 사용하는 디자인 패턴**입니다.

### 🤔 왜 굳이 귀찮게 DI를 써야 하나요?

- **결합도 완화(Decoupling)**: Service가 특정한 하나의 Repository 구현체에 꽉 묶여있지 않게 되어 구조가 유연해집니다.
- **테스트 용이성 (가장 큰 장점)**: Service가 직접 DB에 접근하는 것이 아니라 외부에서 주입된 객체를 사용하므로, 코드를 테스트할 때 가짜(Mock) Repository 객체를 손쉽게 주입할 수 있습니다. 즉, 실제 DB 연결 없이도 순수 로직만 단위 테스트(Unit Test) 하기가 매우 편해집니다.

---

## 3. 우리 프로젝트의 DI 구현 패턴 (코드 예시)

현재 우리 프로젝트는 무거운 외부 라이브러리(Inversify 등) 없이, **생성자 주입(Constructor Injection)** 방식을 직접 활용하여 싱글톤 인스턴스를 내보내는 심플한 방식을 사용합니다.

### 📝 실제 코드 (Capsules 도메인 예시)

**1️⃣ Repository 정의 및 외부로 내보내기**

```typescript
// src/modules/capsules/capsules.repository.ts
export class CapsulesRepository {
  // DB 관련 쿼리 로직
  getCapsule(slug: string) { ... }
}

// 외부에서 쓸 수 있게 생성한 인스턴스를 export 합니다.
export const capsulesRepository = new CapsulesRepository();
```

**2️⃣ Service에서 Repository 주입 받기 ⭐️**

```typescript
// src/modules/capsules/capsules.service.ts
import { capsulesRepository, CapsulesRepository } from "./capsules.repository";

export class CapsulesService {
  // 💡 핵심: 내부에서 new CapsulesRepository()를 직접 하지 않고,
  // 대신 생성자(constructor) 파라미터로 "주입(Inject)"을 받습니다!
  constructor(private readonly repository: CapsulesRepository) {}

  getCapsule(slug: string) {
    // 주입받은 repository 객체를 사용합니다.
    return this.repository.getCapsule(slug);
  }
}

// 위에서 만든 repository를 인자로 전달(주입)하여 Service 인스턴스를 만듭니다.
export const capsulesService = new CapsulesService(capsulesRepository);
```

**3️⃣ Controller에서 Service 사용하기**

```typescript
// src/modules/capsules/capsules.controller.ts
import { Request, Response } from "express";
import { capsulesService } from "./capsules.service";

export const getCapsule = (req: Request, res: Response) => {
  // Controller는 비즈니스 로직과 DB 구조를 몰라도 됩니다.
  // 그저 주입되어 완성된 서비스에 작업만 위임하면 됩니다!
  const payload = capsulesService.getCapsule(req.params.slug);
  res.status(200).json(payload);
};
```

---

## 4. 🚀 새로운 API 기능을 추가할 때의 작업 흐름 (Workflow)

새로운 기능을 개발하실 때는 아래의 순서대로 바닥(데이터 모델)부터 위(네트워크)로 올라오며 조립하시면 헷갈리지 않습니다.

1. **DTO (Data Transfer Object) 정의**
   - `src/modules/{domain}/dto/` 경로에 Zod 스키마를 작성해 입력/출력 데이터의 규격을 잡습니다.
   - 공통 필드는 `src/db/schema.ts`에서 `drizzle-orm/zod`로 생성한 base schema를 우선 재사용합니다.
   - 요청/응답에만 필요한 필드(`password`, `reservationToken`, `isOpen`, `messageCount`, `messages` 등)는 DTO에서 `extend()`로 분리합니다.
   - 응답 example, OpenAPI 설명, path/body 구분 같은 문서 메타데이터는 최종 DTO schema root에 둡니다.
2. **Repository 작성**
   - `*.repository.ts`에 순수 쿼리 함수를 추가합니다.
3. **Service 작성**
   - `*.service.ts`에서 Repository를 생성자 주입받고, 검증 등 핵심 비즈니스 로직을 추가합니다.
4. **Controller 작성**
   - `*.controller.ts`에서 Express 객체(`req`, `res`)를 인자로 받아 만들어진 Service 메서드를 호출하고 HTTP 응답을 내보냅니다.
5. **Routes 매핑 설정**
   - `*.routes.ts` 파일에 라우팅 경로와 Controller를 서로 연결해주면 완성입니다! 🎉
