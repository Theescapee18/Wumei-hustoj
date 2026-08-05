# Wumei OJ

社团在线评测（Online Judge）平台，基于 [HUSTOJ](https://github.com/zhblue/hustoj) 的判题理念，使用 Next.js + PostgreSQL 全新重写。面向社团内部教学与训练场景，在 2 核 2G 低配服务器上即可稳定服务约 50 人。

## 功能概览

**做题与判题**
- 题目管理：单题编辑、XML/FPS 文件导入、JSON 批量粘贴导入、导出
- 真实判题：编译 → 逐用例运行 → 输出比对，支持 AC/PE/WA/TLE/RE/CE 判定
- 支持语言：**C、C++、Java、Python、JavaScript**
- 提交前编译检查，编译错误信息原文回显
- 判题队列：并发受控（默认 2），支持优先级与二次判题

**考试系统**
- 管理员自定义考试分类，导入试卷时下拉选择
- 试卷导入支持文件上传与 JSON 批量粘贴，可设置考试时长
- 答案独立窗口导入，缺答案自动提示
- 两种模式：自由练习（随时提交）、模拟考试（倒计时结束自动交卷）
- 题型：单选、多选、填空、判断、算法题（算法题接入判题机按通过率给分）
- 考试模式防切屏，切屏超 3 次自动交卷；成绩与切屏次数、交卷方式全程留痕

**其他**
- 竞赛、排名、状态列表、公告、班级社团、知识题库
- 用户由管理员导入（支持批量），无自助注册
- 权限体系：administrator / problem_editor / contest_creator

## 技术栈

| 层 | 选型 |
|---|---|
| 框架 | Next.js 16（App Router）+ React 19 + TypeScript |
| UI | React-Bootstrap 5 |
| 数据库 | PostgreSQL 18（`pg` 连接池，兼容 MySQL 降级） |
| 鉴权 | JWT（httpOnly Cookie）+ 签名验证码 |
| 判题 | Node 子进程调用本机工具链，随应用进程启动守护线程 |
| 部署 | Docker + Docker Compose |

## 快速开始（本地开发）

前置：Node.js 22+、PostgreSQL 18+

```bash
git clone https://github.com/Theescapee18/Wumei-hustoj.git
cd Wumei-hustoj
npm ci

cp .env.example .env.local   # 按实际情况填写数据库连接与 JWT_SECRET
```

初始化数据库（先建库，再按顺序执行脚本）：

```bash
createdb -U postgres jol

psql -U postgres -d jol -f database/postgresql_init.sql
psql -U postgres -d jol -f database/judge_queue_init.sql
psql -U postgres -d jol -f database/knowledge_problem_init.sql
psql -U postgres -d jol -f database/class_club_init.sql
psql -U postgres -d jol -f database/performance_indexes.sql
psql -U postgres -d jol -f migrations/exam_tables.sql
```

启动：

```bash
npm run dev        # http://localhost:3000
```

默认管理员 `admin / admin`，**首次登录后请立即修改密码**。

## Docker 部署（推荐，2 核 2G 可用）

```bash
# 1. 准备环境变量（至少改掉 DB_PASS 与 JWT_SECRET）
cp .env.example .env

# 2. 构建并启动（首次启动自动建表）
docker compose up -d --build

# 3. 访问 http://服务器IP
```

镜像内已预装 gcc / g++ / JDK / python3 判题工具链，JavaScript 使用镜像自带 Node。
题目测试数据与数据库分别持久化在 `judgedata`、`pgdata` 卷中。

也可直接使用 CI 构建好的镜像（见 [Packages](https://github.com/Theescapee18/Wumei-hustoj/pkgs/container/wumei-hustoj)）：

```bash
docker pull ghcr.io/theescapee18/wumei-hustoj:latest
```

## 目录结构

```
src/app/            页面与 API 路由（App Router）
  api/              后端接口
  admin/            管理端页面
  exams/            考试相关页面
src/lib/            共享库（db、auth、judgeExecutor、judgeDaemon、examGrade）
src/components/     公共组件（导航等）
database/           建表与索引 SQL
migrations/         增量迁移 SQL
docs/               设计与运维文档
.github/workflows/  CI/CD 工作流
```

## 参与协作

请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)，其中包含分支模型、提交信息规范、PR 流程与代码规范。

## 许可

本项目参考 HUSTOJ（GPL-2.0）的设计实现，遵循 [GPL-2.0](LICENSE) 授权。
