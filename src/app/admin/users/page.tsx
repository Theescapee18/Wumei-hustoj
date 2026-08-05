'use client';

import { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';

export default function AdminUsersPage() {
  const [data, setData] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResults, setImportResults] = useState<any[] | null>(null);
  const [importing, setImporting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [pwTarget, setPwTarget] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ user_id: '', password: '', nick: '', email: '', school: '' });

  const loadUsers = () => {
    fetch('/api/admin/users')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  useEffect(loadUsers, []);

  const toggleDefunct = async (userId: string) => {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_defunct' }),
    });
    loadUsers();
  };

  const addUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/users/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const result = await res.json();
    if (res.ok) {
      setMessage(`用户 ${form.user_id} 创建成功！`);
      setShowAdd(false);
      setForm({ user_id: '', password: '', nick: '', email: '', school: '' });
      loadUsers();
    } else {
      setMessage(`错误: ${result.error}`);
    }
  };

  const importUsers = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setImportResults(null);
    try {
      const res = await fetch('/api/admin/users/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText }),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage(result.message);
        setImportResults(result.results || []);
        setImportText('');
        loadUsers();
      } else {
        setMessage(`错误: ${result.error}`);
      }
    } catch {
      setMessage('网络错误，请重试');
    } finally {
      setImporting(false);
    }
  };

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    const pw = (e.target as any).new_password.value;
    const res = await fetch('/api/admin/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: pwTarget, new_password: pw }),
    });
    if (res.ok) {
      setMessage(`密码修改成功！`);
      setShowPw(false);
    } else {
      const result = await res.json();
      setMessage(`错误: ${result.error}`);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">用户管理</h2>
      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <div className="mb-3 d-flex gap-2">
        <Button variant="primary" onClick={() => setShowAdd(true)}>添加用户</Button>
        <Button variant="success" onClick={() => { setImportResults(null); setShowImport(true); }}>批量导入</Button>
      </div>

      <Table striped bordered hover size="sm">
        <thead className="table-dark">
          <tr>
            <th>用户名</th>
            <th>昵称</th>
            <th>邮箱</th>
            <th>通过/提交</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data?.users?.map((u: any) => (
            <tr key={u.user_id}>
              <td>{u.user_id}</td>
              <td>{u.nick}</td>
              <td>{u.email || '-'}</td>
              <td>{u.solved}/{u.submit}</td>
              <td>
                {u.defunct === 'Y'
                  ? <Badge bg="danger">禁用</Badge>
                  : <Badge bg="success">正常</Badge>}
              </td>
              <td>
                <Button variant="outline-warning" size="sm" className="me-1"
                  onClick={() => { setPwTarget(u.user_id); setShowPw(true); }}>
                  改密
                </Button>
                <Button variant={u.defunct === 'Y' ? 'outline-success' : 'outline-danger'} size="sm"
                  onClick={() => toggleDefunct(u.user_id)}>
                  {u.defunct === 'Y' ? '启用' : '禁用'}
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* 添加用户 Modal */}
      <Modal show={showAdd} onHide={() => setShowAdd(false)}>
        <Modal.Header closeButton><Modal.Title>添加用户</Modal.Title></Modal.Header>
        <Form onSubmit={addUser}>
          <Modal.Body>
            <Form.Group className="mb-2"><Form.Label>用户名 *</Form.Label>
              <Form.Control value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} required /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>密码（留空默认用户名）</Form.Label>
              <Form.Control type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>昵称</Form.Label>
              <Form.Control value={form.nick} onChange={e => setForm(f => ({ ...f, nick: e.target.value }))} /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>邮箱</Form.Label>
              <Form.Control type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></Form.Group>
            <Form.Group className="mb-2"><Form.Label>学校</Form.Label>
              <Form.Control value={form.school} onChange={e => setForm(f => ({ ...f, school: e.target.value }))} /></Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>取消</Button>
            <Button variant="primary" type="submit">创建</Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* 批量导入 Modal */}
      <Modal show={showImport} onHide={() => setShowImport(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>批量导入用户</Modal.Title></Modal.Header>
        <Form onSubmit={importUsers}>
          <Modal.Body>
            <Alert variant="info" className="py-2">
              每行一个用户，格式：<code>用户名,密码,昵称,学校</code>（后三项可省略，密码留空默认与用户名相同）<br />
              示例：<code>zhangsan,abc123,张三,一中</code> 或 <code>lisi</code>
            </Alert>
            <Form.Group className="mb-2">
              <Form.Control as="textarea" rows={10} value={importText}
                onChange={e => setImportText(e.target.value)}
                placeholder={'zhangsan,abc123,张三,一中\nlisi\nwangwu,pass456'}
                style={{ fontFamily: 'monospace' }} />
            </Form.Group>
            {importResults && importResults.length > 0 && (
              <Table size="sm" bordered className="mt-3">
                <thead><tr><th>用户名</th><th>结果</th><th>说明</th></tr></thead>
                <tbody>
                  {importResults.map((r, i) => (
                    <tr key={i}>
                      <td>{r.user_id}</td>
                      <td>{r.status === 'ok'
                        ? <Badge bg="success">成功</Badge>
                        : <Badge bg="danger">失败</Badge>}</td>
                      <td>{r.error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowImport(false)}>关闭</Button>
            <Button variant="success" type="submit" disabled={importing || !importText.trim()}>
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* 改密 Modal */}
      <Modal show={showPw} onHide={() => setShowPw(false)}>
        <Modal.Header closeButton><Modal.Title>修改密码 - {pwTarget}</Modal.Title></Modal.Header>
        <Form onSubmit={changePw}>
          <Modal.Body>
            <Form.Group className="mb-2"><Form.Label>新密码</Form.Label>
              <Form.Control type="password" name="new_password" required /></Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowPw(false)}>取消</Button>
            <Button variant="primary" type="submit">确认</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
