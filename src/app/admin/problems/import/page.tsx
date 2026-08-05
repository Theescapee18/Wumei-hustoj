'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Table from 'react-bootstrap/Table';
import Badge from 'react-bootstrap/Badge';
import Spinner from 'react-bootstrap/Spinner';

export default function AdminProblemImportPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState<'xml' | 'json'>('xml');
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    message: string;
    results: { title: string; problem_id: number; status: string; error?: string }[];
  } | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const usePaste = importFormat === 'json' && inputMode === 'paste';
    if (usePaste ? !jsonText.trim() : !file) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let res: Response;
      if (usePaste) {
        // 粘贴 JSON 文本直接提交
        res = await fetch('/api/admin/problems/import-json', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json_text: jsonText }),
        });
      } else {
        const formData = new FormData();
        formData.append('file', file!);
        const endpoint = importFormat === 'xml' ? '/api/admin/problems/import' : '/api/admin/problems/import-json';
        res = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
      }
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        if (usePaste) setJsonText('');
      } else {
        setError(data.error || '导入失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">导入题目</h2>

      <Card className="mb-4">
        <Card.Body>
          <Card.Title>选择导入格式</Card.Title>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>导入格式</Form.Label>
              <Form.Select value={importFormat} onChange={e => setImportFormat(e.target.value as 'xml' | 'json')}>
                <option value="xml">FPS XML 格式</option>
                <option value="json">JSON 格式</option>
              </Form.Select>
              <Form.Text className="text-muted">
                {importFormat === 'xml' 
                  ? '支持标准 FPS XML 格式，兼容 HUSTOJ、POJ、SDUT OJ 等'
                  : '支持 QDUOJ、HOJ 等平台的 JSON 格式'}
              </Form.Text>
            </Form.Group>
            {importFormat === 'json' && (
              <Form.Group className="mb-3">
                <Form.Label>导入方式</Form.Label>
                <div>
                  <Form.Check inline type="radio" id="mode-file" label="上传文件"
                    checked={inputMode === 'file'} onChange={() => setInputMode('file')} />
                  <Form.Check inline type="radio" id="mode-paste" label="粘贴 JSON 文本"
                    checked={inputMode === 'paste'} onChange={() => setInputMode('paste')} />
                </div>
              </Form.Group>
            )}
            {importFormat === 'json' && inputMode === 'paste' ? (
              <Form.Group className="mb-3">
                <Form.Label>JSON 内容</Form.Label>
                <Form.Control
                  as="textarea" rows={12}
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  placeholder='在此粘贴题目 JSON，支持单个题目对象、题目数组或 {"problems": [...]} 格式'
                  style={{ fontFamily: 'monospace', fontSize: '13px' }}
                />
              </Form.Group>
            ) : (
              <Form.Group className="mb-3">
                <Form.Label>文件</Form.Label>
                <Form.Control
                  type="file"
                  accept={importFormat === 'xml' ? '.xml,.zip' : '.json,.zip'}
                  onChange={e => {
                    const input = e.target as HTMLInputElement;
                    setFile(input.files?.[0] || null);
                  }}
                />
              </Form.Group>
            )}
            <Button variant="primary" type="submit"
              disabled={loading || (importFormat === 'json' && inputMode === 'paste' ? !jsonText.trim() : !file)}>
              {loading ? <><Spinner size="sm" className="me-1" />导入中...</> : '开始导入'}
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => router.push('/admin/problems')}>
              返回
            </Button>
          </Form>
        </Card.Body>
      </Card>
      
      {/* JSON格式说明 */}
      {importFormat === 'json' && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>JSON格式示例</Card.Title>
            <pre style={{ background: '#f5f5f5', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
{`[
  {
    "title": "题目标题",
    "time_limit": 1,
    "memory_limit": 128,
    "description": "题目描述",
    "input": "输入描述",
    "output": "输出描述",
    "sample_input": "样例输入",
    "sample_output": "样例输出",
    "hint": "提示",
    "test_cases": [
      {"input": "测试输入1", "output": "测试输出1"},
      {"input": "测试输入2", "output": "测试输出2"}
    ],
    "tags": ["数学", "模拟"],
    "difficulty": 1
  }
]`}
            </pre>
            <Card.Text className="text-muted small mt-2">
              支持字段别名：problem_title, timeLimit, memoryLimit, input_description, output_description, testCases等
            </Card.Text>
          </Card.Body>
        </Card>
      )}
      
      {/* XML格式说明 */}
      {importFormat === 'xml' && (
        <Card className="mb-4">
          <Card.Body>
            <Card.Title>FPS XML格式说明</Card.Title>
            <Card.Text className="text-muted small">
              支持标准 FPS (Free Problem Set) XML 格式，兼容 HUSTOJ、POJ、SDUT OJ 等平台导出的题目。
            </Card.Text>
          </Card.Body>
        </Card>
      )}

      {error && <Alert variant="danger">{error}</Alert>}

      {result && (
        <Card>
          <Card.Body>
            <Card.Title>导入结果</Card.Title>
            <Alert variant={result.results.some(r => r.status === 'error') ? 'warning' : 'success'}>
              {result.message}
            </Alert>
            {result.results.length > 0 && (
              <Table striped bordered hover size="sm">
                <thead className="table-dark">
                  <tr><th>#</th><th>标题</th><th>ID</th><th>状态</th><th>错误</th></tr>
                </thead>
                <tbody>
                  {result.results.map((r, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td>{r.title}</td>
                      <td>{r.problem_id || '-'}</td>
                      <td>
                        {r.status === 'ok'
                          ? <Badge bg="success">成功</Badge>
                          : <Badge bg="danger">失败</Badge>}
                      </td>
                      <td className="text-danger small">{r.error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      )}
    </Container>
  );
}
