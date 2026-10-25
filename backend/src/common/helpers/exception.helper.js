import { statusCodes } from "./status-code.helper.js";

export class BadRequestException extends Error {
  code = statusCodes.BAD_REQUEST;
  name = "BadRequestException";

  constructor(message = "BadRequestException") {
    super(message);
  }
}

export class UnauthorizedException extends Error {
  code = statusCodes.UNAUTHORIZED;
  name = "UnauthorizedException";

  constructor(message = "UnauthorizedException") {
    super(message);
  }
}

export class ForbiddenException extends Error {
  code = statusCodes.FORBIDDEN;
  name = "ForbiddenException";

  constructor(message = "ForbiddenException") {
    super(message);
  }
}

export class ServiceUnavailableException extends Error {
  code = statusCodes.SERVICE_UNAVAILABLE;
  name = "ServiceUnavailableException";

  constructor(message = "ServiceUnavailableException") {
    super(message);
  }
}
