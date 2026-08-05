# pgAdmin数据库操作指南

## 📋 需要执行的所有SQL脚本

根据之前的所有改进，你需要在pgAdmin中执行以下数据库初始化脚本：

### 执行顺序（按顺序执行）

#### 1️⃣ **主数据库初始化**（必需）
- 文件：`database/postgresql_init.sql`
- 功能：创建基础表结构（用户、题目、提交、比赛等）
- 状态：✅ 已执行（你之前已创建）

#### 2️⃣ **知识题数据库初始化**（新增）
- 文件：`database/knowledge_problem_init.sql`
- 功能：创建技术基础知识题表结构
- 状态：❌ 待执行

#### 3️⃣ **判题排队机制初始化**（新增）
- 文件：`database/judge_queue_init.sql`
- 功能：创建判题排队队列表和配置
- 状态：❌ 待执行

## 🛠️ pgAdmin详细操作步骤

### 步骤1：打开pgAdmin并连接数据库

1. **打开pgAdmin**：
   ```
   Windows: C:\Program Files\PostgreSQL\14\pgAdmin 4\bin\pgAdmin4.exe
   或从开始菜单搜索：pgAdmin 4
   ```

2. **连接到PostgreSQL服务器**：
   - 左侧树形菜单 → Servers → PostgreSQL 14
   - 输入密码：安装 PostgreSQL 时为 postgres 用户设置的密码

3. **打开数据库JOL**：
   - 展开：Databases → JOL
   - 右键点击 JOL → Query Tool（查询工具）

### 步骤2：执行知识题数据库初始化

1. **打开查询工具**：
   - 右键 JOL → Query Tool

2. **加载SQL脚本**：
   - 方法1：点击工具栏的 "Open File" 按钮（文件夹图标）
   - 选择文件：`F:\HUSTOJ\nextoj\database\knowledge_problem_init.sql`
   
   或
   
   - 方法2：直接复制粘贴SQL内容

3. **执行SQL**：
   - 点击工具栏的 "Execute" 按钮（▶️播放图标）
   - 或按键盘：`F5`

4. **验证执行结果**：
   - 查看 "Messages" 标签页，应该显示执行成功
   - 左侧树形菜单刷新，应该看到新表：
     - `knowledge_problem` 表
     - `knowledge_solution` 表

### 步骤3：执行判题排队机制初始化

1. **再次打开查询工具**：
   - 右键 JOL → Query Tool

2. **加载判题排队SQL**：
   - 点击 "Open File" 按钮
   - 选择文件：`F:\HUSTOJ\nextoj\database\judge_queue_init.sql`

3. **执行SQL**：
   - 点击 "Execute" 按钮（F5）

4. **验证执行结果**：
   - Messages标签显示成功
   - 左侧刷新看到新表：
     - `judge_queue` 表
     - `judge_config` 表
     - `judge_stats` 视图

### 步骤4：验证所有表是否创建成功

在Query Tool中执行以下验证SQL：

```sql
-- 查看所有表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 应该看到以下表：
-- users, privilege, problem, solution, source_code, ...
-- knowledge_problem, knowledge_solution (新增)
-- judge_queue, judge_config (新增)
```

```sql
-- 查看所有视图
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public';

-- 应该看到：
-- judge_stats (新增)
```

### 步骤5：检查关键表数据

```sql
-- 检查知识题表结构
\d knowledge_problem

-- 检查判题排队表结构
\d judge_queue

-- 检查判题配置
SELECT * FROM judge_config;
```

## 📝 SQL脚本内容速查

### 知识题初始化SQL（速查版）

如果文件加载有问题，可以直接复制执行：

```sql
-- 技术基础知识题表
CREATE TABLE knowledge_problem (
    problem_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    question_type VARCHAR(20) NOT NULL,
    difficulty INTEGER DEFAULT 1,
    
    content JSONB NOT NULL,
    explanation TEXT,
    knowledge_points JSONB DEFAULT '[]'::jsonb,
    
    source VARCHAR(100),
    author VARCHAR(48),
    create_time TIMESTAMP DEFAULT NOW(),
    update_time TIMESTAMP DEFAULT NOW(),
    
    submit_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    
    defunct CHAR(1) DEFAULT 'N'
);

CREATE TABLE knowledge_solution (
    solution_id SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL,
    user_id VARCHAR(48) NOT NULL,
    answer JSONB NOT NULL,
    correct BOOLEAN NOT NULL,
    score INTEGER DEFAULT 0,
    
    submit_time TIMESTAMP DEFAULT NOW(),
    time_spent INTEGER DEFAULT 0,
    
    review_time TIMESTAMP,
    mastery_level INTEGER DEFAULT 0
);

CREATE INDEX idx_knowledge_category ON knowledge_problem(category, subcategory);
CREATE INDEX idx_knowledge_type ON knowledge_problem(question_type);
CREATE INDEX idx_knowledge_content ON knowledge_problem USING GIN(content);
CREATE INDEX idx_knowledge_points ON knowledge_problem USING GIN(knowledge_points);

CREATE INDEX idx_knowledge_user ON knowledge_solution(user_id);
CREATE INDEX idx_knowledge_problem ON knowledge_solution(problem_id);
CREATE INDEX idx_knowledge_correct ON knowledge_solution(correct);

INSERT INTO privilege (user_id, rightstr) VALUES ('admin', 'knowledge_editor');
```

### 判题排队初始化SQL（速查版）

```sql
CREATE TABLE judge_queue (
    queue_id SERIAL PRIMARY KEY,
    solution_id INTEGER NOT NULL,
    priority INTEGER DEFAULT 0,
    status INTEGER DEFAULT 0,
    create_time TIMESTAMP DEFAULT NOW(),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    estimated_time INTEGER DEFAULT 30,
    language INTEGER NOT NULL
);

CREATE TABLE judge_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value TEXT,
    description VARCHAR(200)
);

INSERT INTO judge_config VALUES 
('MAX_CONCURRENT', '2', '最大并发判题数'),
('MAX_TIME_LIMIT', '60', '单任务最大判题时间（秒）'),
('MAX_MEMORY_LIMIT', '100', '单任务最大内存占用（MB）'),
('QUEUE_TIMEOUT', '300', '队列超时时间（秒）'),
('CPU_THRESHOLD', '80', 'CPU使用率阈值（%）'),
('MEMORY_THRESHOLD', '1500', '内存使用阈值（MB）'),
('PRIORITY_BOOST', '10', '比赛题目优先级加成');

CREATE INDEX idx_queue_status ON judge_queue(status, priority);
CREATE INDEX idx_queue_priority ON judge_queue(priority DESC, create_time);
CREATE INDEX idx_queue_solution ON judge_queue(solution_id);

CREATE VIEW judge_stats AS
SELECT 
    COUNT(CASE WHEN status = 0 THEN 1 END) as waiting_count,
    COUNT(CASE WHEN status = 1 THEN 1 END) as running_count,
    COUNT(CASE WHEN status = 2 THEN 1 END) as completed_count,
    AVG(CASE WHEN status = 2 THEN
        EXTRACT(EPOCH FROM (end_time - start_time))
    END) as avg_judge_time,
    AVG(CASE WHEN status = 0 THEN
        EXTRACT(EPOCH FROM (NOW() - create_time))
    END) as avg_waiting_time
FROM judge_queue
WHERE create_time >= NOW() - INTERVAL '1 hour';
```

## ⚠️ 可能遇到的问题

### 问题1：文件路径找不到
**解决方案**：
- 使用绝对路径：`F:\HUSTOJ\nextoj\database\knowledge_problem_init.sql`
- 或直接复制SQL内容粘贴到Query Tool

### 问题2：表已存在错误
**解决方案**：
如果提示表已存在，可以先删除：
```sql
DROP TABLE IF EXISTS knowledge_problem CASCADE;
DROP TABLE IF EXISTS knowledge_solution CASCADE;
DROP TABLE IF EXISTS judge_queue CASCADE;
DROP TABLE IF EXISTS judge_config CASCADE;
DROP VIEW IF EXISTS judge_stats CASCADE;
```

### 问题3：权限错误
**解决方案**：
```sql
-- 确保admin用户有权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

## ✅ 执行验证清单

执行完所有SQL后，验证以下内容：

- ✅ **基础表**：users, problem, solution, contest 等（已存在）
- ✅ **知识题表**：knowledge_problem, knowledge_solution（新增）
- ✅ **判题排队表**：judge_queue, judge_config（新增）
- ✅ **统计视图**：judge_stats（新增）
- ✅ **GIN索引**：JSONB字段索引（性能优化）
- ✅ **权限配置**：admin用户权限完整

## 🎯 完成后的下一步

数据库初始化完成后，你可以：

1. **导入示例题库**：
   - 使用管理端导入功能
   - 或手动插入示例数据

2. **测试数据库连接**：
   ```bash
   Invoke-WebRequest -Uri "http://localhost:3000/api/test-db"
   ```

3. **开始使用系统**：
   - 用户端：http://localhost:3000
   - 管理端：http://localhost:3000/admin/login

## 📞 需要帮助？

如果遇到任何问题：
1. 检查Messages标签页的错误信息
2. 验证PostgreSQL服务是否运行
3. 检查数据库连接参数是否正确
4. 确认密码和权限设置

---

**总结**：在pgAdmin中需要执行两个SQL脚本：
1. ✅ knowledge_problem_init.sql（知识题系统）
2. ✅ judge_queue_init.sql（判题排队机制）

执行完成后，数据库将完整支持所有新功能！