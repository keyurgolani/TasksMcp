# Multi-stage build for optimized Node.js container
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production --silent

# Copy source code
COPY src/ ./src/

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install system dependencies for performance monitoring
RUN apk add --no-cache \
    dumb-init \
    tini \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S mcpuser && adduser -S mcpuser -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Create necessary directories and set permissions
RUN mkdir -p /app/data /app/logs /app/backups && \
    chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Set environment variables for production and performance
ENV NODE_ENV=production
ENV DATA_DIRECTORY=/app/data
ENV LOG_FILE_PATH=/app/logs/combined.log
ENV HEALTH_CHECK_ENABLED=true
ENV MONITORING_ENABLED=true
ENV NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

# Expose monitoring port
EXPOSE 9090

# Health check with extended timeout for performance monitoring
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node dist/health-check.js || exit 1

# Use tini for proper signal handling and zombie reaping
ENTRYPOINT ["tini", "--"]

# Start the application with performance monitoring enabled
CMD ["node", "--expose-gc", "--max-old-space-size=2048", "dist/index.js"]