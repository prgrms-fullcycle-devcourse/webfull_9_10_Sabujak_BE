import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  createCapsule,
  createMessage,
  createSlugReservation,
  deleteCapsule,
  getCapsule,
  getOpenApiDocument,
  healthCheck,
  helloWorld,
  updateCapsule,
  verifyCapsulePassword,
} from "./app.controller";

const router = Router();

// 목적 1: 서버 휴면 방지 크론잡(14분 주기)을 수용하기 위한 전용 리미터
const healthCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15분
  max: 5, // 15분당 최대 5회 요청 허용
  standardHeaders: true, // `RateLimit-*` 헤더 반환
  legacyHeaders: false, // `X-RateLimit-*` 헤더 비활성화
  message: {
    message:
      "Too Many Requests - /healthCheck rate limit exceeded. Please try again later.",
  },
});

// 목적 2: 일반적인 글로벌 API 엔드포인트 방어 기본 리미터
const globalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1분
  max: 100, // 1분당 최대 100회 요청 허용
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too Many Requests - Global API rate limit exceeded. Please try again later.",
  },
});

// 우선순위에 따라 더 좁은 범위인 healthCheck 라우터에 전용 리미터 선행 적용
router.get("/healthCheck", healthCheckLimiter, healthCheck);

// 그 외의 모든 글로벌 라우팅의 기본 방어 용도로 전역 리미터를 적용합니다.
router.use(globalApiLimiter);

router.get("/", helloWorld);
router.get("/openapi.json", getOpenApiDocument);
router.post("/capsules/slug-reservations", createSlugReservation);
router.post("/capsules", createCapsule);
router.get("/capsules/:slugId", getCapsule);
router.post("/capsules/:slugId/verify", verifyCapsulePassword);
router.patch("/capsules/:slugId", updateCapsule);
router.delete("/capsules/:slugId", deleteCapsule);
router.post("/capsules/:slugId/messages", createMessage);

export default router;
