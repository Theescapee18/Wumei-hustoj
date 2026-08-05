import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { XMLParser } from 'fast-xml-parser';

const OJ_DATA = process.env.OJ_DATA || '/home/judge/data';
const UPLOAD_PATH = process.env.UPLOAD_PATH || '/var/www/html/upload';

/** Extract text value from parsed XML node — handles both plain strings and { "#text": ... } objects */
function textVal(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (typeof node?.['#text'] === 'string') return node['#text'];
  if (typeof node?.['#text'] === 'number') return String(node['#text']);
  return '';
}

/** Extract attribute value from parsed XML node */
function attrVal(node: any, attr: string): string {
  return node?.[attr] ?? '';
}

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

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: '请上传 FPS XML 文件' }, { status: 400 });
    }

    const xmlText = await file.text();

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      isArray: (name: string) =>
        name === 'item' || name === 'test_input' || name === 'test_output' ||
        name === 'img' || name === 'solution' || name === 'prepend' ||
        name === 'template' || name === 'append',
    });

    let parsed: any;
    try {
      parsed = parser.parse(xmlText);
    } catch (e) {
      return NextResponse.json({ error: 'XML 解析失败：' + (e as Error).message }, { status: 400 });
    }

    const fps = parsed?.fps;
    if (!fps) {
      return NextResponse.json({ error: '无效的 FPS XML 格式' }, { status: 400 });
    }

    const items = fps.item || [];
    const inputArray = Array.isArray(items) ? items : [items];

    const results: { title: string; problem_id: number; status: string; error?: string }[] = [];

    for (const item of inputArray) {
      try {
        const title = textVal(item.title);
        if (!title) continue;

        // Deduplicate by md5(title)
        let dedupTitle = title;
        let tail = 0;
        // eslint-disable-next-line no-constant-condition
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

        // Time limit
        let timeLimit = parseFloat(textVal(item.time_limit) || '1');
        const timeUnit = attrVal(item.time_limit, '@_unit') || 's';
        if (timeUnit === 'ms') timeLimit /= 1000;
        if (timeLimit < 0.1) timeLimit = 1;

        // Memory limit
        let memLimit = parseFloat(textVal(item.memory_limit) || '128');
        const memUnit = attrVal(item.memory_limit, '@_unit') || 'mb';
        if (memUnit === 'kb') memLimit /= 1024;
        if (memLimit < 1) memLimit = 128;

        const description = textVal(item.description);
        const inputDesc = textVal(item.input);
        const outputDesc = textVal(item.output);
        const sampleInput = textVal(item.sample_input);
        const sampleOutput = textVal(item.sample_output);
        const hint = textVal(item.hint);
        const source = textVal(item.source);

        const spjLang = attrVal(item.spj, '@_language');
        const spjCode = textVal(item.spj);
        const interactorCode = textVal(item.interactor);
        let spj = 0;
        if (interactorCode) spj = 3;
        else if (spjCode) spj = 1;
        if (spjLang === 'Text') spj = 2;

        // Insert problem
        const insertResult = await query<any>(
          `INSERT INTO problem
           (title, time_limit, memory_limit, description, input, output,
            sample_input, sample_output, hint, source, spj, in_date)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
           RETURNING problem_id`,
          [dedupTitle, timeLimit, memLimit, description, inputDesc, outputDesc,
           sampleInput, sampleOutput, hint, source, spj]
        );
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

        // Test data (inputs)
        const testInputs = item.test_input;
        if (testInputs) {
          const inputs = Array.isArray(testInputs) ? testInputs : [testInputs];
          inputs.forEach((ti: any, idx: number) => {
            const name = attrVal(ti, '@_name') || `test${idx}`;
            const content = textVal(ti);
            if (content.trim()) {
              fs.writeFileSync(path.join(dataDir, `${name}.in`), content, 'utf-8');
            }
          });
        }

        // Test data (outputs)
        const testOutputs = item.test_output;
        if (testOutputs) {
          const outputs = Array.isArray(testOutputs) ? testOutputs : [testOutputs];
          outputs.forEach((to: any, idx: number) => {
            const name = attrVal(to, '@_name') || `test${idx}`;
            const content = textVal(to);
            if (content.trim()) {
              fs.writeFileSync(path.join(dataDir, `${name}.out`), content, 'utf-8');
            }
          });
        }

        // Images
        const images = item.img;
        if (images) {
          const imgArray = Array.isArray(images) ? images : [images];
          const processed: string[] = [];
          for (const img of imgArray) {
            const src = textVal(img.src);
            const base64 = textVal(img.base64);
            if (!src || !base64 || processed.includes(src)) continue;
            processed.push(src);

            const ext = path.extname(src).toLowerCase().replace('.', '');
            if (!['jpeg', 'jpg', 'svg', 'png', 'gif', 'bmp'].includes(ext)) continue;

            const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const imgDir = path.join(UPLOAD_PATH, ymd);
            mkdirSyncRecursive(imgDir);

            const fileName = `${ymd}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
            const relPath = `../upload/${ymd}/${fileName}`;

            try {
              fs.writeFileSync(path.join(imgDir, fileName), Buffer.from(base64, 'base64'));
            } catch { continue; }

            // Replace image URLs in description/input/output/hint
            const escaped = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            for (const field of ['description', 'input', 'output', 'hint']) {
              await query(
                `UPDATE problem SET ${field} = REPLACE(${field}, $1, $2) WHERE problem_id = $3`,
                [src, relPath, pid]
              );
            }
          }
        }

        // SPJ code
        if (spjCode && spj === 1) {
          const spjFile = spjLang === 'C++' ? 'spj.cc' : 'spj.c';
          fs.writeFileSync(path.join(dataDir, spjFile), spjCode, 'utf-8');
        }
        if (interactorCode && spj === 3) {
          fs.writeFileSync(path.join(dataDir, 'interactor.cc'), interactorCode, 'utf-8');
        }

        results.push({ title: dedupTitle, problem_id: pid, status: 'ok' });
      } catch (itemError) {
        const title = textVal(item.title) || 'unknown';
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
