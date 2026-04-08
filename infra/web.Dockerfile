FROM node:24-slim

ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml biome.json /app/
COPY apps /app/apps

RUN pnpm install --frozen-lockfile

RUN pnpm --filter @kafka-link/web build

CMD ["pnpm", "--filter", "@kafka-link/web", "preview", "--host", "0.0.0.0", "--port", "4173"]
