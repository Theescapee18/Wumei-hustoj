'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Badge from 'react-bootstrap/Badge';

export default function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [problem, setProblem] = useState<any>(null);
  const [source, setSource] = useState('');
  const [language, setLanguage] = useState(1);
  const [vcode, setVcode] = useState('');
  const [vcodeImage, setVcodeImage] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [compileChecking, setCompileChecking] = useState(false);
  const [compileResult, setCompileResult] = useState<any>(null);
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

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/problems/${id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || data.error) {
          setIsError(true);
          setMessage(data.error || '加载失败');
        } else {
          setProblem(data);
        }
      })
      .catch((err) => { setIsError(true); setMessage('网络错误：' + err.message); })
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    
    // 验证码检查
    if (!vcode || vcode.length < 4) {
      setMessage('请输入验证码');
      setIsError(true);
      return;
    }
    
    setSubmitting(true);

    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem_id: parseInt(id!), language, source, vcode }),
      });

      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || '提交失败');
        setIsError(true);
        refreshVcode();
      } else {
        setMessage('提交成功！正在跳转...');
        setIsError(false);
        setSource('');
        setTimeout(() => router.push('/status'), 1500);
      }
    } catch {
      setMessage('网络错误，请重试');
      setIsError(true);
      refreshVcode();
    } finally {
      setSubmitting(false);
    }
  };
  
  // 真实编译检查（调用评测机编译器）
  const handleCompileCheck = async () => {
    if (!source.trim()) {
      setMessage('请先输入代码');
      setIsError(true);
      return;
    }
    
    setCompileChecking(true);
    setCompileResult(null);
    setMessage('');
    
    try {
      const res = await fetch('/api/compile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, language }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setCompileResult(data);
      } else {
        setMessage(data.error || '编译检查失败');
        setIsError(true);
      }
    } catch {
      setMessage('编译检查服务错误');
      setIsError(true);
    } finally {
      setCompileChecking(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-3 text-muted">加载题目中...</p>
      </Container>
    );
  }

  if (isError) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <Alert.Heading>加载失败</Alert.Heading>
          <p className="mb-0">{message}</p>
        </Alert>
        <Button variant="primary" onClick={() => router.push('/problems')}>← 返回题目列表</Button>
      </Container>
    );
  }

  if (!problem) return null;

  const diffLabel = problem.difficulty === 0 ? ['简单', 'success'] as [string, string]
    : problem.difficulty === 1 ? ['中等', 'warning'] as [string, string]
    : problem.difficulty === 2 ? ['困难', 'danger'] as [string, string]
    : [null, null] as [null, null];

  return (
    <Container className="py-4">
      {/* Problem Header */}
      <div className="d-flex align-items-center gap-3 mb-4">
        <h2 className="page-title mb-0">#{problem.problem_id} {problem.title}</h2>
        {diffLabel[0] && <Badge bg={diffLabel[1]}>{diffLabel[0]}</Badge>}
      </div>

      {/* Stats Bar */}
      <div className="d-flex gap-4 mb-4 text-muted" style={{ fontSize: '0.85rem' }}>
        <span>时间限制: {problem.time_limit || 1}s</span>
        <span>内存限制: {problem.memory_limit || 128}MB</span>
        <span>通过: {problem.accepted || 0} / 提交: {problem.submit || 0}</span>
        {problem.submit > 0 && <span>通过率: {((problem.accepted / problem.submit) * 100).toFixed(1)}%</span>}
      </div>

      {/* Problem Description Card */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3" style={{ color: 'var(--primary)' }}>📝 题目描述</h5>
          <div className="mb-4" dangerouslySetInnerHTML={{ __html: problem.description || '暂无描述' }} />

          <h5 className="mb-3" style={{ color: 'var(--primary)' }}>📥 输入</h5>
          <div className="mb-4" dangerouslySetInnerHTML={{ __html: problem.input || '暂无' }} />

          <h5 className="mb-3" style={{ color: 'var(--primary)' }}>📤 输出</h5>
          <div className="mb-4" dangerouslySetInnerHTML={{ __html: problem.output || '暂无' }} />

          <div className="row g-3 mb-4">
            <div className="col-md-6">
              <h6 className="mb-2">样例输入</h6>
              <pre>{problem.sample_input || '无'}</pre>
            </div>
            <div className="col-md-6">
              <h6 className="mb-2">样例输出</h6>
              <pre>{problem.sample_output || '无'}</pre>
            </div>
          </div>

          {problem.hint && (
            <>
              <h5 className="mb-3" style={{ color: 'var(--primary)' }}>💡 提示</h5>
              <div className="mb-0" dangerouslySetInnerHTML={{ __html: problem.hint }} />
            </>
          )}
        </Card.Body>
      </Card>

      {/* Submit Card */}
      <Card>
        <Card.Header as="h5" className="d-flex align-items-center gap-2">
          <span style={{ fontSize: '1.1rem' }}>🚀</span> 提交代码
        </Card.Header>
        <Card.Body>
          {message && !isError && <Alert variant="success">{message}</Alert>}
          {message && isError && <Alert variant="danger">{message}</Alert>}
          
          {/* 编译检查结果显示（真实编译器输出） */}
          {compileResult && (
            <Alert
              variant={compileResult.ok ? 'success' : compileResult.available ? 'danger' : 'warning'}
              className="mb-3"
              dismissible
              onClose={() => setCompileResult(null)}
            >
              <strong>
                {compileResult.ok ? '✅ 编译通过' : compileResult.available ? '❌ 编译失败' : '⚠️ 无法检查'}
              </strong>
              {compileResult.message && compileResult.message !== '编译通过' && (
                <pre className="mb-0 mt-2" style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', maxHeight: 300, overflow: 'auto' }}>
                  {compileResult.message}
                </pre>
              )}
            </Alert>
          )}
          
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>语言</Form.Label>
              <Form.Select value={language} onChange={e => setLanguage(parseInt(e.target.value))} style={{ maxWidth: 200 }}>
                <option value={0}>C</option>
                <option value={1}>C++</option>
                <option value={3}>Java</option>
                <option value={6}>Python</option>
                <option value={16}>JavaScript</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>源代码</Form.Label>
              <Form.Control
                as="textarea" rows={16}
                value={source}
                onChange={e => setSource(e.target.value)}
                required
                placeholder="在此粘贴你的代码..."
                style={{ fontFamily: 'var(--font-mono)', fontSize: '14px' }}
              />
            </Form.Group>
            
            {/* 验证码 */}
            <Form.Group className="mb-3">
              <Form.Label>验证码</Form.Label>
              <div className="d-flex gap-2 align-items-center">
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
                <Form.Text className="text-muted">
                  点击验证码可刷新
                </Form.Text>
              </div>
            </Form.Group>
            
            <div className="d-flex gap-2">
              <Button 
                variant="outline-info" 
                onClick={handleCompileCheck}
                disabled={compileChecking || !source.trim()}
              >
                {compileChecking ? '检查中...' : '🔍 编译检查'}
              </Button>
              <Button 
                variant="primary" 
                type="submit" 
                disabled={submitting || !source.trim() || !vcode.trim()}
              >
                {submitting ? '提交中...' : '🚀 提交'}
              </Button>
            </div>
            
            <Form.Text className="text-muted mt-2 d-block">
              💡 编译检查会调用评测机的真实编译器验证代码能否编译通过
            </Form.Text>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
}
