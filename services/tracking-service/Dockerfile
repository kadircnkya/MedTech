FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
ENV NODE_ENV=production
ENV SERVICE_NAME=tracking-service
EXPOSE 3007
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3007/health || exit 1
CMD ["node", "dist/index.js"]
