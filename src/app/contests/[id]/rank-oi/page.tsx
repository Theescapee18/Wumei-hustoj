'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';

// Problem letters A-Z
function letter(n: number) { return String.fromCharCode(65 + n); }

export default function ContestOIRankPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/contests/${id}/rank-oi`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [id]);

  if (!data) return <Container className="py-4"><p>加载中...</p></Container>;

  return (
    <Container className="py-4" style={{ overflowX: 'auto' }}>
      <h3 className="mb-2">{data.contest?.title} - OI 排名</h3>
      <div className="mb-3">
        <Link href={`/contests/${id}`} className="me-3">← 返回竞赛</Link>
        <Link href={`/contests/${id}/rank`}>ACM 排名</Link>
      </div>

      <Table striped bordered hover size="sm" className="text-center" style={{ minWidth: 600 }}>
        <thead className="table-dark">
          <tr>
            <th>#</th>
            <th>用户</th>
            <th>昵称</th>
            {data.problems?.map((p: any) => (
              <th key={p.num}>{letter(p.num)}<br /><small>{p.problem_id}</small></th>
            ))}
            <th>总分</th>
            <th>AC 数</th>
          </tr>
        </thead>
        <tbody>
          {data.ranking?.map((u: any, idx: number) => (
            <tr key={u.user_id}>
              <td>{idx + 1}</td>
              <td>
                <Link href={`/user/${u.user_id}`} className="text-decoration-none">{u.user_id}</Link>
              </td>
              <td>{u.nick}</td>
              {u.scores?.map((score: number, pi: number) => (
                <td key={pi} className={score >= 100 ? 'text-success fw-bold' : score > 0 ? 'text-warning' : ''}>
                  {score > 0 ? score : '-'}
                </td>
              ))}
              <td className="fw-bold">{u.total}</td>
              <td><Badge bg="success">{u.solved}</Badge></td>
            </tr>
          ))}
        </tbody>
      </Table>
      {(!data.ranking || data.ranking.length === 0) && <p className="text-muted">暂无排名数据</p>}
    </Container>
  );
}
