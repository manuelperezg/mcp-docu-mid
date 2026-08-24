import { AppError } from './AppError.js';

export class AuthenticationError extends AppError {
  constructor(message = 'Autenticación requerida o credenciales inválidas.', details = null) {
    super(message, {
      code: 'AUTHENTICATION_ERROR',
      statusCode: 401,
      isOperational: true,
      details
    });
  }
}
