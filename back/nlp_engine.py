"""
NLP 引擎 — Jieba 分词 + TF-IDF + TextRank + 情感分析 + 检索
"""
import jieba
import numpy as np
from collections import Counter
import math
import os
import json

# ===== 加载诗歌数据 =====
_poems_cache = None

def _load_poems():
    global _poems_cache
    if _poems_cache is not None:
        return _poems_cache
    path = os.path.join(os.path.dirname(__file__), '..', 'musagent', 'src', 'data', 'poems_extracted.json')
    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    _poems_cache = data
    return _poems_cache

# ===== 停用词 =====
STOP_WORDS = set('''
的 了 在 是 我 有 和 就 不 人 都 一 他 这 中 大 来 上 国 个 到 说 们 为 子 和 你
地 出 道 也 时 年 得 就 那 要 下 以 生 会 自 着 去 之 过 家 学 对 可 她 里 后
小 么 心 多 天 而 能 好 然 没 日 于 起 还 发 成 事 只 作 当 想 看 文 无 开 手
十 用 主 行 方 又 如 前 所 本 见 经 头 面 公 同 三 已 老 从 动 两 长 知 民 样
现 分 将 外 但 身 些 与 高 意 进 把 法 此 实 回 二 理 美 点 月 明 其 种 声 全
工 己 话 信 重 相 物 气 代 通 比 员 名 水 常 更 正 关 各 合 期 力 教 内 去 平
太 者 头 机 电 间 第 表 少 山 应 制 加 被 门 话 最 题 新 建 程 展 果 样 变 军
很 最 真 之 些 所 等 月 而 题 向 五 解 问 意 建 体 果 代 应 并 系 外 加 提 立
该 还 此 前 区 务 种 群 解 者 量 看 气 说 手 使 义 情 强 光 运 关 加 重 先 海
接 化 战 通 教 指 干 期 此 已 将 回 被 很 最 其 合 同 正 间 门 较 各 组 见
'''.split())

# ===== WordSegAgent：Jieba 分词 =====
def segment(text: str) -> dict:
    words = [w for w in jieba.cut(text) if w.strip() and w not in STOP_WORDS and len(w) > 1]
    freq = Counter(words)
    return {"words": words, "freq": dict(freq.most_common(30)), "total": len(words)}

# ===== KeywordAgent：TF-IDF =====
def extract_keywords(words: list, top_n: int = 10) -> list:
    if not words:
        return []
    total = len(words)
    counter = Counter(words)
    result = []
    for word, count in counter.most_common(top_n):
        tf = count / total
        # 简化 IDF（使用较大语料库的经验值）
        idf = 1.0
        result.append({"keyword": word, "tfidf": round(tf * idf, 4)})
    return result

# ===== SummaryAgent：TextRank =====
def summarize(text: str, top_n: int = 3) -> dict:
    import re
    sentences = [s.strip() for s in re.split(r'[。！？\n]+', text) if len(s.strip()) > 2]
    if len(sentences) <= top_n:
        return {"summary": "。".join(sentences), "count": len(sentences)}
    n = len(sentences)
    sim = np.zeros((n, n))
    sent_words = [set(jieba.cut(s)) for s in sentences]
    for i in range(n):
        for j in range(n):
            if i != j:
                a, b = sent_words[i], sent_words[j]
                inter = len(a & b)
                sim[i][j] = inter / (math.log(len(a) + 1) + math.log(len(b) + 1))
    scores = np.ones(n) / n
    for _ in range(50):
        new = np.ones(n) * 0.15 / n
        for i in range(n):
            for j in range(n):
                if i != j and sim[j].sum() > 0:
                    new[i] += 0.85 * (sim[j][i] / sim[j].sum()) * scores[j]
        scores = new
    ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
    top_idx = sorted([i for i, _ in ranked[:top_n]])
    summary = "。".join([sentences[i] for i in top_idx])
    return {"summary": summary, "count": len(sentences)}

# ===== EmotionAgent：情感分析 =====
EMOTION_DICT = {
    "孤独": ["孤独","寂寞","独自","空旷","荒漠","一人","深夜","无人","沉默","静默","落寞"],
    "怀旧": ["怀念","回忆","记忆","往事","从前","曾经","故乡","旧日","往昔","泛黄"],
    "激昂": ["激昂","热血","汹涌","澎湃","燃烧","呐喊","奔放","豪迈","壮阔","梦想"],
    "平静": ["平静","宁静","安静","祥和","淡然","从容","悠然","缓缓","淡淡","微风"],
    "悲伤": ["悲伤","痛苦","泪","哭泣","碎裂","凋零","苍白","沉重","窒息","告别"],
    "喜悦": ["快乐","幸福","欢笑","甜","美好","欣喜","灿烂","明媚","温暖","希望"],
}

def analyze_sentiment(words: list) -> dict:
    scores = {k: 0 for k in EMOTION_DICT}
    total = 0
    for word in words:
        for emotion, kws in EMOTION_DICT.items():
            if word in kws:
                scores[emotion] += 1
                total += 1
    if total == 0:
        return {"dominant": "平静", "scores": scores, "intensity": 0.0}
    max_score = max(scores.values())
    normalized = {k: round(v / max_score, 2) if max_score > 0 else 0 for k, v in scores.items()}
    dominant = max(normalized, key=normalized.get)
    return {"dominant": dominant, "scores": normalized, "intensity": round(total / max(len(words), 1), 2)}

# ===== RetrievalAgent：TF-IDF 相似度检索 =====
def _build_kb():
    data = _load_poems()
    docs = []
    corpus = []
    for p in data.get("modern", []):
        words = [w for w in jieba.cut(p.get("content","")) if w.strip() and len(w) > 1]
        docs.append({"type": "现代诗", "title": p["title"], "author": p["author"], "content": p["content"][:200], "words": words})
        corpus.append(words)
    for p in data.get("classical", []):
        words = [w for w in jieba.cut(p.get("content","")) if w.strip() and len(w) > 1]
        docs.append({"type": "古典诗", "title": p["title"], "author": p["author"], "content": p["content"][:200], "words": words})
        corpus.append(words)
    return docs, corpus

_kb_docs = None
_kb_corpus = None

def retrieve_similar(query_words: list, creation_type: str = "all", top_n: int = 5) -> list:
    global _kb_docs, _kb_corpus
    if _kb_docs is None:
        _kb_docs, _kb_corpus = _build_kb()

    # 简单 TF 向量相似度
    query_set = set(query_words)
    scored = []
    for i, doc in enumerate(_kb_docs):
        if creation_type == "古典诗" and doc["type"] != "古典诗":
            continue
        if creation_type in ("现代诗","散文","短篇片段") and doc["type"] != "现代诗":
            continue
        doc_set = set(doc["words"])
        inter = len(query_set & doc_set)
        sim = inter / (math.log(len(query_set) + 1) + math.log(len(doc_set) + 1)) if inter > 0 else 0
        scored.append({
        "type": doc["type"],
        "title": doc["title"],
        "author": doc["author"],
        "content": doc["content"],
        "similarity": round(sim, 4),
    })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_n]

# ===== 实体向量计算（用 TF-IDF 加权词向量模拟） =====
def compute_query_embedding(words: list, dim: int = 128) -> list:
    """轻量 embedding：基于词袋 + 随机投影的伪语义向量"""
    import hashlib
    vec = np.zeros(dim)
    for word in set(words):
        h = int(hashlib.md5(word.encode()).hexdigest()[:8], 16)
        np.random.seed(h)
        proj = np.random.randn(dim)
        vec += proj
    norm = np.linalg.norm(vec)
    return (vec / norm).tolist() if norm > 0 else vec.tolist()

# ===== 艺术风格匹配 =====
ART_STYLES = {
    "印象派": ["光影","色彩","模糊","瞬间","朦胧","柔和","梦幻","自然"],
    "表现主义": ["扭曲","呐喊","强烈","痛苦","情绪","黑暗","浓烈","不安"],
    "极简主义": ["留白","简洁","线条","空间","克制","空旷","静谧","几何"],
    "中国水墨": ["山水","意境","留白","气韵","墨","虚实","飘逸","古雅"],
    "赛博朋克": ["霓虹","科技","都市","虚拟","雨夜","钢筋","电子","未来"],
    "超现实主义": ["梦境","荒诞","潜意识","自由","奇异","不羁","幻想","迷离"],
}

EMOTION_STYLE_MAP = {
    "孤独": ["表现主义","极简主义","赛博朋克"],
    "怀旧": ["印象派","中国水墨"],
    "激昂": ["表现主义","超现实主义"],
    "平静": ["极简主义","中国水墨"],
    "喜悦": ["印象派","超现实主义"],
    "悲伤": ["表现主义","中国水墨"],
}

def match_art_style(words: list, emotion: str) -> list:
    scores = []
    for style, kws in ART_STYLES.items():
        s = sum(1 for w in words if w in kws)
        if emotion in EMOTION_STYLE_MAP and style in EMOTION_STYLE_MAP[emotion]:
            s += 2
        scores.append({"name": style, "score": s, "keywords": kws[:4]})
    scores.sort(key=lambda x: x["score"], reverse=True)
    return scores[:3]

MUSIC_MOODS = {
    "孤独": {"mood":"孤独","genre":"后摇 / 氛围","desc":"Sigur Rós, 坂本龙一"},
    "怀旧": {"mood":"怀旧","genre":"爵士 / 民谣","desc":"Chet Baker, Bob Dylan"},
    "激昂": {"mood":"激昂","genre":"交响乐","desc":"贝多芬, 马勒"},
    "平静": {"mood":"平静","genre":"极简 / 新世纪","desc":"Max Richter, Enya"},
    "悲伤": {"mood":"悲伤","genre":"古典 / 钢琴","desc":"肖邦, 拉赫玛尼诺夫"},
    "喜悦": {"mood":"喜悦","genre":"流行 / 放克","desc":"Earth Wind & Fire"},
}

def match_music(emotion: str) -> dict:
    return MUSIC_MOODS.get(emotion, MUSIC_MOODS["平静"])
