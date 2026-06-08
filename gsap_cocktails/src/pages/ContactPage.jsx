import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useState } from 'react'
import { runPipeline } from '../nlp/pipeline.js'

const pipelineAgents = [
  { id: 'wordseg', name: 'WordSegAgent', label: '分词 + 停用词过滤', icon: '📝' },
  { id: 'keyword', name: 'KeywordAgent', label: 'TF-IDF 关键词提取', icon: '🔑' },
  { id: 'summary', name: 'SummaryAgent', label: 'TextRank 摘要', icon: '📋' },
  { id: 'emotion', name: 'EmotionAgent', label: '情感分析', icon: '💭' },
  { id: 'intent', name: 'IntentAgent', label: '意图分类', icon: '🎯' },
  { id: 'retrieval', name: 'RetrievalAgent', label: '知识库检索', icon: '🔍' },
  { id: 'rag', name: 'RAGAgent', label: 'RAG 知识整合', icon: '📚' },
  { id: 'writer', name: 'WriterAgent', label: '文本生成与润色', icon: '✍️' },
];

const ContactPage = () => {
  const [inputText, setInputText] = useState('黄昏把影子拉得很长很长。 像极了十八岁那年，我们说过的远方。 后来远山吞没了夕阳，归鸟衔走了最后一声告别。')
  const [showProcess, setShowProcess] = useState(false)
  const [currentStep, setCurrentStep] = useState(-1)
  const [result, setResult] = useState(null)
  const [isRunning, setIsRunning] = useState(false)

  useGSAP(() => {
    gsap.from('.page-contact h1', { yPercent: 100, duration: 1.2, ease: 'expo.out' });
    gsap.from('.create-panel', { y: 40, duration: 0.8, ease: 'power2.out', stagger: 0.15, delay: 0.3 });
  }, [])

  const handleAnalyze = async () => {
    setShowProcess(false)
    setCurrentStep(-1)
    setResult(null)
    setIsRunning(true)
    try {
      for (let i = 0; i < pipelineAgents.length; i++) {
        await new Promise(r => setTimeout(r, 120));
        setCurrentStep(i); setShowProcess(true);
      }
      const pr = await runPipeline({ topic: inputText, creationType: '散文', emotionTone: '怀旧', artStyle: '中国水墨' });
      const suggestions = [
        'TF-IDF 关键词：' + (pr.keywords || []).slice(0, 3).map(k => k.keyword).join('、'),
        '情绪基调「' + (pr.emotion?.dominant || '未知') + '」，建议增强相关意象密度',
        '检索到 ' + (pr.similarWorks || []).length + ' 篇相似作品作为参考',
      ];
      setResult({ ...pr, polishSuggestions: suggestions, polishedText: pr.generated?.content || '', polishedLLM: pr.generatedLLM?.content || '' });
      setCurrentStep(pipelineAgents.length);
    } catch (err) {
      setResult({
        error: true, message: err.message, generated: { method: '错误', content: '分析失败：' + err.message, note: '' }, generatedLLM: { method: '错误', content: '', note: '' }, polishedText: '', polishedLLM: '',
        keywords: [], emotion: { dominant: '未知', scores: {}, intensity: 0 }, summary: '', similarWorks: [], polishSuggestions: [], artStyles: [], music: {}
      });
      setCurrentStep(pipelineAgents.length);
    }
    setIsRunning(false);
  };

  return (
    <section className="page-contact noisy min-h-dvh pt-32 pb-20">
      <div className="container mx-auto px-5 2xl:px-0">
        <div className="text-center mb-16">
          <p className="badge inline-block mb-6">创作润色</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-modern-negra leading-none">创作与润色</h1>
          <p className="mt-6 text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>输入你的文本片段，多 Agent 协作分析、润色并推荐艺术风格</p>
        </div>
        <div className="grid xl:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="create-panel space-y-4">
            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h2 className="text-lg font-medium mb-4">📝 文本输入区</h2>
              <textarea value={inputText} onChange={e => setInputText(e.target.value)} rows={10}
                className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none resize-none"
                style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }} />
              <button onClick={handleAnalyze} className="w-full mt-4 py-3 rounded-xl bg-yellow text-black font-semibold cursor-pointer">✨ 开始分析与润色</button>
            </div>
          </div>
          <div className="create-panel">
            <div className="p-6 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <h2 className="text-lg font-medium mb-4">⚙️ Agent 执行过程</h2>
              {!showProcess ? (
                <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}><span className="text-4xl block mb-3">🤖</span><p>点击按钮启动 8 个 NLP Agent</p></div>
              ) : (
                <div className="space-y-2">
                  {pipelineAgents.map((step, i) => (
                    <div key={step.id} className={`flex items-center gap-2 p-2.5 rounded-xl ${i <= currentStep ? 'opacity-100' : 'opacity-40'}`} style={{ backgroundColor: 'var(--bg-secondary)' }}>
                      <span>{i < currentStep ? '✅' : i === currentStep ? step.icon : '⏳'}</span>
                      <div className="flex-1"><p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{step.label}</p><p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{step.name}</p></div>
                      {i < currentStep && <span className="text-[10px] text-green-400">完成</span>}
                      {i === currentStep && <span className="text-[10px] text-yellow animate-pulse">处理中</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="create-panel space-y-4">
            {result ? (
              <>
                {result.keywords && result.keywords.length > 0 && (
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>🔑 关键词</h3>
                    <div className="flex flex-wrap gap-1.5">{(result.keywords||[]).slice(0,8).map(kw => <span key={kw.keyword} className="px-2 py-0.5 rounded-full text-xs bg-yellow text-black">{kw.keyword} {(kw.tfidf||0).toFixed(2)}</span>)}</div>
                    <p className="text-xs mt-2"><span style={{ color: 'var(--text-muted)' }}>主导情绪：</span><span className="font-bold text-yellow">{result.emotion?.dominant||'未知'}</span></p>
                  </div>
                )}
                {result.polishSuggestions && result.polishSuggestions.length > 0 && (
                  <div className="p-4 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>💡 优化建议</h3>
                    <ul className="space-y-1.5">{(result.polishSuggestions||[]).map((s,i) => <li key={i} className="text-xs flex gap-1.5" style={{ color: 'var(--text-secondary)' }}><span className="text-yellow">►</span>{s}</li>)}</ul>
                  </div>
                )}
                {/* 双版本润色对比 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl border border-white/20" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <h3 className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>⚙️ 算法模板</h3>
                    <pre className="text-xs leading-relaxed font-serif whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{(result.polishedText || result.generated?.content || '')}</pre>
                  </div>
                  <div className="p-3 rounded-2xl border border-yellow/30" style={{ backgroundColor: 'var(--bg-card)' }}>
                    <h3 className="text-xs font-medium mb-2 text-yellow">🤖 DeepSeek LLM</h3>
                    <pre className="text-xs leading-relaxed font-serif whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{(result.polishedLLM || result.generatedLLM?.content || '生成中...')}</pre>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-center h-full min-h-[300px] rounded-2xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div className="text-center"><span className="text-4xl block mb-3">📋</span><p className="text-sm" style={{ color: 'var(--text-muted)' }}>结果将在此展示</p></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default ContactPage
