# HUSTOJ 班级和社团组织功能 API 文档

## 功能概述

本次开发为HUSTOJ系统添加了完整的班级和社团组织管理功能，替代传统的学校组织结构。功能包括：

- 班级管理：创建、查询、更新、删除班级
- 社团管理：创建、查询、更新、删除社团
- 成员管理：用户加入/退出班级和社团
- 权限控制：管理员、班级管理员、社团管理员分级权限

## 数据库设计

### 主要数据表

1. **class (班级表)**
   - class_id: 班级ID (自增主键)
   - class_name: 班级名称
   - class_code: 级代码
   - head_teacher: 班主任用户ID
   - grade: 年级
   - department: 院系
   - description: 班级描述
   - max_members: 最大成员数
   - defunct: 是否停用
   - created_at, updated_at: 创建和更新时间

2. **club (社团表)**
   - club_id: 社团ID (自增主键)
   - club_name: 社团名称
   - club_code: 社团代码
   - president: 社长用户ID
   - vice_president: 副社长用户ID
   - category: 社团类别
   - description: 社团描述
   - max_members: 最大成员数
   - defunct: 是否停用
   - created_at, updated_at: 创建和更新时间

3. **class_member (班级成员关系表)**
   - class_id: 班级ID
   - user_id: 用户ID
   - role: 角色 (teacher, monitor, vice_monitor, student)
   - status: 状态 (Y-正常, N-退出)
   - join_time: 加入时间

4. **club_member (社团成员关系表)**
   - club_id: 社团ID
   - user_id: 用户ID
   - role: 角色 (president, vice_president, manager, member)
   - status: 状态 (Y-正常, N-退出)
   - join_time: 加入时间

5. **users 表扩展**
   - class_id: 主班级ID
   - primary_club_id: 主社团ID

## API 文档

### 管理端 API (需要管理员权限)

#### 1. 班级管理 API

**获取班级列表**
```
GET /api/admin/classes
参数:
  - page: 页码 (默认1)
  - pageSize: 每页数量 (默认20)
  - search: 搜索关键词
  - grade: 年级筛选
  - department: 院系筛选

响应:
{
  "classes": [
    {
      "class_id": 1,
      "class_name": "计算机科学2023级1班",
      "class_code": "CS202301",
      "head_teacher": "teacher1",
      "head_teacher_name": "张老师",
      "grade": "2023级",
      "department": "计算机学院",
      "member_count": 35,
      "max_members": 50,
      "defunct": "N"
    }
  ],
  "total": 10,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

**创建班级**
```
POST /api/admin/classes
请求体:
{
  "class_name": "计算机科学2023级1班",
  "class_code": "CS202301",
  "head_teacher": "teacher1",
  "grade": "2023级",
  "department": "计算机学院",
  "description": "计算机科学与技术专业2023级1班",
  "max_members": 50
}

响应:
{
  "success": true,
  "class_id": 1,
  "message": "班级创建成功"
}
```

**获取班级详情**
```
GET /api/admin/classes/[id]

响应:
{
  "class": {
    "class_id": 1,
    "class_name": "计算机科学2023级1班",
    "member_count": 35
  },
  "members": [
    {
      "user_id": "student1",
      "nick": "张三",
      "email": "student1@example.com",
      "role": "student",
      "join_time": "2026-01-01"
    }
  ]
}
```

**更新班级信息**
```
PUT /api/admin/classes/[id]
请求体:
{
  "class_name": "计算机科学2023级1班",
  "head_teacher": "teacher2",
  "max_members": 60,
  "defunct": "N"
}

响应:
{
  "success": true,
  "message": "班级信息更新成功"
}
```

**删除班级**
```
DELETE /api/admin/classes/[id]

响应:
{
  "success": true,
  "message": "班级删除成功"
}
```

#### 2. 社团管理 API

**获取社团列表**
```
GET /api/admin/clubs
参数:
  - page: 页码 (默认1)
  - pageSize: 每页数量 (默认20)
  - search: 搜索关键词
  - category: 类别筛选

响应:
{
  "clubs": [
    {
      "club_id": 1,
      "club_name": "编程算法协会",
      "club_code": "PROG2024",
      "president": "president1",
      "president_name": "李社长",
      "category": "科技",
      "member_count": 85,
      "max_members": 150,
      "defunct": "N"
    }
  ],
  "total": 5,
  "page": 1,
  "pageSize": 20,
  "totalPages": 1
}
```

**创建社团**
```
POST /api/admin/clubs
请求体:
{
  "club_name": "编程算法协会",
  "club_code": "PROG2024",
  "president": "president1",
  "vice_president": "vice1",
  "category": "科技",
  "description": "热爱编程和算法，定期举办编程竞赛和培训",
  "max_members": 150
}

响应:
{
  "success": true,
  "club_id": 1,
  "message": "社团创建成功"
}
```

**获取社团详情**
```
GET /api/admin/clubs/[id]

响应:
{
  "club": {
    "club_id": 1,
    "club_name": "编程算法协会",
    "member_count": 85
  },
  "members": [
    {
      "user_id": "member1",
      "nick": "王五",
      "role": "member",
      "join_time": "2026-01-01"
    }
  ]
}
```

**更新社团信息**
```
PUT /api/admin/clubs/[id]
请求体:
{
  "club_name": "编程算法协会",
  "president": "president2",
  "max_members": 200
}

响应:
{
  "success": true,
  "message": "社团信息更新成功"
}
```

**删除社团**
```
DELETE /api/admin/clubs/[id]

响应:
{
  "success": true,
  "message": "社团删除成功"
}
```

#### 3. 用户添加 API (支持班级和社团选择)

**获取班级和社团下拉列表**
```
GET /api/admin/users/add

响应:
{
  "classes": [
    {
      "class_id": 1,
      "class_name": "计算机科学2023级1班",
      "class_code": "CS202301",
      "grade": "2023级",
      "department": "计算机学院",
      "current_members": 35,
      "max_members": 50
    }
  ],
  "clubs": [
    {
      "club_id": 1,
      "club_name": "编程算法协会",
      "club_code": "PROG2024",
      "category": "科技",
      "current_members": 85,
      "max_members": 150
    }
  ]
}
```

**创建用户并加入班级/社团**
```
POST /api/admin/users/add
请求体:
{
  "user_id": "new_student",
  "password": "password123",
  "nick": "新学生",
  "email": "new@example.com",
  "school": "测试学校",
  "class_id": 1,
  "club_ids": [1, 2]
}

响应:
{
  "success": true,
  "message": "用户创建成功",
  "user_id": "new_student",
  "class_id": 1,
  "club_ids": [1, 2]
}
```

### 用户端 API (需要登录)

#### 1. 班级查询 API

**获取用户所属的所有班级**
```
GET /api/classes

响应:
{
  "classes": [
    {
      "class_id": 1,
      "class_name": "计算机科学2023级1班",
      "class_code": "CS202301",
      "grade": "2023级",
      "department": "计算机学院",
      "role": "student",
      "join_time": "2026-01-01",
      "member_count": 35
    }
  ]
}
```

**获取班级详情和成员列表**
```
GET /api/classes/[id]

响应:
{
  "class": {
    "class_id": 1,
    "class_name": "计算机科学2023级1班",
    "member_count": 35
  },
  "user_role": "student",
  "user_join_time": "2026-01-01",
  "is_member": true,
  "members": [
    {
      "user_id": "student1",
      "nick": "张三",
      "role": "student"
    }
  ]
}
```

#### 2. 社团查询 API

**获取用户所属的所有社团**
```
GET /api/clubs

响应:
{
  "clubs": [
    {
      "club_id": 1,
      "club_name": "编程算法协会",
      "club_code": "PROG2024",
      "category": "科技",
      "role": "member",
      "join_time": "2026-01-01",
      "member_count": 85
    }
  ]
}
```

**获取社团详情和成员列表**
```
GET /api/clubs/[id]

响应:
{
  "club": {
    "club_id": 1,
    "club_name": "编程算法协会",
    "member_count": 85
  },
  "user_role": "member",
  "user_join_time": "2026-01-01",
  "is_member": true,
  "members": [
    {
      "user_id": "member1",
      "nick": "王五",
      "role": "member"
    }
  ]
}
```

## 权限说明

系统定义了以下权限：

- **administrator**: 系统管理员，拥有所有权限
- **class_manager**: 班级管理员，可以管理所有班级
- **club_manager**: 社团管理员，可以管理所有社团
- **class_creator**: 班级创建者，可以创建班级
- **club_creator**: 社团创建者，可以创建社团

## 数据库初始化

要使用班级和社团功能，需要执行数据库初始化脚本：

```bash
psql -U postgres -d jol -f nextoj/database/class_club_init.sql
```

该脚本会：
1. 创建班级表、社团表、成员关系表
2. 扩展用户表结构
3. 创建必要的索引和视图
4. 创建存储过程和函数
5. 插入示例数据
6. 添加权限配置

## 性能优化

系统包含以下性能优化措施：

1. **数据库索引**: 为所有常用查询字段创建索引
2. **数据库视图**: 使用视图预计算成员数量等统计数据
3. **分页查询**: 所有列表API支持分页，避免大数据量查询
4. **连接池**: 使用PostgreSQL连接池管理数据库连接
5. **查询优化**: 使用JOIN替代多次查询，减少数据库交互

## 使用示例

### 1. 创建班级并添加学生

```javascript
// 1. 创建班级
await fetch('/api/admin/classes', {
  method: 'POST',
  body: JSON.stringify({
    class_name: '计算机科学2023级1班',
    class_code: 'CS202301',
    grade: '2023级',
    department: '计算机学院'
  })
});

// 2. 创建学生并加入班级
await fetch('/api/admin/users/add', {
  method: 'POST',
  body: JSON.stringify({
    user_id: 'student001',
    nick: '张三',
    class_id: 1
  })
});
```

### 2. 创建社团并添加成员

```javascript
// 1. 创建社团
await fetch('/api/admin/clubs', {
  method: 'POST',
  body: JSON.stringify({
    club_name: '编程算法协会',
    club_code: 'PROG2024',
    category: '科技'
  })
});

// 2. 创建学生并加入社团
await fetch('/api/admin/users/add', {
  method: 'POST',
  body: JSON.stringify({
    user_id: 'student001',
    nick: '张三',
    club_ids: [1, 2]  // 可以同时加入多个社团
  })
});
```

### 3. 学生查看自己的班级和社团

```javascript
// 查看自己的班级
const classes = await fetch('/api/classes').then(r => r.json());

// 查看班级详情和成员
const classDetail = await fetch('/api/classes/1').then(r => r.json());

// 查看自己的社团
const clubs = await fetch('/api/clubs').then(r => r.json());

// 查看社团详情和成员
const clubDetail = await fetch('/api/clubs/1').then(r => r.json());
```

## 文件清单

本次开发创建的文件：

1. `nextoj/database/class_club_init.sql` - 数据库初始化脚本
2. `nextoj/src/app/api/admin/classes/route.ts` - 管理端班级列表和创建API
3. `nextoj/src/app/api/admin/classes/[id]/route.ts` - 管理端班级详情、更新、删除API
4. `nextoj/src/app/api/admin/clubs/route.ts` - 管理端社团列表和创建API
5. `nextoj/src/app/api/admin/clubs/[id]/route.ts` - 管理端社团详情、更新、删除API
6. `nextoj/src/app/api/classes/route.ts` - 用户端班级查询API
7. `nextoj/src/app/api/classes/[id]/route.ts` - 用户端班级详情API
8. `nextoj/src/app/api/clubs/route.ts` - 用户端社团查询API
9. `nextoj/src/app/api/clubs/[id]/route.ts` - 用户端社团详情API
10. `nextoj/src/app/api/admin/users/add/route.ts` - 修改后的用户添加API

## 技术特性

- ✅ PostgreSQL数据库支持
- ✅ 完整的权限检查机制
- ✅ RESTful API设计
- ✅ 分页查询支持
- ✅ 数据库索引优化
- ✅ 事务安全
- ✅ 触发器和存储过程
- ✅ 数据库视图预计算
- ✅ 完善的错误处理

## 注意事项

1. 删除班级或社团前，需要先移除所有成员
2. 用户可以属于一个班级和多个社团
3. 班级和社团的最大成员数可以配置
4. 停用的班级和社团无法加入新成员
5. 所有API都需要相应的权限验证
6. 数据库初始化脚本需要PostgreSQL支持