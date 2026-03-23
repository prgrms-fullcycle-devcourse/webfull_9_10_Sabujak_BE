export const errorCodes = [
  "INVALID_INPUT",
  "FORBIDDEN_PASSWORD",
  "CAPSULE_NOT_FOUND",
  "SLUG_ALREADY_IN_USE",
  "SLUG_RESERVATION_MISMATCH",
  "DUPLICATE_NICKNAME",
  "MESSAGE_LIMIT_EXCEEDED",
  "CAPSULE_EXPIRED",
  "TOO_MANY_REQUESTS",
  "INTERNAL_SERVER_ERROR",
] as const;

export type ErrorCode = (typeof errorCodes)[number];

export class DomainException extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainException";
  }
}
