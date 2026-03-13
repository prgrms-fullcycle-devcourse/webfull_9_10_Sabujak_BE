# 1. 의존성 설치 및 빌드 스테이지
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# 💡 TypeScript 프로젝트라면 빌드 수행 (package.json에 build 스크립트 필요)
# RUN npm run build

# 2. 운영용 의존성 '만' 설치하는 스테이지 (최적화)
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# 💡 프로덕션 실행에 필요한 라이브러리만 설치 (이미지 용량 대폭 감소)
RUN npm ci --omit=dev

# 3. 프로덕션 실행 스테이지
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# 💡 최적화된 node_modules 복사
COPY --from=deps /app/node_modules ./node_modules

# TS 환경에 맞게 결과물 복사
# (JS라면 COPY --from=builder /app/src ./src)
COPY --from=builder /app/src ./src 

USER node
EXPOSE 3000

# 프로젝트 환경에 맞게 index 진입점 수정
CMD ["node", "src/index.js"] 
