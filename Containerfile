FROM docker.io/oven/bun:1.4.3

ENV NODE_ENV=production

WORKDIR /app

# Copy dependency manifests before source so code edits reuse the install layer.
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile --production

COPY src ./src

RUN mkdir -p /data && chown bun:bun /data

USER bun

EXPOSE 8081

CMD ["bun", "src/index.ts"]
