FROM node:24-alpine
WORKDIR /app
COPY package.json server.mjs game.mjs ./
COPY public ./public
RUN mkdir data && chown -R node:node /app
USER node
ENV PORT=3000 NODE_ENV=production DATA_DIR=/app/data
EXPOSE 3000
CMD ["node","server.mjs"]
