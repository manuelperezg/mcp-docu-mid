export class AppError extends Error {
  constructor(message, { code = 'INTERNAL_ERROR', statusCode = 500, isOperational = true, details = null } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toMcpResponse() {
    return {
      isError: true,
      content: [{ type: 'text', text: `[${this.code}] ${this.message}` }]
    };
  }

  toJson() {
    return {
      error: {
        name: this.name,
        code: this.code,
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.details ? { details: this.details } : {})
      }
    };
  }
}
