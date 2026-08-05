'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';
import Button from 'react-bootstrap/Button';

export default function ProblemListPage() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`/api/problems?page=${page}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [page]);

  const pages = data?.totalPages || 0;

  return (
    <Container className="py-4">
      <h2 className="page-title">题目列表</h2>

      <div className="table-wrapper">
      <Table striped hover responsive>
        <thead>
          <tr>
            <th style={{ width: 80 }}>#</th>
            <th>标题</th>
            <th style={{ width: 120 }}>难度</th>
            <th style={{ width: 100 }}>通过/提交</th>
            <th style={{ width: 80 }}>通过率</th>
            <th style={{ width: 80 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {data?.problems?.map((p: any) => {
            const rate = p.submit > 0 ? ((p.accepted / p.submit) * 100).toFixed(1) : '-';
            return (
              <tr key={p.problem_id}>
                <td className="text-center">{p.problem_id}</td>
                <td><Link href={`/problems/${p.problem_id}`} className="text-decoration-none">{p.title}</Link></td>
                <td className="text-center">
                  {p.difficulty === 0 ? <span className="text-success">简单</span>
                  : p.difficulty === 1 ? <span className="text-warning">中等</span>
                  : p.difficulty === 2 ? <span className="text-danger">困难</span>
                  : '-'}
                </td>
                <td className="text-center">{p.accepted}/{p.submit}</td>
                <td className="text-center">{rate}{rate !== '-' ? '%' : ''}</td>
                <td className="text-center">
                  <Button as={Link as any} href={`/problems/${p.problem_id}`} variant="primary" size="sm">
                    做题
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>

      {pages > 1 && (
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
