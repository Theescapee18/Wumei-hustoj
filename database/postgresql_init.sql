-- PostgreSQL数据库初始化脚本
-- 创建数据库和表结构，优化JSON字段支持

-- 创建数据库
CREATE DATABASE jol;

-- 使用数据库
\c jol;

-- 用户表
CREATE TABLE users (
    user_id VARCHAR(48) PRIMARY KEY,
    password VARCHAR(64) NOT NULL,
    nick VARCHAR(20),
    email VARCHAR(100),
    school VARCHAR(20),
    group_name VARCHAR(48),
    ip VARCHAR(46),
    accesstime TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reg_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    defunct CHAR(1) DEFAULT 'N',
    expiry_date DATE DEFAULT '2099-01-01',
    activecode VARCHAR(18),
    coins INTEGER DEFAULT 0
);

-- 权限表
CREATE TABLE privilege (
    user_id VARCHAR(48),
    rightstr VARCHAR(30),
    valuestr VARCHAR(30),
    PRIMARY KEY (user_id, rightstr)
);

-- 题目表（增加JSON字段）
CREATE TABLE problem (
    problem_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    time_limit NUMERIC(6,2) DEFAULT 1.0,
    memory_limit INTEGER DEFAULT 128,
    description TEXT,
    input TEXT,
    output TEXT,
    sample_input TEXT,
    sample_output TEXT,
    hint TEXT,
    source VARCHAR(100),
    spj INTEGER DEFAULT 0,
    in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    defunct CHAR(1) DEFAULT 'N',
    accepted INTEGER DEFAULT 0,
    submit INTEGER DEFAULT 0,
    difficulty INTEGER DEFAULT 0,
    -- PostgreSQL JSONB字段，存储题目元数据
    metadata JSONB DEFAULT '{}'::jsonb,
    -- PostgreSQL JSONB字段，存储题目标签
    tags JSONB DEFAULT '[]'::jsonb
);

-- 题目标签索引（PostgreSQL GIN索引，优化JSON查询）
CREATE INDEX idx_problem_tags ON problem USING GIN (tags);
CREATE INDEX idx_problem_metadata ON problem USING GIN (metadata);

-- 提交记录表
CREATE TABLE solution (
    solution_id SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL,
    user_id VARCHAR(48) NOT NULL,
    nick VARCHAR(20),
    in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    language INTEGER DEFAULT 0,
    ip VARCHAR(46),
    code_length INTEGER,
    result INTEGER DEFAULT 0,
    time INTEGER DEFAULT 0,
    memory INTEGER DEFAULT 0,
    judger VARCHAR(16),
    contest_id INTEGER DEFAULT 0,
    num INTEGER DEFAULT -1,
    pass_rate NUMERIC(4,2) DEFAULT 0.00,
    remote_oj VARCHAR(12),
    -- PostgreSQL JSONB字段，存储提交详情
    details JSONB DEFAULT '{}'::jsonb
);

-- 源代码表
CREATE TABLE source_code (
    solution_id INTEGER PRIMARY KEY,
    source TEXT NOT NULL
);

-- 用户源代码表
CREATE TABLE source_code_user (
    solution_id INTEGER PRIMARY KEY,
    source TEXT NOT NULL
);

-- 编译信息表
CREATE TABLE compileinfo (
    solution_id INTEGER PRIMARY KEY,
    error TEXT
);

-- 运行信息表
CREATE TABLE runtimeinfo (
    solution_id INTEGER PRIMARY KEY,
    error TEXT
);

-- 自定义输入表
CREATE TABLE custominput (
    solution_id INTEGER PRIMARY KEY,
    input_text TEXT
);

-- 比赛表（增加JSON配置字段）
CREATE TABLE contest (
    contest_id SERIAL PRIMARY KEY,
    title VARCHAR(255) DEFAULT '',
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    defunct CHAR(1) DEFAULT 'N',
    description TEXT,
    private INTEGER DEFAULT 0,
    langmask INTEGER DEFAULT 0,
    prize VARCHAR(100),
    user_id VARCHAR(48) NOT NULL,
    -- PostgreSQL JSONB字段，存储比赛配置
    config JSONB DEFAULT '{}'::jsonb,
    -- PostgreSQL JSONB字段，存储比赛统计
    stats JSONB DEFAULT '{}'::jsonb
);

-- 比赛题目表
CREATE TABLE contest_problem (
    contest_id INTEGER,
    problem_id INTEGER,
    num INTEGER NOT NULL,
    c_submit INTEGER DEFAULT 0,
    c_accepted INTEGER DEFAULT 0,
    title VARCHAR(30) DEFAULT '',
    PRIMARY KEY (contest_id, num)
);

-- 新闻/公告表（增加JSON内容字段）
CREATE TABLE news (
    news_id SERIAL PRIMARY KEY,
    user_id VARCHAR(48) NOT NULL,
    title VARCHAR(100),
    content TEXT,
    in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    importance INTEGER DEFAULT 0,
    defunct CHAR(1) DEFAULT 'N',
    -- PostgreSQL JSONB字段，存储新闻元数据
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 登录日志表
CREATE TABLE loginlog (
    user_id VARCHAR(48),
    password VARCHAR(40),
    ip VARCHAR(46),
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引优化查询性能
CREATE INDEX idx_solution_user ON solution(user_id);
CREATE INDEX idx_solution_problem ON solution(problem_id);
CREATE INDEX idx_solution_result ON solution(result);
CREATE INDEX idx_solution_contest ON solution(contest_id);
CREATE INDEX idx_problem_title ON problem(title);
CREATE INDEX idx_contest_time ON contest(start_time, end_time);

-- 插入默认管理员账号
-- 默认管理员账号 admin/admin（md5 旧格式，首次登录后请修改密码）
INSERT INTO users (user_id, password, nick, email, defunct) VALUES
('admin', '21232f297a57a5a743894a0e4a801fc3', 'Administrator', 'admin@localhost', 'N');

-- 授权管理员权限
INSERT INTO privilege (user_id, rightstr) VALUES 
('admin', 'administrator'),
('admin', 'problem_editor'),
('admin', 'contest_creator');

-- PostgreSQL特有的JSON查询函数示例
-- 查询包含特定标签的题目
-- SELECT * FROM problem WHERE tags @> '[{"name":"数学"}]'::jsonb;

-- 查询题目元数据中的某个字段
-- SELECT problem_id, title, metadata->>'difficulty' FROM problem;

-- 更新题目JSON字段
-- UPDATE problem SET tags = tags || '[{"name":"新标签"}]'::jsonb WHERE problem_id = 1000;