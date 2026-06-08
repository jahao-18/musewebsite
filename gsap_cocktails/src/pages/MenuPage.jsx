import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useState, useMemo, useEffect } from 'react'
import { segment } from '../nlp/segmenter.js'
import { extractKeywords } from '../nlp/tfidf.js'
import { analyzeSentiment } from '../nlp/sentiment.js'
import { artStyles } from '../data/mockData.js'

// ===== 预处理：分词 + 关键词 + 情感 =====
function preprocessPoems(poemsData) {
  const all = [];
  for (const p of poemsData.modern) {
    const { words } = segment(p.content);
    const keywords = extractKeywords(words, null, 5);
    const emotion = analyzeSentiment(words);
    all.push({ id: `m-${all.length}`, type: '现代诗', title: p.title, author: p.author, content: p.content, keywords: keywords.map(k => k.keyword), emotion: emotion.dominant, emotionDetail: emotion });
  }
  for (const p of poemsData.classical) {
    const { words } = segment(p.content);
    const keywords = extractKeywords(words, null, 5);
    const emotion = analyzeSentiment(words);
    all.push({ id: `c-${all.length}`, type: '古典诗', title: p.title, author: p.author, content: p.content, keywords: keywords.map(k => k.keyword), emotion: emotion.dominant, emotionDetail: emotion });
  }
  return all;
}

// 情感分类标签
const EMOTION_TABS = [
  { key: 'all', label: '全部', icon: '📚' },
  { key: '孤独', label: '孤独', icon: '🌙' },
  { key: '怀旧', label: '怀旧', icon: '📷' },
  { key: '平静', label: '平静', icon: '🍃' },
  { key: '激昂', label: '激昂', icon: '🔥' },
  { key: '悲伤', label: '悲伤', icon: '💧' },
  { key: '喜悦', label: '喜悦', icon: '☀️' },
];

const MenuPage = () => {
  const [allPoems, setAllPoems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeEmotion, setActiveEmotion] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);
  const PER_PAGE = 30;

  // 切换筛选条件时重置页码
  useEffect(() => setPage(1), [searchQuery, activeEmotion, activeType]);

  // 动态加载诗歌数据
  useEffect(() => {
    import('../data/poems_extracted.json').then(m => {
      const processed = preprocessPoems(m.default);
      setAllPoems(processed);
      setPage(1);
      setLoading(false);
    });
  }, []);

  // 统计
  const stats = useMemo(() => {
    const modern = allPoems.filter(p => p.type === '现代诗').length;
    const classical = allPoems.filter(p => p.type === '古典诗').length;
    const emotions = {};
    allPoems.forEach(p => { emotions[p.emotion] = (emotions[p.emotion] || 0) + 1; });
    return { total: allPoems.length, modern, classical, emotions };
  }, [allPoems]);

  // 过滤
  const filteredPoems = useMemo(() => {
    return allPoems.filter(p => {
      const matchSearch = !searchQuery ||
        p.title.includes(searchQuery) ||
        p.content.includes(searchQuery) ||
        p.keywords.some(k => k.includes(searchQuery));
      const matchEmotion = activeEmotion === 'all' || p.emotion === activeEmotion;
      const matchType = activeType === 'all' || p.type === activeType;
      return matchSearch && matchEmotion && matchType;
    });
  }, [searchQuery, activeEmotion, activeType, allPoems]);

  // 分页展示（每次最多 30 张卡片，避免 DOM 节点过多导致卡顿）
  const displayedPoems = useMemo(
    () => filteredPoems.slice(0, page * PER_PAGE),
    [filteredPoems, page]
  );
  const hasMore = displayedPoems.length < filteredPoems.length;

  useGSAP(() => {
    gsap.from('.page-menu h1', { yPercent: 100, duration: 1.2, ease: 'expo.out' });
    gsap.from('.menu-intro', { opacity: 0, y: 30, duration: 1, ease: 'power2.out', delay: 0.4 });
    gsap.from('.kb-card', { y: 30, duration: 0.6, ease: 'power3.out', stagger: 0.04, delay: 0.5 });
  }, []);

  return (
    <section className="page-menu noisy min-h-dvh pt-32 pb-20">
      <div className="container mx-auto px-5 2xl:px-0">
        {loading ? (
          <div className="flex-center min-h-[60vh]">
            <div className="text-center">
              <span className="text-5xl block mb-4 animate-pulse">📚</span>
              <p style={{ color: 'var(--text-secondary)' }}>正在加载知识库...</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>5320 首诗歌数据加载中</p>
            </div>
          </div>
        ) : (
        <>
        <div className="text-center mb-12">
          <p className="badge inline-block mb-6">知识库探索</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-modern-negra leading-none">艺术知识库</h1>
          <p className="menu-intro mt-5 text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            共收录 <span className="text-yellow font-bold">{stats.total}</span> 首诗词（{stats.modern} 现代 · {stats.classical} 古典），已通过分词与情感分析提取特征
          </p>
        </div>

        {/* 搜索 + 统计 */}
        <div className="max-w-2xl mx-auto mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索诗词标题、内容、关键词..."
            className="w-full px-6 py-4 rounded-2xl text-base focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
        </div>

        {/* 情感分类标签 */}
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {EMOTION_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveEmotion(tab.key)}
              className={`px-4 py-2 rounded-full text-sm transition-colors cursor-pointer ${
                activeEmotion === tab.key ? 'bg-yellow text-black' : ''
              }`}
              style={activeEmotion !== tab.key ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' } : {}}
            >
              {tab.icon} {tab.label}
              {tab.key !== 'all' && stats.emotions[tab.key] ? ` (${stats.emotions[tab.key]})` : ''}
            </button>
          ))}
        </div>

        {/* 类型标签 */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {[
            { key: 'all', label: '全部' },
            { key: '现代诗', label: `📖 现代诗 (${stats.modern})` },
            { key: '古典诗', label: `📜 古典诗词 (${stats.classical})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveType(tab.key)}
              className={`px-4 py-2 rounded-full text-xs transition-colors cursor-pointer ${
                activeType === tab.key ? 'bg-yellow/80 text-black' : ''
              }`}
              style={activeType !== tab.key ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 诗词卡片列表 */}
        {displayedPoems.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
            <span className="text-5xl block mb-4">🔍</span>
            <p>没有匹配的诗词，试试换个关键词或情感分类</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {displayedPoems.map((poem) => {
              const isExpanded = expandedId === poem.id;
              return (
              <div
                key={poem.id}
                onClick={() => setExpandedId(isExpanded ? null : poem.id)}
                className="kb-card p-5 rounded-2xl transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card)', border: isExpanded ? '1px solid rgba(231,211,147,0.4)' : '1px solid var(--border-color)' }}
              >
                {/* 顶部标签 */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {poem.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    poem.emotion === '孤独' ? 'bg-purple-500/15 text-purple-300' :
                    poem.emotion === '怀旧' ? 'bg-amber-500/15 text-amber-300' :
                    poem.emotion === '激昂' ? 'bg-red-500/15 text-red-300' :
                    poem.emotion === '平静' ? 'bg-teal-500/15 text-teal-300' :
                    poem.emotion === '喜悦' ? 'bg-green-500/15 text-green-300' :
                    'bg-slate-500/15 text-slate-300'
                  }`}>
                    {poem.emotion}
                  </span>
                </div>

                {/* 标题 */}
                <h3 className="font-modern-negra text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  {poem.title}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>作者：{poem.author}</p>

                {/* 内容 — 折叠时 line-clamp，展开时全显示 */}
                <p className={`text-xs mb-4 leading-relaxed ${isExpanded ? '' : 'line-clamp-3'}`}
                  style={{ color: 'var(--text-secondary)' }}>
                  {poem.content}
                </p>
                {!isExpanded && poem.content.length > 120 && (
                  <p className="text-[10px] mb-3 text-yellow cursor-pointer">点击展开全文 →</p>
                )}
                {isExpanded && (
                  <p className="text-[10px] mb-3 text-yellow">▲ 收起</p>
                )}

                {/* 关键词 */}
                <div className="flex flex-wrap gap-1.5">
                  {poem.keywords.map((kw) => (
                    <span key={kw} className="px-2 py-0.5 rounded-full text-[10px]"
                      style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                      #{kw}
                    </span>
                  ))}
                </div>
              </div>
            )})}
          </div>
        )}

        {/* 显示条数 + 加载更多 */}
        <div className="text-center mt-8" style={{ color: 'var(--text-muted)' }}>
          显示 {displayedPoems.length} / {filteredPoems.length} 首
          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              className="block mx-auto mt-4 px-8 py-3 rounded-full text-sm font-medium transition-colors hover:bg-white/10"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              📖 加载更多（每次 {PER_PAGE} 首）
            </button>
          )}
        </div>

        {/* 艺术风格库 */}
        <div className="mt-24">
          <h2 className="text-2xl md:text-3xl font-modern-negra text-center mb-8">艺术风格库</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {artStyles.map((style) => (
              <div
                key={style.id}
                className="p-4 rounded-2xl text-center transition-colors"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
              >
                <div className="flex justify-center gap-1 mb-2">
                  {style.colorPalette.map((color) => (
                    <div key={color} className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                  ))}
                </div>
                <h3 className="font-medium text-sm">{style.name}</h3>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>{style.emotion}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{style.musicMatch}</p>
              </div>
            ))}
          </div>
        </div>
        </>
        )}
      </div>
    </section>
  )
}

export default MenuPage
