'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';

export default function AdminRejudgePage() {
  const router = useRouter();
  const [type, setType] = useState<'problem' | 'solution' | 'contest' | 'result'>('problem');
  const [problemId, setProblemId] = useState('');
  const [solutionId, setSolutionId] = useState('');
  const [contestId, setContestId] = useState('');
  const [contestProblemLetter, setContestProblemLetter] = useState('');
  const [resultFrom, setResultFrom] = useState('3');
  const [resultTo, setResultTo] = useState('6');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const body: any = { type };
    if (type === 'problem') body.problem_id = problemId;
    if (type === 'solution') body.solution_id = solutionId;
    if (type === 'contest') {
      body.contest_id = contestId;
      if (contestProblemLetter) {
        // Convert letter to num (A=0, B=1, ...)
        body.pid = contestProblemLetter.toUpperCase().charCodeAt(0) - 65;
      }
    }
    if (type === 'result') {
      body.result_from = resultFrom;
      body.result_to = resultTo;
    }

    try {
      const res = await fetch('/api/admin/rejudge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message || '操作成功');
        setIsError(false);
      } else {
        setIsError(true);
        setMessage(data.error || '操作失败');
      }
    } catch {
      setIsError(true);
      setMessage('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-4">
      <h2 className="mb-4">二次判题 (Rejudge)</h2>
      {message && <Alert variant={isError ? 'danger' : 'success'} dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Card>
        <Card.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>重判类型</Form.Label>
              <Form.Select value={type} onChange={e => setType(e.target.value as any)}>
                <option value="problem">按题目重判</option>
                <option value="solution">按提交记录重判</option>
                <option value="contest">按竞赛重判</option>
                <option value="result">按结果批量修改</option>
              </Form.Select>
            </Form.Group>

            {type === 'problem' && (
              <Form.Group className="mb-3">
                <Form.Label>题目 ID</Form.Label>
                <Form.Control type="number" value={problemId} onChange={e => setProblemId(e.target.value)} placeholder="1001" required />
              </Form.Group>
            )}

            {type === 'solution' && (
              <Form.Group className="mb-3">
                <Form.Label>提交 ID (Run ID)</Form.Label>
                <Form.Control type="number" value={solutionId} onChange={e => setSolutionId(e.target.value)} placeholder="12345" required />
              </Form.Group>
            )}

            {type === 'contest' && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label>竞赛 ID</Form.Label>
                  <Form.Control type="number" value={contestId} onChange={e => setContestId(e.target.value)} placeholder="1003" required />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>题目（可选，留空则重判全部题目）</Form.Label>
                  <Form.Control value={contestProblemLetter} onChange={e => setContestProblemLetter(e.target.value)} placeholder="如 A B C D" maxLength={1} />
                  <Form.Text className="text-muted">输入题目字母（A/B/C...），不填则重判竞赛所有题</Form.Text>
                </Form.Group>
              </>
            )}

            {type === 'result' && (
              <div className="row mb-3">
                <div className="col-md-6">
                  <Form.Label>从结果</Form.Label>
                  <Form.Select value={resultFrom} onChange={e => setResultFrom(e.target.value)}>
                    <option value="0">Pending</option>
                    <option value="1">Rejuding</option>
                    <option value="2">Compiling</option>
                    <option value="3">Running & Judging</option>
                    <option value="4">Accepted</option>
                    <option value="5">Presentation Error</option>
                    <option value="6">Wrong Answer</option>
                    <option value="7">Time Limit Exceeded</option>
                    <option value="8">Memory Limit Exceeded</option>
                    <option value="9">Output Limit Exceeded</option>
                    <option value="10">Runtime Error</option>
                    <option value="11">Compile Error</option>
                    <option value="12">Compile Error</option>
                    <option value="16">No Test Data</option>
                  </Form.Select>
                </div>
                <div className="col-md-6">
                  <Form.Label>改为结果</Form.Label>
                  <Form.Select value={resultTo} onChange={e => setResultTo(e.target.value)}>
                    <option value="1">Rejuding</option>
                    <option value="4">Accepted</option>
                    <option value="6">Wrong Answer</option>
                    <option value="7">Time Limit Exceeded</option>
                    <option value="8">Memory Limit Exceeded</option>
                    <option value="9">Output Limit Exceeded</option>
                    <option value="10">Runtime Error</option>
                    <option value="11">Compile Error</option>
                    <option value="16">No Test Data</option>
                  </Form.Select>
                </div>
              </div>
            )}

            <Button variant="warning" type="submit" disabled={loading}>
              {loading ? <><Spinner size="sm" className="me-1" />执行中...</> : '执行重判'}
            </Button>
            <Button variant="secondary" className="ms-2" onClick={() => router.push('/admin')}>返回</Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
