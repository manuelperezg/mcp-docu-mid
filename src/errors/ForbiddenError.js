import { AppError } from './AppError.js';

export class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado o sesión no autorizada.', details = null) {
    super(message, {
      code: 'FORBIDDEN_ERROR',
      statusCode: 403,
      isOperational: true,
      details
    });
  }
}
