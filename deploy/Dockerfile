FROM node:20-alpine

WORKDIR /app
COPY server ./server
COPY web ./web
COPY data/normalized ./data/normalized

ENV HOST=0.0.0.0
ENV PORT=3000
ENV SITE_URL=https://xuanke.visc.cn
EXPOSE 3000

CMD ["node", "server/index.mjs"]
