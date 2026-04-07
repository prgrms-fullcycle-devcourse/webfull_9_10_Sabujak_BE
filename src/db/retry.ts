const RETRYABLE_DB_ERROR_CODES = new Set([
  "08000",
  "08001",
  "08003",
  "08004",
  "08006",
  "57P01",
  "57P02",
  "57P03",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  // ENOTFOUND is intentionally excluded so configuration mistakes such as
  // falling back to a local-only host fail fast instead of being retried.
]);

const RETRYABLE_DB_ERROR_MESSAGE = [
  /Connection terminated unexpectedly/i,
  /Connection ended unexpectedly/i,
  /server closed the connection unexpectedly/i,
  /terminating connection/i,
  /cannot connect now/i,
  /the database system is starting up/i,
  /timeout expired/i,
  /Connection terminated due to connection timeout/i,
];

const DEFAULT_RETRY_DELAY_MS = 500;
const DEFAULT_RETRY_ATTEMPTS = 5;
const DEFAULT_READINESS_TTL_MS = 30_000;

type RetryableDbError = Error & {
  code?: string;
  cause?: unknown;
};

type RetryOptions = {
  attempts?: number;
  delayMs?: number;
  logger?: (message: string, error: Error) => void;
};

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export const isRetryableDbConnectionError = (error: unknown): boolean => {
  const queue: unknown[] = [error];
  const visited = new Set<object>();

  while (queue.length > 0) {
    const current = queue.shift();

    if (!(current instanceof Error)) {
      continue;
    }

    if (visited.has(current)) {
      continue;
    }

    visited.add(current);

    const { code, message, cause } = current as RetryableDbError;

    if (
      (typeof code === "string" && RETRYABLE_DB_ERROR_CODES.has(code)) ||
      RETRYABLE_DB_ERROR_MESSAGE.some((pattern) => pattern.test(message))
    ) {
      return true;
    }

    if (cause) {
      queue.push(cause);
    }
  }

  return false;
};

export const withDbConnectionRetry = async <T>(
  task: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const attempts = options.attempts ?? DEFAULT_RETRY_ATTEMPTS;
  const baseDelayMs = options.delayMs ?? DEFAULT_RETRY_DELAY_MS;
  const logger = options.logger ?? console.warn;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !isRetryableDbConnectionError(error)) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      const retryableError =
        error instanceof Error ? error : new Error(String(error));

      logger(
        `[db] Retryable database connection error detected. retry=${attempt}/${attempts - 1} nextDelayMs=${delayMs}`,
        retryableError,
      );

      await sleep(delayMs);
    }
  }

  throw lastError;
};

type EnsureDatabaseConnectionOptions = {
  force?: boolean;
  readinessTtlMs?: number;
};

export const createDatabaseReadinessEnsurer = (
  ping: () => Promise<unknown>,
) => {
  let lastReadyAt = 0;
  let inFlightReadinessCheck: Promise<void> | null = null;

  return async (options: EnsureDatabaseConnectionOptions = {}) => {
    const force = options.force ?? false;
    const readinessTtlMs = options.readinessTtlMs ?? DEFAULT_READINESS_TTL_MS;

    if (!force && Date.now() - lastReadyAt < readinessTtlMs) {
      return;
    }

    if (inFlightReadinessCheck) {
      return inFlightReadinessCheck;
    }

    inFlightReadinessCheck = withDbConnectionRetry(async () => {
      await ping();
      lastReadyAt = Date.now();
    });

    try {
      await inFlightReadinessCheck;
    } finally {
      inFlightReadinessCheck = null;
    }
  };
};
