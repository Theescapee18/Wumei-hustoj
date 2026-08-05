import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getUserFromCookies } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const OJ_DATA = process.env.OJ_DATA || '/home/judge/data';

function cdata(s: string | null | undefined): string {
  if (!s) return '';
  // Escape ]]> inside CDATA per XML spec
  return s.replace(/]]>/g, ']]]]><![CDATA[>');
}

function writeLine(lines: string[], line: string) {
  lines.push(line);
}

export async function GET(request: NextRequest) {
  try {
    const userId = getUserFromCookies(request)?.userId;
    if (!userId) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const privs = await query<any[]>(
      "SELECT 1 FROM privilege WHERE user_id=$1 AND (rightstr='administrator' OR rightstr='problem_importer')",
      [userId]
    );
    if (!privs || privs.length === 0) {
      return NextResponse.json({ error: '无权限' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('ids');
    const start = searchParams.get('start');
    const end = searchParams.get('end');
    const cid = searchParams.get('cid');

    let problems: any[];

    if (cid) {
      // Export problems in a contest
      const contestId = parseInt(cid);
      problems = await query<any[]>(
        `SELECT p.* FROM problem p
         INNER JOIN (SELECT problem_id, num FROM contest_problem WHERE contest_id=$1) cp ON p.problem_id=cp.problem_id
         ORDER BY cp.num`,
        [contestId]
      );
    } else if (idsParam) {
      const ids = idsParam.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));
      if (ids.length === 0) {
        return NextResponse.json({ error: '无效的题目 ID' }, { status: 400 });
      }
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      problems = await query<any[]>(
        `SELECT * FROM problem WHERE problem_id IN (${placeholders}) ORDER BY problem_id`,
        ids
      );
    } else if (start && end) {
      const s = parseInt(start);
      const e = parseInt(end);
      problems = await query<any[]>(
        'SELECT * FROM problem WHERE problem_id >= $1 AND problem_id <= $2 ORDER BY problem_id',
        [s, e]
      );
    } else {
      return NextResponse.json({ error: '请指定要导出的题目（ids=1,2,3 或 start=1&end=100 或 cid=1）' }, { status: 400 });
    }

    const lines: string[] = [];
    writeLine(lines, '<?xml version="1.0" encoding="UTF-8"?>');
    writeLine(lines, '<!DOCTYPE fps PUBLIC');
    writeLine(lines, '  "-//freeproblemset//An opensource XML standard for Algorithm Contest Problem Set//EN"');
    writeLine(lines, '  "http://hustoj.com/fps.current.dtd">');
    writeLine(lines, '<fps version="1.6" url="https://github.com/zhblue/freeproblemset/">');
    writeLine(lines, '  <generator name="NextOJ" url="https://github.com/user/nextoj" />');

    for (const prob of problems) {
      writeLine(lines, '  <item>');
      writeLine(lines, `    <title><![CDATA[${cdata(prob.title)}]]></title>`);

      const timeVal = parseFloat(prob.time_limit);
      writeLine(lines, `    <time_limit unit="s"><![CDATA[${timeVal}]]></time_limit>`);

      const memVal = parseInt(prob.memory_limit);
      writeLine(lines, `    <memory_limit unit="mb"><![CDATA[${memVal}]]></memory_limit>`);

      writeLine(lines, `    <description><![CDATA[${cdata(prob.description)}]]></description>`);
      writeLine(lines, `    <input><![CDATA[${cdata(prob.input)}]]></input>`);
      writeLine(lines, `    <output><![CDATA[${cdata(prob.output)}]]></output>`);
      writeLine(lines, `    <sample_input><![CDATA[${cdata(prob.sample_input)}]]></sample_input>`);
      writeLine(lines, `    <sample_output><![CDATA[${cdata(prob.sample_output)}]]></sample_output>`);
      writeLine(lines, `    <hint><![CDATA[${cdata(prob.hint)}]]></hint>`);
      writeLine(lines, `    <source><![CDATA[${cdata(prob.source)}]]></source>`);

      // Test cases
      const pid = prob.problem_id;
      const dataDir = path.join(OJ_DATA, String(pid));
      if (fs.existsSync(dataDir)) {
        const files = fs.readdirSync(dataDir).sort();
        for (const file of files) {
          const parsed = path.parse(file);
          if (parsed.ext === '.in' && parsed.name !== 'sample') {
            try {
              const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
              writeLine(lines, `    <test_input name="${parsed.name}"><![CDATA[${cdata(content)}]]></test_input>`);
            } catch { /* skip unreadable */ }
          }
        }
        for (const file of files) {
          const parsed = path.parse(file);
          if (parsed.ext === '.out' && parsed.name !== 'sample') {
            try {
              const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
              writeLine(lines, `    <test_output name="${parsed.name}"><![CDATA[${cdata(content)}]]></test_output>`);
            } catch { /* skip unreadable */ }
          }
        }
      }

      // SPJ code
      if (prob.spj == 1) {
        const spjCC = path.join(dataDir, 'spj.cc');
        const spjC = path.join(dataDir, 'spj.c');
        if (fs.existsSync(spjCC)) {
          const code = fs.readFileSync(spjCC, 'utf-8');
          writeLine(lines, `    <spj language="C++"><![CDATA[${cdata(code)}]]></spj>`);
        } else if (fs.existsSync(spjC)) {
          const code = fs.readFileSync(spjC, 'utf-8');
          writeLine(lines, `    <spj language="C"><![CDATA[${cdata(code)}]]></spj>`);
        }
      } else if (prob.spj == 2) {
        writeLine(lines, '    <spj language="Text">text judge</spj>');
      } else if (prob.spj == 3) {
        const interactor = path.join(dataDir, 'interactor.cc');
        if (fs.existsSync(interactor)) {
          const code = fs.readFileSync(interactor, 'utf-8');
          writeLine(lines, `    <interactor language="C++"><![CDATA[${cdata(code)}]]></interactor>`);
        }
      }

      writeLine(lines, '  </item>');
    }

    writeLine(lines, '</fps>');

    const xmlContent = lines.join('\n');

    return new NextResponse(xmlContent, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="problems_export_${Date.now()}.xml"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: '导出失败：' + (error as Error).message }, { status: 500 });
  }
}
