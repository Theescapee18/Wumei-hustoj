-- 判题排队机制数据库初始化

-- 判题队列表
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

-- 判题配置表
CREATE TABLE judge_config (
    config_key VARCHAR(50) PRIMARY KEY,
    config_value TEXT,
    description VARCHAR(200)
);

-- 默认配置（2核2G服务器）
INSERT INTO judge_config VALUES 
('MAX_CONCURRENT', '2', '最大并发判题数'),
('MAX_TIME_LIMIT', '60', '单任务最大判题时间（秒）'),
('MAX_MEMORY_LIMIT', '100', '单任务最大内存占用（MB）'),
('QUEUE_TIMEOUT', '300', '队列超时时间（秒）'),
('CPU_THRESHOLD', '80', 'CPU使用率阈值（%）'),
('MEMORY_THRESHOLD', '1500', '内存使用阈值（MB）'),
('PRIORITY_BOOST', '10', '比赛题目优先级加成');

-- 创建索引
CREATE INDEX idx_queue_status ON judge_queue(status, priority);
CREATE INDEX idx_queue_priority ON judge_queue(priority DESC, create_time);
CREATE INDEX idx_queue_solution ON judge_queue(solution_id);

-- 判题统计视图
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