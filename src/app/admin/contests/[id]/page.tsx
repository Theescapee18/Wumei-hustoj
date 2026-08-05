'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';

export default function AdminContestEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isNew = id === 'new';
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startHour, setStartHour] = useState('08');
  const [startMin, setStartMin] = useState('00');
  const [endDate, setEndDate] = useState('');
  const [endHour, setEndHour] = useState('12');
  const [endMin, setEndMin] = useState('00');
  const [isPrivate, setIsPrivate] = useState(0);
  const [password, setPassword] = useState('');
  const [subnet, setSubnet] = useState('');
  const [problemIds, setProblemIds] = useState('');
  const [userList, setUserList] = useState('');
  const [contestType, setContestType] = useState(0);
  const [langmask, setLangmask] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [existingProblems, setExistingProblems] = useState<any[]>([]);

  useEffect(() => {
    if (!isNew && id) {
      fetch(`/api/admin/contests/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.error) {
            setIsError(true);
            setMessage(data.error);
            return;
          }
          const c = data.contest;
          setTitle(c.title || '');
          setDesc(c.description || '');

          const st = new Date(c.start_time);
          setStartDate(st.toISOString().slice(0, 10));
          setStartHour(String(st.getHours()).padStart(2, '0'));
          setStartMin(String(st.getMinutes()).padStart(2, '0'));

          const et = new Date(c.end_time);
          setEndDate(et.toISOString().slice(0, 10));
          setEndHour(String(et.getHours()).padStart(2, '0'));
          setEndMin(String(et.getMinutes()).padStart(2, '0'));

          setIsPrivate(c.private ?? 0);
          setPassword(c.password || '');
          setSubnet(c.subnet || '');
          setContestType(c.contest_type ?? 0);
          setLangmask(c.langmask ?? 0);

          setProblemIds(data.problems?.map((p: any) => p.problem_id).join(',') || '');
          setExistingProblems(data.problems || []);
          setUserList(data.users?.join('\n') || '');
        })
        .catch(() => { setIsError(true); setMessage('加载失败'); });
    } else {
      // Default values for new contest
      const now = new Date();
      setStartDate(now.toISOString().slice(0, 10));
      setStartHour(String(now.getHours()).padStart(2, '0'));
      setStartMin('00');
      const later = new Date(now.getTime() + 4 * 3600000);
      setEndDate(later.toISOString().slice(0, 10));
      setEndHour(String(later.getHours()).padStart(2, '0'));
      setEndMin('00');
    }
  }, [id, isNew]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const startTime = `${startDate} ${startHour}:${startMin}:00`;
    const endTime = `${endDate} ${endHour}:${endMin}:00`;

    const body = {
      action: isNew ? undefined : 'update',
      title,
      description: desc,
      start_time: startTime,
      end_time: endTime,
      private: isPrivate,
      password,
      subnet,
      contest_type: contestType,
      langmask,
      problems: problemIds.split(',').map(s => s.trim()).filter(Boolean),
      userList: userList.split('\n').map(s => s.trim()).filter(Boolean),
    };

    try {
      let res;
      if (isNew) {
        res = await fetch('/api/admin/contests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      } else {
        res = await fetch(`/api/admin/contests/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
      }
      const data = await res.json();
      if (res.ok) {
        setMessage(isNew ? `创建成功！竞赛 ID: ${data.contest_id}` : '保存成功！');
        setIsError(false);
        if (isNew && data.contest_id) {
          setTimeout(() => router.push(`/admin/contests/${data.contest_id}`), 1500);
        }
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

  if (!isNew && !title && !message) return <Container className="py-4"><p>加载中...</p></Container>;

  return (
    <Container className="py-4">
      <h2 className="mb-4">{isNew ? '创建竞赛' : `编辑竞赛 #${id}`}</h2>
      {message && <Alert variant={isError ? 'danger' : 'success'} dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Form onSubmit={handleSubmit}>
        <Card className="mb-3">
          <Card.Body>
            <Form.Group className="mb-2">
              <Form.Label>标题</Form.Label>
              <Form.Control value={title} onChange={e => setTitle(e.target.value)} required />
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>描述</Form.Label>
              <Form.Control as="textarea" rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
            </Form.Group>
            <div className="row mb-2">
              <div className="col-md-6">
                <Form.Label>开始时间</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <Form.Control type="number" min={0} max={23} style={{ width: 70 }} placeholder="时" value={startHour} onChange={e => setStartHour(e.target.value.padStart(2, '0'))} />
                  <span className="align-self-center">:</span>
                  <Form.Control type="number" min={0} max={59} style={{ width: 70 }} placeholder="分" value={startMin} onChange={e => setStartMin(e.target.value.padStart(2, '0'))} />
                </div>
              </div>
              <div className="col-md-6">
                <Form.Label>结束时间</Form.Label>
                <div className="d-flex gap-2">
                  <Form.Control type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                  <Form.Control type="number" min={0} max={23} style={{ width: 70 }} placeholder="时" value={endHour} onChange={e => setEndHour(e.target.value.padStart(2, '0'))} />
                  <span className="align-self-center">:</span>
                  <Form.Control type="number" min={0} max={59} style={{ width: 70 }} placeholder="分" value={endMin} onChange={e => setEndMin(e.target.value.padStart(2, '0'))} />
                </div>
              </div>
            </div>
            <div className="row mb-2">
              <div className="col-md-4">
                <Form.Label>权限</Form.Label>
                <Form.Select value={isPrivate} onChange={e => setIsPrivate(parseInt(e.target.value))}>
                  <option value={0}>公开</option>
                  <option value={1}>私有</option>
                </Form.Select>
              </div>
              <div className="col-md-4">
                <Form.Label>密码（可选）</Form.Label>
                <Form.Control value={password} onChange={e => setPassword(e.target.value)} placeholder="留空表示无密码" />
              </div>
              <div className="col-md-4">
                <Form.Label>子网限制</Form.Label>
                <Form.Control value={subnet} onChange={e => setSubnet(e.target.value)} placeholder="0.0.0.0/0" />
              </div>
            </div>
            <Form.Group className="mb-2">
              <Form.Label>题目 ID 列表（逗号分隔）</Form.Label>
              <Form.Control value={problemIds} onChange={e => setProblemIds(e.target.value)} placeholder="1000,1001,1002" />
              {existingProblems.length > 0 && (
                <div className="mt-1 small text-muted">
                  已选：{existingProblems.map((p: any) => `${p.problem_id}(${p.title || '?'})`).join(', ')}
                </div>
              )}
            </Form.Group>
            <Form.Group className="mb-2">
              <Form.Label>私有竞赛用户列表（每行一个用户名）</Form.Label>
              <Form.Control as="textarea" rows={4} value={userList} onChange={e => setUserList(e.target.value)} placeholder="user1&#10;user2&#10;user3" />
            </Form.Group>
          </Card.Body>
        </Card>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading ? <><Spinner size="sm" className="me-1" />保存中...</> : (isNew ? '创建' : '保存')}
        </Button>
        <Button variant="secondary" className="ms-2" onClick={() => router.push('/admin/contests')}>返回</Button>
      </Form>
    </Container>
  );
}
