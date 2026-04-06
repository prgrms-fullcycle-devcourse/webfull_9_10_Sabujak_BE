import { Router } from "express";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import { openApiDocument } from "../../openapi/registry";
import {
  getOpenApiDocument,
  healthCheck,
  helloWorld,
} from "./system.controller";

const router = Router();

const healthCheckLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too Many Requests - /healthCheck rate limit exceeded. Please try again later.",
  },
});

const globalApiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too Many Requests - Global API rate limit exceeded. Please try again later.",
  },
});

router.get("/healthCheck", healthCheckLimiter, healthCheck);

router.get("/debug-500", () => {
  // 나중에 삭제 ^^
  throw new Error("글로벌 errorHandler를 통한 Sentry 연동 테스트입니다!");
});

router.use(globalApiLimiter);
router.get("/", helloWorld);
router.get("/openapi.json", getOpenApiDocument);
router.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(openApiDocument, {
    customSiteTitle: "Sabujak API Docs",
  }),
);

export default router;
