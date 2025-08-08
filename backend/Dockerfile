# Multi-stage build for production optimization
FROM node:18-alpine AS base

# Install security updates and required packages
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    rm -rf /var/cache/apk/*

# Create app directory with proper permissions
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S superprompt -u 1001

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS dev
ENV NODE_ENV=development
RUN npm ci --include=dev
COPY . .
RUN chown -R superprompt:nodejs /app
USER superprompt
EXPOSE 3000
CMD ["dumb-init", "npm", "run", "dev"]

# Build stage
FROM base AS build
ENV NODE_ENV=production
RUN npm ci --only=production && npm cache clean --force

# Production stage
FROM node:18-alpine AS production

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory and user
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && \
    adduser -S superprompt -u 1001

# Copy built application
COPY --from=build --chown=superprompt:nodejs /app/node_modules ./node_modules
COPY --chown=superprompt:nodejs . .

# Remove unnecessary files
RUN rm -rf tests/ docs/ .git/ .github/ *.md .env.example

# Create logs directory
RUN mkdir -p logs && chown superprompt:nodejs logs

# Set security headers and optimize Node.js
ENV NODE_ENV=production \
    NODE_OPTIONS="--max-old-space-size=512" \
    NPM_CONFIG_LOGLEVEL=warn

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

# Switch to non-root user
USER superprompt

# Expose port
EXPOSE 3000

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]