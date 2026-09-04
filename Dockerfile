FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY server.mjs ./
COPY src ./src
COPY public ./public
COPY data ./data
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.mjs"]
