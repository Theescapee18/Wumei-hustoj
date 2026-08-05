-- 技术基础知识题表
CREATE TABLE knowledge_problem (
    problem_id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL,
    subcategory VARCHAR(50),
    question_type VARCHAR(20) NOT NULL,
    difficulty INTEGER DEFAULT 1,
    
    -- 题目内容（JSONB存储）
    content JSONB NOT NULL,
    explanation TEXT,
    knowledge_points JSONB DEFAULT '[]'::jsonb,
    
    -- 元数据
    source VARCHAR(100),
    author VARCHAR(48),
    create_time TIMESTAMP DEFAULT NOW(),
    update_time TIMESTAMP DEFAULT NOW(),
    
    -- 统计
    submit_count INTEGER DEFAULT 0,
    correct_count INTEGER DEFAULT 0,
    
    defunct CHAR(1) DEFAULT 'N'
);

-- 知识题答题记录表
CREATE TABLE knowledge_solution (
    solution_id SERIAL PRIMARY KEY,
    problem_id INTEGER NOT NULL,
    user_id VARCHAR(48) NOT NULL,
    answer JSONB NOT NULL,
    correct BOOLEAN NOT NULL,
    score INTEGER DEFAULT 0,
    
    submit_time TIMESTAMP DEFAULT NOW(),
    time_spent INTEGER DEFAULT 0,
    
    -- 学习数据
    review_time TIMESTAMP,
    mastery_level INTEGER DEFAULT 0
);

-- 创建索引
CREATE INDEX idx_knowledge_category ON knowledge_problem(category, subcategory);
CREATE INDEX idx_knowledge_type ON knowledge_problem(question_type);
CREATE INDEX idx_knowledge_content ON knowledge_problem USING GIN(content);
CREATE INDEX idx_knowledge_points ON knowledge_problem USING GIN(knowledge_points);

CREATE INDEX idx_knowledge_user ON knowledge_solution(user_id);
CREATE INDEX idx_knowledge_problem ON knowledge_solution(problem_id);
CREATE INDEX idx_knowledge_correct ON knowledge_solution(correct);

-- 授权管理员操作知识题
INSERT INTO privilege (user_id, rightstr) VALUES ('admin', 'knowledge_editor');