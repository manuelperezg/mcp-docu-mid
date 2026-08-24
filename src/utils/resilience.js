import pRetry from 'p-retry';
import { logger } from './logger.js';
import { CircuitBreakerOpenError } from '../errors/index.js';

export class CircuitBreaker {
  constructor({ failureThreshold = 5, cooldownMs = 30000, name = 'default' } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.failureCount = 0;
    this.nextAttempt = Date.now();
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() > this.nextAttempt) {
        this.state = 'HALF_OPEN';
        logger.warn({ breaker: this.name }, `Circuit breaker ${this.name} pasando a HALF_OPEN.`);
      } else {
        throw new CircuitBreakerOpenError(this.name, this.cooldownMs);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure(err);
      throw err;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
  }

  onFailure(err) {
    this.failureCount += 1;
    logger.warn({ breaker: this.name, failures: this.failureCount, error: err?.message }, `Fallo registrado en ${this.name}`);
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.cooldownMs;
      logger.error({ breaker: this.name, cooldownMs: this.cooldownMs }, `Circuit breaker ${this.name} ABIERTO.`);
    }
  }

  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.nextAttempt = Date.now();
  }
}

export async function executeWithRetry(fn, options = {}) {
  const retries = options.retries ?? (process.env.NODE_ENV === 'test' ? 0 : 3);
  return pRetry(fn, {
    retries,
    factor: 2,
    minTimeout: 200,
    maxTimeout: 2000,
    ...options
  });
}
