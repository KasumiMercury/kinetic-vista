FROM node:20

RUN corepack enable pnpm

# 作業ディレクトリを設定
WORKDIR /app

COPY package.json pnpm-lock.yaml wrangler.jsonc ./

RUN pnpm install

EXPOSE 5173

CMD ["pnpm", "run", "dev", "--host", "0.0.0.0"]

