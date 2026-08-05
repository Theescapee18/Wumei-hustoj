'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Pagination from 'react-bootstrap/Pagination';

export default function RanklistPage() {
  const [data, setData] = useState<any>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch(`/api/ranklist?page=${page}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [page]);

  const pages = data?.totalPages || 0;

  return (
    <Container className="py-4">
      <h2 className="mb-4">用户排名</h2>

      <Table striped bordered hover>
        <thead className="table-dark">
          <tr>
            <th style={{ width: 60 }}>排名</th>
            <th>用户名</th>
            <th>昵称</th>
            <th>学校</th>
            <th>解决数</th>
            <th>提交数</th>
            <th>通过率</th>
          </tr>
        </thead>
        <tbody>
          {data?.users?.map((u: any) => (
            <tr key={u.user_id}>
              <td className="text-center fw-bold">{u.rank}</td>
              <td><Link href={`/user/${u.user_id}`} className="text-decoration-none">{u.user_id}</Link></td>
              <td>{u.nick}</td>
              <td>{u.school || '-'}</td>
              <td className="text-center text-success fw-bold">{u.solved}</td>
              <td className="text-center">{u.submit}</td>
              <td className="text-center">{u.acRate}%</td>
            </tr>
          ))}
        </tbody>
      </Table>

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
