import cors from "cors";
import express from "express";
import { errorHandler } from "./common/middlewares/error-handler";
import routes from "./routes";

import { logger } from "./common/utils/logger";
import pinoHttp from "pino-http";

const app = express();
const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignore: (req) => req.url === "/healthCheck",
    },
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
      }),
      res: (res) => ({
        statusCode: res.statusCode,
      }),
    },
    customSuccessMessage: (req, res, responseTime) => {
      return `${req.method} ${req.url} - ${res.statusCode} (${responseTime}ms)`;
    },
    customErrorMessage: (req, res) => {
      return `${req.method} ${req.url} - ${res.statusCode} - FAILED`;
    },
  }),
);

app.use(express.json());

app.use(
  cors({
    origin: allowedOrigins,
  }),
);
app.use("/", routes);
app.use(errorHandler);

export default app;
