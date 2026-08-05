// 真实判题执行引擎（Windows/Linux 通用）
// 编译 -> 逐用例运行 -> 输出比对，替代原来的随机模拟判题
import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

// HUSTOJ 结果码
export const RESULT = {
  AC: 4, PE: 5, WA: 6, TLE: 7, MLE: 8, OLE: 9, RE: 10, CE: 11, SYSERR: 13,
} as const;

export interface JudgeOutcome {
  result: number;        // HUSTOJ 结果码
  time: number;          // 最大用例耗时 ms
  memory: number;        // KB（Windows 下暂不精确统计）
  passRate: number;      // 通过率 0~1
  compileError?: string; // 编译错误信息
  runtimeError?: string; // 运行错误/系统错误信息
}

interface LangConfig {
  name: string;
  srcFile: string;
  compile?: (dir: string) => { cmd: string; args: string[] };
  run: (dir: string) => { cmd: string; args: string[] };
  tool: string; // 依赖的可执行程序，用于检测是否安装
}

// HUSTOJ 语言编码：0=C 1=C++ 2=Pascal 3=Java 4=Ruby 5=Bash 6=Python 7=PHP 8=Perl 16=JavaScript
const LANGUAGES: Record<number, LangConfig> = {
  0: {
    name: 'C', srcFile: 'main.c', tool: 'gcc',
    compile: dir => ({ cmd: 'gcc', args: [path.join(dir, 'main.c'), '-o', path.join(dir, 'main.exe'), '-O2', '-std=c11', '-lm'] }),
    run: dir => ({ cmd: path.join(dir, 'main.exe'), args: [] }),
  },
  1: {
    name: 'C++', srcFile: 'main.cpp', tool: 'g++',
    compile: dir => ({ cmd: 'g++', args: [path.join(dir, 'main.cpp'), '-o', path.join(dir, 'main.exe'), '-O2', '-std=c++17'] }),
    run: dir => ({ cmd: path.join(dir, 'main.exe'), args: [] }),
  },
  3: {
    name: 'Java', srcFile: 'Main.java', tool: 'javac',
    compile: dir => ({ cmd: 'javac', args: ['-encoding', 'UTF-8', path.join(dir, 'Main.java')] }),
    run: dir => ({ cmd: 'java', args: ['-cp', dir, '-Xmx256m', 'Main'] }),
  },
  6: {
    name: 'Python', srcFile: 'main.py', tool: process.platform === 'win32' ? 'python' : 'python3',
    compile: dir => ({ cmd: process.platform === 'win32' ? 'python' : 'python3', args: ['-m', 'py_compile', path.join(dir, 'main.py')] }),
    run: dir => ({ cmd: process.platform === 'win32' ? 'python' : 'python3', args: [path.join(dir, 'main.py')] }),
  },
  16: {
    name: 'JavaScript', srcFile: 'main.js', tool: 'node',
    compile: dir => ({ cmd: 'node', args: ['--check', path.join(dir, 'main.js')] }),
    run: dir => ({ cmd: 'node', args: ['--max-old-space-size=256', path.join(dir, 'main.js')] }),
  },
};

const toolCache = new Map<string, boolean>();

// 检测编译器/解释器是否可用
export function toolAvailable(tool: string): boolean {
  if (toolCache.has(tool)) return toolCache.get(tool)!;
  const probe = process.platform === 'win32'
    ? spawnSync('where.exe', [tool], { timeout: 5000 })
    : spawnSync('which', [tool], { timeout: 5000 });
  const ok = probe.status === 0;
  toolCache.set(tool, ok);
  return ok;
}

export function supportedLanguage(language: number): LangConfig | null {
  return LANGUAGES[language] || null;
}

// 子进程运行（带超时与输入）
function runProcess(
  cmd: string, args: string[], input: string, timeoutMs: number, cwd: string
): Promise<{ code: number | null; stdout: string; stderr: string; timedOut: boolean; timeMs: number }> {
  return new Promise(resolve => {
    const started = Date.now();
    let timedOut = false;
    let stdout = '';
    let stderr = '';
    const child = spawn(cmd, args, { cwd, windowsHide: true });

    const timer = setTimeout(() => {
      timedOut = true;
      try { child.kill('SIGKILL'); } catch { /* ignore */ }
    }, timeoutMs);

    child.stdout.on('data', d => {
      // 输出超限保护（16MB）
      if (stdout.length < 16 * 1024 * 1024) stdout += d.toString();
    });
    child.stderr.on('data', d => {
      if (stderr.length < 64 * 1024) stderr += d.toString();
    });
    child.on('error', err => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: String(err), timedOut: false, timeMs: Date.now() - started });
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, timeMs: Date.now() - started });
    });

    if (input) child.stdin.write(input);
    child.stdin.end();
  });
}

// 输出规范化：CRLF->LF，去除行尾空白与末尾空行
function normalize(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n+$/g, '');
}

// 去掉所有空白字符（用于 PE 判定）
function stripAll(text: string): string {
  return text.replace(/\s+/g, '');
}

// 读取题目测试数据（.in/.out 成对；只有 .out 时输入为空）
function loadTestCases(problemId: number): { input: string; output: string }[] | null {
  const base = process.env.OJ_DATA || path.join(process.cwd(), '..', 'judge', 'data');
  const dir = path.join(base, String(problemId));
  if (!fs.existsSync(dir)) return null;

  const files = fs.readdirSync(dir);
  const outs = files.filter(f => f.toLowerCase().endsWith('.out'));
  if (outs.length === 0) return null;

  const cases: { input: string; output: string }[] = [];
  for (const outFile of outs.sort()) {
    const stem = outFile.slice(0, -4);
    const inFile = files.find(f => f.toLowerCase() === (stem + '.in').toLowerCase());
    cases.push({
      input: inFile ? fs.readFileSync(path.join(dir, inFile), 'utf8') : '',
      output: fs.readFileSync(path.join(dir, outFile), 'utf8'),
    });
  }
  return cases;
}

/**
 * 真实判题：编译源代码并逐用例运行比对
 * @param solutionId 提交 ID（用于隔离工作目录）
 * @param problemId  题目 ID（定位测试数据）
 * @param language   HUSTOJ 语言编码
 * @param source     源代码
 * @param timeLimitSec 单用例时间限制（秒）
 */
export async function judgeSolution(
  solutionId: number,
  problemId: number,
  language: number,
  source: string,
  timeLimitSec: number
): Promise<JudgeOutcome> {
  const lang = supportedLanguage(language);
  if (!lang) {
    return { result: RESULT.CE, time: 0, memory: 0, passRate: 0, compileError: `暂不支持该语言（编码 ${language}），请使用 C/C++/Java/Python/JavaScript` };
  }
  if (!toolAvailable(lang.tool)) {
    return { result: RESULT.CE, time: 0, memory: 0, passRate: 0, compileError: `评测机未安装 ${lang.name} 工具链（${lang.tool}），请联系管理员` };
  }

  const cases = loadTestCases(problemId);
  if (!cases) {
    return { result: RESULT.SYSERR, time: 0, memory: 0, passRate: 0, runtimeError: `题目 ${problemId} 缺少测试数据，请联系管理员上传 .in/.out 文件` };
  }

  // 隔离工作目录
  const workDir = path.join(os.tmpdir(), 'nextoj-judge', String(solutionId));
  fs.mkdirSync(workDir, { recursive: true });

  try {
    fs.writeFileSync(path.join(workDir, lang.srcFile), source, 'utf8');

    // 编译（限时 30 秒）
    if (lang.compile) {
      const c = lang.compile(workDir);
      const compileRes = await runProcess(c.cmd, c.args, '', 30000, workDir);
      if (compileRes.timedOut || compileRes.code !== 0) {
        return {
          result: RESULT.CE, time: 0, memory: 0, passRate: 0,
          compileError: (compileRes.stderr || compileRes.stdout || '编译失败').slice(0, 8000),
        };
      }
    }

    // 逐用例运行
    const timeoutMs = Math.max(1000, Math.round(timeLimitSec * 1000));
    let maxTime = 0;
    let passed = 0;
    let finalResult = RESULT.AC as number;
    let runtimeError = '';

    for (const tc of cases) {
      const r = lang.run(workDir);
      const res = await runProcess(r.cmd, r.args, tc.input, timeoutMs, workDir);
      maxTime = Math.max(maxTime, Math.min(res.timeMs, timeoutMs));

      if (res.timedOut) {
        finalResult = RESULT.TLE;
        continue;
      }
      if (res.code !== 0) {
        if (finalResult === RESULT.AC || finalResult === RESULT.PE) finalResult = RESULT.RE;
        if (!runtimeError) runtimeError = (res.stderr || `进程退出码 ${res.code}`).slice(0, 8000);
        continue;
      }
      if (res.stdout.length >= 16 * 1024 * 1024) {
        if (finalResult === RESULT.AC || finalResult === RESULT.PE) finalResult = RESULT.OLE;
        continue;
      }

      const expected = normalize(tc.output);
      const actual = normalize(res.stdout);
      if (actual === expected) {
        passed++;
      } else if (stripAll(actual) === stripAll(expected)) {
        if (finalResult === RESULT.AC) finalResult = RESULT.PE;
      } else {
        if (finalResult === RESULT.AC || finalResult === RESULT.PE) finalResult = RESULT.WA;
      }
    }

    if (passed === cases.length) finalResult = RESULT.AC;

    return {
      result: finalResult,
      time: maxTime,
      memory: 0,
      passRate: cases.length > 0 ? passed / cases.length : 0,
      runtimeError: runtimeError || undefined,
    };
  } catch (err: any) {
    return { result: RESULT.SYSERR, time: 0, memory: 0, passRate: 0, runtimeError: String(err?.message || err) };
  } finally {
    // 清理工作目录
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

export interface CompileCheckResult {
  ok: boolean;          // 编译是否通过
  available: boolean;   // 评测机是否具备该语言工具链
  message: string;      // 编译器输出或提示信息
}

/**
 * 真实编译检查（只编译不运行），供提交前的"编译检查"功能使用
 */
export async function compileCheck(language: number, source: string): Promise<CompileCheckResult> {
  const lang = supportedLanguage(language);
  if (!lang) {
    return { ok: false, available: false, message: `暂不支持该语言（编码 ${language}），请使用 C/C++/Java/Python/JavaScript` };
  }
  if (!toolAvailable(lang.tool)) {
    return { ok: false, available: false, message: `评测机未安装 ${lang.name} 工具链（${lang.tool}），无法进行编译检查，可直接提交` };
  }

  const workDir = path.join(os.tmpdir(), 'nextoj-compile', `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  fs.mkdirSync(workDir, { recursive: true });
  try {
    fs.writeFileSync(path.join(workDir, lang.srcFile), source, 'utf8');
    if (!lang.compile) {
      return { ok: true, available: true, message: '该语言无需编译' };
    }
    const c = lang.compile(workDir);
    const res = await runProcess(c.cmd, c.args, '', 30000, workDir);
    if (res.timedOut) {
      return { ok: false, available: true, message: '编译超时（30 秒）' };
    }
    if (res.code !== 0) {
      return { ok: false, available: true, message: (res.stderr || res.stdout || '编译失败').slice(0, 8000) };
    }
    return { ok: true, available: true, message: '编译通过' };
  } catch (err: any) {
    return { ok: false, available: true, message: String(err?.message || err) };
  } finally {
    try { fs.rmSync(workDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}
