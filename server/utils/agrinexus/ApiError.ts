export class ApiError extends Error {
  public statusCode: number;
  public details: any;

  constructor(statusCode: number, message: string, details: any = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
