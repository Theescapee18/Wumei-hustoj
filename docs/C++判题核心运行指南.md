# C++判题核心运行指南

## 📋 系统状态

### ✅ 前端运行状态
- **Next.js服务器**：http://localhost:3000 ✅ 运行正常
- **数据库**：PostgreSQL JOL ✅ 连接正常
- **测试账号**：admin/admin ✅ 登录成功

### 🎯 C++判题核心代码检查

**判题核心位置**：`f:\HUSTOJ\trunk\core`

**核心文件**：
- ✅ [judged/judged.cc](file:///f:\HUSTOJ\trunk\core\judged\judged.cc) - 判题守护进程（主程序）
- ✅ [judge_client/judge_client.cc](file:///f:\HUSTOJ\trunk\core\judge_client\judge_client.cc) - 判题客户端
- ✅ [judged/judgehub.cc](file:///f:\HUSTOJ\trunk\core\judged\judgehub.cc) - SaaS判题平台

**判题状态码定义**（judge_client.cc）：
```cpp
#define OJ_WT0 0     // 提交排队 ✅ 已实现
#define OJ_WT1 1     // 重判排队
#define OJ_CI 2      // 编译中
#define OJ_RI 3      // 运行中
#define OJ_AC 4      // 答案正确
#define OJ_PE 5      // 格式错误
#define OJ_WA 6      // 答案错误
#define OJ_TL 7      // 时间超限
#define OJ_ML 8      // 内存超限
#define OJ_OL 9      // 输出超限
#define OJ_RE 10     // 运行错误
#define OJ_CE 11     // 编译错误
#define OJ_CO 12     // 编译完成
#define OJ_TR 13     // 测试运行
#define OJ_MC 14     // 等待裁判确认 ✅ 已用于超时
```

## 🔧 Windows环境编译方案

### 方案1：Docker容器运行（推荐）

**优势**：
- ✅ 无需修改代码
- ✅ 完全兼容Linux环境
- ✅ 独立运行，不影响主系统

**实施步骤**：

#### 1. 安装Docker Desktop
```powershell
# 下载并安装：https://www.docker.com/products/docker-desktop
```

#### 2. 构建判题Docker镜像
```bash
# 在 trunk/core 目录创建 Dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \
    g++ \
    make \
    postgresql-client \
    libpq-dev \
    gcc \
    g++

WORKDIR /judge

COPY judged/ ./judged/
COPY judge_client/ ./judge_client/
COPY sim/ ./sim/

# 编译判题程序
RUN cd judged && g++ -o judged judged.cc -lpq
RUN cd judge_client && g++ -o judge_client judge_client.cc -lpq
```

#### 3. 运行判题容器
```powershell
docker build -t hustoj-judge trunk/core
docker run -d --name judge-server \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5432 \
  -e DB_USER=postgres \
  -e DB_PASS=你的数据库密码 \
  -e DB_NAME=JOL \
  hustoj-judge
```

### 方案2：MinGW编译（适合Windows原生）

**步骤**：

#### 1. 安装MinGW-w64
```powershell
# 下载：https://www.mingw-w64.org/
# 或使用 Chocolatey
choco install mingw
```

#### 2. 安装PostgreSQL开发库
```powershell
# PostgreSQL安装目录包含libpq开发库
# C:\Program Files\PostgreSQL\14\include
# C:\Program Files\PostgreSQL\14\lib
```

#### 3. 创建Windows适配Makefile
```makefile
# trunk/core/judge_client/makefile.windows

PG_INCLUDE = "C:\Program Files\PostgreSQL\14\include"
PG_LIB = "C:\Program Files\PostgreSQL\14\lib"

judge_client.exe: judge_client.cc
	g++ -Wall -o judge_client.exe \
	-I$(PG_INCLUDE) \
	-L$(PG_LIB) \
	judge_client.cc \
	-lpq

judged.exe: judged.cc
	g++ -Wall -o judged.exe \
	-I$(PG_INCLUDE) \
	-L$(PG_LIB) \
	judged.cc \
	-lpq
```

#### 4. 编译判题程序
```powershell
cd trunk\core\judge_client
make -f makefile.windows
```

### 方案3：Node.js模拟判题（已实现）

**当前状态**：✅ 已实现

- [judgeDaemon.ts](file:///f:\HUSTOJ\nextoj\src\lib\judgeDaemon.ts) - Node.js判题守护进程
- ✅ 严格并发控制（最多2并发）
- ✅ 队列管理（judge_queue表）
- ✅ 超时保护（60秒）
- ⚠️ 目前是模拟判题（需要真实编译器集成）

## 🚀 推荐运行方案

### **生产环境**（Docker方案）

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js    │────▶│ PostgreSQL   │────▶│ Docker判题  │
│  前端       │     │  数据库      │     │  容器       │
│ (3000端口) │     │ (JOL数据库) │     │ (独立环境) │
└─────────────┘     └──────────────┘     └─────────────┘
      ↓                    ↓                    ↓
   用户访问           队列管理           C++判题执行
   提交代码           judge_queue表      真实编译运行
```

### **开发测试环境**（Node.js模拟）

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js    │────▶│ PostgreSQL   │────▶│ Node.js     │
│  前端       │     │  数据库      │     │  模拟判题   │
│ (3000端口) │     │ (JOL数据库) │     │ (已实现)   │
└─────────────┘     └──────────────┘     └─────────────┘
      ↓                    ↓                    ↓
   用户访问           队列管理           模拟结果
   提交代码           judge_queue表      用于测试
```

## 📝 集成步骤

### 步骤1：启动前端（已完成）
```powershell
cd f:\HUSTOJ\nextoj
npm run dev
```
✅ 运行状态：http://localhost:3000 正常

### 步骤2：初始化数据库（已完成）
```sql
-- 所有必需表已创建
judge_queue ✅
judge_config ✅
solution ✅
knowledge_problem ✅
knowledge_solution ✅
```

### 步骤3：选择判题方案

#### **选项A：继续使用Node.js模拟判题**
- ✅ 已完全实现
- ✅ 适合功能测试
- ⚠️ 不执行真实编译

#### **选项B：集成Docker真实判题**
```powershell
# 1. 安装Docker Desktop
# 2. 构建判题镜像
cd f:\HUSTOJ\trunk\core
docker build -t hustoj-judge .

# 3. 运行判题容器
docker run -d --name judge-server \
  -e DB_HOST=host.docker.internal \
  -e DB_PASS=你的数据库密码 \
  hustoj-judge

# 4. 更新Node.js守护进程连接Docker
```

#### **选项C：编译Windows原生判题程序**
```powershell
# 1. 安装MinGW和PostgreSQL开发库
# 2. 修改makefile适配Windows
# 3. 编译生成judge_client.exe和judged.exe
# 4. 配置运行参数
```

## 🎯 完整运行流程

### 当前可用功能：
1. ✅ **前端访问**：http://localhost:3000
2. ✅ **用户登录**：admin/admin
3. ✅ **技术知识题**：http://localhost:3000/knowledge（前端判题）
4. ✅ **判题排队API**：已实现队列管理
5. ✅ **数据库**：PostgreSQL完整配置

### 待实施功能：
1. ⚠️ **真实判题执行**：需要Docker或Windows编译
2. ⚠️ **编译器集成**：gcc/g++编译和运行
3. ⚠️ **测试数据管理**：题目测试用例文件

## 💡 快速测试建议

### 方案1：先测试功能逻辑
使用当前Node.js模拟判题测试：
- 队列管理是否正常
- 排队机制是否工作
- 状态更新是否正确
- 超时保护是否有效

### 方案2：集成真实判题
如果需要真实编译和判题：
- 安装Docker Desktop
- 构建判题容器
- 连接到PostgreSQL数据库
- 启动判题守护进程

## 📊 性能对比

| 方案 | 开发难度 | 真实判题 | 性能 | 推荐度 |
|------|---------|---------|------|--------|
| **Node.js模拟** | ✅ 简单 | ❌ 模拟 | 中等 | ⭐⭐⭐ 测试用 |
| **Docker容器** | ⭐ 中等 | ✅ 真实 | 高 | ⭐⭐⭐⭐⭐ 生产推荐 |
| **Windows编译** | 🔴 复杂 | ✅ 真实 | 高 | ⭐⭐ 专家级 |

## ✅ 结论

**当前状态**：
- ✅ 前端完全可用
- ✅ 数据库完整配置
- ✅ 队列机制已实现
- ✅ Node.js模拟判题可用

**下一步建议**：
1. 继续使用Node.js模拟判题测试功能逻辑
2. 准备真实判题时，使用Docker方案
3. Docker方案最稳定且完全兼容原版HUSTOJ

系统已具备完整的功能框架，可以先测试功能逻辑，后续集成真实判题核心！