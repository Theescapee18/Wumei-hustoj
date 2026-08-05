import { NextRequest, NextResponse } from 'next/server';
import { query, insertJSON } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const OJ_DATA = process.env.OJ_DATA || '/home/judge/data';
const UPLOAD_PATH = process.env.UPLOAD_PATH || '/var/www/html/upload';

// JSON题目导入API - 支持QDUOJ和HOJ格式，利用PostgreSQL JSON特性优化
export async function POST(request: NextRequest) {
  try {
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    // Check admin or problem_importer privilege
    const privs = await query<any[]>(
      "SELECT rightstr FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='problem_importer')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    // 支持两种提交方式：文件上传（multipart/form-data）或直接粘贴 JSON 文本（application/json）
    let jsonText: string;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      // { json_text: "..." } 包装或直接就是题目 JSON
      if (typeof body?.json_text === 'string') {
        jsonText = body.json_text;
      } else {
        jsonText = JSON.stringify(body);
      }
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const pasted = formData.get('json_text');
      if (file) {
        jsonText = await file.text();
      } else if (typeof pasted === 'string' && pasted.trim()) {
        jsonText = pasted;
      } else {
        return NextResponse.json({ error: '请上传题目文件或粘贴 JSON 内容' }, { status: 400 });
      }
    }

    if (!jsonText || !jsonText.trim()) {
      return NextResponse.json({ error: 'JSON 内容为空' }, { status: 400 });
    }

    let problemsData: any[];
    
    try {
      const jsonData = JSON.parse(jsonText);
      
      // 支持多种JSON格式
      if (Array.isArray(jsonData)) {
        // QDUOJ格式：直接是数组
        problemsData = jsonData;
      } else if (jsonData.problems && Array.isArray(jsonData.problems)) {
        // HOJ格式：{ problems: [...] }
        problemsData = jsonData.problems;
      } else if (jsonData.problem) {
        // 单个题目格式
        problemsData = [jsonData.problem];
      } else {
        // 可能是单个题目直接格式
        problemsData = [jsonData];
      }
    } catch (e) {
      return NextResponse.json({ error: 'JSON解析失败：' + (e as Error).message }, { status: 400 });
    }

    const results: { title: string; problem_id: number; status: string; error?: string }[] = [];

    for (const item of problemsData) {
      try {
        const title = item.title || item.problem_title || '';
        if (!title) continue;

        // Deduplicate by md5(title)
        let dedupTitle = title;
        let tail = 0;
        while (true) {
          const md5 = crypto.createHash('md5').update(dedupTitle).digest('hex');
          const existing = await query<any[]>(
            "SELECT 1 FROM problem WHERE md5(title)=$1",
            [md5]
          );
          if (!existing || existing.length === 0) break;
          tail++;
          dedupTitle = title + '_' + tail;
        }

        // Time limit (支持多种字段名)
        const timeLimit = parseFloat(item.time_limit || item.timeLimit || item.time || '1');
        // Memory limit (支持多种字段名)
        const memLimit = parseFloat(item.memory_limit || item.memoryLimit || item.memory || '128');

        // Description (支持多种字段名)
        const description = item.description || item.problem_description || item.content || '';
        const inputDesc = item.input_description || item.input || '';
        const outputDesc = item.output_description || item.output || '';
        const sampleInput = item.sample_input || item.sampleInput || '';
        const sampleOutput = item.sample_output || item.sampleOutput || '';
        const hint = item.hint || item.note || '';
        const source = item.source || item.from || '';

        // Special Judge (支持多种字段名)
        let spj = 0;
        const spjCode = item.spj_code || item.spj || '';
        if (spjCode) spj = 1;
        if (item.spj_type === 'Text') spj = 2;

        // 提取标签和难度（用于PostgreSQL JSONB字段）
        const tags = item.tags || [];
        const difficulty = parseInt(item.difficulty || item.level || '0');
        
        // 构建metadata JSON对象（PostgreSQL优化）
        const metadata = {
          difficulty,
          author: item.author || userId,
          create_time: new Date().toISOString(),
          source_platform: item.source_platform || 'json_import',
          test_count: (item.test_cases || item.testCases || []).length,
          has_spj: spj > 0,
          imported_by: userId
        };

        // 使用insertJSON函数插入数据（PostgreSQL优化）
        const insertResult = await insertJSON('problem', {
          title: dedupTitle,
          time_limit: timeLimit,
          memory_limit: memLimit,
          description,
          input: inputDesc,
          output: outputDesc,
          sample_input: sampleInput,
          sample_output: sampleOutput,
          hint,
          source,
          spj,
          tags: JSON.stringify(tags),
          metadata: JSON.stringify(metadata)
        });

        const pid = insertResult[0].problem_id;

        // Grant privilege
        await query(
          "INSERT INTO privilege (user_id, rightstr) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [userId, 'p' + pid]
        );

        // Create data directory
        const dataDir = path.join(OJ_DATA, String(pid));
        mkdirSyncRecursive(dataDir);

        // Sample data
        if (sampleInput) fs.writeFileSync(path.join(dataDir, 'sample.in'), sampleInput, 'utf-8');
        if (sampleOutput) fs.writeFileSync(path.join(dataDir, 'sample.out'), sampleOutput, 'utf-8');

        // Test data (支持多种格式)
        const testCases = item.test_cases || item.testCases || item.samples || [];
        if (Array.isArray(testCases)) {
          testCases.forEach((testCase: any, idx: number) => {
            const inputContent = testCase.input || testCase.input_content || '';
            const outputContent = testCase.output || testCase.output_content || '';
            
            if (inputContent) {
              const inputName = testCase.input_name || `test${idx}`;
              fs.writeFileSync(path.join(dataDir, `${inputName}.in`), inputContent, 'utf-8');
            }
            if (outputContent) {
              const outputName = testCase.output_name || testCase.input_name || `test${idx}`;
              fs.writeFileSync(path.join(dataDir, `${outputName}.out`), outputContent, 'utf-8');
            }
          });
        }

        // SPJ code
        if (spjCode && spj === 1) {
          const spjLang = item.spj_language || 'C';
          const spjFile = spjLang === 'C++' ? 'spj.cc' : 'spj.c';
          fs.writeFileSync(path.join(dataDir, spjFile), spjCode, 'utf-8');
        }

        results.push({ title: dedupTitle, problem_id: pid, status: 'ok' });
      } catch (itemError) {
        const title = item.title || item.problem_title || 'unknown';
        results.push({ title, problem_id: 0, status: 'error', error: (itemError as Error).message });
      }
    }

    const ok = results.filter(r => r.status === 'ok').length;
    const failed = results.filter(r => r.status === 'error').length;
    return NextResponse.json({
      message: `导入完成：成功 ${ok} 题，失败 ${failed} 题`,
      results,
    });
  } catch (error) {
    console.error('Import error:', error);
    return NextResponse.json({ error: '导入失败：' + (error as Error).message }, { status: 500 });
  }
}

function mkdirSyncRecursive(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}