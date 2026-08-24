# ==========================================
# Multi-Stage Production Dockerfile for MCP-DOC-MID
# ==========================================

# 1. Builder Stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package*.json ./

# Instalar dependencias de producción limpias
RUN npm ci --omit=dev && npm cache clean --force

# 2. Runner Stage (Minimal & Secure)
FROM node:20-alpine AS runner

WORKDIR /app

# Variables de entorno predeterminadas de producción
ENV NODE_ENV=production \
    TRANSPORT_MODE=sse \
    PORT=3000 \
    LOG_LEVEL=info \
    STATS_STORAGE_ENABLED=true \
    STATS_STORAGE_PATH=data/stats.json \
    SWAGGERS_DIR=swaggers

# Crear carpetas y ajustar permisos para usuario no privilegiado 'node'
RUN mkdir -p /app/data /app/swaggers /app/.cache && \
    chown -R node:node /app

# Copiar artefactos y código fuente
COPY --chown=node:node package*.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node src ./src
COPY --chown=node:node swaggers ./swaggers
COPY --chown=node:node data ./data

# Cambiar a usuario no-root por seguridad
USER node

# Exponer puerto HTTP / SSE
EXPOSE 3000

# Healthcheck nativo con Node.js fetch (cero dependencias externas como curl)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health/ready').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Comando de inicio
CMD ["node", "src/index.js"]
