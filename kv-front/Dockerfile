FROM node:24

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml wrangler.jsonc ./

RUN pnpm install

EXPOSE 5173

CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]

