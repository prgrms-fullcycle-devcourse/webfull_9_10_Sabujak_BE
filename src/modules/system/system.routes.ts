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
