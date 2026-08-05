'use client';

import { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';

export default function AdminPrivilegesPage() {
  const [data, setData] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ user_id: '', rightstr: 'administrator' });

  const loadPrivileges = () => {
    fetch('/api/admin/privileges')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  useEffect(loadPrivileges, []);

  const addPrivilege = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/privileges', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setMessage('权限添加成功');
      setShowAdd(false);
      setForm({ user_id: '', rightstr: 'administrator' });
      loadPrivileges();
    } else {
      const result = await res.json();
      setMessage(`错误: ${result.error}`);
    }
  };

  const deletePrivilege = async (userId: string, rightstr: string) => {
    const res = await fetch('/api/admin/privileges', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, rightstr }),
    });
    if (res.ok) {
      setMessage('权限已删除');
      loadPrivileges();
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">权限管理</h2>
      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Button variant="primary" className="mb-3" onClick={() => setShowAdd(true)}>添加权限</Button>

      <Table striped bordered hover size="sm">
        <thead className="table-dark">
          <tr>
            <th>用户名</th>
            <th>昵称</th>
            <th>权限</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {data?.privileges?.map((p: any, idx: number) => (
            <tr key={idx}>
              <td>{p.user_id}</td>
              <td>{p.nick || '-'}</td>
              <td><Badge bg="info">{p.rightstr}</Badge></td>
              <td>
                {p.rightstr !== 'administrator' ? (
                  <Button variant="outline-danger" size="sm" onClick={() => deletePrivilege(p.user_id, p.rightstr)}>
                    删除
                  </Button>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Modal show={showAdd} onHide={() => setShowAdd(false)}>
        <Modal.Header closeButton><Modal.Title>添加权限</Modal.Title></Modal.Header>
        <Form onSubmit={addPrivilege}>
          <Modal.Body>
            <Form.Group className="mb-2">
              <Form.Label>用户名</Form.Label>
              <Form.Control value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>权限</Form.Label>
              <Form.Select value={form.rightstr} onChange={e => setForm(f => ({ ...f, rightstr: e.target.value }))}>
                <option value="administrator">administrator (管理员)</option>
                <option value="contest_creator">contest_creator (竞赛创建者)</option>
                <option value="problem_editor">problem_editor (题目编辑)</option>
                <option value="source_viewer">source_viewer (代码查看)</option>
              </Form.Select>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>取消</Button>
            <Button variant="primary" type="submit">添加</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
