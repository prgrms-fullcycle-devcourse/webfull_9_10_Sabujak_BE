import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { DomainException } from "../exceptions/domain-exception";
import * as Sentry from "@sentry/node";

const defaultValidationMessage = "요청 값을 확인해 주세요.";
const defaultInternalMessage = "서버 내부 오류가 발생했습니다.";

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((issue) => ({
      field:
        issue.path.length > 0
          ? issue.path.map((segment) => String(segment)).join(".")
          : "root",
      message: issue.message,
    }));

    res.status(400).json({
      error: {
        code: "INVALID_INPUT",
        message: defaultValidationMessage,
        details,
      },
    });
    return;
  }

  if (err instanceof DomainException) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
      },
    });
    return;
  }

  console.error(err);
  Sentry.captureException(err, {
    extra: {
      "메서드(Method)": req.method,
      "요청 주소(URL)": req.originalUrl,
      "전달된 데이터(Body)":
        req.body && typeof req.body === "object" ? Object.keys(req.body) : [],
      "쿼리 스트링(Query)": req.query,
    },
  });

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: defaultInternalMessage,
    },
  });
};
