'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/dashboard')
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  const statCards = [
    {
      href: '/admin/problems',
      label: '题目总数',
      value: stats?.problemCount || 0,
      color: '#2563EB',
      icon: '📝',
    },
    {
      href: '/admin/users',
      label: '用户总数',
      value: stats?.userCount || 0,
      color: '#059669',
      icon: '👥',
    },
    {
      href: '/admin/contests',
      label: '提交总数',
      value: stats?.submitCount || 0,
      color: '#D97706',
      icon: '📊',
    },
    {
      label: '通过总数',
      value: stats?.acCount || 0,
      color: '#0891B2',
      icon: '✅',
    },
    {
      href: '/admin/settings',
      label: '系统设置',
      value: '',
      color: '#475569',
      icon: '⚙️',
    },
    {
      href: '/admin/rejudge',
      label: '二次判题',
      value: '',
      color: '#E11D48',
      icon: '🔄',
    },
    {
      href: '/admin/news',
      label: '公告管理',
      value: '',
      color: '#475569',
      icon: '📢',
    },
    {
      href: '/admin/privileges',
      label: '权限管理',
      value: '',
      color: '#475569',
      icon: '🔐',
    },
  ];

  return (
    <Container className="py-4">
      <h2 className="page-title">管理控制台</h2>

      <Row className="g-3">
        {statCards.map((card, idx) => (
          <Col md={3} sm={6} key={idx}>
            {card.href ? (
              <Link href={card.href} className="text-decoration-none">
                <div className="card card-stat">
                  <div className="stat-icon">{card.icon}</div>
                  <div className="card-body">
                    <div className="stat-value" style={{ color: card.color }}>{card.value || '~'}</div>
                    <div className="stat-label text-secondary">{card.label}</div>
                  </div>
                  <div className="stat-footer text-secondary">
                    查看详情 →
                  </div>
                </div>
              </Link>
            ) : (
              <div className="card card-stat">
                <div className="stat-icon">{card.icon}</div>
                <div className="card-body">
                  <div className="stat-value" style={{ color: card.color }}>{card.value || '~'}</div>
                  <div className="stat-label text-secondary">{card.label}</div>
                </div>
              </div>
            )}
          </Col>
        ))}
      </Row>
    </Container>
  );
}
