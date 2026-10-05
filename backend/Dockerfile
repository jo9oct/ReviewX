FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY src ./src
COPY worker.js ./worker.js
COPY README.md ./README.md

RUN mkdir -p /app/tmp

USER node

EXPOSE 5000

CMD ["node", "src/server.js"]