import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { agentSteps } from '../data/mockData.js'

const AboutPage = () => {
  useGSAP(() => {
    gsap.from('.page-about h1', { yPercent: 100, duration: 1.2, ease: 'expo.out' });
    gsap.from('.agent-desc', { opacity: 0, y: 40, duration: 1, ease: 'power2.out', delay: 0.3 });
    gsap.from('.agent-card', { y: 40, duration: 0.6, ease: 'power2.out', stagger: 0.1, delay: 0.5 });
  }, [])

  return (
    <section className="page-about noisy min-h-dvh pt-32 pb-20">
      <div className="container mx-auto px-5 2xl:px-0">
        <div className="text-center mb-20">
          <p className="badge inline-block mb-6">系统架构</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-modern-negra leading-none">多 Agent 工作流</h1>
          <p className="agent-desc mt-6 text-lg max-w-3xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            七个专业 Agent 协同工作——从意图识别到最终结果汇总，形成完整的文学与艺术灵感生成管线
          </p>
        </div>

        {/* 流程概览图 */}
        <div className="flex flex-wrap justify-center items-center gap-2 md:gap-3 mb-20 max-w-6xl mx-auto">
          {agentSteps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2 md:gap-3">
              <div className={`px-3 py-2 md:px-4 md:py-3 rounded-xl text-center transition-all min-w-[80px] md:min-w-[100px] ${
                step.status === 'success' ? 'ring-1 ring-green-500/30' :
                step.status === 'running' ? 'ring-1 ring-yellow/50 animate-pulse' :
                'ring-1 ring-white/10 opacity-60'
              }`}
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <span className="text-lg md:text-xl block">{step.icon}</span>
                <span className="text-[10px] md:text-xs font-medium block mt-1" style={{ color: 'var(--text-primary)' }}>
                  {step.label}
                </span>
                <span className="text-[9px] md:text-[10px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {step.status === 'success' ? '✓ 完成' : step.status === 'running' ? '⏳ 执行中' : '○ 等待'}
                </span>
              </div>
              {i < agentSteps.length - 1 && (
                <span className="text-yellow text-lg md:text-xl">→</span>
              )}
            </div>
          ))}
        </div>

        {/* 详细 Agent 卡片 */}
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {agentSteps.map((step) => (
            <div
              key={step.id}
              className="agent-card p-6 rounded-2xl transition-colors"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: `1px solid ${step.status === 'success' ? 'rgba(34,197,94,0.2)' : step.status === 'running' ? 'rgba(231,211,147,0.3)' : 'var(--border-color)'}`
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{step.icon}</span>
                <div>
                  <h3 className="font-modern-negra text-lg">{step.label}</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{step.name}</p>
                </div>
              </div>
              <p className="text-sm mb-4" style={{ color: 'var(--text-primary)' }}>{step.description}</p>
              <div className="space-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex justify-between">
                  <span>输入：</span>
                  <span>{step.input}</span>
                </div>
                <div className="flex justify-between">
                  <span>输出：</span>
                  <span className="text-yellow">{step.output}</span>
                </div>
              </div>
              <p className="mt-4 text-xs italic leading-relaxed" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
                {step.detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default AboutPage
