// Next.js 服务启动钩子：自动拉起判题守护进程
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { getJudgeDaemon } = await import('./lib/judgeDaemon');
    getJudgeDaemon().start().catch(err => {
      console.error('判题守护进程启动失败:', err);
    });
  }
}
