FROM node:20-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build \
	&& npm prune --omit=dev \
	&& npm cache clean --force

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production

RUN apt-get update \
	&& apt-get install -y --no-install-recommends graphicsmagick ca-certificates \
	&& rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/build ./build

USER node

EXPOSE 8081

CMD ["node", "build/index.js"]
