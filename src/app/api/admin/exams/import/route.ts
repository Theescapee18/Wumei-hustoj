import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';
import { normalizeQtype } from '@/lib/examGrade';

/**
 * 试卷导入：支持文件上传（multipart）和 JSON 粘贴（application/json）
 *
 * 试卷 JSON 格式（单份或数组）：
 * {
 *   "title": "第一次月考",
 *   "description": "...",
 *   "duration_minutes": 90,
 *   "questions": [
 *     { "type": "单选|single", "content": "题干", "options": ["A. xx","B. yy"], "answer": "A", "score": 5 },
 *     { "type": "多选", "content": "...", "options": [...], "answer": "ABD", "score": 5 },
 *     { "type": "填空", "content": "...", "answer": "42|四十二", "score": 5 },
 *     { "type": "判断", "content": "...", "answer": "T", "score": 5 },
 *     { "type": "算法题", "content": "...", "problem_id": 1001, "score": 20 }
 *   ]
 * }
 * answer 可省略（之后在"导入答案"窗口单独导入）。
 * 表单参数 category_id / duration_minutes 会覆盖 JSON 内的值。
 */
export async function POST(request: NextRequest) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;

  try {
    let jsonText = '';
    let categoryId: number | null = null;
    let durationOverride: number | null = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      jsonText = typeof body?.json_text === 'string' ? body.json_text : JSON.stringify(body);
      if (body?.category_id) categoryId = parseInt(body.category_id) || null;
      if (body?.duration_minutes) durationOverride = parseInt(body.duration_minutes) || null;
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const pasted = formData.get('json_text');
      if (file) jsonText = await file.text();
      else if (typeof pasted === 'string' && pasted.trim()) jsonText = pasted;
      else return NextResponse.json({ error: '请上传试卷文件或粘贴 JSON 内容' }, { status: 400 });
      const cid = formData.get('category_id');
      if (cid) categoryId = parseInt(String(cid)) || null;
      const dur = formData.get('duration_minutes');
      if (dur) durationOverride = parseInt(String(dur)) || null;
    }

    if (!jsonText.trim()) {
      return NextResponse.json({ error: 'JSON 内容为空' }, { status: 400 });
    }

    let papers: any[];
    try {
      const data = JSON.parse(jsonText);
      if (Array.isArray(data)) papers = data;
      else if (Array.isArray(data?.papers)) papers = data.papers;
      else papers = [data];
    } catch (e) {
      return NextResponse.json({ error: 'JSON 解析失败：' + (e as Error).message }, { status: 400 });
    }

    // 校验分类存在
    if (categoryId !== null) {
      const cat = await query<any[]>("SELECT 1 FROM exam_category WHERE category_id=$1", [categoryId]);
      if (!cat || cat.length === 0) {
        return NextResponse.json({ error: '所选分类不存在' }, { status: 400 });
      }
    }

    const results: { title: string; paper_id: number; status: string; error?: string; questions?: number }[] = [];

    for (const paper of papers) {
      const title = String(paper?.title || '').trim();
      try {
        if (!title) {
          results.push({ title: '(无标题)', paper_id: 0, status: 'error', error: '缺少 title 字段' });
          continue;
        }
        const questions: any[] = Array.isArray(paper.questions) ? paper.questions : [];
        if (questions.length === 0) {
          results.push({ title, paper_id: 0, status: 'error', error: '试卷没有 questions 题目列表' });
          continue;
        }

        // 逐题校验
        const parsed: { qtype: string; content: string; options: any[]; answer: string; score: number; problem_id: number | null }[] = [];
        let qErr = '';
        for (let i = 0; i < questions.length; i++) {
          const raw = questions[i];
          const qtype = normalizeQtype(raw?.type || raw?.qtype || '');
          if (!qtype) { qErr = `第 ${i + 1} 题题型无效（支持：单选/多选/填空/判断/算法题）`; break; }
          const content = String(raw?.content || raw?.title || '').trim();
          if (!content) { qErr = `第 ${i + 1} 题缺少题干 content`; break; }
          // 选项支持 ["A. xx"] 或 [{key,text}]
          let options: any[] = [];
          if (qtype === 'single' || qtype === 'multiple') {
            const rawOpts = Array.isArray(raw?.options) ? raw.options : [];
            if (rawOpts.length < 2) { qErr = `第 ${i + 1} 题选择题至少需要 2 个选项`; break; }
            options = rawOpts.map((o: any, idx: number) => {
              if (typeof o === 'string') {
                const m = o.match(/^\s*([A-Za-z])[.、:：)）]\s*(.*)$/);
                return m ? { key: m[1].toUpperCase(), text: m[2] } : { key: String.fromCharCode(65 + idx), text: o };
              }
              return { key: String(o?.key || String.fromCharCode(65 + idx)).toUpperCase(), text: String(o?.text ?? o?.value ?? '') };
            });
          }
          let problemId: number | null = null;
          if (qtype === 'coding') {
            problemId = parseInt(raw?.problem_id) || null;
            if (!problemId) { qErr = `第 ${i + 1} 题算法题缺少 problem_id`; break; }
            const prob = await query<any[]>("SELECT 1 FROM problem WHERE problem_id=$1", [problemId]);
            if (!prob || prob.length === 0) { qErr = `第 ${i + 1} 题关联的题目 ${problemId} 不存在`; break; }
          }
          const score = Math.max(1, parseInt(raw?.score) || (qtype === 'coding' ? 20 : 5));
          parsed.push({ qtype, content, options, answer: String(raw?.answer ?? '').trim(), score, problem_id: problemId });
        }
        if (qErr) {
          results.push({ title, paper_id: 0, status: 'error', error: qErr });
          continue;
        }

        const duration = durationOverride || parseInt(paper?.duration_minutes) || 60;
        const inserted = await query<any[]>(
          `INSERT INTO exam_paper(title, category_id, description, duration_minutes, created_by)
           VALUES($1, $2, $3, $4, $5) RETURNING paper_id`,
          [title, categoryId, String(paper?.description || '').trim(), duration, guard.userId]
        );
        const paperId = inserted[0].paper_id;

        for (let i = 0; i < parsed.length; i++) {
          const q = parsed[i];
          await query(
            `INSERT INTO exam_question(paper_id, question_order, qtype, content, options, answer, score, problem_id)
             VALUES($1, $2, $3, $4, $5::jsonb, $6, $7, $8)`,
            [paperId, i + 1, q.qtype, q.content, JSON.stringify(q.options), q.answer, q.score, q.problem_id]
          );
        }

        results.push({ title, paper_id: paperId, status: 'ok', questions: parsed.length });
      } catch (e) {
        results.push({ title: title || 'unknown', paper_id: 0, status: 'error', error: (e as Error).message });
      }
    }

    const ok = results.filter(r => r.status === 'ok').length;
    return NextResponse.json({
      message: `导入完成：成功 ${ok} 份，失败 ${results.length - ok} 份`,
      results,
    });
  } catch (error) {
    console.error('Import exam paper error:', error);
    return NextResponse.json({ error: '试卷导入失败：' + (error as Error).message }, { status: 500 });
  }
}
