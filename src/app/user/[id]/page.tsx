'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Table from 'react-bootstrap/Table';

const resultText: Record<number, string> = {
  0: 'Pending WA', 4: 'Accepted', 6: 'Wrong Answer',
  7: 'TLE', 8: 'MLE', 10: 'RE', 11: 'CE',
};

export default function UserPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/users/${id}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [id]);

  if (!data) return <Container className="py-4"><p>加载中...</p></Container>;

  return (
    <Container className="py-4">
      <h2 className="mb-4">用户信息</h2>

      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Body>
              <h5>{data.nick || data.user_id}</h5>
              <table className="table table-sm">
                <tbody>
                  <tr><td>用户名</td><td>{data.user_id}</td></tr>
                  <tr><td>昵称</td><td>{data.nick}</td></tr>
                  <tr><td>邮箱</td><td>{data.email || '-'}</td></tr>
                  <tr><td>学校</td><td>{data.school || '-'}</td></tr>
                  <tr><td>注册时间</td><td>{data.reg_time ? new Date(data.reg_time).toLocaleString('zh-CN') : '-'}</td></tr>
                  <tr><td>通过/提交</td><td>{data.solved}/{data.submit}</td></tr>
                </tbody>
              </table>
            </Card.Body>
          </Card>
        </Col>
        <Col md={6}>
          <Card>
            <Card.Body>
              <h5>通过率</h5>
              {data.submit > 0 ? (
                <div className="text-center">
                  <div className="display-4 text-success">{((data.solved / data.submit) * 100).toFixed(1)}%</div>
                  <p className="text-muted">{data.solved} 题通过 / {data.submit} 次提交</p>
                </div>
              ) : (
                <p className="text-muted">暂无提交记录</p>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header as="h5">最近 20 条提交</Card.Header>
        <Table striped bordered hover size="sm" className="mb-0">
          <thead className="table-dark">
            <tr><th>#</th><th>题目</th><th>结果</th><th>时间</th><th>内存</th><th>提交时间</th></tr>
          </thead>
          <tbody>
            {data.submissions?.map((s: any) => (
              <tr key={s.solution_id}>
                <td><Link href={`/status/${s.solution_id}`} className="text-decoration-none">{s.solution_id}</Link></td>
                <td><Link href={`/problems/${s.problem_id}`} className="text-decoration-none">{s.problem_id}. {s.title}</Link></td>
                <td className={s.result === 4 ? 'text-success fw-bold' : s.result > 4 ? 'text-danger' : ''}>
                  {resultText[s.result] || `${s.result}`}
                </td>
                <td>{s.time} ms</td>
                <td>{s.memory} KB</td>
                <td>{new Date(s.in_date).toLocaleString('zh-CN')}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Container>
  );
}
