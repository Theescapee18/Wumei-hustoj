'use client';

import { useState, useEffect } from 'react';
import { LocalKnowledgeJudge, KnowledgeProblemCache, KnowledgeSubmitService } from '@/lib/localKnowledgeJudge';

export default function KnowledgeAnswerPage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [currentProblem, setCurrentProblem] = useState<any | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState<any>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const judge = new LocalKnowledgeJudge();
  const cache = new KnowledgeProblemCache();
  const submitService = new KnowledgeSubmitService();

  useEffect(() => {
    loadProblems();
    submitService.startAutoSync();
    
    // 定期更新待提交数量
    setInterval(() => {
      setPendingCount(submitService.getPendingCount());
    }, 1000);
  }, []);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const data = await cache.loadAllProblems(category);
      setProblems(data);
      if (data.length > 0) {
        setCurrentProblem(data[0]);
      }
    } catch (error) {
      console.error('加载题目失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = () => {
    if (!currentProblem || !userAnswer) return;

    const startTime = Date.now();
    
    // 前端即时判题（服务器零压力）
    const judgeResult = judge.judge(currentProblem, userAnswer);
    const timeSpent = Math.floor((Date.now() - startTime) / 1000);

    setResult(judgeResult);

    // 保存到本地缓存（批量提交）
    submitService.saveSolutionLocally(
      currentProblem.problem_id,
      userAnswer,
      judgeResult,
      timeSpent
    );

    setPendingCount(submitService.getPendingCount());
  };

  const handleNextProblem = () => {
    if (currentIndex < problems.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setCurrentProblem(problems[nextIndex]);
      setUserAnswer(null);
      setResult(null);
    }
  };

  const handleManualSync = async () => {
    const success = await submitService.batchSubmit();
    if (success) {
      alert('答题结果已同步到服务器');
      setPendingCount(0);
    } else {
      alert('同步失败，稍后自动重试');
    }
  };

  const renderQuestion = () => {
    if (!currentProblem) return null;

    switch (currentProblem.question_type) {
      case 'choice':
        return (
          <div>
            <h3>{currentProblem.title}</h3>
            <div className="mt-3">
              {currentProblem.content.options.map((opt: any) => (
                <div key={opt.id} className="mb-2">
                  <input
                    type={currentProblem.content.type === 'single' ? 'radio' : 'checkbox'}
                    name="answer"
                    value={opt.id}
                    onChange={(e) => {
                      if (currentProblem.content.type === 'single') {
                        setUserAnswer([e.target.value]);
                      } else {
                        const answers = userAnswer || [];
                        if (e.target.checked) {
                          setUserAnswer([...answers, opt.id]);
                        } else {
                          setUserAnswer(answers.filter((a: any) => a !== opt.id));
                        }
                      }
                    }}
                  />
                  <label className="ml-2">{opt.id}. {opt.text}</label>
                </div>
              ))}
            </div>
          </div>
        );

      case 'judge':
        return (
          <div>
            <h3>{currentProblem.title}</h3>
            <div className="mt-3">
              <button
                className={`btn ${userAnswer === true ? 'btn-success' : 'btn-outline-success'} mr-2`}
                onClick={() => setUserAnswer(true)}
              >
                ✓ 正确
              </button>
              <button
                className={`btn ${userAnswer === false ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => setUserAnswer(false)}
              >
                ✗ 错误
              </button>
            </div>
          </div>
        );

      case 'blank':
        return (
          <div>
            <h3>{currentProblem.title}</h3>
            <div className="mt-3">
              {currentProblem.content.blanks.map((blank: any, index: number) => (
                <div key={blank.id} className="mb-2">
                  <label>填空 {index + 1}:</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="请输入答案"
                    onChange={(e) => {
                      const answers = userAnswer || [];
                      answers[index] = e.target.value;
                      setUserAnswer(answers);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return <div>未知题型</div>;
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className={`alert ${result.correct ? 'alert-success' : 'alert-warning'} mt-3`}>
        <h4>
          {result.correct ? '✓ 正确！' : '✗ 错误'}
          <span className="ml-2">得分: {result.score}</span>
        </h4>
        
        {result.correctAnswer && (
          <p className="mt-2">
            <strong>正确答案：</strong>
            {Array.isArray(result.correctAnswer) 
              ? result.correctAnswer.join(', ')
              : result.correctAnswer.toString()}
          </p>
        )}
        
        {result.explanation && (
          <p className="mt-2">
            <strong>解析：</strong>{result.explanation}
          </p>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="container mt-5">加载题目中...</div>;
  }

  return (
    <div className="container mt-5">
      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h5>
                技术基础知识题
                <span className="badge badge-info ml-2">
                  第 {currentIndex + 1} / {problems.length} 题
                </span>
              </h5>
            </div>
            
            <div className="card-body">
              {renderQuestion()}
              
              {!result && (
                <button 
                  className="btn btn-primary mt-3"
                  onClick={handleAnswer}
                  disabled={!userAnswer}
                >
                  🔍 检查答案（本地判题，零服务器压力）
                </button>
              )}
              
              {renderResult()}
              
              {result && currentIndex < problems.length - 1 && (
                <button 
                  className="btn btn-success mt-3"
                  onClick={handleNextProblem}
                >
                  下一题 →
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5>答题统计</h5>
            </div>
            <div className="card-body">
              <p>待提交: {pendingCount} 题</p>
              <p>已完成: {currentIndex + 1} 题</p>
              <p>题目总数: {problems.length} 题</p>
              
              {pendingCount > 0 && (
                <button 
                  className="btn btn-warning mt-2"
                  onClick={handleManualSync}
                >
                  ⬆️ 手动同步到服务器
                </button>
              )}
              
              <div className="mt-3">
                <label>按分类筛选：</label>
                <select 
                  className="form-control"
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setCurrentIndex(0);
                    setResult(null);
                  }}
                >
                  <option value="">全部</option>
                  <option value="language">编程语言</option>
                  <option value="framework">开发框架</option>
                  <option value="database">数据库</option>
                  <option value="frontend">前端技术</option>
                </select>
              </div>
            </div>
          </div>

          <div className="alert alert-info mt-3">
            <h6>💡 性能优化提示</h6>
            <ul>
              <li>✅ 题目已缓存到本地浏览器</li>
              <li>✅ 前端即时判题（零服务器压力）</li>
              <li>✅ 每10题自动同步结果</li>
              <li>✅ 支持离线答题</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}