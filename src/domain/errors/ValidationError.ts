export class ValidationError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "ValidationError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}
