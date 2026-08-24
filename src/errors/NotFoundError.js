import { AppError } from './AppError.js';

export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado.', details = null) {
    super(message, {
      code: 'NOT_FOUND_ERROR',
      statusCode: 404,
      isOperational: true,
      details
    });
  }
}
