'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';

export default function ContestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/contests/${id}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [id]);

  if (!data) return <Container className="py-4"><p>加载中...</p></Container>;

  const c = data.contest;
  const now = new Date();
  const start = new Date(c.start_time);
  const end = new Date(c.end_time);

  return (
    <Container className="py-4">
      <Card className="mb-4">
        <Card.Header as="h4">{c.title}</Card.Header>
        <Card.Body>
          {c.description && <div className="mb-3">{c.description}</div>}
          <div className="d-flex gap-4 flex-wrap">
            <div><strong>类型：</strong>{['公开', 'VJudge', '私有', '校内', '定制', '计数组', '队长'][c.contest_type] || '未知'}</div>
            <div><strong>开始：</strong>{start.toLocaleString('zh-CN')}</div>
            <div><strong>结束：</strong>{end.toLocaleString('zh-CN')}</div>
            <div>
              <strong>状态：</strong>
              {now < start ? <Badge bg="secondary">未开始</Badge>
              : now > end ? <Badge bg="dark">已结束</Badge>
              : <Badge bg="success">进行中</Badge>}
              <Link href={"/contests/" + id + "/rank"} className="ms-3">
                <Button variant="outline-info" size="sm">ACM 排名</Button>
              </Link>
              <Link href={"/contests/" + id + "/rank-oi"} className="ms-2">
                <Button variant="outline-warning" size="sm">OI 排名</Button>
              </Link>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header as="h5">题目列表</Card.Header>
        <Table striped bordered hover className="mb-0">
          <thead className="table-dark">
            <tr><th>#</th><th>题目编号</th><th>标题</th><th>通过/提交</th></tr>
          </thead>
          <tbody>
            {data.problems?.map((p: any) => (
              <tr key={p.num}>
                <td className="text-center">{String.fromCharCode(65 + p.num)}</td>
                <td>{p.problem_id}</td>
                <td>
                  {now >= start ? (
                    <Link href={`/problems/${p.problem_id}`} className="text-decoration-none">{p.title}</Link>
                  ) : p.title}
                </td>
                <td className="text-center">{p.accepted}/{p.submit}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
}
