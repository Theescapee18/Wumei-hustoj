// 判题守护进程服务（适配低配服务器）
// 严格并发控制，从 judge_queue 领取任务并调用真实判题引擎

import { query } from './db';
import { judgeSolution, RESULT } from './judgeExecutor';

class JudgeDaemonService {
  private maxConcurrent = 2;         // 最大并发数
  private runningCount = 0;          // 正在判题的数量
  private queueCheckInterval = 1000; // 队列检查间隔（毫秒）
  private maxTimeLimit = 60;         // 单任务最大判题时间（秒）
  private isRunning = false;         // 服务是否运行
  private timers: NodeJS.Timeout[] = [];

  /**
   * 启动判题守护进程
   */
  async start() {
    if (this.isRunning) {
      console.log('判题守护进程已在运行');
      return;
    }

    this.isRunning = true;

    // 从数据库读取配置
    await this.loadConfig();

    // 恢复上次异常退出时卡在"判题中"的任务
    await this.recoverStaleTasks();

    // 定期检查队列
    this.timers.push(setInterval(() => {
      if (this.isRunning) this.processQueue().catch(e => console.error('处理队列失败:', e));
    }, this.queueCheckInterval));

    console.log('判题守护进程启动，最大并发数：', this.maxConcurrent);
  }

  /**
   * 停止判题守护进程
   */
  stop() {
    this.isRunning = false;
    for (const t of this.timers) clearInterval(t);
    this.timers = [];
    console.log('判题守护进程已停止');
  }

  /**
   * 从数据库读取配置
   */
  private async loadConfig() {
    try {
      const config = await query<any[]>(
        `SELECT config_key, config_value FROM judge_config`
      );

      const maxConcurrentConfig = config.find(
        c => c.config_key === 'MAX_CONCURRENT'
      );
      if (maxConcurrentConfig) {
        this.maxConcurrent = parseInt(maxConcurrentConfig.config_value) || this.maxConcurrent;
      }

      const timeLimitConfig = config.find(
        c => c.config_key === 'MAX_TIME_LIMIT'
      );
      if (timeLimitConfig) {
        this.maxTimeLimit = parseInt(timeLimitConfig.config_value) || this.maxTimeLimit;
      }
    } catch (error) {
      console.error('加载配置失败（使用默认值）:', error);
    }
  }

  /**
   * 服务重启后，将卡在"判题中"的任务重新放回队列
   */
  private async recoverStaleTasks() {
    try {
      await query(`UPDATE judge_queue SET status = 0, start_time = NULL WHERE status = 1`);
    } catch (error) {
      console.error('恢复滞留任务失败:', error);
    }
  }

  /**
   * 处理判题队列（原子领取，防止并发重复判题）
   */
  private async processQueue() {
    while (this.runningCount < this.maxConcurrent) {
      // 原子领取下一个任务（优先级排序 + 行锁跳过）
      const claimed = await query<any[]>(
        `UPDATE judge_queue
         SET status = 1, start_time = NOW()
         WHERE queue_id = (
           SELECT queue_id FROM judge_queue
           WHERE status = 0
           ORDER BY priority DESC, create_time ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         RETURNING queue_id, solution_id`
      );

      if (!claimed || claimed.length === 0) break;

      // 异步执行，不阻塞领取循环
      this.judgeTask(claimed[0]).catch(e => console.error('判题任务失败:', e));
    }
  }

  /**
   * 执行判题任务
   */
  private async judgeTask(task: any) {
    this.runningCount++;

    try {
      // 读取提交信息与源代码
      const rows = await query<any[]>(
        `SELECT s.solution_id, s.problem_id, s.language, s.user_id, sc.source,
                p.time_limit
         FROM solution s
         LEFT JOIN source_code sc ON sc.solution_id = s.solution_id
         LEFT JOIN problem p ON p.problem_id = s.problem_id
         WHERE s.solution_id = $1`,
        [task.solution_id]
      );

      if (!rows || rows.length === 0 || !rows[0].source) {
        // 无源代码，标记系统错误
        await this.finishTask(task, RESULT.SYSERR, 0, 0, 0);
        await query(
          `INSERT INTO runtimeinfo(solution_id, error) VALUES($1, $2)
           ON CONFLICT (solution_id) DO UPDATE SET error = EXCLUDED.error`,
          [task.solution_id, '缺少源代码，无法判题']
        );
        return;
      }

      const sub = rows[0];
      const timeLimit = Math.min(parseFloat(sub.time_limit) || 1, this.maxTimeLimit);

      // 状态 -> 编译中
      await query(`UPDATE solution SET result = 2 WHERE solution_id = $1`, [task.solution_id]);

      // 真实判题
      const outcome = await judgeSolution(
        sub.solution_id, sub.problem_id, sub.language, sub.source, timeLimit
      );

      // 记录编译错误/运行错误信息
      if (outcome.compileError) {
        await query(
          `INSERT INTO compileinfo(solution_id, error) VALUES($1, $2)
           ON CONFLICT (solution_id) DO UPDATE SET error = EXCLUDED.error`,
          [task.solution_id, outcome.compileError]
        );
      }
      if (outcome.runtimeError) {
        await query(
          `INSERT INTO runtimeinfo(solution_id, error) VALUES($1, $2)
           ON CONFLICT (solution_id) DO UPDATE SET error = EXCLUDED.error`,
          [task.solution_id, outcome.runtimeError]
        );
      }

      await this.finishTask(task, outcome.result, outcome.time, outcome.memory, outcome.passRate);

      // AC 时更新题目通过计数，并重算用户通过题数（重算可避免重判导致重复累加）
      if (outcome.result === RESULT.AC) {
        await query(`UPDATE problem SET accepted = accepted + 1 WHERE problem_id = $1`, [sub.problem_id]);
        await query(
          `UPDATE users SET solved = (
             SELECT COUNT(DISTINCT problem_id) FROM solution
             WHERE user_id = $1 AND result = 4 AND problem_id > 0
           ) WHERE user_id = $1`,
          [sub.user_id]
        );
      }

      console.log(`判题完成: solution_id=${task.solution_id}, result=${outcome.result}, time=${outcome.time}ms`);
    } catch (error) {
      console.error('判题任务失败:', error);
      await this.finishTask(task, RESULT.SYSERR, 0, 0, 0).catch(() => { /* ignore */ });
    } finally {
      this.runningCount--;
    }
  }

  /**
   * 写回判题结果并结束队列任务
   */
  private async finishTask(task: any, result: number, time: number, memory: number, passRate: number) {
    await query(
      `UPDATE solution
       SET result = $1, time = $2, memory = $3, pass_rate = $4, judger = 'local'
       WHERE solution_id = $5`,
      [result, time, memory, passRate.toFixed(2), task.solution_id]
    );
    await query(
      `UPDATE judge_queue SET status = 2, end_time = NOW() WHERE queue_id = $1`,
      [task.queue_id]
    );
  }
}

// 单例模式（挂到 globalThis，防止 Next.js 热重载产生多个实例）
const globalStore = globalThis as unknown as { __judgeDaemon?: JudgeDaemonService };

export function getJudgeDaemon(): JudgeDaemonService {
  if (!globalStore.__judgeDaemon) {
    globalStore.__judgeDaemon = new JudgeDaemonService();
  }
  return globalStore.__judgeDaemon;
}

export { JudgeDaemonService };
