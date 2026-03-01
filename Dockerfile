FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

# Run migrations (idempotent) then start the app
CMD ["sh", "-c", "npm run db:migrate && npm start"]
