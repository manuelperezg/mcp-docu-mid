import rateLimit from 'express-rate-limit';
import { config } from '../utils/config.js';
import { RateLimitError } from '../errors/index.js';

export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMax,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new RateLimitError(`Límite de ${config.rateLimitMax} peticiones por ventana excedido.`));
  }
});
