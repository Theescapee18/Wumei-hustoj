-- HUSTOJ PostgreSQL 性能优化索引脚本
-- 修复响应慢问题的正确索引创建

-- ====== 1. 权限表索引 ======
-- 加速权限查询（登录、导入题目等操作）
CREATE INDEX IF NOT EXISTS idx_privilege_user_right
ON privilege(user_id, rightstr);

-- ====== 2. 题目表索引 ======
-- 加速题目标题MD5去重查询（导入题目时检查重复）
CREATE INDEX IF NOT EXISTS idx_problem_title_md5
ON problem(md5(title));

-- 加速题目列表查询
CREATE INDEX IF NOT EXISTS idx_problem_defunct
ON problem(defunct);

-- 加速题目按时间查询
CREATE INDEX IF NOT EXISTS idx_problem_in_date
ON problem(in_date);

-- ====== 3. 提交记录表索引 ======
-- 加速用户提交记录查询
CREATE INDEX IF NOT EXISTS idx_solution_user_problem
ON solution(user_id, problem_id);

-- 加速题目提交统计查询
CREATE INDEX IF NOT EXISTS idx_solution_problem_result
ON solution(problem_id, result);

-- 加速提交时间查询
CREATE INDEX IF NOT EXISTS idx_solution_in_date
ON solution(in_date);

-- ====== 4. 判题队列索引 ======
-- 加速排队查询
CREATE INDEX IF NOT EXISTS idx_judge_queue_status
ON judge_queue(status);

-- 加速优先级排序
CREATE INDEX IF NOT EXISTS idx_judge_queue_priority
ON judge_queue(priority DESC, create_time ASC);

-- ====== 5. 知识题表索引 ======
-- 加速知识题查询
CREATE INDEX IF NOT EXISTS idx_knowledge_problem_category
ON knowledge_problem(category);

CREATE INDEX IF NOT EXISTS idx_knowledge_problem_type
ON knowledge_problem(question_type);

-- JSONB字段GIN索引（已在初始化脚本中创建）
-- CREATE INDEX IF NOT EXISTS idx_knowledge_content
-- ON knowledge_problem USING GIN(content);

-- ====== 6. 比赛表索引 ======
-- 加速比赛查询
CREATE INDEX IF NOT EXISTS idx_contest_problem_contest
ON contest_problem(contest_id);

CREATE INDEX IF NOT EXISTS idx_contest_problem_problem
ON contest_problem(problem_id);

-- ====== 验证索引创建 ======
-- 查看所有创建的索引
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;