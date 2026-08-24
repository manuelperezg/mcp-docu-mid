import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  constructor(message = 'Parámetros de entrada inválidos.', details = null) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      isOperational: true,
      details
    });
  }
}
