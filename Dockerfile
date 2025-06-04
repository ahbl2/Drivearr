# Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app
COPY frontend ./frontend
RUN cd frontend && npm install && npm run build

FROM node:18-alpine
WORKDIR /app

ENV NODE_ENV=production

COPY backend ./backend
COPY --from=builder /app/frontend/dist ./frontend

COPY package*.json ./
RUN npm install

EXPOSE 3000
CMD ["node", "backend/index.js"]
