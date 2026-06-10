import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { useEffect, useState } from 'react'
import { fetchKnowledge } from '../nlp/api.js'
import { artStyles } from '../data/mockData.js'

const PER_PAGE = 30;

const EMPTY_STATS = {
  total: 0,
  modern: 0,
  classical: 0,
  emotions: {},
};

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

const TYPE_TABS = [
  { key: 'all', label: '全部' },
  { key: '现代诗', label: '📖 现代诗' },
  { key: '古典诗', label: '📜 古典诗词' },
];

const getEmotionClass = (emotion) => {
  if (emotion === '孤独') return 'bg-purple-500/15 text-purple-300';
  if (emotion === '怀旧') return 'bg-amber-500/15 text-amber-300';
  if (emotion === '激昂') return 'bg-red-500/15 text-red-300';
  if (emotion === '平静') return 'bg-teal-500/15 text-teal-300';
  if (emotion === '喜悦') return 'bg-green-500/15 text-green-300';
  return 'bg-slate-500/15 text-slate-300';
};

const MenuPage = () => {
  const [poems, setPoems] = useState([]);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [filteredTotal, setFilteredTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [activeEmotion, setActiveEmotion] = useState('all');
  const [activeType, setActiveType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const data = await fetchKnowledge({
          page: 1,
          pageSize: PER_PAGE,
          search: searchQuery.trim(),
          emotion: activeEmotion,
          poemType: activeType,
        });
        if (cancelled) return;
        setPoems(data.items || []);
        setStats(data.stats || EMPTY_STATS);
        setFilteredTotal(data.filteredTotal || 0);
        setHasMore(Boolean(data.hasMore));
        setPage(1);
        setExpandedId(null);
      } catch (e) {
        if (cancelled) return;
        setError(e.message || '知识库接口请求失败');
        setPoems([]);
        setFilteredTotal(0);
        setHasMore(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchQuery, activeEmotion, activeType]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);
    setError('');
    try {
      const data = await fetchKnowledge({
        page: nextPage,
        pageSize: PER_PAGE,
        search: searchQuery.trim(),
        emotion: activeEmotion,
        poemType: activeType,
      });
      setPoems((prev) => [...prev, ...(data.items || [])]);
      setFilteredTotal(data.filteredTotal || 0);
      setHasMore(Boolean(data.hasMore));
      setPage(nextPage);
    } catch (e) {
      setError(e.message || '加载更多失败');
    } finally {
      setLoadingMore(false);
    }
  };

  useGSAP(() => {
    gsap.from('.page-menu h1', { yPercent: 100, duration: 1.2, ease: 'expo.out' });
    gsap.from('.menu-intro', { opacity: 0, y: 30, duration: 1, ease: 'power2.out', delay: 0.4 });
    gsap.from('.kb-card', { y: 30, duration: 0.6, ease: 'power3.out', stagger: 0.04, delay: 0.5 });
  }, []);

  return (
    <section className="page-menu noisy min-h-dvh pt-32 pb-20">
      <div className="container mx-auto px-5 2xl:px-0">
        {loading && poems.length === 0 ? (
          <div className="flex-center min-h-[60vh]">
            <div className="text-center">
              <span className="text-5xl block mb-4 animate-pulse">📚</span>
              <p style={{ color: 'var(--text-secondary)' }}>正在加载知识库...</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>后端正在生成标签与情感特征</p>
            </div>
          </div>
        ) : (
        <>
        <div className="text-center mb-12">
          <p className="badge inline-block mb-6">知识库探索</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-modern-negra leading-none">艺术知识库</h1>
          <p className="menu-intro mt-5 text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            共收录 <span className="text-yellow font-bold">{stats.total}</span> 首诗词（{stats.modern} 现代 · {stats.classical} 古典），由后端统一完成分词、标签与情感分析
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索诗词标题、作者、内容、关键词..."
            className="w-full px-6 py-4 rounded-2xl text-base focus:outline-none transition-colors"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          />
        </div>

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

        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {TYPE_TABS.map((tab) => {
            const count = tab.key === '现代诗' ? stats.modern : tab.key === '古典诗' ? stats.classical : stats.total;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveType(tab.key)}
                className={`px-4 py-2 rounded-full text-xs transition-colors cursor-pointer ${
                  activeType === tab.key ? 'bg-yellow/80 text-black' : ''
                }`}
                style={activeType !== tab.key ? { backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' } : {}}
              >
                {tab.label} ({count})
              </button>
            );
          })}
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 rounded-2xl text-sm"
            style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', color: '#fecaca', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
            知识库后端接口不可用：{error}。请确认后端已在 8000 端口启动。
          </div>
        )}

        {loading && poems.length > 0 && (
          <p className="text-center text-xs mb-6" style={{ color: 'var(--text-muted)' }}>正在刷新筛选结果...</p>
        )}

        {poems.length === 0 ? (
          <div className="text-center py-20" style={{ color: 'var(--text-muted)' }}>
            <span className="text-5xl block mb-4">🔍</span>
            <p>没有匹配的诗词，试试换个关键词或情感分类</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
            {poems.map((poem) => {
              const isExpanded = expandedId === poem.id;
              return (
              <div
                key={poem.id}
                onClick={() => setExpandedId(isExpanded ? null : poem.id)}
                className="kb-card p-5 rounded-2xl transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card)', border: isExpanded ? '1px solid rgba(231,211,147,0.4)' : '1px solid var(--border-color)' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                    {poem.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getEmotionClass(poem.emotion)}`}>
                    {poem.emotion}
                  </span>
                </div>

                <h3 className="font-modern-negra text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  {poem.title}
                </h3>
                <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>作者：{poem.author}</p>

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

                <div className="flex flex-wrap gap-1.5">
                  {(poem.keywords || []).map((kw) => (
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

        <div className="text-center mt-8" style={{ color: 'var(--text-muted)' }}>
          显示 {poems.length} / {filteredTotal} 首
          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="block mx-auto mt-4 px-8 py-3 rounded-full text-sm font-medium transition-colors hover:bg-white/10 disabled:opacity-60"
              style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
            >
              {loadingMore ? '正在加载...' : `📖 加载更多（每次 ${PER_PAGE} 首）`}
            </button>
          )}
        </div>

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
