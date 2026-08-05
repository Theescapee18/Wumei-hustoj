import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { requireRight } from '@/lib/adminGuard';

/**
 * 答案导入（独立窗口）
 * 支持格式：
 *   { "answers": [ { "order": 1, "answer": "A" }, ... ] }
 *   { "1": "A", "2": "BD", "3": "42" }   —— 键为题号
 *   也支持文件上传（multipart 的 file 字段）或粘贴（json_text）
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRight(request, ['administrator']);
  if (!guard.ok) return guard.response;

  try {
    const { id } = await params;
    const pid = parseInt(id);
    const papers = await query<any[]>("SELECT paper_id FROM exam_paper WHERE paper_id=$1", [pid]);
    if (!papers || papers.length === 0) {
      return NextResponse.json({ error: '试卷不存在' }, { status: 404 });
    }

    let jsonText = '';
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await request.json();
      jsonText = typeof body?.json_text === 'string' ? body.json_text : JSON.stringify(body);
    } else {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const pasted = formData.get('json_text');
      if (file) jsonText = await file.text();
      else if (typeof pasted === 'string' && pasted.trim()) jsonText = pasted;
      else return NextResponse.json({ error: '请上传答案文件或粘贴 JSON 内容' }, { status: 400 });
    }

    let data: any;
    try {
      data = JSON.parse(jsonText);
    } catch (e) {
      return NextResponse.json({ error: 'JSON 解析失败：' + (e as Error).message }, { status: 400 });
    }

    // 归一化为 [{order, answer}]
    let items: { order: number; answer: string }[] = [];
    if (Array.isArray(data?.answers)) {
      items = data.answers.map((a: any) => ({ order: parseInt(a?.order ?? a?.question_order), answer: String(a?.answer ?? '').trim() }));
    } else if (Array.isArray(data)) {
      items = data.map((a: any, i: number) => (
        typeof a === 'string'
          ? { order: i + 1, answer: a.trim() } // 纯数组按顺序对应题号
          : { order: parseInt(a?.order ?? a?.question_order), answer: String(a?.answer ?? '').trim() }
      ));
    } else if (data && typeof data === 'object') {
      items = Object.entries(data)
        .filter(([k]) => /^\d+$/.test(k))
        .map(([k, v]) => ({ order: parseInt(k), answer: String(v ?? '').trim() }));
    }
    items = items.filter(it => Number.isInteger(it.order) && it.order > 0);
    if (items.length === 0) {
      return NextResponse.json({ error: '没有可识别的答案（支持 {"answers":[{"order":1,"answer":"A"}]} 或 {"1":"A"} 格式）' }, { status: 400 });
    }

    const questions = await query<any[]>(
      "SELECT question_id, question_order, qtype FROM exam_question WHERE paper_id=$1", [pid]);
    const byOrder = new Map<number, any>((questions || []).map(q => [Number(q.question_order), q]));

    const results: { order: number; status: string; error?: string }[] = [];
    for (const it of items) {
      const q = byOrder.get(it.order);
      if (!q) { results.push({ order: it.order, status: 'error', error: '题号不存在' }); continue; }
      if (q.qtype === 'coding') { results.push({ order: it.order, status: 'skip', error: '算法题由评测机判分，无需导入答案' }); continue; }
      if (!it.answer) { results.push({ order: it.order, status: 'error', error: '答案为空' }); continue; }
      await query("UPDATE exam_question SET answer=$1 WHERE question_id=$2", [it.answer, q.question_id]);
      results.push({ order: it.order, status: 'ok' });
    }

    const ok = results.filter(r => r.status === 'ok').length;
    return NextResponse.json({
      message: `答案导入完成：成功 ${ok} 题，跳过/失败 ${results.length - ok} 题`,
      results,
    });
  } catch (error) {
    console.error('Import exam answers error:', error);
    return NextResponse.json({ error: '答案导入失败' }, { status: 500 });
  }
}
