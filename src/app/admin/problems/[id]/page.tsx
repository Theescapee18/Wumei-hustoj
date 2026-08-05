'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';

export default function AdminProblemEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [problem, setProblem] = useState<any>(null);;
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetch(`/api/problems/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) { setIsError(true); setMessage(data.error); }
        else setProblem(data);
      })
      .catch(() => { setIsError(true); setMessage('加载失败'); });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`/api/admin/problems/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', ...problem }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('保存成功！');
      setIsError(false);
    } else {
      setMessage(data.error || '保存失败');
      setIsError(true);
    }
  };

  if (!problem) return <Container className="py-4"><p>加载中...</p></Container>;

  return (
    <Container className="py-4">
      <h2 className="mb-4">编辑题目 #{id}</h2>
      {message && <Alert variant={isError ? 'danger' : 'success'} dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Card className="mb-3">
          <Card.Body>
            <Form.Group className="mb-2">
              <Form.Label>标题</Form.Label>
              <Form.Control value={problem.title} onChange={e => setProblem((p: any) => ({ ...p, title: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>题目描述</Form.Label>
              <Form.Control as="textarea" rows={6} value={problem.description || ''}
                onChange={e => setProblem((p: any) => ({ ...p, description: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>输入说明</Form.Label>
              <Form.Control as="textarea" rows={3} value={problem.input || ''}
                onChange={e => setProblem((p: any) => ({ ...p, input: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>输出说明</Form.Label>
              <Form.Control as="textarea" rows={3} value={problem.output || ''}
                onChange={e => setProblem((p: any) => ({ ...p, output: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>样例输入</Form.Label>
              <Form.Control as="textarea" rows={3} value={problem.sample_input || ''}
                onChange={e => setProblem((p: any) => ({ ...p, sample_input: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>样例输出</Form.Label>
              <Form.Control as="textarea" rows={3} value={problem.sample_output || ''}
                onChange={e => setProblem((p: any) => ({ ...p, sample_output: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>提示</Form.Label>
              <Form.Control as="textarea" rows={4} value={problem.hint || ''}
                onChange={e => setProblem((p: any) => ({ ...p, hint: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>来源</Form.Label>
              <Form.Control value={problem.source || ''}
                onChange={e => setProblem((p: any) => ({ ...p, source: e.target.value }))} />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>难度</Form.Label>
              <Form.Select value={problem.difficulty ?? 0}
                onChange={e => setProblem((p: any) => ({ ...p, difficulty: parseInt(e.target.value) }))}>
                <option value={0}>简单</option>
                <option value={1}>中等</option>
                <option value={2}>困难</option>
              </Form.Select>
            </Form.Group>
          </Card.Body>
        </Card>
        <Button variant="primary" type="submit">保存</Button>
        <Button variant="secondary" className="ms-2" onClick={() => router.push('/admin/problems')}>返回</Button>
      </Form>
    </Container>
  );
}
