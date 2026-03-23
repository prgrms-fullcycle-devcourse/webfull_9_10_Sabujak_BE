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

export class InvalidInputException extends DomainException {
  constructor(message = "요청 값을 확인해 주세요.") {
    super(400, "INVALID_INPUT", message);
    this.name = "InvalidInputException";
  }
}

export class ForbiddenPasswordException extends DomainException {
  constructor(message = "비밀번호가 일치하지 않습니다.") {
    super(403, "FORBIDDEN_PASSWORD", message);
    this.name = "ForbiddenPasswordException";
  }
}

export class CapsuleNotFoundException extends DomainException {
  constructor(message = "존재하지 않는 캡슐입니다.") {
    super(404, "CAPSULE_NOT_FOUND", message);
    this.name = "CapsuleNotFoundException";
  }
}

export class SlugAlreadyInUseException extends DomainException {
  constructor(message = "이미 사용 중인 slug 입니다.") {
    super(409, "SLUG_ALREADY_IN_USE", message);
    this.name = "SlugAlreadyInUseException";
  }
}

export class SlugReservationMismatchException extends DomainException {
  constructor(message = "slug 예약 토큰 검증에 실패했습니다.") {
    super(409, "SLUG_RESERVATION_MISMATCH", message);
    this.name = "SlugReservationMismatchException";
  }
}

export class DuplicateNicknameException extends DomainException {
  constructor(message = "중복된 닉네임입니다.") {
    super(409, "DUPLICATE_NICKNAME", message);
    this.name = "DuplicateNicknameException";
  }
}

export class MessageLimitExceededException extends DomainException {
  constructor(message = "메시지 작성 가능 개수를 초과했습니다.") {
    super(409, "MESSAGE_LIMIT_EXCEEDED", message);
    this.name = "MessageLimitExceededException";
  }
}

export class CapsuleExpiredException extends DomainException {
  constructor(message = "만료된 캡슐입니다.") {
    super(410, "CAPSULE_EXPIRED", message);
    this.name = "CapsuleExpiredException";
  }
}

export class TooManyRequestsException extends DomainException {
  constructor(message = "요청 횟수 제한을 초과했습니다.") {
    super(429, "TOO_MANY_REQUESTS", message);
    this.name = "TooManyRequestsException";
  }
}

export class InternalServerErrorException extends DomainException {
  constructor(message = "서버 내부 오류가 발생했습니다.") {
    super(500, "INTERNAL_SERVER_ERROR", message);
    this.name = "InternalServerErrorException";
  }
}
