FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY tsconfig.json ./
COPY src ./src
COPY supabase ./supabase

CMD ["npx", "tsx", "src/entrypoint.ts"]
