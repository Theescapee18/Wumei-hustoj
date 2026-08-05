'use client';

import { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Link from 'next/link';

export default function HomePage() {
  const [news, setNews] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    fetch('/api/news')
      .then(res => res.json())
      .then(data => {
        setNews(data.news || []);
        setStats(data.stats || {});
      })
      .catch(console.error);
  }, []);

  const statCards = [
    { label: '用户数', value: stats.user_count || 0, icon: '👥', color: '#2563EB' },
    { label: '题目数', value: stats.problem_count || 0, icon: '📝', color: '#059669' },
    { label: '提交数', value: stats.submit_count || 0, icon: '📊', color: '#D97706' },
    { label: '通过数', value: stats.ac_count || 0, icon: '✅', color: '#0891B2' },
  ];

  return (
    <>
      {/* Hero Section */}
      <div style={{ background: '#FFFFFF', padding: '3rem 0', borderBottom: '1px solid #E2E8F0' }}>
        <Container className="text-center">
          <h1 style={{ fontSize: '2.25rem', fontWeight: 700, color: '#0F172A' }}>
            {process.env.NEXT_PUBLIC_OJ_NAME || 'Online Judge'}
          </h1>
          <p className="text-muted mt-2 mb-4" style={{ fontSize: '1.1rem' }}>在线评测系统 · 提升算法能力</p>
          <div className="d-flex gap-3 justify-content-center">
            <Link href="/login" className="btn btn-primary px-4">登录系统</Link>
            <Link href="/problems" className="btn btn-outline-primary px-4">开始做题</Link>
            <Link href="/ranklist" className="btn btn-outline-secondary px-4">查看排名</Link>
          </div>
        </Container>
      </div>

      <Container className="py-4">
        {/* Stats */}
        <Row className="g-3 mb-4">
          {statCards.map((card, idx) => (
            <Col md={3} sm={6} key={idx}>
              <Card className="card-stat">
                <div className="stat-icon">{card.icon}</div>
                <div className="card-body">
                  <div className="stat-value" style={{ color: card.color }}>{card.value}</div>
                  <div className="stat-label text-secondary">{card.label}</div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* News */}
        <Card>
          <Card.Header as="h5" className="d-flex align-items-center gap-2">
            <span style={{ color: 'var(--primary)', fontSize: '1.2rem' }}>📢</span> 系统公告
          </Card.Header>
          <Card.Body>
            {news.length === 0 ? (
              <p className="text-muted mb-0">暂无公告</p>
            ) : (
              news.map((item: any, i: number) => (
                <div key={item.news_id} className={i < news.length - 1 ? 'mb-3 pb-3 border-bottom' : ''}>
                  <h6 className="mb-1">{item.title}</h6>
                  <p className="mb-1 text-secondary">{item.content}</p>
                  <small className="text-muted">{new Date(item.time).toLocaleString('zh-CN')}</small>
                </div>
              ))
            )}
          </Card.Body>
        </Card>
      </Container>
    </>
  );
}
