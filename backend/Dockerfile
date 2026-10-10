# STATUS: UPDATED

FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev

COPY src ./src
COPY worker.js ./worker.js
COPY start.js ./start.js
COPY README.md ./README.md

RUN mkdir -p /app/tmp \
    && chown -R node:node /app/tmp

USER node

EXPOSE 5000

CMD ["node", "start.js"]