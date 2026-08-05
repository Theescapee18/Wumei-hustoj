'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Button from 'react-bootstrap/Button';

export default function ContestListPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/contests')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <Container className="py-4">
      <h2 className="page-title">竞赛列表</h2>

      <div className="table-wrapper">
      <Table striped hover responsive>
        <thead>
          <tr>
            <th>#</th>
            <th>标题</th>
            <th>类型</th>
            <th>权限</th>
            <th>开始时间</th>
            <th>结束时间</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data?.contests?.map((c: any) => {
            const now = new Date();
            const start = new Date(c.start_time);
            const end = new Date(c.end_time);
            let status: { text: string; variant: string };
            if (now < start) { status = { text: '未开始', variant: 'secondary' }; }
            else if (now > end) { status = { text: '已结束', variant: 'dark' }; }
            else { status = { text: '进行中', variant: 'success' }; }

            return (
              <tr key={c.contest_id}>
                <td>{c.contest_id}</td>
                <td><Link href={`/contests/${c.contest_id}`} className="text-decoration-none">{c.title}</Link></td>
                <td>{['公开', 'VJudge', '私有', '校内', '定制', '计数组', '队长'][c.contest_type] || '未知'}</td>
                <td>{c.private === 0 ? <Badge bg="success">公开</Badge> : <Badge bg="warning">私有</Badge>}</td>
                <td>{start.toLocaleString('zh-CN')}</td>
                <td>{end.toLocaleString('zh-CN')}</td>
                <td><Badge bg={status.variant}>{status.text}</Badge></td>
                <td>
                  <Button as={Link as any} href={`/contests/${c.contest_id}`} variant="primary" size="sm">
                    查看
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    </div>
    </Container>
  );
}
