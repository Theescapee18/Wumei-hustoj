'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';

export default function AdminContestsPage() {
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  const load = () => {
    fetch('/api/admin/contests')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  useEffect(load, []);

  const toggleDefunct = async (id: number) => {
    await fetch(`/api/admin/contests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_defunct' }),
    });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm(`确定删除竞赛 #${id}？此操作不可恢复！`)) return;
    await fetch(`/api/admin/contests/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">竞赛管理</h2>

      <div className="mb-3">
        <Link href="/admin/contests/new">
          <Button variant="primary" size="sm">创建竞赛</Button>
        </Link>
      </div>

      <Table striped bordered hover size="sm">
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>类型</th>
            <th>开始</th>
            <th>结束</th>
            <th>权限</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data?.contests?.map((c: any) => (
            <tr key={c.contest_id}>
              <td>{c.contest_id}</td>
              <td>
                <Link href={`/contests/${c.contest_id}`} className="text-decoration-none">{c.title}</Link>
              </td>
              <td>{['公开', 'VJudge', '私有', '校内', '定制', '计数组', '队长'][c.type] || '未知'}</td>
              <td>{new Date(c.start_time).toLocaleString('zh-CN')}</td>
              <td>{new Date(c.end_time).toLocaleString('zh-CN')}</td>
              <td>{c.private === 0 ? <Badge bg="success">公开</Badge> : <Badge bg="warning">私有</Badge>}</td>
              <td>
                {c.defunct === 'Y'
                  ? <Badge bg="danger">隐藏</Badge>
                  : <Badge bg="success">显示</Badge>}
              </td>
              <td>
                <Link href={`/admin/contests/${c.contest_id}`}>
                  <Button variant="outline-warning" size="sm" className="me-1">编辑</Button>
                </Link>
                <Button
                  variant={c.defunct === 'Y' ? 'outline-success' : 'outline-danger'}
                  size="sm"
                  className="me-1"
                  onClick={() => toggleDefunct(c.contest_id)}
                >
                  {c.defunct === 'Y' ? '显示' : '隐藏'}
                </Button>
                <Button variant="outline-danger" size="sm" onClick={() => handleDelete(c.contest_id)}>删除</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
