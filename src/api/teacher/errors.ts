// Typed teacher-API error (admin doc §22). Status-driven behaviour:
// 400 validation, 404 reload/remove, 409 conflict (preserve form),
// 500 retryable, network failure offline/retry.
export class TeacherApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "TeacherApiError";
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }
  get isConflict(): boolean {
    return this.status === 409;
  }
  get isValidation(): boolean {
    return this.status === 400;
  }
  get isNetwork(): boolean {
    return this.status === 0;
  }
}
