FROM node:18-bullseye

# 安装必要的依赖
RUN apt-get update && apt-get install -y \
    graphicsmagick \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# 设置工作目录
WORKDIR /app

# 设置 npm 镜像源（可选，加速下载）
# RUN npm config set registry https://registry.npmmirror.com

# 复制 package.json 和 lock 文件
COPY package.json pnpm-lock.yaml ./

# 安装 pnpm
RUN npm install -g pnpm

# 安装依赖
RUN pnpm install --frozen-lockfile

# 复制项目文件
COPY . .

# 编译项目
RUN pnpm run compile

# 默认命令
CMD ["bash"]
