-- HUSTOJ 班级和社团组织功能数据库初始化脚本
-- PostgreSQL版本
-- 创建日期: 2026-06-27

-- ============================================
-- 1. 班级表 (class)
-- ============================================
CREATE TABLE IF NOT EXISTS class (
    class_id SERIAL PRIMARY KEY,
    class_name VARCHAR(100) NOT NULL UNIQUE,
    class_code VARCHAR(20) UNIQUE,  -- 班级代码，便于学生查找加入
    head_teacher VARCHAR(48),  -- 班主任用户ID
    description TEXT,  -- 班级描述
    grade VARCHAR(20),  -- 年级
    department VARCHAR(100),  -- 院系
    max_members INTEGER DEFAULT 100,  -- 最大成员数
    defunct CHAR(1) DEFAULT 'N',  -- 是否停用: Y-停用, N-正常
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(48),  -- 创建者用户ID

    -- 外键约束
    CONSTRAINT fk_class_head_teacher FOREIGN KEY (head_teacher) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_class_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 班级表索引
CREATE INDEX idx_class_name ON class(class_name);
CREATE INDEX idx_class_code ON class(class_code);
CREATE INDEX idx_class_head_teacher ON class(head_teacher);
CREATE INDEX idx_class_grade ON class(grade);
CREATE INDEX idx_class_department ON class(department);
CREATE INDEX idx_class_defunct ON class(defunct);

-- ============================================
-- 2. 社团表 (club)
-- ============================================
CREATE TABLE IF NOT EXISTS club (
    club_id SERIAL PRIMARY KEY,
    club_name VARCHAR(100) NOT NULL UNIQUE,
    club_code VARCHAR(20) UNIQUE,  -- 社团代码，便于学生查找加入
    president VARCHAR(48),  -- 社长用户ID
    vice_president VARCHAR(48),  -- 副社长用户ID
    description TEXT,  -- 社团描述
    category VARCHAR(50),  -- 社团类别（科技、文艺、体育等）
    max_members INTEGER DEFAULT 200,  -- 最大成员数
    defunct CHAR(1) DEFAULT 'N',  -- 是否停用: Y-停用, N-正常
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(48),  -- 创建者用户ID

    -- 外键约束
    CONSTRAINT fk_club_president FOREIGN KEY (president) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_club_vice_president FOREIGN KEY (vice_president) REFERENCES users(user_id) ON DELETE SET NULL,
    CONSTRAINT fk_club_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
);

-- 社团表索引
CREATE INDEX idx_club_name ON club(club_name);
CREATE INDEX idx_club_code ON club(club_code);
CREATE INDEX idx_club_president ON club(president);
CREATE INDEX idx_club_category ON club(category);
CREATE INDEX idx_club_defunct ON club(defunct);

-- ============================================
-- 3. 班级成员关系表 (class_member)
-- ============================================
CREATE TABLE IF NOT EXISTS class_member (
    id SERIAL PRIMARY KEY,
    class_id INTEGER NOT NULL,
    user_id VARCHAR(48) NOT NULL,
    join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status CHAR(1) DEFAULT 'Y',  -- Y-正常, N-退出
    role VARCHAR(20) DEFAULT 'student',  -- 角色: student-学生, monitor-班长, vice_monitor-副班长
    remark TEXT,  -- 备注

    -- 唯一约束：一个用户在一个班级中只能有一条记录
    CONSTRAINT uk_class_member UNIQUE (class_id, user_id),

    -- 外键约束
    CONSTRAINT fk_class_member_class FOREIGN KEY (class_id) REFERENCES class(class_id) ON DELETE CASCADE,
    CONSTRAINT fk_class_member_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 班级成员表索引
CREATE INDEX idx_class_member_class ON class_member(class_id);
CREATE INDEX idx_class_member_user ON class_member(user_id);
CREATE INDEX idx_class_member_status ON class_member(status);

-- ============================================
-- 4. 社团成员关系表 (club_member)
-- ============================================
CREATE TABLE IF NOT EXISTS club_member (
    id SERIAL PRIMARY KEY,
    club_id INTEGER NOT NULL,
    user_id VARCHAR(48) NOT NULL,
    join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status CHAR(1) DEFAULT 'Y',  -- Y-正常, N-退出
    role VARCHAR(20) DEFAULT 'member',  -- 角色: member-成员, president-社长, vice_president-副社长, manager-管理员
    remark TEXT,  -- 备注

    -- 唯一约束：一个用户在一个社团中只能有一条记录
    CONSTRAINT uk_club_member UNIQUE (club_id, user_id),

    -- 外键约束
    CONSTRAINT fk_club_member_club FOREIGN KEY (club_id) REFERENCES club(club_id) ON DELETE CASCADE,
    CONSTRAINT fk_club_member_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 社团成员表索引
CREATE INDEX idx_club_member_club ON club_member(club_id);
CREATE INDEX idx_club_member_user ON club_member(user_id);
CREATE INDEX idx_club_member_status ON club_member(status);

-- ============================================
-- 5. 修改用户表 - 添加班级和社团字段
-- ============================================
-- 为兼容性考虑，先检查字段是否存在再添加
DO $$
BEGIN
    -- 添加 class_id 字段（主班级）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'class_id'
    ) THEN
        ALTER TABLE users ADD COLUMN class_id INTEGER;
        ALTER TABLE users ADD CONSTRAINT fk_user_class FOREIGN KEY (class_id) REFERENCES class(class_id) ON DELETE SET NULL;
    END IF;

    -- 添加主社团字段（保留字段，主要用于标记主社团）
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'primary_club_id'
    ) THEN
        ALTER TABLE users ADD COLUMN primary_club_id INTEGER;
        ALTER TABLE users ADD CONSTRAINT fk_user_primary_club FOREIGN KEY (primary_club_id) REFERENCES club(club_id) ON DELETE SET NULL;
    END IF;
END $$;

-- 用户表索引
CREATE INDEX IF NOT EXISTS idx_user_class ON users(class_id);
CREATE INDEX IF NOT EXISTS idx_user_primary_club ON users(primary_club_id);

-- ============================================
-- 6. 触发器 - 自动更新 updated_at 字段
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 班级表更新触发器
DROP TRIGGER IF EXISTS update_class_updated_at ON class;
CREATE TRIGGER update_class_updated_at BEFORE UPDATE ON class
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 社团表更新触发器
DROP TRIGGER IF EXISTS update_club_updated_at ON club;
CREATE TRIGGER update_club_updated_at BEFORE UPDATE ON club
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. 视图 - 班级成员统计视图
-- ============================================
CREATE OR REPLACE VIEW class_member_stats AS
SELECT
    c.class_id,
    c.class_name,
    c.class_code,
    c.head_teacher,
    u.nick AS head_teacher_name,
    c.grade,
    c.department,
    COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END) AS member_count,
    c.max_members,
    c.defunct,
    c.created_at
FROM class c
LEFT JOIN class_member cm ON c.class_id = cm.class_id
LEFT JOIN users u ON c.head_teacher = u.user_id
GROUP BY c.class_id, c.class_name, c.class_code, c.head_teacher, u.nick, c.grade, c.department, c.max_members, c.defunct, c.created_at;

-- ============================================
-- 8. 视图 - 社团成员统计视图
-- ============================================
CREATE OR REPLACE VIEW club_member_stats AS
SELECT
    cl.club_id,
    cl.club_name,
    cl.club_code,
    cl.president,
    u.nick AS president_name,
    cl.vice_president,
    u2.nick AS vice_president_name,
    cl.category,
    COUNT(DISTINCT CASE WHEN cm.status = 'Y' THEN cm.user_id END) AS member_count,
    cl.max_members,
    cl.defunct,
    cl.created_at
FROM club cl
LEFT JOIN club_member cm ON cl.club_id = cm.club_id
LEFT JOIN users u ON cl.president = u.user_id
LEFT JOIN users u2 ON cl.vice_president = u.user_id
GROUP BY cl.club_id, cl.club_name, cl.club_code, cl.president, u.nick, cl.vice_president, u2.nick, cl.category, cl.max_members, cl.defunct, cl.created_at;

-- ============================================
-- 9. 权限管理 - 添加班级和社团管理权限
-- ============================================
-- 班级管理员权限
INSERT INTO privilege (user_id, rightstr, valuestr) VALUES
('admin', 'class_manager', 'Y')
ON CONFLICT (user_id, rightstr) DO NOTHING;

-- 社团管理员权限
INSERT INTO privilege (user_id, rightstr, valuestr) VALUES
('admin', 'club_manager', 'Y')
ON CONFLICT (user_id, rightstr) DO NOTHING;

-- 班级创建权限
INSERT INTO privilege (user_id, rightstr, valuestr) VALUES
('admin', 'class_creator', 'Y')
ON CONFLICT (user_id, rightstr) DO NOTHING;

-- 社团创建权限
INSERT INTO privilege (user_id, rightstr, valuestr) VALUES
('admin', 'club_creator', 'Y')
ON CONFLICT (user_id, rightstr) DO NOTHING;

-- ============================================
-- 10. 示例数据插入
-- ============================================
-- 示例班级
INSERT INTO class (class_name, class_code, grade, department, description, max_members) VALUES
('计算机科学2023级1班', 'CS202301', '2023级', '计算机学院', '计算机科学与技术专业2023级1班', 50),
('计算机科学2023级2班', 'CS202302', '2023级', '计算机学院', '计算机科学与技术专业2023级2班', 50),
('软件工程2023级1班', 'SE202301', '2023级', '软件学院', '软件工程专业2023级1班', 45)
ON CONFLICT (class_name) DO NOTHING;

-- 示例社团
INSERT INTO club (club_name, club_code, category, description, max_members) VALUES
('编程算法协会', 'PROG2024', '科技', '热爱编程和算法，定期举办编程竞赛和培训', 150),
('开源软件开发社', 'OSS2024', '科技', '参与开源项目，学习软件开发最佳实践', 100),
('ACM竞赛队', 'ACM2024', '科技', 'ACM-ICPC竞赛训练队', 50)
ON CONFLICT (club_name) DO NOTHING;

-- ============================================
-- 11. 存储过程 - 用户加入班级
-- ============================================
CREATE OR REPLACE PROCEDURE join_class(
    p_user_id VARCHAR(48),
    p_class_id INTEGER,
    p_role VARCHAR(20) DEFAULT 'student'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_count INTEGER;
    v_max_members INTEGER;
    v_class_defunct CHAR(1);
BEGIN
    -- 检查班级是否存在和状态
    SELECT max_members, defunct INTO v_max_members, v_class_defunct
    FROM class WHERE class_id = p_class_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '班级不存在';
    END IF;

    IF v_class_defunct = 'Y' THEN
        RAISE EXCEPTION '班级已停用';
    END IF;

    -- 检查是否已满
    SELECT COUNT(*) INTO v_current_count
    FROM class_member
    WHERE class_id = p_class_id AND status = 'Y';

    IF v_current_count >= v_max_members THEN
        RAISE EXCEPTION '班级成员已满';
    END IF;

    -- 插入或更新成员记录
    INSERT INTO class_member (class_id, user_id, role, status, join_time)
    VALUES (p_class_id, p_user_id, p_role, 'Y', CURRENT_TIMESTAMP)
    ON CONFLICT (class_id, user_id)
    DO UPDATE SET status = 'Y', join_time = CURRENT_TIMESTAMP;

    -- 更新用户主班级（如果还没有）
    UPDATE users SET class_id = p_class_id
    WHERE user_id = p_user_id AND class_id IS NULL;

    COMMIT;
END;
$$;

-- ============================================
-- 12. 存储过程 - 用户加入社团
-- ============================================
CREATE OR REPLACE PROCEDURE join_club(
    p_user_id VARCHAR(48),
    p_club_id INTEGER,
    p_role VARCHAR(20) DEFAULT 'member'
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_current_count INTEGER;
    v_max_members INTEGER;
    v_club_defunct CHAR(1);
BEGIN
    -- 检查社团是否存在和状态
    SELECT max_members, defunct INTO v_max_members, v_club_defunct
    FROM club WHERE club_id = p_club_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '社团不存在';
    END IF;

    IF v_club_defunct = 'Y' THEN
        RAISE EXCEPTION '社团已停用';
    END IF;

    -- 检查是否已满
    SELECT COUNT(*) INTO v_current_count
    FROM club_member
    WHERE club_id = p_club_id AND status = 'Y';

    IF v_current_count >= v_max_members THEN
        RAISE EXCEPTION '社团成员已满';
    END IF;

    -- 插入或更新成员记录
    INSERT INTO club_member (club_id, user_id, role, status, join_time)
    VALUES (p_club_id, p_user_id, p_role, 'Y', CURRENT_TIMESTAMP)
    ON CONFLICT (club_id, user_id)
    DO UPDATE SET status = 'Y', join_time = CURRENT_TIMESTAMP;

    COMMIT;
END;
$$;

-- ============================================
-- 13. 存储过程 - 用户退出班级
-- ============================================
CREATE OR REPLACE PROCEDURE leave_class(
    p_user_id VARCHAR(48),
    p_class_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 更新成员状态为退出
    UPDATE class_member
    SET status = 'N'
    WHERE user_id = p_user_id AND class_id = p_class_id;

    -- 如果是主班级，清除用户表的班级字段
    UPDATE users SET class_id = NULL
    WHERE user_id = p_user_id AND class_id = p_class_id;

    COMMIT;
END;
$$;

-- ============================================
-- 14. 存储过程 - 用户退出社团
-- ============================================
CREATE OR REPLACE PROCEDURE leave_club(
    p_user_id VARCHAR(48),
    p_club_id INTEGER
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- 更新成员状态为退出
    UPDATE club_member
    SET status = 'N'
    WHERE user_id = p_user_id AND club_id = p_club_id;

    -- 如果是主社团，清除用户表的主社团字段
    UPDATE users SET primary_club_id = NULL
    WHERE user_id = p_user_id AND primary_club_id = p_club_id;

    COMMIT;
END;
$$;

-- ============================================
-- 15. 函数 - 获取用户所属的所有班级
-- ============================================
CREATE OR REPLACE FUNCTION get_user_classes(p_user_id VARCHAR(48))
RETURNS TABLE(
    class_id INTEGER,
    class_name VARCHAR(100),
    class_code VARCHAR(20),
    role VARCHAR(20),
    join_time TIMESTAMP,
    member_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.class_id,
        c.class_name,
        c.class_code,
        cm.role,
        cm.join_time,
        COUNT(cm2.id) AS member_count
    FROM class_member cm
    INNER JOIN class c ON cm.class_id = c.class_id
    LEFT JOIN class_member cm2 ON c.class_id = cm2.class_id AND cm2.status = 'Y'
    WHERE cm.user_id = p_user_id AND cm.status = 'Y'
    GROUP BY c.class_id, c.class_name, c.class_code, cm.role, cm.join_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 16. 函数 - 获取用户所属的所有社团
-- ============================================
CREATE OR REPLACE FUNCTION get_user_clubs(p_user_id VARCHAR(48))
RETURNS TABLE(
    club_id INTEGER,
    club_name VARCHAR(100),
    club_code VARCHAR(20),
    category VARCHAR(50),
    role VARCHAR(20),
    join_time TIMESTAMP,
    member_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        cl.club_id,
        cl.club_name,
        cl.club_code,
        cl.category,
        cm.role,
        cm.join_time,
        COUNT(cm2.id) AS member_count
    FROM club_member cm
    INNER JOIN club cl ON cm.club_id = cl.club_id
    LEFT JOIN club_member cm2 ON cl.club_id = cm2.club_id AND cm2.status = 'Y'
    WHERE cm.user_id = p_user_id AND cm.status = 'Y'
    GROUP BY cl.club_id, cl.club_name, cl.club_code, cl.category, cm.role, cm.join_time;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 说明文档
-- ============================================
-- 数据表说明:
-- 1. class 表：存储班级基本信息
-- 2. club 表：存储社团基本信息
-- 3. class_member 表：班级成员关系表，支持一个用户加入多个班级（如选修班）
-- 4. club_member 表：社团成员关系表，支持一个用户加入多个社团
-- 5. users 表扩展：添加 class_id（主班级）和 primary_club_id（主社团）字段

-- 权限说明:
-- class_manager: 班级管理员权限，可以管理所有班级
-- club_manager: 社团管理员权限，可以管理所有社团
-- class_creator: 班级创建权限，可以创建班级
-- club_creator: 社团创建权限，可以创建社团

-- 使用示例:
-- 1. 创建班级: INSERT INTO class (class_name, class_code, grade, department) VALUES (...)
-- 2. 用户加入班级: CALL join_class('user_id', class_id, 'student')
-- 3. 用户退出班级: CALL leave_class('user_id', class_id)
-- 4. 查询用户班级: SELECT * FROM get_user_classes('user_id')
-- 5. 查询班级成员: SELECT * FROM class_member_stats WHERE class_id = ?
-- 6. 查询社团成员: SELECT * FROM club_member_stats WHERE club_id = ?