'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Form from 'react-bootstrap/Form';
import Button from 'react-bootstrap/Button';
import Alert from 'react-bootstrap/Alert';
import Spinner from 'react-bootstrap/Spinner';

export default function AdminSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setSettings(data.settings);
          setLabels(data.labels || {});
        }
      })
      .catch(() => { setIsError(true); setMessage('加载设置失败'); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('保存成功！');
        setIsError(false);
      } else {
        setIsError(true);
        setMessage(data.error || '保存失败');
      }
    } catch {
      setIsError(true);
      setMessage('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: string) => {
    setSettings(prev => ({ ...prev, [key]: prev[key] === 'true' ? 'false' : 'true' }));
  };

  const textSetting = (key: string, value: string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) return <Container className="py-4"><p>加载中...</p></Container>;

  const booleanKeys = [
    'OJ_REGISTER', 'OJ_NEED_LOGIN', 'OJ_PUBLIC_STATUS', 'OJ_SIM', 'OJ_MAIL',
    'OJ_MATHJAX', 'OJ_ACE_EDITOR', 'OJ_VCODE', 'OJ_LONG_LOGIN', 'OJ_AUTO_SHOW_OFF',
    'OJ_OI_MODE', 'OJ_CONTEST_TOTAL_100', 'OJ_CE_PENALTY', 'OJ_APPENDCODE',
    'OJ_BLOCKLY', 'OJ_TEST_RUN', 'OJ_DOWNLOAD', 'OJ_SHARE_CODE',
    'OJ_REMOTE_JUDGE', 'OJ_NICK_IMMUTABLE', 'OJ_NOIP_HINT', 'OJ_FREE_PRACTICE',
    'OJ_LIMIT_TO_1_IP',
  ];

  return (
    <Container className="py-4">
      <h2 className="mb-4">系统设置</h2>
      {message && <Alert variant={isError ? 'danger' : 'success'} dismissible onClose={() => setMessage('')}>{message}</Alert>}

      <Card>
        <Card.Body>
          <Form>
            {/* Text fields */}
            {booleanKeys.includes('OJ_NAME') || true ? null : null}
            <Form.Group className="mb-3">
              <Form.Label>OJ 名称</Form.Label>
              <Form.Control
                value={settings.OJ_NAME || ''}
                onChange={e => textSetting('OJ_NAME', e.target.value)}
              />
            </Form.Group>

            <hr />
            <h6 className="mb-3">开关设置</h6>

            {booleanKeys.filter(k => k !== 'OJ_REGISTER').map(key => (
              <Form.Check
                key={key}
                type="switch"
                id={`sw-${key}`}
                label={labels[key] || key}
                checked={settings[key] === 'true'}
                onChange={() => toggleSetting(key)}
                className="mb-2"
              />
            ))}

            <hr />
            <h6 className="mb-3">已禁用的设置（注册功能已在代码层禁用）</h6>
            <Form.Check
              type="switch"
              id="sw-OJ_REGISTER"
              label={labels.OJ_REGISTER || 'OJ_REGISTER'}
              checked={false}
              disabled
              className="mb-2 text-muted"
            />
          </Form>
        </Card.Body>
      </Card>

      <div className="mt-3">
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          {saving ? <><Spinner size="sm" className="me-1" />保存中...</> : '保存设置'}
        </Button>
        <Button variant="secondary" className="ms-2" onClick={() => router.push('/admin')}>返回</Button>
      </div>
    </Container>
  );
}
