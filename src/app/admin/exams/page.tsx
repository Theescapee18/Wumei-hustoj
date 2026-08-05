'use client';

import { useState, useEffect, useCallback } from 'react';
import Container from 'react-bootstrap/Container';
import Table from 'react-bootstrap/Table';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Modal from 'react-bootstrap/Modal';
import Form from 'react-bootstrap/Form';
import Alert from 'react-bootstrap/Alert';
import Card from 'react-bootstrap/Card';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const PAPER_EXAMPLE = `{
  "title": "C语言基础月考",
  "description": "第一次月考",
  "duration_minutes": 60,
  "questions": [
    { "type": "单选", "content": "int 占几个字节？", "options": ["A. 1", "B. 2", "C. 4", "D. 8"], "answer": "C", "score": 5 },
    { "type": "多选", "content": "以下哪些是关键字？", "options": ["A. int", "B. main", "C. for", "D. abc"], "answer": "AC", "score": 5 },
    { "type": "填空", "content": "1+1=____", "answer": "2", "score": 5 },
    { "type": "判断", "content": "C 语言区分大小写", "answer": "T", "score": 5 },
    { "type": "算法题", "content": "完成 A+B 问题", "problem_id": 1000, "score": 20 }
  ]
}`;

const ANSWER_EXAMPLE = `{ "answers": [
  { "order": 1, "answer": "C" },
  { "order": 2, "answer": "AC" },
  { "order": 3, "answer": "2" },
  { "order": 4, "answer": "T" }
] }`;

export default function AdminExamsPage() {
  const [papers, setPapers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [message, setMessage] = useState('');

  // 分类管理
  const [showCat, setShowCat] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // 试卷导入
  const [showImport, setShowImport] = useState(false);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [jsonText, setJsonText] = useState('');
  const [importCatId, setImportCatId] = useState('');
  const [importDuration, setImportDuration] = useState('60');
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState<any[] | null>(null);

  // 答案导入（独立窗口）
  const [answerPaper, setAnswerPaper] = useState<any>(null);
  const [ansMode, setAnsMode] = useState<'file' | 'paste'>('paste');
  const [ansFile, setAnsFile] = useState<File | null>(null);
  const [ansText, setAnsText] = useState('');
  const [ansImporting, setAnsImporting] = useState(false);
  const [ansResults, setAnsResults] = useState<any[] | null>(null);

  const load = useCallback(async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/admin/exams'),
        fetch('/api/admin/exams/categories'),
      ]);
      if (pRes.ok) setPapers((await pRes.json()).papers || []);
      if (cRes.ok) setCategories((await cRes.json()).categories || []);
    } catch { setMessage('加载失败，请刷新重试'); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const createCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/exams/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: catName, description: catDesc }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : `错误: ${data.error}`);
    if (res.ok) { setCatName(''); setCatDesc(''); load(); }
  };

  const deleteCategory = async (cid: number, name: string) => {
    if (!confirm(`确认删除分类"${name}"？分类下的试卷会保留但变为未分类。`)) return;
    const res = await fetch(`/api/admin/exams/categories/${cid}`, { method: 'DELETE' });
    const data = await res.json();
    setMessage(res.ok ? data.message : `错误: ${data.error}`);
    load();
  };

  const importPaper = async (e: React.FormEvent) => {
    e.preventDefault();
    setImporting(true);
    setImportResults(null);
    try {
      let res: Response;
      if (inputMode === 'paste') {
        res = await fetch('/api/admin/exams/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            json_text: jsonText,
            category_id: importCatId || undefined,
            duration_minutes: importDuration || undefined,
          }),
        });
      } else {
        const fd = new FormData();
        if (importFile) fd.append('file', importFile);
        if (importCatId) fd.append('category_id', importCatId);
        if (importDuration) fd.append('duration_minutes', importDuration);
        res = await fetch('/api/admin/exams/import', { method: 'POST', body: fd });
      }
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setImportResults(data.results || []);
        setJsonText('');
        setImportFile(null);
        load();
      } else setMessage(`错误: ${data.error}`);
    } catch { setMessage('网络错误，请重试'); }
    finally { setImporting(false); }
  };

  const importAnswers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerPaper) return;
    setAnsImporting(true);
    setAnsResults(null);
    try {
      let res: Response;
      if (ansMode === 'paste') {
        res = await fetch(`/api/admin/exams/${answerPaper.paper_id}/answers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ json_text: ansText }),
        });
      } else {
        const fd = new FormData();
        if (ansFile) fd.append('file', ansFile);
        res = await fetch(`/api/admin/exams/${answerPaper.paper_id}/answers`, { method: 'POST', body: fd });
      }
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setAnsResults(data.results || []);
        setAnsText('');
        setAnsFile(null);
        load();
      } else setMessage(`错误: ${data.error}`);
    } catch { setMessage('网络错误，请重试'); }
    finally { setAnsImporting(false); }
  };

  const toggleDefunct = async (pid: number) => {
    const res = await fetch(`/api/admin/exams/${pid}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toggle_defunct: true }),
    });
    const data = await res.json();
    setMessage(res.ok ? data.message : `错误: ${data.error}`);
    load();
  };

  const deletePaper = async (pid: number, title: string) => {
    if (!confirm(`确认删除试卷"${title}"？所有作答记录将一并删除，此操作不可恢复。`)) return;
    const res = await fetch(`/api/admin/exams/${pid}`, { method: 'DELETE' });
    const data = await res.json();
    setMessage(res.ok ? data.message : `错误: ${data.error}`);
    load();
  };

  return (
    <Container className="py-4">
      <h2 className="mb-3">考试管理</h2>
      {message && <Alert variant="info" dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <div className="mb-3 d-flex gap-2">
        <Button variant="primary" onClick={() => { setImportResults(null); setShowImport(true); }}>导入试卷</Button>
        <Button variant="outline-secondary" onClick={() => setShowCat(true)}>分类管理</Button>
      </div>

      <Table striped bordered hover responsive>
        <thead>
          <tr>
            <th>#</th><th>标题</th><th>分类</th><th>题数</th><th>总分</th>
            <th>时长(分)</th><th>缺答案</th><th>状态</th><th>操作</th>
          </tr>
        </thead>
        <tbody>
          {papers.map(p => (
            <tr key={p.paper_id}>
              <td>{p.paper_id}</td>
              <td>{p.title}</td>
              <td>{p.category_name || <span className="text-muted">未分类</span>}</td>
              <td>{p.question_count}</td>
              <td>{p.total_score}</td>
              <td>{p.duration_minutes}</td>
              <td>{p.missing_answers > 0
                ? <Badge bg="warning" text="dark">{p.missing_answers} 题</Badge>
                : <Badge bg="success">齐全</Badge>}</td>
              <td>{p.defunct === 'Y' ? <Badge bg="secondary">已下架</Badge> : <Badge bg="success">上架中</Badge>}</td>
              <td className="d-flex gap-1 flex-wrap">
                <Button size="sm" variant="outline-primary"
                  onClick={() => { setAnsResults(null); setAnsText(''); setAnswerPaper(p); }}>
                  导入答案
                </Button>
                <Button size="sm" variant={p.defunct === 'Y' ? 'outline-success' : 'outline-warning'}
                  onClick={() => toggleDefunct(p.paper_id)}>
                  {p.defunct === 'Y' ? '上架' : '下架'}
                </Button>
                <Button size="sm" variant="outline-danger" onClick={() => deletePaper(p.paper_id, p.title)}>删除</Button>
              </td>
            </tr>
          ))}
          {papers.length === 0 && <tr><td colSpan={9} className="text-center text-muted">暂无试卷，点击"导入试卷"添加</td></tr>}
        </tbody>
      </Table>

      {/* 分类管理 Modal */}
      <Modal show={showCat} onHide={() => setShowCat(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>考试分类管理</Modal.Title></Modal.Header>
        <Modal.Body>
          <Form onSubmit={createCategory} className="mb-3">
            <Row className="g-2">
              <Col md={4}><Form.Control placeholder="分类名（如：C语言基础）" value={catName}
                onChange={e => setCatName(e.target.value)} required /></Col>
              <Col md={5}><Form.Control placeholder="描述（可选）" value={catDesc}
                onChange={e => setCatDesc(e.target.value)} /></Col>
              <Col md={3}><Button type="submit" className="w-100">创建分类</Button></Col>
            </Row>
          </Form>
          <Table size="sm" bordered>
            <thead><tr><th>#</th><th>名称</th><th>描述</th><th>试卷数</th><th>操作</th></tr></thead>
            <tbody>
              {categories.map(c => (
                <tr key={c.category_id}>
                  <td>{c.category_id}</td>
                  <td>{c.name}</td>
                  <td>{c.description}</td>
                  <td>{c.paper_count}</td>
                  <td><Button size="sm" variant="outline-danger"
                    onClick={() => deleteCategory(c.category_id, c.name)}>删除</Button></td>
                </tr>
              ))}
              {categories.length === 0 && <tr><td colSpan={5} className="text-center text-muted">暂无分类</td></tr>}
            </tbody>
          </Table>
        </Modal.Body>
      </Modal>

      {/* 导入试卷 Modal */}
      <Modal show={showImport} onHide={() => setShowImport(false)} size="lg">
        <Modal.Header closeButton><Modal.Title>导入试卷</Modal.Title></Modal.Header>
        <Form onSubmit={importPaper}>
          <Modal.Body>
            <Row className="g-2 mb-3">
              <Col md={6}>
                <Form.Label>考试分类</Form.Label>
                <Form.Select value={importCatId} onChange={e => setImportCatId(e.target.value)}>
                  <option value="">未分类</option>
                  {categories.map(c => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
                </Form.Select>
              </Col>
              <Col md={6}>
                <Form.Label>考试时长（分钟，模拟考试倒计时用）</Form.Label>
                <Form.Control type="number" min={1} value={importDuration}
                  onChange={e => setImportDuration(e.target.value)} required />
              </Col>
            </Row>
            <div className="mb-2">
              <Form.Check inline type="radio" label="上传 JSON 文件" checked={inputMode === 'file'}
                onChange={() => setInputMode('file')} name="exam-input-mode" id="exam-mode-file" />
              <Form.Check inline type="radio" label="粘贴 JSON 内容" checked={inputMode === 'paste'}
                onChange={() => setInputMode('paste')} name="exam-input-mode" id="exam-mode-paste" />
            </div>
            {inputMode === 'file' ? (
              <Form.Group className="mb-2">
                <Form.Control type="file" accept=".json,application/json"
                  onChange={e => setImportFile((e.target as HTMLInputElement).files?.[0] || null)} />
              </Form.Group>
            ) : (
              <Form.Group className="mb-2">
                <Form.Control as="textarea" rows={12} value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  placeholder={PAPER_EXAMPLE} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
              </Form.Group>
            )}
            <Alert variant="secondary" className="py-2" style={{ fontSize: '0.85rem' }}>
              支持单份试卷或数组批量导入。题型：单选/多选/填空/判断/算法题。
              answer 可省略，之后通过"导入答案"窗口单独导入；算法题填 problem_id 关联题库，由评测机判分。
            </Alert>
            {importResults && importResults.length > 0 && (
              <Table size="sm" bordered>
                <thead><tr><th>试卷</th><th>结果</th><th>说明</th></tr></thead>
                <tbody>
                  {importResults.map((r, i) => (
                    <tr key={i}>
                      <td>{r.title}</td>
                      <td>{r.status === 'ok'
                        ? <Badge bg="success">成功（{r.questions} 题）</Badge>
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
            <Button variant="primary" type="submit"
              disabled={importing || (inputMode === 'file' ? !importFile : !jsonText.trim())}>
              {importing ? '导入中...' : '开始导入'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* 导入答案 Modal（独立窗口） */}
      <Modal show={!!answerPaper} onHide={() => setAnswerPaper(null)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>导入答案 - {answerPaper?.title}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={importAnswers}>
          <Modal.Body>
            <div className="mb-2">
              <Form.Check inline type="radio" label="粘贴 JSON 内容" checked={ansMode === 'paste'}
                onChange={() => setAnsMode('paste')} name="ans-input-mode" id="ans-mode-paste" />
              <Form.Check inline type="radio" label="上传 JSON 文件" checked={ansMode === 'file'}
                onChange={() => setAnsMode('file')} name="ans-input-mode" id="ans-mode-file" />
            </div>
            {ansMode === 'file' ? (
              <Form.Group className="mb-2">
                <Form.Control type="file" accept=".json,application/json"
                  onChange={e => setAnsFile((e.target as HTMLInputElement).files?.[0] || null)} />
              </Form.Group>
            ) : (
              <Form.Group className="mb-2">
                <Form.Control as="textarea" rows={8} value={ansText}
                  onChange={e => setAnsText(e.target.value)}
                  placeholder={ANSWER_EXAMPLE} style={{ fontFamily: 'monospace', fontSize: '0.85rem' }} />
              </Form.Group>
            )}
            <Alert variant="secondary" className="py-2" style={{ fontSize: '0.85rem' }}>
              格式：<code>{'{"answers":[{"order":1,"answer":"A"}]}'}</code> 或简写 <code>{'{"1":"A","2":"AC"}'}</code>（键为题号）。
              多选答案连写如 <code>AC</code>；填空多个可接受答案用 <code>|</code> 分隔；判断题填 <code>T/F</code> 或 对/错。
            </Alert>
            {ansResults && ansResults.length > 0 && (
              <Table size="sm" bordered>
                <thead><tr><th>题号</th><th>结果</th><th>说明</th></tr></thead>
                <tbody>
                  {ansResults.map((r, i) => (
                    <tr key={i}>
                      <td>{r.order}</td>
                      <td>{r.status === 'ok' ? <Badge bg="success">成功</Badge>
                        : r.status === 'skip' ? <Badge bg="secondary">跳过</Badge>
                          : <Badge bg="danger">失败</Badge>}</td>
                      <td>{r.error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setAnswerPaper(null)}>关闭</Button>
            <Button variant="primary" type="submit"
              disabled={ansImporting || (ansMode === 'file' ? !ansFile : !ansText.trim())}>
              {ansImporting ? '导入中...' : '导入答案'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
}
