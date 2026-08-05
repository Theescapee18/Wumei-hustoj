'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';

export default function AdminProblemExportPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'ids' | 'range' | 'contest'>('ids');
  const [ids, setIds] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [cid, setCid] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setLoading(true);
    setError('');

    let params = '';
    if (mode === 'ids') {
      if (!ids.trim()) { setError('请输入题目 ID'); setLoading(false); return; }
      params = `ids=${encodeURIComponent(ids.trim())}`;
    } else if (mode === 'range') {
      if (!start || !end) { setError('请输入起始和结束 ID'); setLoading(false); return; }
      params = `start=${start}&end=${end}`;
    } else if (mode === 'contest') {
      if (!cid) { setError('请输入竞赛 ID'); setLoading(false); return; }
      params = `cid=${cid}`;
    }

    try {
      const res = await fetch(`/api/admin/problems/export?${params}`);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || '导出失败');
        setLoading(false);
        return;
      }
      // Download as file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `problems_export_${Date.now()}.xml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">导出题目 (FPS XML)</h2>

      <Card>
        <Card.Body>
          <Card.Title>选择导出范围</Card.Title>

          <Form>
            <Form.Group className="mb-3">
              <Form.Check
                type="radio"
                label="按 ID 列表导出（逗号分隔）"
                name="mode"
                checked={mode === 'ids'}
                onChange={() => setMode('ids')}
              />
              {mode === 'ids' && (
                <Form.Control
                  className="mt-2"
                  placeholder="例如：1,2,3,4,5"
                  value={ids}
                  onChange={e => setIds(e.target.value)}
                />
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="radio"
                label="按 ID 区间导出"
                name="mode"
                checked={mode === 'range'}
                onChange={() => setMode('range')}
              />
              {mode === 'range' && (
                <div className="d-flex gap-2 mt-2 align-items-center">
                  <Form.Control style={{ width: 120 }} placeholder="起始 ID" type="number" value={start} onChange={e => setStart(e.target.value)} />
                  <span>~</span>
                  <Form.Control style={{ width: 120 }} placeholder="结束 ID" type="number" value={end} onChange={e => setEnd(e.target.value)} />
                </div>
              )}
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Check
                type="radio"
                label="按竞赛导出"
                name="mode"
                checked={mode === 'contest'}
                onChange={() => setMode('contest')}
              />
              {mode === 'contest' && (
                <Form.Control
                  className="mt-2"
                  style={{ width: 120 }}
                  placeholder="竞赛 ID"
                  type="number"
                  value={cid}
                  onChange={e => setCid(e.target.value)}
                />
              )}
            </Form.Group>

            {error && <Alert variant="danger">{error}</Alert>}

            <Button variant="primary" onClick={handleExport} disabled={loading}>
              {loading ? <><Spinner size="sm" className="me-1" />导出中...</> : '导出'}
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => router.push('/admin/problems')}>
              返回
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
