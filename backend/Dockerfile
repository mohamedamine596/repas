FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY data ./data
COPY .env ./.env

EXPOSE 4000

CMD ["node", "src/server.js"]
