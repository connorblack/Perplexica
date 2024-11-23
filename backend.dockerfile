FROM node:18-slim

WORKDIR /home/perplexica

# Install pnpm
RUN npm install -g pnpm

COPY src /home/perplexica/src
COPY tsconfig.json /home/perplexica/
COPY drizzle.config.ts /home/perplexica/
COPY package.json /home/perplexica/
COPY pnpm-lock.yaml /home/perplexica/

RUN mkdir /home/perplexica/data

RUN pnpm install
RUN pnpm build

CMD ["pnpm", "start"]
