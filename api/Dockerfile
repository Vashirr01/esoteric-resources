# --- Base ---
FROM node:22-alpine AS base
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npx prisma generate

# --- Dev ---
FROM base AS dev
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]

# --- Prod ---
FROM base AS prod
RUN npm run build
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
