FROM oven/bun:1.4.2

USER root
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

COPY index.ts config.ts emoji-catalog.ts slack-api.ts slack-app.ts ./

USER bun
CMD ["bun", "run", "index.ts"]
