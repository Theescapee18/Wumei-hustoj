'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';

const resultText: Record<number, string> = {
  0: 'Pending', 1: 'Rejudging', 2: 'Compiling', 3: 'Running',
  4: 'Accepted', 5: 'Presentation Error', 6: 'Wrong Answer',
  7: 'Time Limit Exceeded', 8: 'Memory Limit Exceeded', 9: 'Output Limit Exceeded',
  10: 'Runtime Error', 11: 'Compile Error', 13: 'Internal Error',
};

export default function StatusPage() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [filterProblem, setFilterProblem] = useState('');
  const [filterUser, setFilterUser] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page) });
    if (filterProblem) params.set('problem_id', filterProblem);
    if (filterUser) params.set('user_id', filterUser);

    fetch(`/api/submissions?${params}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [page, filterProblem, filterUser]);

  const pages = data ? Math.min(data.totalPages, 100) : 0;

  return (
    <Container className="py-4">
      <h2 className="mb-4">提交状态</h2>

      <div className="mb-3 d-flex gap-3">
        <input
          type="text" className="form-control" style={{ width: 150 }}
          placeholder="题目ID" value={filterProblem}
          onChange={e => { setFilterProblem(e.target.value); setPage(1); }}
        />
        <input
          type="text" className="form-control" style={{ width: 150 }}
          placeholder="用户名" value={filterUser}
          onChange={e => { setFilterUser(e.target.value); setPage(1); }}
        />
      </div>

      <Table striped bordered hover size="sm">
        <thead className="table-dark">
          <tr>
            <th>#</th><th>题目</th><th>用户</th><th>结果</th>
            <th>时间</th><th>内存</th><th>语言</th><th>代码长度</th><th>提交时间</th>
          </tr>
        </thead>
        <tbody>
          {data?.submissions?.map((s: any) => {
            const color = s.result === 4 ? 'text-success' : s.result > 4 ? 'text-danger' : 'text-muted';
            return (
              <tr key={s.solution_id}>
                <td><Link href={`/status/${s.solution_id}`} className="text-decoration-none">{s.solution_id}</Link></td>
                <td><Link href={`/problems/${s.problem_id}`} className="text-decoration-none">{s.problem_id}. {s.title}</Link></td>
                <td><Link href={`/user/${s.user_id}`} className="text-decoration-none">{s.user_id}</Link></td>
                <td className={color + ' fw-bold'}>{resultText[s.result] || 'Unknown'}</td>
                <td>{s.time} ms</td>
                <td>{s.memory} KB</td>
                <td>{({ 0: 'C', 1: 'C++', 2: 'Pascal', 3: 'Java', 4: 'Ruby', 5: 'Bash', 6: 'Python', 7: 'PHP', 8: 'Perl', 9: 'C#', 10: 'Obj-C', 11: 'FreeBasic', 12: 'Scheme', 13: 'Lua', 16: 'JavaScript' } as Record<number, string>)[s.language] || ''}</td>
                <td>{s.code_length} B</td>
                <td>{new Date(s.in_date).toLocaleString('zh-CN')}</td>
              </tr>
            );
          })}
        </tbody>
      </Table>

      {pages > 0 && (
        <Pagination className="justify-content-center">
          <Pagination.Prev disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))} />
          {Array.from({ length: Math.min(pages, 20) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 10, pages - 20)) + i;
            if (p > pages) return null;
            return <Pagination.Item key={p} active={p === page} onClick={() => setPage(p)}>{p}</Pagination.Item>;
          }).filter(Boolean)}
          <Pagination.Next disabled={page >= pages} onClick={() => setPage(p => p + 1)} />
        </Pagination>
      )}
    </Container>
  );
}
