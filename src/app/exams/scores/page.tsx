'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';
import Button from 'react-bootstrap/Button';

export default function ExamScoresPage() {
  const [scores, setScores] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/exams/my-scores')
      .then(async res => {
        const d = await res.json();
        if (!res.ok) { setError(d.error || '加载失败'); return; }
        setScores(d.scores || []);
      })
      .catch(() => setError('网络错误，请刷新重试'));
  }, []);

  return (
    <Container className="py-4" style={{ marginTop: 60 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">我的成绩</h2>
        <Link href="/exams"><Button variant="outline-secondary" size="sm">← 返回考试列表</Button></Link>
      </div>
      {error && <Alert variant="warning">{error}</Alert>}

      {scores && (
        <Table striped bordered hover responsive>
          <thead>
            <tr>
              <th>试卷</th><th>分类</th><th>模式</th><th>得分</th>
              <th>切屏次数</th><th>交卷方式</th><th>交卷时间</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            {scores.map(s => (
              <tr key={s.attempt_id}>
                <td>{s.paper_title}</td>
                <td>{s.category_name || '未分类'}</td>
                <td>
                  <Badge bg={s.mode === 'exam' ? 'danger' : 'success'}>
                    {s.mode === 'exam' ? '模拟考试' : '自由练习'}
                  </Badge>
                </td>
                <td>
                  <strong>{s.score ?? '-'}</strong> / {s.total_score}
                  {s.pending && <Badge bg="info" className="ms-1">判题中</Badge>}
                </td>
                <td>{s.mode === 'exam' ? s.switch_count : '-'}</td>
                <td>{s.auto_submitted === 'Y'
                  ? <Badge bg="warning" text="dark">自动交卷</Badge>
                  : <Badge bg="secondary">主动交卷</Badge>}</td>
                <td>{s.submitted_at ? new Date(s.submitted_at).toLocaleString('zh-CN') : '-'}</td>
                <td>
                  <Link href={`/exams/attempt/${s.attempt_id}`}>
                    <Button size="sm" variant="outline-primary">查看详情</Button>
                  </Link>
                </td>
              </tr>
            ))}
            {scores.length === 0 && (
              <tr><td colSpan={8} className="text-center text-muted">暂无成绩记录，去参加一场考试吧</td></tr>
            )}
          </tbody>
        </Table>
      )}
    </Container>
  );
}
