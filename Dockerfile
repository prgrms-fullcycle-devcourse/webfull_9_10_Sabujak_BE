# -----------------------------------------------------------------------------
# Base Stage: 패키지 매니저 일원화 (pnpm 설치)
# -----------------------------------------------------------------------------
FROM node:20-alpine AS base
# CI 환경과 동일한 pnpm v9 버전을 전역 설치하여 빌드 일관성 보장
RUN npm install -g pnpm@9
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 1: Builder (의존성 설치 및 TypeScript 컴파일)
# -----------------------------------------------------------------------------
FROM base AS builder
# pnpm 환경에 맞게 lock 파일 변경
COPY package.json pnpm-lock.yaml ./
# 무결성을 보장하는 설치 명령어 (--frozen-lockfile)
RUN pnpm install --frozen-lockfile

COPY . .
# TypeScript 코드를 dist 폴더로 컴파일
RUN pnpm run build

# -----------------------------------------------------------------------------
# Stage 2: Dependencies (운영 환경 최소 의존성 캡슐화)
# -----------------------------------------------------------------------------
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
# 프로덕션 실행에 필요한 라이브러리만 설치하여 이미지 경량화 및 공격 표면 축소
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# -----------------------------------------------------------------------------
# Stage 3: Production Runner (최소 권한 및 ESM 런타임 최적화)
# -----------------------------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production

# 보안 핵심: 모든 복사 파일의 소유권을 root에서 node로 명시적 이관
# Native ESM 런타임 인식을 위해 package.json 필수 복사
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

# root 계정 실행 차단
USER node
EXPOSE 3000

# 트랜스파일링된 결과물 실행
CMD ["node", "dist/index.js"]
