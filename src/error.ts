export class CLIError extends Error {
  readonly errorCode: number
  readonly message: string
  readonly name = 'CLIError'

  constructor(message: string, errorCode = 1) {
    super()
    this.message = message
    this.errorCode = errorCode
  }

  toString() {
    return this.message
  }
}

export enum CLIErrorCode {
  GENERAL_ERROR = 1,
  NOT_FOUND_CHROMIUM = 2,
  LISTEN_PORT_IS_ALREADY_USED = 3,
  CANNOT_SPAWN_SNAP_CHROMIUM = 4,
}

export function error(
  msg: string,
  errorCode = CLIErrorCode.GENERAL_ERROR
): never {
  throw new CLIError(msg, errorCode)
}

export const isError = (e: unknown): e is NodeJS.ErrnoException =>
  Object.prototype.toString.call(e) === '[object Error]'
