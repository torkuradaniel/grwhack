FROM node:20-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm install --no-save tsx typescript

COPY tsconfig.json ./
COPY src ./src
COPY supabase ./supabase

CMD ["npx", "tsx", "src/entrypoint.ts"]
