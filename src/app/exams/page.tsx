'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';
import Nav from 'react-bootstrap/Nav';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function ExamsPage() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [activeCat, setActiveCat] = useState<number | 'all'>('all');
  const [starting, setStarting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/exams')
      .then(async res => {
        if (res.status === 401) { setError('请先登录后查看考试列表'); return null; }
        return res.json();
      })
      .then(d => d && setData(d))
      .catch(() => setError('加载失败，请刷新重试'));
  }, []);

  const start = async (paperId: number, mode: 'practice' | 'exam') => {
    if (mode === 'exam' && !confirm(
      '进入模拟考试后开始倒计时，中途切屏超过 3 次将自动交卷，确认开始？')) return;
    setStarting(true);
    try {
      const res = await fetch(`/api/exams/${paperId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      const d = await res.json();
      if (res.ok) router.push(`/exams/attempt/${d.attempt_id}`);
      else setError(d.error || '开始失败');
    } catch { setError('网络错误，请重试'); }
    finally { setStarting(false); }
  };

  const papers = (data?.papers || []).filter((p: any) =>
    activeCat === 'all' || p.category_id === activeCat);
  const attemptOf = (paperId: number, mode: string) =>
    (data?.my_attempts || []).find((a: any) => a.paper_id === paperId && a.mode === mode);

  return (
    <Container className="py-4" style={{ marginTop: 60 }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">在线考试</h2>
        <Link href="/exams/scores"><Button variant="outline-primary" size="sm">我的成绩</Button></Link>
      </div>
      {error && <Alert variant="warning">{error} {error.includes('登录') && <Link href="/login">去登录</Link>}</Alert>}

      {data && (
        <>
          <Nav variant="pills" className="mb-3 flex-wrap">
            <Nav.Item>
              <Nav.Link active={activeCat === 'all'} onClick={() => setActiveCat('all')}>全部</Nav.Link>
            </Nav.Item>
            {(data.categories || []).map((c: any) => (
              <Nav.Item key={c.category_id}>
                <Nav.Link active={activeCat === c.category_id} onClick={() => setActiveCat(c.category_id)}>
                  {c.name}
                </Nav.Link>
              </Nav.Item>
            ))}
          </Nav>

          <Row xs={1} md={2} className="g-3">
            {papers.map((p: any) => {
              const practiceAtt = attemptOf(p.paper_id, 'practice');
              const examAtt = attemptOf(p.paper_id, 'exam');
              return (
                <Col key={p.paper_id}>
                  <Card className="h-100">
                    <Card.Body>
                      <Card.Title className="d-flex justify-content-between">
                        <span>{p.title}</span>
                        <Badge bg="info">{p.total_score} 分</Badge>
                      </Card.Title>
                      <div className="text-muted mb-2" style={{ fontSize: '0.9rem' }}>
                        {p.question_count} 题 · 时长 {p.duration_minutes} 分钟
                        {p.description && <div className="mt-1">{p.description}</div>}
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <Button size="sm" variant="outline-success" disabled={starting}
                          onClick={() => start(p.paper_id, 'practice')}>
                          {practiceAtt && !practiceAtt.submitted_at ? '继续练习' : '自由练习'}
                        </Button>
                        <Button size="sm" variant="danger" disabled={starting}
                          onClick={() => start(p.paper_id, 'exam')}>
                          {examAtt && !examAtt.submitted_at ? '继续考试' : '模拟考试'}
                        </Button>
                        {examAtt?.submitted_at && (
                          <Link href={`/exams/attempt/${examAtt.attempt_id}`}>
                            <Button size="sm" variant="outline-secondary">
                              考试成绩：{examAtt.score ?? '-'}/{examAtt.total_score}
                            </Button>
                          </Link>
                        )}
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
          {papers.length === 0 && <Alert variant="light" className="text-center">该分类下暂无考试</Alert>}
        </>
      )}
    </Container>
  );
}
