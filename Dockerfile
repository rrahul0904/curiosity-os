FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY server.mjs ./
COPY src ./src
COPY public ./public
COPY data ./data
COPY scripts ./scripts
COPY db ./db

EXPOSE 3000
ENV PORT=3000

CMD ["node", "server.mjs"]
