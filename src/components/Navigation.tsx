'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';
import Container from 'react-bootstrap/Container';
import Button from 'react-bootstrap/Button';

export default function Navigation() {
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
    router.push('/');
  };

  const navLinks = [
    { href: '/problems', label: '题目' },
    { href: '/status', label: '状态' },
    { href: '/ranklist', label: '排名' },
    { href: '/contests', label: '竞赛' },
    { href: '/exams', label: '考试' },
  ];

  return (
    <Navbar className="navbar-premium" expand="lg" fixed="top">
      <Container>
        <Navbar.Brand as={Link} href="/">
          <span className="brand-icon">OJ</span>
          {process.env.NEXT_PUBLIC_OJ_NAME || 'Online Judge'}
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-navbar" />
        <Navbar.Collapse id="main-navbar">
          <Nav className="me-auto">
            {navLinks.map(({ href, label }) => (
              <Nav.Link
                key={href}
                as={Link}
                href={href}
                className={pathname === href || pathname.startsWith(href + '/') ? 'active' : ''}
              >
                {label}
              </Nav.Link>
            ))}
            {user?.role === 'administrator' && (
              <Nav.Link
                as={Link}
                href="/admin"
                className={pathname.startsWith('/admin') ? 'active' : ''}
              >
                <span className="badge bg-soft-primary text-primary me-1">✦</span>
                管理
              </Nav.Link>
            )}
          </Nav>
          <Nav className="align-items-center">
            {user ? (
              <>
                <Navbar.Text className="me-3">
                  <Link href={`/user/${user.userId}`} style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                    {user.nick || user.userId}
                  </Link>
                </Navbar.Text>
                <Button variant="outline-primary" size="sm" onClick={handleLogout}>
                  退出
                </Button>
              </>
            ) : (
              <Button
                as={Link as any}
                href="/login"
                variant="primary"
                size="sm"
                className="px-3"
              >
                登录
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
