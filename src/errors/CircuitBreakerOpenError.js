import { AppError } from './AppError.js';

export class CircuitBreakerOpenError extends AppError {
  constructor(serviceName, cooldownMs) {
    super(`El Circuit Breaker para el servicio '${serviceName}' está ABIERTO debido a fallos recurrentes. Reintento en ${Math.round(cooldownMs / 1000)}s.`, {
      code: 'CIRCUIT_BREAKER_OPEN',
      statusCode: 503,
      isOperational: true,
      details: { service: serviceName, cooldownMs }
    });
    this.serviceName = serviceName;
    this.cooldownMs = cooldownMs;
  }
}
