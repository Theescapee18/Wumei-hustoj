# syntax=docker/dockerfile:1
# ===== 构建阶段 =====
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* 变量在构建时内联进客户端代码，需通过 build-arg 传入
ARG NEXT_PUBLIC_OJ_NAME="Online Judge"
ENV NEXT_PUBLIC_OJ_NAME=$NEXT_PUBLIC_OJ_NAME
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ===== 运行阶段（含判题工具链）=====
FROM node:22-bookworm-slim AS runner

# 判题所需工具链：C(gcc) C++(g++) Java(jdk) Python(python3)；JS 使用镜像自带 node
RUN apt-get update && apt-get install -y --no-install-recommends \
      gcc g++ default-jdk-headless python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    OJ_DATA=/app/judge-data

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 题目测试数据目录（由 compose 挂载持久化）
RUN mkdir -p /app/judge-data

EXPOSE 3000
CMD ["node", "server.js"]
