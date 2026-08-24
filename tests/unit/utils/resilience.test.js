import { describe, it, expect } from 'vitest';
import { CircuitBreaker, executeWithRetry } from '../../../src/utils/resilience.js';
import { CircuitBreakerOpenError } from '../../../src/errors/index.js';

describe('Resilience Utility (CircuitBreaker & Retry)', () => {
  it('executes successful calls normally in CLOSED state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 1000, name: 'test-cb' });
    const result = await cb.execute(async () => 'ok');
    expect(result).toBe('ok');
    expect(cb.state).toBe('CLOSED');
  });

  it('transitions to OPEN state after exceeding failureThreshold', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 500, name: 'failing-cb' });

    await expect(cb.execute(async () => { throw new Error('fail 1'); })).rejects.toThrow('fail 1');
    expect(cb.state).toBe('CLOSED');

    await expect(cb.execute(async () => { throw new Error('fail 2'); })).rejects.toThrow('fail 2');
    expect(cb.state).toBe('OPEN');

    // Subsequent call should immediately throw CircuitBreakerOpenError without executing fn
    await expect(cb.execute(async () => 'wont run')).rejects.toThrow(CircuitBreakerOpenError);
  });

  it('transitions to HALF_OPEN after cooldown and recovers to CLOSED on success', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 50, name: 'recovering-cb' });

    await expect(cb.execute(async () => { throw new Error('fail'); })).rejects.toThrow();
    expect(cb.state).toBe('OPEN');

    // Wait for cooldown
    await new Promise(r => setTimeout(r, 60));

    const result = await cb.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(cb.state).toBe('CLOSED');
  });

  it('resets CircuitBreaker to CLOSED state', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10000, name: 'reset-cb' });
    await expect(cb.execute(async () => { throw new Error('err'); })).rejects.toThrow();
    expect(cb.state).toBe('OPEN');

    cb.reset();
    expect(cb.state).toBe('CLOSED');
    expect(cb.failureCount).toBe(0);
  });

  it('executeWithRetry retries failed operations', async () => {
    let attempts = 0;
    const result = await executeWithRetry(async () => {
      attempts++;
      if (attempts < 2) throw new Error('transient error');
      return 'success';
    }, { retries: 3, minTimeout: 10 });

    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });
});
