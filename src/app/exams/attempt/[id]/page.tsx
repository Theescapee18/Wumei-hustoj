'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge';
import Alert from 'react-bootstrap/Alert';
import Form from 'react-bootstrap/Form';

const QTYPE_LABEL: Record<string, string> = {
  single: '单选题', multiple: '多选题', fill: '填空题', judge: '判断题', coding: '算法题',
};

function fmtTime(sec: number): string {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return [h, m, s].map(x => String(x).padStart(2, '0')).join(':');
}

export default function ExamAttemptPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.id as string;

  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [codingSrc, setCodingSrc] = useState<Record<string, { language: string; source: string }>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submittedRef = useRef(false);
  const answersRef = useRef<Record<string, string>>({});

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/exams/attempts/${attemptId}`);
      const d = await res.json();
      if (!res.ok) { setError(d.error || '加载失败'); return; }
      setData(d);
      submittedRef.current = d.attempt.submitted;
      setRemaining(d.attempt.remaining_seconds);
      const a: Record<string, string> = {};
      for (const q of d.questions) if (q.my_answer) a[String(q.question_id)] = q.my_answer;
      setAnswers(a);
      answersRef.current = a;
    } catch { setError('网络错误，请刷新重试'); }
  }, [attemptId]);

  useEffect(() => { load(); }, [load]);

  // 保存客观题答案（防抖）
  const scheduleSave = useCallback((next: Record<string, string>) => {
    answersRef.current = next;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await fetch(`/api/exams/attempts/${attemptId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: answersRef.current }),
        });
      } catch { /* 下次保存重试 */ }
    }, 800);
  }, [attemptId]);

  const setAnswer = (qid: number, value: string) => {
    if (submittedRef.current) return;
    setAnswers(prev => {
      const next = { ...prev, [String(qid)]: value };
      scheduleSave(next);
      return next;
    });
  };

  const toggleMultiple = (qid: number, key: string) => {
    const cur = answers[String(qid)] || '';
    const set = new Set(cur.split(''));
    if (set.has(key)) set.delete(key); else set.add(key);
    setAnswer(qid, Array.from(set).sort().join(''));
  };

  // 交卷
  const submit = useCallback(async (auto = false) => {
    if (submittedRef.current || submitting) return;
    if (!auto && !confirm('确认交卷？交卷后不能再修改答案。')) return;
    setSubmitting(true);
    try {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      // 交卷前把最新答案落库
      await fetch(`/api/exams/attempts/${attemptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersRef.current }),
      });
      const res = await fetch(`/api/exams/attempts/${attemptId}/submit`, { method: 'POST' });
      const d = await res.json();
      if (res.ok) {
        submittedRef.current = true;
        setNotice(auto ? '时间到/触发限制，已自动交卷' : d.message);
      } else if (String(d.error || '').includes('已')) {
        submittedRef.current = true;
      } else {
        setError(d.error || '交卷失败');
      }
      await load();
    } catch { setError('网络错误，交卷失败，请重试'); }
    finally { setSubmitting(false); }
  }, [attemptId, load, submitting]);

  // 倒计时（考试模式）
  useEffect(() => {
    if (remaining === null || submittedRef.current) return;
    if (remaining <= 0) { submit(true); return; }
    const t = setInterval(() => {
      setRemaining(prev => {
        if (prev === null) return prev;
        if (prev <= 1) { clearInterval(t); submit(true); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining !== null, data?.attempt?.submitted]);

  // 防切屏（考试模式）：visibilitychange 上报，超 3 次服务端自动交卷
  useEffect(() => {
    if (!data || data.attempt.mode !== 'exam' || data.attempt.submitted) return;
    const onVisibility = async () => {
      if (!document.hidden || submittedRef.current) return;
      try {
        const res = await fetch(`/api/exams/attempts/${attemptId}/switch`, { method: 'POST' });
        const d = await res.json();
        if (d.auto_submitted) {
          submittedRef.current = true;
          setNotice(d.message || '切屏超限，已自动交卷');
          await load();
        } else if (d.message) {
          setNotice(d.message);
        }
      } catch { /* ignore */ }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [data, attemptId, load]);

  // 算法题提交评测
  const submitCoding = async (qid: number) => {
    const c = codingSrc[String(qid)] || { language: '6', source: '' };
    if (!c.source.trim()) { setNotice('请先输入代码'); return; }
    try {
      const res = await fetch(`/api/exams/attempts/${attemptId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coding: { question_id: qid, language: c.language, source: c.source } }),
      });
      const d = await res.json();
      if (res.ok) { setNotice(`代码已提交评测（提交号 ${d.solution_id}），判分以最后一次提交为准`); await load(); }
      else setError(d.error || '提交失败');
    } catch { setError('网络错误，请重试'); }
  };

  if (error && !data) {
    return <Container className="py-5" style={{ marginTop: 60 }}><Alert variant="danger">{error}</Alert></Container>;
  }
  if (!data) {
    return <Container className="py-5 text-center" style={{ marginTop: 60 }}>加载中...</Container>;
  }

  const { attempt, questions, result } = data;
  const detailOf = (qid: number) => result?.details?.find((x: any) => x.question_id === qid);

  return (
    <Container className="py-4" style={{ marginTop: 60, maxWidth: 900 }}>
      {/* 顶栏：标题 / 倒计时 / 交卷 */}
      <Card className="mb-3 sticky-top" style={{ top: 70, zIndex: 10 }}>
        <Card.Body className="d-flex justify-content-between align-items-center py-2 flex-wrap gap-2">
          <div>
            <strong>{attempt.paper_title}</strong>{' '}
            <Badge bg={attempt.mode === 'exam' ? 'danger' : 'success'}>
              {attempt.mode === 'exam' ? '模拟考试' : '自由练习'}
            </Badge>
            {attempt.mode === 'exam' && !attempt.submitted && (
              <Badge bg="warning" text="dark" className="ms-2">切屏 {attempt.switch_count}/3</Badge>
            )}
          </div>
          <div className="d-flex align-items-center gap-3">
            {attempt.mode === 'exam' && !attempt.submitted && remaining !== null && (
              <span className={`fw-bold ${remaining < 300 ? 'text-danger' : ''}`} style={{ fontSize: '1.2rem' }}>
                ⏱ {fmtTime(remaining)}
              </span>
            )}
            {!attempt.submitted ? (
              <Button variant="danger" size="sm" onClick={() => submit(false)} disabled={submitting}>
                {submitting ? '交卷中...' : '交卷'}
              </Button>
            ) : (
              <Badge bg="secondary" style={{ fontSize: '1rem' }}>
                已交卷{attempt.auto_submitted ? '（自动）' : ''} 得分 {result?.score ?? '-'}/{result?.total ?? '-'}
                {result?.pending && ' (算法题判题中)'}
              </Badge>
            )}
          </div>
        </Card.Body>
      </Card>

      {notice && <Alert variant="warning" dismissible onClose={() => setNotice('')}>{notice}</Alert>}
      {error && <Alert variant="danger" dismissible onClose={() => setError('')}>{error}</Alert>}
      {attempt.mode === 'exam' && !attempt.submitted && (
        <Alert variant="info" className="py-2">
          ⚠️ 考试模式已开启防切屏监控：切换标签页/最小化窗口会被记录，超过 3 次将自动交卷。答案自动保存。
        </Alert>
      )}

      {/* 题目列表 */}
      {questions.map((q: any) => {
        const qid = q.question_id;
        const myAns = answers[String(qid)] || '';
        const detail = detailOf(qid);
        return (
          <Card key={qid} className="mb-3">
            <Card.Header className="d-flex justify-content-between">
              <span>
                <Badge bg="primary" className="me-2">{q.question_order}</Badge>
                <Badge bg="light" text="dark">{QTYPE_LABEL[q.qtype] || q.qtype}</Badge>
                <span className="ms-2 text-muted">（{q.score} 分）</span>
              </span>
              {detail && (
                <Badge bg={detail.pending ? 'info' : detail.got >= q.score ? 'success' : detail.got > 0 ? 'warning' : 'danger'}>
                  {detail.pending ? '判题中' : `得 ${detail.got} 分`}
                </Badge>
              )}
            </Card.Header>
            <Card.Body>
              <div className="mb-3" style={{ whiteSpace: 'pre-wrap' }}>{q.content}</div>

              {q.qtype === 'single' && (q.options || []).map((o: any) => (
                <Form.Check key={o.key} type="radio" id={`q${qid}-${o.key}`} name={`q${qid}`}
                  label={`${o.key}. ${o.text}`} checked={myAns === o.key}
                  disabled={attempt.submitted}
                  onChange={() => setAnswer(qid, o.key)} />
              ))}

              {q.qtype === 'multiple' && (q.options || []).map((o: any) => (
                <Form.Check key={o.key} type="checkbox" id={`q${qid}-${o.key}`}
                  label={`${o.key}. ${o.text}`} checked={myAns.includes(o.key)}
                  disabled={attempt.submitted}
                  onChange={() => toggleMultiple(qid, o.key)} />
              ))}

              {q.qtype === 'judge' && ['T', 'F'].map(k => (
                <Form.Check key={k} type="radio" id={`q${qid}-${k}`} name={`q${qid}`}
                  label={k === 'T' ? '对 ✓' : '错 ✗'} checked={myAns === k}
                  disabled={attempt.submitted}
                  onChange={() => setAnswer(qid, k)} />
              ))}

              {q.qtype === 'fill' && (
                <Form.Control value={myAns} placeholder="请输入答案"
                  disabled={attempt.submitted}
                  onChange={e => setAnswer(qid, e.target.value)} />
              )}

              {q.qtype === 'coding' && (
                <div>
                  <div className="mb-2">
                    <Link href={`/problems/${q.problem_id}`} target="_blank">
                      查看完整题面（题目 #{q.problem_id}）↗
                    </Link>
                  </div>
                  {!attempt.submitted && (
                    <>
                      <Form.Select className="mb-2" style={{ maxWidth: 200 }}
                        value={codingSrc[String(qid)]?.language || '6'}
                        onChange={e => setCodingSrc(prev => ({
                          ...prev, [String(qid)]: { language: e.target.value, source: prev[String(qid)]?.source || '' },
                        }))}>
                        <option value="0">C</option>
                        <option value="1">C++</option>
                        <option value="3">Java</option>
                        <option value="6">Python</option>
                        <option value="16">JavaScript</option>
                      </Form.Select>
                      <Form.Control as="textarea" rows={8} className="mb-2"
                        style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}
                        placeholder="在此编写代码后点击提交评测"
                        value={codingSrc[String(qid)]?.source || ''}
                        onChange={e => setCodingSrc(prev => ({
                          ...prev, [String(qid)]: { language: prev[String(qid)]?.language || '6', source: e.target.value },
                        }))} />
                      <Button size="sm" variant="primary" onClick={() => submitCoding(qid)}>提交评测</Button>
                    </>
                  )}
                  {q.my_solution_id && (
                    <div className="mt-2">
                      <Link href={`/status/${q.my_solution_id}`} target="_blank">
                        查看最近一次评测结果（#{q.my_solution_id}）↗
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* 交卷后显示标准答案 */}
              {detail && q.qtype !== 'coding' && (
                <Alert variant={detail.got >= q.score ? 'success' : 'danger'} className="mt-3 py-2 mb-0">
                  你的答案：{detail.user_answer || '（未作答）'} ｜ 标准答案：{detail.standard_answer || '（未录入）'}
                </Alert>
              )}
            </Card.Body>
          </Card>
        );
      })}

      <div className="d-flex justify-content-between mb-5">
        <Link href="/exams"><Button variant="outline-secondary">← 返回考试列表</Button></Link>
        {!attempt.submitted ? (
          <Button variant="danger" onClick={() => submit(false)} disabled={submitting}>
            {submitting ? '交卷中...' : '确认交卷'}
          </Button>
        ) : (
          <Button variant="outline-primary" onClick={() => router.push('/exams/scores')}>查看我的成绩</Button>
        )}
      </div>
    </Container>
  );
}
