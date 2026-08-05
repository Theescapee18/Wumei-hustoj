'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

export default function AdminLoginPage() {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [vcode, setVcode] = useState('');
  const [vcodeImage, setVcodeImage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  // 获取验证码
  useEffect(() => {
    refreshVcode();
  }, []);
  
  const refreshVcode = async () => {
    try {
      const res = await fetch('/api/vcode');
      const data = await res.json();
      setVcodeImage(data.image);
    } catch {
      console.error('获取验证码失败');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // 验证码检查
    if (!vcode || vcode.length < 4) {
      setError('请输入验证码');
      return;
    }
    
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, password, vcode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || '登录失败');
        refreshVcode();
        return;
      }
      
      // 检查是否有管理员权限
      if (data.user.role !== 'administrator' && data.user.role !== 'contest_creator' && data.user.role !== 'problem_editor') {
        setError('您没有管理员权限，请使用用户登录页面');
        return;
      }

      router.push('/admin');
      router.refresh();
    } catch {
      setError('网络错误，请重试');
      refreshVcode();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: '#F8FAFC', minHeight: 'calc(100vh - 64px)', display: 'flex', alignItems: 'center' }}>
      <Container>
        <div className="d-flex justify-content-center">
          <Card style={{ width: '420px', border: '1px solid #E2E8F0', boxShadow: 'var(--card-shadow)' }}>
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                <div style={{ width: 56, height: 56, borderRadius: 14, background: '#2563EB', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <span style={{ color: 'white', fontSize: 20, fontWeight: 700 }}>管理</span>
                </div>
                <h4 className="mb-0">管理员登录</h4>
                <p className="text-muted mt-1" style={{ fontSize: '0.85rem' }}>仅限管理员、比赛创建者和题目编辑者</p>
              </div>

              {error && <Alert variant="danger">{error}</Alert>}
              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label>用户名</Form.Label>
                  <Form.Control
                    type="text"
                    value={userId}
                    onChange={e => setUserId(e.target.value)}
                    placeholder="请输入管理员账号"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>密码</Form.Label>
                  <Form.Control
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="请输入密码"
                    required
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>验证码</Form.Label>
                  <div className="d-flex gap-2">
                    <Form.Control
                      type="text"
                      value={vcode}
                      onChange={e => setVcode(e.target.value)}
                      placeholder="请输入验证码"
                      maxLength={4}
                      required
                      style={{ maxWidth: '150px' }}
                    />
                    <div
                      className="border rounded d-flex align-items-center justify-content-center"
                      style={{ minWidth: '120px', cursor: 'pointer' }}
                      onClick={refreshVcode}
                      title="点击刷新验证码"
                    >
                      {vcodeImage ? <img src={vcodeImage} alt="验证码" style={{ height: 38 }} /> : '加载中'}
                    </div>
                  </div>
                  <Form.Text className="text-muted">
                    点击验证码可以刷新
                  </Form.Text>
                </Form.Group>
                <Button variant="danger" type="submit" className="w-100" disabled={loading}>
                  {loading ? '登录中...' : '管理员登录'}
                </Button>
              </Form>
              <div className="text-center mt-3">
                <small className="text-muted">
                  普通用户请使用 <a href="/login">用户登录</a>
                </small>
              </div>
            </Card.Body>
          </Card>
        </div>
      </Container>
    </div>
  );
}