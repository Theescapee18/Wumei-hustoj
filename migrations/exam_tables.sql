-- 考试功能数据表
-- 分类（管理员自定义）
CREATE TABLE IF NOT EXISTS exam_category (
  category_id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 试卷
CREATE TABLE IF NOT EXISTS exam_paper (
  paper_id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  category_id INT REFERENCES exam_category(category_id) ON DELETE SET NULL,
  description TEXT DEFAULT '',
  duration_minutes INT NOT NULL DEFAULT 60,
  defunct CHAR(1) DEFAULT 'N',
  created_by VARCHAR(48),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 试题（qtype: single/multiple/fill/judge/coding）
CREATE TABLE IF NOT EXISTS exam_question (
  question_id SERIAL PRIMARY KEY,
  paper_id INT NOT NULL REFERENCES exam_paper(paper_id) ON DELETE CASCADE,
  question_order INT NOT NULL DEFAULT 0,
  qtype VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  answer TEXT DEFAULT '',
  score INT NOT NULL DEFAULT 5,
  problem_id INT
);
CREATE INDEX IF NOT EXISTS idx_exam_question_paper ON exam_question(paper_id, question_order);

-- 作答记录（mode: practice/exam）
CREATE TABLE IF NOT EXISTS exam_attempt (
  attempt_id SERIAL PRIMARY KEY,
  paper_id INT NOT NULL REFERENCES exam_paper(paper_id) ON DELETE CASCADE,
  user_id VARCHAR(48) NOT NULL,
  mode VARCHAR(10) NOT NULL DEFAULT 'practice',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deadline TIMESTAMP,
  submitted_at TIMESTAMP,
  score NUMERIC(8,2),
  total_score INT DEFAULT 0,
  switch_count INT NOT NULL DEFAULT 0,
  auto_submitted CHAR(1) DEFAULT 'N',
  answers JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_exam_attempt_user ON exam_attempt(user_id, paper_id);
