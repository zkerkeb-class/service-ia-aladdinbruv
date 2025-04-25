FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install only production dependencies
RUN npm ci --only=production

# Install tensorflow dependencies
RUN apk add --no-cache libc6-compat python3 make g++

# Create a non-root user to run the app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001 -G nodejs

# Change ownership to the non-root user
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD node -e "try { require('http').request({ host: 'localhost', port: 3000, path: '/api/v1/health', timeout: 2000 }, (res) => process.exit(res.statusCode === 200 ? 0 : 1)).end(); } catch (err) { process.exit(1); }"

CMD ["node", "dist/app.js"] 