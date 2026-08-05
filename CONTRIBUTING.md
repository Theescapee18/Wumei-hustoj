# 协作规范

本文档约定本项目的分支模型、提交规范、PR 流程与代码规范。**所有改动都必须经 Pull Request 合入，禁止直接向 `main` 推送。**

## 一、分支模型

采用简化的 GitHub Flow，只有一条长期分支。

| 分支 | 用途 | 说明 |
|---|---|---|
| `main` | 唯一长期分支，随时可部署 | 受保护，只能通过 PR 合入 |
| `feat/*` | 新功能 | 例：`feat/exam-export` |
| `fix/*` | 缺陷修复 | 例：`fix/judge-tle-misreport` |
| `refactor/*` | 重构（不改外部行为） | 例：`refactor/db-query-helper` |
| `docs/*` | 仅文档改动 | 例：`docs/deploy-guide` |
| `chore/*` | 依赖升级、CI、构建配置 | 例：`chore/bump-next-16.3` |

规则：
- 分支从最新的 `main` 切出，命名全小写、用连字符分词
- 一个分支只做一件事；功能大就拆成多个 PR，别攒成一个巨型 PR
- 分支合入后即删除，不长期保留
- 与 `main` 有冲突时，**用 rebase 而不是 merge** 来同步：`git fetch origin && git rebase origin/main`

## 二、提交信息规范

采用 Conventional Commits，格式：

```
<type>(<scope>): <简短描述>

<可选的正文，说明为什么这么改>

<可选的脚注，如 Closes #12>
```

**type 取值**：`feat` 新功能 / `fix` 修复 / `refactor` 重构 / `perf` 性能 / `docs` 文档 / `test` 测试 / `chore` 杂项 / `style` 纯格式。

**scope 建议**：`exam` `judge` `problem` `user` `contest` `admin` `auth` `ui` `db` `docker` `ci`。

示例：

```
feat(exam): 支持导入试卷时设置考试时长
fix(judge): 修正 query() 返回值误用 .rows 导致导入失败
docs(deploy): 补充 2核2G 服务器 Docker 部署步骤
```

要求：
- 描述用中文或英文均可，但**必须说清做了什么**，禁止 `update`、`修改`、`fix bug` 这类无信息量的描述
- 一个提交只做一件事，不要把格式化和逻辑改动混在一个提交里
- 破坏性变更在 type 后加 `!`，并在正文说明迁移方式：`feat(db)!: 重命名 exam_paper.duration 字段`

## 三、Pull Request 流程

1. 从 `main` 切分支开发
2. 本地自检（必须全部通过，否则 CI 会拦住）：
   ```bash
   npx tsc --noEmit     # 类型检查
   npm run lint         # ESLint
   npm run build        # 生产构建
   ```
3. 推送分支并开 PR，按模板填写：改了什么、为什么、怎么验证的
4. 等待 CI 全绿 + 至少 1 人 Approve
5. 由 Reviewer 或作者本人执行 **Squash and merge**（保持 `main` 历史线性整洁）
6. 删除已合入的分支

**PR 要求**：
- 标题同样遵循 Conventional Commits 格式
- 单个 PR 建议不超过 400 行改动（不含自动生成文件）
- 涉及 UI 的 PR 附上截图或录屏
- 涉及数据库结构变更的 PR 必须包含 `migrations/` 下的增量 SQL，且**不得修改已合入的历史迁移文件**
- 不允许在 PR 中夹带无关改动（顺手格式化整个文件、升级不相干依赖等）

## 四、Code Review 约定

**作者**：PR 描述写清上下文，别让 Reviewer 猜；自己先通读一遍 diff；收到评论后逐条回复而不是静默改完。

**Reviewer**：24 小时内给出首次响应；区分**必须改**（逻辑错误、安全问题、破坏兼容）和**建议改**（命名、风格偏好），明确标注；只对代码提意见，不对人。

重点看：判题与考试判分逻辑的正确性、SQL 注入与权限校验、并发与超时处理、错误路径是否有兜底。

## 五、代码规范

**通用**
- TypeScript 严格模式，不写 `// @ts-ignore` 绕过类型问题
- 新代码风格与所在文件保持一致（命名、注释密度、缩进）
- 注释写"为什么"，不写"是什么"；中文注释即可

**数据库**
- `src/lib/db.ts` 的 `query()` **直接返回行数组**，不是 `{ rows }`，取插入返回值写 `result[0].xxx`
- 一律使用参数化查询（`$1`、`$2`），禁止字符串拼接 SQL
- 结构变更走 `migrations/` 新增文件，文件名带语义，不改老文件

**API 路由**
- 管理端接口必须走 `requireRight(request, ['administrator'])` 校验
- 用户数据接口必须按 `user_id` 隔离，越权访问返回 404 而不是 403（不泄露资源存在性）
- 考试未交卷时接口不得下发标准答案

**判题**
- 新增语言在 `src/lib/judgeExecutor.ts` 的 `LANGUAGES` 表注册，同时更新前端语言下拉与状态页语言名映射
- 语言编码沿用 HUSTOJ 约定（0=C 1=C++ 3=Java 6=Python 16=JavaScript）

**安全红线**
- 真实密码、密钥、Token **禁止**出现在代码、文档、注释、提交信息中；只能进 `.env.local`（已 gitignore）或仓库 Secrets
- 不要提交 `judge-data/`、`.next/`、`node_modules/`、压缩包等产物

## 六、Issue 约定

- 报缺陷用 Bug 模板，必须写复现步骤、预期与实际表现、环境信息
- 提需求用 Feature 模板，说明使用场景而不只是要什么功能
- Issue 标题写清问题本身，不要写"有问题"、"求帮助"

## 七、发布

- `main` 合入即代表可部署状态，CI 自动构建镜像推送到 GHCR，tag 为 `main` 与提交 SHA
- 正式发布打语义化 tag：`git tag v1.2.0 && git push origin v1.2.0`，CI 会构建 `v1.2.0`、`1.2`、`latest` 三个标签的镜像
- 服务器更新：`docker compose pull && docker compose up -d`
