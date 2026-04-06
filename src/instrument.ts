// src/instrument.ts
import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

interface SentryExtendedError extends Error {
  status?: number;
  statusCode?: number;
}

Sentry.init({
  dsn: "https://2861c2a072eee50f5286bbf76d79d76f@o4511171686563840.ingest.us.sentry.io/4511171821371392", // .env 파일에 설정한 DSN (직접 문자열로 넣어도 됩니다)
  environment: process.env.NODE_ENV || "development",
  integrations: [nodeProfilingIntegration()],

  // 400번대 에러는 무시하고 500번대 에러만 수집하는 로직
  beforeSend(event, hint) {
    const error = hint.originalException as SentryExtendedError;
    const status = error?.status ?? error?.statusCode ?? 500;

    if (status && status >= 400 && status < 500) {
      return null;
    }
    event.tags = {
      ...event.tags,
      statusCode: status.toString(),
    };
    return event;
  },
});
