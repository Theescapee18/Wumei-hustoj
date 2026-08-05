'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';

export default function ContestRankPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/contests/${id}/rank`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [id]);

  return (
    <Container className="py-4">
      <Card className="mb-4">
        <Card.Header as="h5">竞赛排名 - #{id}</Card.Header>
        <Table striped bordered hover size="sm" className="mb-0">
          <thead className="table-dark">
            <tr>
              <th style={{ width: 50 }}>#</th>
              <th>用户</th>
              <th>昵称</th>
              <th>解决数</th>
              <th>罚时</th>
              <th>提交数</th>
            </tr>
          </thead>
          <tbody>
            {data?.rankings?.map((r: any, idx: number) => (
              <tr key={r.user_id}>
                <td className="text-center fw-bold">{idx + 1}</td>
                <td><Link href={`/user/${r.user_id}`} className="text-decoration-none">{r.user_id}</Link></td>
                <td>{r.nick}</td>
                <td className="text-center text-success fw-bold">{r.solved}</td>
                <td className="text-center">{Math.floor(r.penalty / 60)}:{(r.penalty % 60).toString().padStart(2, '0')}</td>
                <td className="text-center">{r.attempts}</td>
              </tr>
            ))}
            {(!data?.rankings || data.rankings.length === 0) && (
              <tr><td colSpan={6} className="text-center text-muted">暂无排名数据</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
}
