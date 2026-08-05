'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';

export default function AdminProblemsPage() {
  const [data, setData] = useState<any>(null);
  const router = useRouter();

  const loadProblems = () => {
    fetch('/api/admin/problems')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  useEffect(loadProblems, []);

  const toggleDefunct = async (id: number) => {
    await fetch('/api/admin/problems/' + id, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_defunct' }),
    });
    loadProblems();
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">题目管理</h2>

      <div className="mb-3">
        <Link href="/admin/problems/import">
          <Button variant="success" size="sm" className="me-2">导入题目 (FPS XML)</Button>
        </Link>
        <Link href="/admin/problems/export">
          <Button variant="info" size="sm">导出题目</Button>
        </Link>
      </div>

      <Table striped bordered hover size="sm">
        <thead className="table-dark">
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>通过/提交</th>
            <th>难度</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data?.problems?.map((p: any) => (
            <tr key={p.problem_id}>
              <td>{p.problem_id}</td>
              <td><Link href={`/problems/${p.problem_id}`} className="text-decoration-none">{p.title}</Link></td>
              <td>{p.accepted}/{p.submit}</td>
              <td>{['简单', '中等', '困难'][p.difficulty] || '-'}</td>
              <td>{p.defunct === 'Y' ? <Badge bg="danger">隐藏</Badge> : <Badge bg="success">显示</Badge>}</td>
              <td>
                <Link href={"/admin/problems/" + p.problem_id}>
                  <Button variant="outline-warning" size="sm" className="me-1">编辑</Button>
                </Link>
                <Button variant={p.defunct === 'Y' ? 'outline-success' : 'outline-danger'} size="sm" onClick={() => toggleDefunct(p.problem_id)}>
                  {p.defunct === 'Y' ? '显示' : '隐藏'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Container>
  );
}
