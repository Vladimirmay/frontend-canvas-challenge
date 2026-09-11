export class ApiError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(code: string, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export function toApiError(error: unknown, fallbackMessage: string): ApiError {
  if (error instanceof ApiError) return error;
  return new ApiError('UNKNOWN_ERROR', fallbackMessage);
}
