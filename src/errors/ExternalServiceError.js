import { AppError } from './AppError.js';

export class ExternalServiceError extends AppError {
  constructor(serviceName, message = 'Fallo en la comunicación con el servicio externo.', details = null) {
    super(`[${serviceName}] ${message}`, {
      code: 'EXTERNAL_SERVICE_ERROR',
      statusCode: 502,
      isOperational: true,
      details: {
        service: serviceName,
        ...(details && typeof details === 'object' ? details : { raw: details })
      }
    });
    this.serviceName = serviceName;
  }
}
