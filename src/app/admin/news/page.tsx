'use client';

import { useState, useEffect } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';
import Alert from 'react-bootstrap/Alert';

export default function AdminNewsPage() {
  const [data, setData] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ title: '', content: '' });

  const loadNews = () => {
    fetch('/api/news')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  };

  useEffect(loadNews, []);

  const saveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    const method = editItem ? 'PUT' : 'POST';
    const url = editItem ? `/api/admin/news/${editItem.news_id}` : '/api/admin/news';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      setMessage(editItem ? '公告已更新！' : '公告已发布！');
      setShowAdd(false);
      setEditItem(null);
      setForm({ title: '', content: '' });
      loadNews();
    } else {
      const result = await res.json();
      setMessage(`错误: ${result.error}`);
    }
  };

  const editNews = (item: any) => {
    setEditItem(item);
    setForm({ title: item.title, content: item.content });
    setShowAdd(true);
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">公告管理</h2>
      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Button variant="primary" className="mb-3" onClick={() => { setEditItem(null); setForm({ title: '', content: '' }); setShowAdd(true); }}>
        发布公告
      </Button>

      {data?.news?.map((item: any) => (
        <Card key={item.news_id} className="mb-2">
          <Card.Body className="py-2 d-flex justify-content-between align-items-center">
            <div>
              <strong>{item.title}</strong>
              <small className="text-muted ms-3">{new Date(item.time).toLocaleString('zh-CN')}</small>
            </div>
            <Button variant="outline-primary" size="sm" onClick={() => editNews(item)}>编辑</Button>
          </Card.Body>
        </Card>
      ))}

      <Modal show={showAdd} onHide={() => setShowAdd(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{editItem ? '编辑公告' : '发布公告'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={saveNews}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>标题</Form.Label>
              <Form.Control value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>内容</Form.Label>
              <Form.Control as="textarea" rows={8} value={form.content}
                onChange={e => setForm(f => ({ ...f, content: e.target.value }))} required />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowAdd(false)}>取消</Button>
            <Button variant="primary" type="submit">{editItem ? '保存' : '发布'}</Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
