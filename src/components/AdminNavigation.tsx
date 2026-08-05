'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';

export default function AdminNavigation() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const adminLinks = [
    { href: '/admin', label: '控制台', exact: true },
    { href: '/admin/problems', label: '题目' },
    { href: '/admin/users', label: '用户' },
    { href: '/admin/contests', label: '竞赛' },
    { href: '/admin/exams', label: '考试' },
    { href: '/admin/news', label: '公告' },
    { href: '/admin/privileges', label: '权限' },
    { href: '/admin/settings', label: '设置' },
    { href: '/admin/rejudge', label: '二次判题' },
  ];

  return (
    <Navbar className="navbar-admin" expand="lg" fixed="top">
      <Container fluid>
        <Navbar.Brand as={Link} href="/admin">
          <span className="brand-icon">✦</span>
          管理后台
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="admin-navbar" />
        <Navbar.Collapse id="admin-navbar">
          <Nav className="me-auto">
            {adminLinks.map(({ href, label, exact }) => (
              <Nav.Link
                key={href}
                as={Link}
                href={href}
                className={exact ? (pathname === href ? 'active' : '') : (pathname.startsWith(href) ? 'active' : '')}
              >
                {label}
              </Nav.Link>
            ))}
          </Nav>
          <Nav>
            <Nav.Link as={Link} href="/" className="me-1">
              ← 返回前台
            </Nav.Link>
            {user && (
              <Navbar.Text className="me-2">
                {user.nick || user.userId}
              </Navbar.Text>
            )}
            <Button variant="outline-secondary" size="sm" onClick={handleLogout}>
              退出
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
