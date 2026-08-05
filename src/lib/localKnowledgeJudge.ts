// 前端本地判题服务（服务器零压力）
// 适用于技术基础知识题（选择题、判断题、填空题）

export interface KnowledgeProblem {
  problem_id: number;
  title: string;
  category: string;
  subcategory?: string;
  question_type: 'choice' | 'judge' | 'blank' | 'short';
  difficulty: number;
  content: any;
  explanation?: string;
  knowledge_points?: string[];
}

export interface JudgeResult {
  correct: boolean;
  score: number;
  explanation?: string;
  correctAnswer?: any;
  details?: any;
}

export class LocalKnowledgeJudge {
  
  /**
   * 判断选择题答案（单选/多选）
   */
  judgeChoice(problem: KnowledgeProblem, userAnswer: string[]): JudgeResult {
    const content = problem.content;
    const correctOptions = content.options
      .filter((opt: any) => opt.correct)
      .map((opt: any) => opt.id);
    
    // 比对答案
    const isCorrect = 
      userAnswer.length === correctOptions.length &&
      userAnswer.every((ans: string) => correctOptions.includes(ans));
    
    return {
      correct: isCorrect,
      score: isCorrect ? 100 : 0,
      explanation: problem.explanation,
      correctAnswer: correctOptions,
      details: {
        userAnswer: userAnswer,
        correctOptions: correctOptions,
        type: content.type // 'single' or 'multiple'
      }
    };
  }
  
  /**
   * 判断判断题答案
   */
  judgeJudge(problem: KnowledgeProblem, userAnswer: boolean): JudgeResult {
    const correctAnswer = problem.content.answer;
    const isCorrect = userAnswer === correctAnswer;
    
    return {
      correct: isCorrect,
      score: isCorrect ? 100 : 0,
      explanation: problem.explanation,
      correctAnswer: correctAnswer
    };
  }
  
  /**
   * 判断填空题答案
   */
  judgeBlank(problem: KnowledgeProblem, userAnswers: string[]): JudgeResult {
    const blanks = problem.content.blanks;
    let correctCount = 0;
    const results: any[] = [];
    
    blanks.forEach((blank: any, index: number) => {
      const userAns = userAnswers[index] || '';
      const isCorrect = this.checkBlankAnswer(
        userAns, 
        blank.answer, 
        blank.acceptable || [],
        problem.content.case_sensitive || false
      );
      
      if (isCorrect) correctCount++;
      results.push({
        blankId: blank.id,
        correct: isCorrect,
        userAnswer: userAns,
        correctAnswer: blank.answer
      });
    });
    
    const score = (correctCount / blanks.length) * 100;
    
    return {
      correct: score === 100,
      score: score,
      explanation: problem.explanation,
      details: {
        results: results,
        totalBlanks: blanks.length,
        correctBlanks: correctCount
      }
    };
  }
  
  /**
   * 检查填空题答案（支持多种可接受答案）
   */
  private checkBlankAnswer(
    userAnswer: string, 
    correctAnswer: string, 
    acceptable: string[], 
    caseSensitive: boolean
  ): boolean {
    // 标准化答案
    const normalize = (str: string) => 
      caseSensitive ? str.trim() : str.trim().toLowerCase();
    
    const normalizedUser = normalize(userAnswer);
    
    // 检查标准答案
    if (normalizedUser === normalize(correctAnswer)) return true;
    
    // 检查可接受答案列表
    return acceptable.some((ans: string) => normalizedUser === normalize(ans));
  }
  
  /**
   * 统一判题接口
   */
  judge(problem: KnowledgeProblem, userAnswer: any): JudgeResult {
    switch (problem.question_type) {
      case 'choice':
        return this.judgeChoice(problem, userAnswer);
      case 'judge':
        return this.judgeJudge(problem, userAnswer);
      case 'blank':
        return this.judgeBlank(problem, userAnswer);
      case 'short':
        // 简答题需要人工评分，前端只做基础检查
        return {
          correct: false,
          score: 0,
          explanation: '简答题需要人工评分',
          details: {
            keywords: problem.content.keywords,
            reference_answer: problem.content.reference_answer,
            needReview: true
          }
        };
      default:
        return {
          correct: false,
          score: 0,
          explanation: '未知题型'
        };
    }
  }
}

// 前端题目缓存服务
export class KnowledgeProblemCache {
  private cacheKey = 'knowledge_problems_v1';
  private versionKey = 'knowledge_cache_version';
  
  /**
   * 批量加载题目到前端缓存
   */
  async loadAllProblems(category?: string): Promise<KnowledgeProblem[]> {
    // 检查本地缓存
    const cachedVersion = localStorage.getItem(this.versionKey);
    const cachedData = localStorage.getItem(this.cacheKey);
    
    // 如果有缓存，先使用缓存
    if (cachedData) {
      try {
        const problems = JSON.parse(cachedData);
        
        // 检查版本是否需要更新
        const latestVersion = await this.checkVersion();
        if (cachedVersion === latestVersion) {
          // 使用缓存，按分类过滤
          return category 
            ? problems.filter((p: any) => p.category === category)
            : problems;
        }
      } catch (e) {
        console.error('缓存解析失败:', e);
      }
    }
    
    // 从服务器批量获取
    const response = await fetch('/api/knowledge/problems/batch' + 
      (category ? `?category=${category}` : ''), {
      headers: { 'Authorization': `Bearer ${this.getToken()}` }
    });
    
    if (!response.ok) {
      throw new Error('获取题目失败');
    }
    
    const data = await response.json();
    
    // 存储到本地缓存
    localStorage.setItem(this.cacheKey, JSON.stringify(data.problems));
    localStorage.setItem(this.versionKey, data.version);
    
    return data.problems;
  }
  
  /**
   * 从缓存获取单个题目
   */
  getProblem(problemId: number): KnowledgeProblem | null {
    const cached = localStorage.getItem(this.cacheKey);
    if (!cached) return null;
    
    try {
      const problems = JSON.parse(cached);
      return problems.find((p: any) => p.problem_id === problemId);
    } catch {
      return null;
    }
  }
  
  /**
   * 检查缓存版本
   */
  private async checkVersion(): Promise<string> {
    try {
      const response = await fetch('/api/knowledge/problems/version', {
        headers: { 'Authorization': `Bearer ${this.getToken()}` }
      });
      const data = await response.json();
      return data.version;
    } catch {
      return 'v1'; // 默认版本
    }
  }
  
  /**
   * 获取JWT Token
   */
  private getToken(): string {
    // 从cookie获取token
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find((c: string) => c.trim().startsWith('token='));
    return tokenCookie ? tokenCookie.split('=')[1] : '';
  }
  
  /**
   * 清除缓存
   */
  clearCache() {
    localStorage.removeItem(this.cacheKey);
    localStorage.removeItem(this.versionKey);
  }
}

// 答题数据批量提交服务
export class KnowledgeSubmitService {
  private pendingKey = 'pending_knowledge_solutions';
  private batchSize = 10; // 每10题提交一次
  private autoSyncInterval = 5 * 60 * 1000; // 5分钟自动同步
  
  /**
   * 保存答题结果到本地缓存
   */
  saveSolutionLocally(
    problemId: number, 
    answer: any, 
    result: JudgeResult,
    timeSpent: number = 0
  ) {
    const pending = JSON.parse(localStorage.getItem(this.pendingKey) || '[]');
    
    pending.push({
      problem_id: problemId,
      answer: answer,
      correct: result.correct,
      score: result.score,
      time_spent: timeSpent,
      timestamp: Date.now(),
      details: result.details
    });
    
    localStorage.setItem(this.pendingKey, JSON.stringify(pending));
    
    // 达到批量大小自动提交
    if (pending.length >= this.batchSize) {
      this.batchSubmit();
    }
  }
  
  /**
   * 批量提交答题结果到服务器
   */
  async batchSubmit(): Promise<boolean> {
    const pending = JSON.parse(localStorage.getItem(this.pendingKey) || '[]');
    
    if (pending.length === 0) return true;
    
    try {
      const response = await fetch('/api/knowledge/solutions/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getToken()}`
        },
        body: JSON.stringify({ solutions: pending })
      });
      
      if (response.ok) {
        // 清空本地缓存
        localStorage.removeItem(this.pendingKey);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('批量提交失败:', error);
      // 失败保留数据，下次继续提交
      return false;
    }
  }
  
  /**
   * 启动自动同步
   */
  startAutoSync() {
    setInterval(() => {
      this.batchSubmit();
    }, this.autoSyncInterval);
  }
  
  /**
   * 获取JWT Token
   */
  private getToken(): string {
    const cookies = document.cookie.split(';');
    const tokenCookie = cookies.find((c: string) => c.trim().startsWith('token='));
    return tokenCookie ? tokenCookie.split('=')[1] : '';
  }
  
  /**
   * 获取待提交数量
   */
  getPendingCount(): number {
    const pending = JSON.parse(localStorage.getItem(this.pendingKey) || '[]');
    return pending.length;
  }
}