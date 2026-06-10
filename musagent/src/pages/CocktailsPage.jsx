import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { runPipeline } from '../nlp/pipeline.js'
import { chatWithInspiration, remoteRegenerate } from '../nlp/api.js'

const creationTypes = ['现代诗', '古典诗', '散文', '短篇片段'];
const emotionTones = ['孤独', '温柔', '激昂', '怀旧', '治愈'];
const artStyleOptions = ['印象派', '表现主义', '极简主义', '中国水墨', '赛博朋克', '超现实主义'];
const lengthOptions = ['短', '中', '长'];
const languageStyleOptions = ['清新', '浪漫', '克制', '朦胧', '叙事'];
const rhymeOptions = ['自由', '轻微押韵', '强押韵'];
const abstractionOptions = ['具象', '平衡', '抽象'];

const CocktailsPage = () => {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('城市孤独')
  const [creationType, setCreationType] = useState('现代诗')
  const [emotion, setEmotion] = useState('孤独')
  const [artStyle, setArtStyle] = useState('赛博朋克')
  const [lengthPreference, setLengthPreference] = useState('中')
  const [languageStyle, setLanguageStyle] = useState('清新')
  const [rhymeLevel, setRhymeLevel] = useState('自由')
  const [abstractionLevel, setAbstractionLevel] = useState('平衡')
  const [showResult, setShowResult] = useState(false)
  const [pipelineResult, setPipelineResult] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')
  const [agentLog, setAgentLog] = useState([])
  const [showAnalysisDetail, setShowAnalysisDetail] = useState(false)

  // ===== 灵感对话系统 =====
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  const agents = [
    { id: 'wordseg', name: 'WordSegAgent', label: '中文分词', icon: '📝' },
    { id: 'keyword', name: 'KeywordAgent', label: 'TF-IDF 关键词', icon: '🔑' },
    { id: 'summary', name: 'SummaryAgent', label: 'TextRank 摘要', icon: '📋' },
    { id: 'emotion', name: 'EmotionAgent', label: '情感分析', icon: '💭' },
    { id: 'intent', name: 'IntentAgent', label: '意图分类', icon: '🎯' },
    { id: 'retrieval', name: 'RetrievalAgent', label: '相似度检索', icon: '🔍' },
    { id: 'rag', name: 'RAGAgent', label: '知识库 RAG', icon: '📚' },
    { id: 'writer', name: 'WriterAgent', label: '文本生成', icon: '✍️' },
  ];

  useGSAP(() => {
    gsap.from('.page-cocktails h1', { yPercent: 100, duration: 1.2, ease: 'expo.out' });
    gsap.from('.page-cocktails .badge', { opacity: 0, y: 30, duration: 0.8, ease: 'power2.out' });
    gsap.from('.page-cocktails .menu-intro', { opacity: 0, y: 20, duration: 0.8, ease: 'power2.out', delay: 0.3 });
    gsap.from('.input-panel, .result-panel', { y: 50, duration: 0.8, ease: 'power2.out', stagger: 0.15, delay: 0.5 });
  }, []);

  const handleGenerate = async () => {
    setShowResult(false)
    setPipelineResult(null)
    setAgentLog([])
    setIsRunning(true)

    try {
      // 逐步执行 Agent（模拟流水线可见过程）
      for (let i = 0; i < agents.length; i++) {
        await new Promise(r => setTimeout(r, 150 + Math.random() * 150));
        setAgentLog(prev => [...prev, { ...agents[i], status: 'running' }]);
      }

      // 执行 NLP Pipeline
      const result = await runPipeline({
        topic,
        creationType,
        emotionTone: emotion,
        artStyle,
        lengthPreference,
        languageStyle,
        rhymeLevel,
        abstractionLevel,
      });

      if (!result || !result.generated) {
        throw new Error('Pipeline 返回数据为空');
      }

      setAgentLog(prev => prev.map(a => ({ ...a, status: 'done' })));
      setPipelineResult(result);
      setShowResult(true);
    } catch (err) {
      console.error('[灵感生成] 错误:', err);
      setAgentLog(prev => prev.map(a => ({ ...a, status: 'error' })));
      setPipelineResult({
        error: true,
        message: err.message || '未知错误',
        generated: { method: '错误', content: '生成失败：' + (err.message || '请检查后端是否正常运行'), note: '' },
        generatedLLM: { method: '错误', content: '生成失败：' + (err.message || '请检查后端是否正常运行'), note: '' },
        keywords: [], emotion: { dominant: '未知', scores: {}, intensity: 0 },
        queryExpansion: { core: [], imagery: [], expanded: [] },
        summary: '', similarWorks: [], ragResults: [],
        artStyles: [], music: { mood: '', genre: '' },
        input: { topic, creationType, emotionTone: emotion, artStyle, lengthPreference, languageStyle, rhymeLevel, abstractionLevel },
      });
      setShowResult(true);
    }
    setIsRunning(false);
  };

  const handleRegenerateOnly = async () => {
    if (!pipelineResult || isRegenerating) return;
    setIsRegenerating(true);
    try {
      const regenerated = await remoteRegenerate({
        input: {
          ...(pipelineResult.input || {}),
          useLLM: true,
          lengthPreference,
          languageStyle,
          rhymeLevel,
          abstractionLevel,
        },
        keywords: pipelineResult.keywords || [],
        similarWorks: pipelineResult.similarWorks || [],
        ragResults: pipelineResult.ragResults || [],
        emotion: pipelineResult.emotion || {},
        artStyles: pipelineResult.artStyles || [],
        music: pipelineResult.music || {},
      });
      setPipelineResult(prev => ({ ...prev, ...regenerated }));
    } catch (err) {
      console.error('[仅重新生成] 错误:', err);
    }
    setIsRegenerating(false);
  };

  const getResultText = () => {
    const llm = pipelineResult?.generatedLLM?.content || '';
    const template = pipelineResult?.generated?.content || '';
    return llm || template;
  };

  const handleCopyResult = async () => {
    const text = getResultText();
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyStatus('已复制');
    setTimeout(() => setCopyStatus(''), 1500);
  };

  const handleSendToPolish = () => {
    const text = getResultText();
    if (!text) return;
    sessionStorage.setItem('musagent:polishDraft', text);
    navigate('/contact');
  };

  const getEmotionStrengthText = (value = 0) => {
    if (value >= 0.5) return '情绪线索明显';
    if (value >= 0.2) return '情绪线索中等';
    if (value > 0) return '情绪线索较弱';
    return '情绪线索不明显';
  };

  const getKeywordLevel = (score, maxScore) => {
    if (!maxScore) return '低';
    const ratio = score / maxScore;
    if (ratio >= 0.75) return '高';
    if (ratio >= 0.4) return '中';
    return '低';
  };

  const applyChatToTopic = (msg, index) => {
    const previousUser = [...messages].slice(0, index).reverse().find(m => m.role === 'user');
    const terms = (msg.nlp?.keywords || []).slice(0, 4).map(k => k.keyword);
    const nextTopic = terms.length > 0 ? terms.join(' ') : previousUser?.content || '';
    if (nextTopic) {
      setTopic(nextTopic);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // ===== 对话处理 =====
  const handleSendMessage = async () => {
    const text = chatInput.trim();
    if (!text || chatLoading) return;
    setChatInput('');
    const userMsg = { role: 'user', content: text, nlp: null };
    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const history = messages.map(m => ({ role: m.role, content: m.content }));
      const res = await chatWithInspiration(text, history);
      const assistantMsg = {
        role: 'assistant',
        content: res.reply,
        llmUsed: res.llmUsed,
        nlp: res.nlp || null,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '😔 抱歉，我暂时无法回应。请确保后端服务已启动，然后重试。',
        llmUsed: false,
        nlp: null,
      }]);
    }
    setChatLoading(false);
  };

  const handleChatKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // 自动滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <section className="page-cocktails noisy min-h-dvh pt-32 pb-20">
      <div className="container mx-auto px-5 2xl:px-0">
        <div className="text-center mb-16">
          <p className="badge inline-block mb-6">灵感工作台</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-modern-negra leading-none">灵感生成</h1>
          <p className="mt-6 text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            输入主题或情绪，多 Agent 协作为你生成诗歌意象与创作灵感
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
          {/* 左侧输入面板 */}
          <div className="input-panel space-y-6">
            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>创作主题</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder='例如："城市孤独" "黄昏与成长" "雨夜里的自我和解"'
                className="w-full px-4 py-3 rounded-xl text-base focus:outline-none transition-colors"
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              />
            </div>

            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>创作类型</label>
              <div className="flex flex-wrap gap-2">
                {creationTypes.map((t) => (
                  <button key={t} onClick={() => setCreationType(t)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors cursor-pointer ${
                      creationType === t ? 'bg-yellow text-black' : ''
                    }`}
                    style={creationType !== t ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
                  >{t}</button>
                ))}
              </div>
              {(creationType === '散文' || creationType === '短篇片段') && (
                <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                  💡 知识库仅含现代诗与古典诗，相似度检索将自动引用现代诗作为参考语料
                </p>
              )}
            </div>

            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>情绪基调</label>
              <div className="flex flex-wrap gap-2">
                {emotionTones.map((e) => (
                  <button key={e} onClick={() => setEmotion(e)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors cursor-pointer ${
                      emotion === e ? 'bg-yellow text-black' : ''
                    }`}
                    style={emotion !== e ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
                  >{e}</button>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>艺术风格</label>
              <div className="flex flex-wrap gap-2">
                {artStyleOptions.map((s) => (
                  <button key={s} onClick={() => setArtStyle(s)}
                    className={`px-4 py-2 rounded-full text-sm transition-colors cursor-pointer ${
                      artStyle === s ? 'bg-yellow text-black' : ''
                    }`}
                    style={artStyle !== s ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
                  >{s}</button>
                ))}
              </div>
            </div>

            <div className="p-6 rounded-2xl space-y-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>生成偏好</label>
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>篇幅</p>
                <div className="flex flex-wrap gap-2">
                  {lengthOptions.map((option) => (
                    <button key={option} onClick={() => setLengthPreference(option)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${lengthPreference === option ? 'bg-yellow text-black' : ''}`}
                      style={lengthPreference !== option ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
                    >{option}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>语言风格</p>
                <div className="flex flex-wrap gap-2">
                  {languageStyleOptions.map((option) => (
                    <button key={option} onClick={() => setLanguageStyle(option)}
                      className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${languageStyle === option ? 'bg-yellow text-black' : ''}`}
                      style={languageStyle !== option ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
                    >{option}</button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>押韵</p>
                  <div className="flex flex-wrap gap-2">
                    {rhymeOptions.map((option) => (
                      <button key={option} onClick={() => setRhymeLevel(option)}
                        className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${rhymeLevel === option ? 'bg-yellow text-black' : ''}`}
                        style={rhymeLevel !== option ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
                      >{option}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>抽象程度</p>
                  <div className="flex flex-wrap gap-2">
                    {abstractionOptions.map((option) => (
                      <button key={option} onClick={() => setAbstractionLevel(option)}
                        className={`px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer ${abstractionLevel === option ? 'bg-yellow text-black' : ''}`}
                        style={abstractionLevel !== option ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
                      >{option}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={handleGenerate} disabled={isRunning}
              className="w-full py-4 rounded-xl bg-yellow text-black font-semibold text-lg hover:opacity-80 transition-opacity cursor-pointer disabled:opacity-50">
              {isRunning ? '⏳ Agent 执行中...' : '✨ 生成灵感'}
            </button>
          </div>

          {/* 右侧结果面板 */}
          <div className="result-panel space-y-4">
            {/* Agent 执行日志 */}
            {agentLog.length > 0 && (
              <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>⚙️ Agent 执行状态</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {agentLog.map((a) => (
                    <div key={a.id} className={`text-center p-1.5 rounded-lg text-[10px] ${
                      a.status === 'done' ? 'bg-green-500/10 text-green-400' : 'bg-yellow/10 text-yellow animate-pulse'
                    }`}>
                      <span className="block text-sm">{a.icon}</span>
                      {a.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {showResult && pipelineResult ? (
              <>
                {/* 意图 */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>🎯 用户意图</h3>
                  <p className="text-lg font-bold text-yellow">{pipelineResult.intent?.intent || '诗歌创作'}</p>
                </div>

                {/* WriterAgent 状态 */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>🤖 WriterAgent 状态</h3>
                  <p className="text-sm font-medium" style={{ color: pipelineResult.generatedLLM?.method?.includes('DeepSeek') ? '#86efac' : 'var(--text-secondary)' }}>
                    {pipelineResult.generatedLLM?.method?.includes('DeepSeek') ? 'DeepSeek 已启用' :
                      pipelineResult.generatedLLM?.method?.includes('失败') ? 'DeepSeek 不可用，已降级模板' :
                      pipelineResult.generatedLLM?.method || '等待生成'}
                  </p>
                  {pipelineResult.generatedLLM?.note && (
                    <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{pipelineResult.generatedLLM.note}</p>
                  )}
                </div>

                {/* 最终结果优先展示 */}
                <div className="p-4 rounded-2xl border border-yellow/30" style={{ backgroundColor: 'var(--bg-card)' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <h3 className="text-sm font-medium text-yellow">最终生成结果</h3>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {pipelineResult.generatedLLM?.method?.includes('DeepSeek') ? 'LLM 版本优先' : '模板降级结果'}
                    </span>
                  </div>
                  <pre className="text-sm leading-relaxed font-serif whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                    {getResultText() || '暂无生成内容'}
                  </pre>
                </div>

                <div className="flex flex-wrap justify-center gap-2">
                  <button onClick={handleCopyResult}
                    className="px-4 py-2 rounded-full text-xs transition-colors hover:bg-white/10"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                    {copyStatus || '复制结果'}
                  </button>
                  <button onClick={handleRegenerateOnly} disabled={isRegenerating}
                    className="px-4 py-2 rounded-full text-xs transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                    {isRegenerating ? '生成中...' : '沿用分析再生成'}
                  </button>
                  <button onClick={handleGenerate} disabled={isRunning}
                    className="px-4 py-2 rounded-full text-xs transition-colors disabled:opacity-50"
                    style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
                    重新分析生成
                  </button>
                  <button onClick={handleSendToPolish}
                    className="px-4 py-2 rounded-full text-xs bg-yellow text-black transition-opacity hover:opacity-80">
                    发送到润色
                  </button>
                </div>

                <button
                  onClick={() => setShowAnalysisDetail(v => !v)}
                  className="w-full px-4 py-2 rounded-full text-xs transition-colors"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}
                >
                  {showAnalysisDetail ? '收起 Agent 分析详情' : '查看 Agent 分析详情'}
                </button>

                {showAnalysisDetail && (
                <>

                {/* 主题理解 */}
                {pipelineResult.queryExpansion && (
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <h3 className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>🧭 主题理解</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>核心关键词</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(pipelineResult.queryExpansion.core || []).length > 0 ? (
                            pipelineResult.queryExpansion.core.map((term) => (
                              <span key={term} className="px-2 py-1 rounded-full text-xs bg-yellow text-black">
                                {term}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>未识别到明确核心词</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <p className="text-[10px] mb-1.5" style={{ color: 'var(--text-muted)' }}>联想意象</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(pipelineResult.queryExpansion.imagery || []).length > 0 ? (
                            pipelineResult.queryExpansion.imagery.map((term) => (
                              <span key={term} className="px-2 py-0.5 rounded-full text-[10px]"
                                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                #{term}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>暂无扩展意象</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 关键词 */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>🔑 关键词重要度</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {(() => {
                      const keywords = pipelineResult.keywords || [];
                      const maxScore = Math.max(...keywords.map((kw) => kw.tfidf || 0), 0);
                      return keywords.map((kw) => {
                        const level = getKeywordLevel(kw.tfidf || 0, maxScore);
                        return (
                          <span key={kw.keyword} className="px-2 py-1 rounded-full text-xs bg-yellow text-black">
                            {kw.keyword} <span className="opacity-60">{level}</span>
                          </span>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* 情感 */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>💭 情感分析</h3>
                  <p className="text-sm mb-2">
                    主导：<span className="font-bold text-yellow">{pipelineResult.emotion.dominant}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{getEmotionStrengthText(pipelineResult.emotion.intensity)}</span>
                  </p>
                  <div className="space-y-1">
                    {Object.entries(pipelineResult.emotion.scores).filter(([,v]) => v > 0).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-2">
                        <span className="w-10 text-xs" style={{ color: 'var(--text-muted)' }}>{k}</span>
                        <div className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                          <div className="h-1.5 rounded-full bg-yellow" style={{ width: `${v * 100}%` }}></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 摘要 */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>📋 TextRank 摘要</h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{pipelineResult.summary}</p>
                </div>

                {/* 生成内容 — 双结果对比 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* 算法模板 */}
                  <div className="p-3 rounded-2xl border border-white/20" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <p className="text-[10px] mb-2 px-2 py-0.5 rounded-full inline-block"
                      style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                      ⚙️ {pipelineResult.generated?.method || '算法模板'}
                    </p>
                    <pre className="text-xs leading-relaxed font-serif whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                      {pipelineResult.generated?.content || ''}
                    </pre>
                  </div>
                  {/* DeepSeek LLM */}
                  <div className="p-3 rounded-2xl border border-yellow/30" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <p className="text-[10px] mb-2 px-2 py-0.5 rounded-full inline-block"
                      style={{ backgroundColor: 'rgba(231,211,147,0.15)', color: 'var(--text-secondary)' }}>
                      🤖 {pipelineResult.generatedLLM?.method || 'LLM 生成'}
                    </p>
                    <pre className="text-xs leading-relaxed font-serif whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
                      {pipelineResult.generatedLLM?.content || '生成中...'}
                    </pre>
                  </div>
                </div>

                {/* 相似度对比 */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>
                    🔍 知识库检索 — 主题「{pipelineResult.input.topic}」→ 诗词正文相似度对比
                    {pipelineResult.input.creationType !== 'all' && <span className="ml-1">（按类型「{pipelineResult.input.creationType}」过滤）</span>}
                  </h3>
                  <div className="space-y-1.5">
                    {(pipelineResult.similarWorks || []).slice(0, 3).map((w, i) => (
                      <div key={i} className="text-xs space-y-1">
                        <div className="flex justify-between items-center">
                          <span style={{ color: 'var(--text-primary)' }}>[{w.type}] {w.title}</span>
                          <span className="text-yellow">{(w.similarity || 0).toFixed(3)}</span>
                        </div>
                        {(w.matchedTerms || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            <span style={{ color: 'var(--text-muted)' }}>命中：</span>
                            {w.matchedTerms.slice(0, 5).map((term) => (
                              <span key={term} className="px-1.5 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                                {term}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>相似度为 BM25 相关度分数，用于排序，不代表百分比。</p>
                </div>

                {/* RAG 知识 */}
                <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>📚 RAG 知识依据</h3>
                  {(pipelineResult.ragResults || []).map((r, i) => (
                    <p key={i} className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      <span className="text-yellow">[{r.topic}]</span> {r.excerpt}...
                    </p>
                  ))}
                </div>
                </>
                )}
              </>
            ) : !isRunning ? (
              <div className="flex-center h-full min-h-[400px] rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div className="text-center">
                  <span className="text-5xl block mb-4">✨</span>
                  <p style={{ color: 'var(--text-secondary)' }}>输入主题并点击「生成灵感」</p>
                  <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>8 个 NLP Agent 将协作完成分析</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {/* ===== 灵感对话系统 ===== */}
        <div className="mt-20 max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <p className="badge inline-block mb-4" style={{ backgroundColor: 'var(--badge-bg)', color: 'var(--badge-text)', padding: '4px 16px', borderRadius: '999px', fontSize: '0.75rem' }}>
              💬 灵感对话
            </p>
            <h2 className="text-2xl md:text-3xl font-modern-negra mb-2">与灵感菌聊聊</h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              情绪感知小助手 · 倾听你的创作心声
            </p>
          </div>

          {/* 聊天区域 */}
          <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
            {/* 消息列表 */}
            <div className="h-[400px] overflow-y-auto p-4 space-y-4" style={{ scrollBehavior: 'smooth' }}>
              {messages.length === 0 ? (
                <div className="flex-center h-full">
                  <div className="text-center">
                    <span className="text-4xl block mb-3">🍄</span>
                    <p style={{ color: 'var(--text-secondary)' }}>嘿，我是灵感菌～</p>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>你可以分享情绪、聊聊灵感，或者只是……说说话。</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      {/* 气泡 */}
                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-yellow text-black rounded-br-md'
                          : 'rounded-bl-md'
                      }`}
                        style={msg.role !== 'user' ? { backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' } : {}}
                      >
                        {msg.content}
                      </div>
                      {/* NLP 分析标签（仅助手消息） */}
                      {msg.role === 'assistant' && msg.nlp && (
                        <>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: 'rgba(231,211,147,0.15)', color: '#e7d393' }}>
                              {msg.nlp.emotion?.dominant || '未知'}
                            </span>
                            {(msg.nlp.keywords || []).slice(0, 3).map((k, ki) => (
                              <span key={ki} className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)' }}>
                                #{k.keyword}
                              </span>
                            ))}
                            {msg.llmUsed !== undefined && (
                              <span className="px-2 py-0.5 rounded-full text-[10px]" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                                {msg.llmUsed ? '🤖 LLM' : '📋 模板'}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => applyChatToTopic(msg, i)}
                            className="mt-2 px-3 py-1 rounded-full text-[10px] bg-yellow text-black"
                          >
                            用这段对话生成灵感
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="px-4 py-3 rounded-2xl rounded-bl-md text-sm" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    <span className="inline-flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-yellow animate-pulse" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-yellow animate-pulse" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-2 h-2 rounded-full bg-yellow animate-pulse" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* 输入框 */}
            <div className="p-3" style={{ borderTop: '1px solid var(--border-color)' }}>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={handleChatKeyDown}
                  placeholder="分享你的情绪或灵感想法……"
                  disabled={chatLoading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm focus:outline-none disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="px-5 py-2.5 rounded-xl bg-yellow text-black font-medium text-sm hover:opacity-80 transition-opacity disabled:opacity-40 cursor-pointer"
                >
                  发送
                </button>
              </div>
              <p className="text-[10px] mt-1.5 text-center" style={{ color: 'var(--text-muted)' }}>
                按 Enter 发送 · 灵感菌会感知你的情绪并给予创作启发
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default CocktailsPage
