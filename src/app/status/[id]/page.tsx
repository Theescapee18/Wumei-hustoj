'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import Badge from 'react-bootstrap/Badge';

const resultText: Record<number, { text: string; variant: string }> = {
  0: { text: 'Pending', variant: 'secondary' },
  1: { text: 'Rejudging', variant: 'warning' },
  2: { text: 'Compiling', variant: 'info' },
  3: { text: 'Running', variant: 'info' },
  4: { text: 'Accepted', variant: 'success' },
  5: { text: 'Presentation Error', variant: 'danger' },
  6: { text: 'Wrong Answer', variant: 'danger' },
  7: { text: 'Time Limit Exceeded', variant: 'danger' },
  8: { text: 'Memory Limit Exceeded', variant: 'danger' },
  9: { text: 'Output Limit Exceeded', variant: 'danger' },
  10: { text: 'Runtime Error', variant: 'danger' },
  11: { text: 'Compile Error', variant: 'warning' },
  13: { text: 'Internal Error', variant: 'danger' },
};

const languageNames: Record<number, string> = {
  0: 'C', 1: 'C++', 2: 'Pascal', 3: 'Java', 4: 'Ruby',
  5: 'Bash', 6: 'Python', 7: 'PHP', 8: 'Perl', 9: 'C#',
  10: 'Obj-C', 11: 'FreeBasic', 12: 'Scheme', 13: 'Lua', 16: 'JavaScript',
};

export default function StatusDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/submissions/${id}`)
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, [id]);

  if (!data) return <Container className="py-4"><p>加载中...</p></Container>;

  const result = resultText[data.result] || { text: 'Unknown', variant: 'secondary' };

  return (
    <Container className="py-4">
      <h2 className="mb-4">提交详情 #{data.solution_id}</h2>

      <Card className="mb-4">
        <Card.Body>
          <div className="d-flex gap-4 flex-wrap">
            <div><strong>题目：</strong>{data.problem_id}. {data.title}</div>
            <div><strong>用户：</strong>{data.user_id}</div>
            <div><strong>结果：</strong><Badge bg={result.variant}>{result.text}</Badge></div>
            <div><strong>时间：</strong>{data.time} ms</div>
            <div><strong>内存：</strong>{data.memory} KB</div>
            <div><strong>语言：</strong>{languageNames[data.language] || `Lang-${data.language}`}</div>
            <div><strong>代码长度：</strong>{data.code_length} B</div>
            <div><strong>提交时间：</strong>{new Date(data.in_date).toLocaleString('zh-CN')}</div>
          </div>
        </Card.Body>
      </Card>

      {data.compileinfo && (
        <Card className="mb-4 border-danger">
          <Card.Header className="text-danger">编译错误信息</Card.Header>
          <Card.Body><pre style={{ whiteSpace: 'pre-wrap' }}>{data.compileinfo}</pre></Card.Body>
        </Card>
      )}

      {data.runtimeinfo && (
        <Card className="mb-4 border-warning">
          <Card.Header className="text-warning">运行时信息</Card.Header>
          <Card.Body><pre style={{ whiteSpace: 'pre-wrap' }}>{data.runtimeinfo}</pre></Card.Body>
        </Card>
      )}

      <Card>
        <Card.Header>源代码</Card.Header>
        <Card.Body>
          <pre className="mb-0"><code>{data.source}</code></pre>
        </Card.Body>
      </Card>
    </Container>
  );
}
