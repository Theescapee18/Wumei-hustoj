# PostgreSQL 数据库安装和配置指南

## 📋 前置要求

HUSTOJ Next.js版本已经集成了PostgreSQL支持，但你需要自己安装和配置PostgreSQL数据库服务。

## 🛠️ 安装步骤

### Windows系统

1. **下载PostgreSQL**
   - 访问：https://www.postgresql.org/download/windows/
   - 下载最新的PostgreSQL版本（推荐14.x或更高版本）
   - 运行安装程序

2. **安装过程**
   - 选择安装目录（默认：C:\Program Files\PostgreSQL\14）
   - 设置超级用户密码（记住这个密码，后面需要用到）
   - 设置端口（默认：5432）
   - 选择locale（默认即可）

3. **验证安装**
   ```powershell
   # 检查PostgreSQL是否运行
   psql --version
   
   # 或通过服务管理器检查
   services.msc  # 查找postgresql-x64-14服务
   ```

### Linux系统 (Ubuntu/Debian)

```bash
# 1. 安装PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# 2. 启动PostgreSQL服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. 检查状态
sudo systemctl status postgresql

# 4. 切换到postgres用户
sudo -u postgres psql
```

### macOS系统

```bash
# 使用Homebrew安装
brew install postgresql@14

# 启动服务
brew services start postgresql@14

# 验证安装
psql --version
```

## 🗄️ 数据库初始化

### 1. 创建数据库

**Windows (PowerShell)**:
```powershell
# 进入PostgreSQL命令行
psql -U postgres

# 在psql命令行中执行
CREATE DATABASE jol;

# 退出psql
\q
```

**Linux/macOS**:
```bash
# 使用postgres用户
sudo -u postgres createdb jol

# 或在psql中创建
sudo -u postgres psql -c "CREATE DATABASE jol;"
```

### 2. 初始化数据库结构

```bash
# 进入项目目录
cd f:\HUSTOJ\nextoj

# Windows PowerShell
psql -U postgres -d jol -f database\postgresql_init.sql

# Linux/macOS
sudo -u postgres psql -d jol -f database/postgresql_init.sql
```

**如果遇到密码提示**：
- Windows: 输入安装时设置的postgres用户密码
- Linux: postgres用户默认无密码，需要先设置

### 3. 设置postgres用户密码（Linux系统）

```bash
# 进入psql
sudo -u postgres psql

# 设置密码
ALTER USER postgres WITH PASSWORD 'your_password_here';

# 退出
\q
```

## ⚙️ 环境配置

### 1. 创建环境变量文件

```bash
# 复制示例配置
cd f:\HUSTOJ\nextoj
copy .env.example .env.local

# Linux/macOS
cp .env.example .env.local
```

### 2. 编辑配置文件

打开 `.env.local` 文件，配置数据库连接：

```bash
# PostgreSQL配置
DB_TYPE=postgresql
DB_HOST=localhost          # 数据库服务器地址
DB_PORT=5432              # PostgreSQL端口（默认5432）
DB_USER=postgres          # 数据库用户名
DB_PASS=your_password     # 你设置的数据库密码
DB_NAME=jol               # 数据库名称

# JWT配置（必须设置）
JWT_SECRET=your_secret_key_here  # 随机字符串，用于JWT加密

# OJ配置
OJ_DATA=/home/judge/data  # 测试数据存放路径
UPLOAD_PATH=/var/www/html/upload  # 上传文件路径（Windows可改为C:\upload）
```

**重要提示**：
- `DB_PASS` 必须是你安装PostgreSQL时设置的密码
- `JWT_SECRET` 必须设置为任意随机字符串（用于安全加密）
- Windows系统路径使用反斜杠 `C:\path` 或正斜杠 `C:/path`

## 🧪 测试连接

### 1. 检查数据库连接

```bash
# Windows PowerShell
psql -U postgres -d jol -c "SELECT version();"

# Linux/macOS  
sudo -u postgres psql -d jol -c "SELECT version();"
```

### 2. 检查表结构

```sql
# 在psql命令行中
\c jol
\dt         # 显示所有表
\d problem  # 查看problem表结构

# 测试JSONB字段
SELECT * FROM problem LIMIT 1;
```

### 3. 启动应用测试

```bash
cd f:\HUSTOJ\nextoj

# 安装依赖（已完成）
npm install

# 启动开发服务器
npm run dev
```

访问：http://localhost:3000

## 🔧 常见问题解决

### 1. 连接失败错误

**错误**: `Connection refused` 或 `could not connect to server`

**解决方案**:
```bash
# Windows: 检查PostgreSQL服务是否运行
services.msc  # 确保postgresql服务正在运行

# Linux: 重启PostgreSQL服务
sudo systemctl restart postgresql
sudo systemctl status postgresql
```

### 2. 密码认证失败

**错误**: `password authentication failed for user "postgres"`

**解决方案**:
```bash
# Linux: 重置postgres用户密码
sudo -u postgres psql
ALTER USER postgres WITH PASSWORD 'new_password';
\q

# Windows: 使用安装时设置的密码
```

### 3. 数据库不存在

**错误**: `database "jol" does not exist`

**解决方案**:
```bash
# 创建数据库
psql -U postgres -c "CREATE DATABASE jol;"
```

### 4. 端口被占用

**错误**: `port 5432 is already in use`

**解决方案**:
```bash
# 检查端口占用（Windows）
netstat -ano | findstr :5432

# Linux
sudo netstat -tulpn | grep 5432

# 或修改.env.local中的DB_PORT为其他端口（如5433）
```

## 📊 数据库管理

### 可视化管理工具

推荐使用以下工具管理PostgreSQL数据库：

1. **pgAdmin** (官方工具)
   - 安装PostgreSQL时会自动安装
   - Windows: C:\Program Files\PostgreSQL\14\pgAdmin 4\bin\pgAdmin4.exe
   - 功能：数据库管理、查询执行、数据可视化

2. **DBeaver** (通用数据库工具)
   - 下载：https://dbeaver.io/download/
   - 支持多种数据库，包括PostgreSQL和MySQL

3. **VS Code插件**
   - 安装：`SQLTools` + `PostgreSQL driver`
   - 在VS Code中直接管理数据库

### 基本管理命令

```sql
# 连接数据库
psql -U postgres -d jol

# 查看所有数据库
\l

# 查看所有表
\dt

# 查看表结构
\d problem

# 查看表数据
SELECT * FROM problem LIMIT 10;

# 查看JSON数据
SELECT problem_id, title, tags, metadata FROM problem LIMIT 5;

# 测试JSON查询
SELECT * FROM problem WHERE tags::text != '[]';
```

## 🔄 从MySQL迁移

如果你之前使用MySQL，可以保留MySQL配置：

1. **同时支持两种数据库**
   - PostgreSQL: `DB_TYPE=postgresql`
   - MySQL: `DB_TYPE=mysql`

2. **数据迁移**
   - 使用数据导出导入工具
   - 或使用pgAdmin的数据迁移功能

## ✅ 验证清单

完成以下步骤后，系统即可正常运行：

- ✅ PostgreSQL服务已安装并运行
- ✅ 数据库 `jol` 已创建
- ✅ 数据库表结构已初始化（postgresql_init.sql）
- ✅ `.env.local` 文件已配置正确
- ✅ 数据库密码已正确设置
- ✅ JWT_SECRET已配置
- ✅ Next.js应用启动成功
- ✅ 访问 http://localhost:3000 无错误

## 📞 需要帮助？

如果遇到问题：

1. 检查PostgreSQL服务状态
2. 验证数据库连接参数
3. 查看应用启动日志错误信息
4. 使用pgAdmin等工具检查数据库结构

---

**提示**: PostgreSQL相比MySQL有更好的JSON支持，更适合现代Web应用的数据管理需求。配置完成后，你的HUSTOJ系统将拥有强大的JSONB字段支持，特别适合题目导入和管理功能。