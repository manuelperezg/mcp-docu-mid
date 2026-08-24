import { AppError } from './AppError.js';

export class RateLimitError extends AppError {
  constructor(message = 'Límite de peticiones excedido. Intente más tarde.', details = null) {
    super(message, {
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      isOperational: true,
      details
    });
  }
}
