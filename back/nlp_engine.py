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
但是 并且 而且 或者 因为 所以 如果 虽然 然而
'''.split())

NUMERAL_PREFIXES = set("一二三四五六七八九十百千万几数每半两")
MEASURE_WORDS = set("个只条张本次回遍趟场片朵颗双份层阵")
LOW_QUALITY_KEYWORDS = {
    "一张",
    "张脸",
}

def _is_low_quality_word(word: str) -> bool:
    if not word or word in STOP_WORDS or word in LOW_QUALITY_KEYWORDS:
        return True
    if len(word) < 2:
        return True
    # 过滤“数量词 + 量词”残片，例如“一张”“几条”。
    if len(word) == 2 and word[0] in NUMERAL_PREFIXES and word[1] in MEASURE_WORDS:
        return True
    # 过滤 Jieba 偶发的“量词 + 单字名词”残片，例如“一张张脸”中的“张脸”。
    if len(word) == 2 and word[0] in MEASURE_WORDS and word[1] in {"脸", "手", "眼", "嘴", "纸", "票", "桌", "床"}:
        return True
    return False

# ===== WordSegAgent：Jieba 分词 =====
def segment(text: str) -> dict:
    words = [w for w in jieba.cut(text) if w.strip() and not _is_low_quality_word(w)]
    freq = Counter(words)
    return {"words": words, "freq": dict(freq.most_common(30)), "total": len(words)}

# ===== QueryExpansionAgent：主题拆解 + 联想扩展 =====
QUERY_EXPANSION_RULES = {
    "校园": ["校园", "教室", "操场", "课桌", "校服", "毕业", "青春", "少年"],
    "爱情": ["爱情", "恋爱", "初恋", "暗恋", "心动", "告白", "喜欢", "温柔"],
    "校园爱情": ["校园", "爱情", "青春", "少年", "初恋", "暗恋", "教室", "操场", "晚风"],
    "甜美": ["甜美", "甜", "温柔", "明亮", "微笑", "喜欢"],
    "幸福": ["幸福", "快乐", "希望", "温暖", "美好"],
    "成长": ["成长", "青春", "远方", "告别", "梦想"],
    "黄昏": ["黄昏", "夕阳", "晚霞", "怀旧", "告别"],
    "雨夜": ["雨夜", "雨声", "窗", "孤独", "安静"],
    "城市": ["城市", "街道", "霓虹", "地铁", "人潮"],
}

TOPIC_EMOTION_HINTS = {
    "爱情": {"喜悦": 2.0, "平静": 0.8, "怀旧": 0.3},
    "校园": {"怀旧": 0.8, "喜悦": 0.6, "平静": 0.2},
    "校园爱情": {"喜悦": 3.0, "怀旧": 1.2, "平静": 0.7},
    "青春": {"激昂": 0.7, "怀旧": 0.5, "喜悦": 0.3},
    "甜美": {"喜悦": 2.0, "平静": 0.3},
    "幸福": {"喜悦": 2.5},
}

def expand_query(text: str, words: list) -> dict:
    """扩展短主题，解决复合词难以命中知识库的问题。"""
    expanded = []
    reasons = {}

    def add(term: str, reason: str):
        if term and not _is_low_quality_word(term) and term not in expanded:
            expanded.append(term)
            reasons[term] = reason

    for word in words:
        add(word, "原始分词")

    for trigger, terms in QUERY_EXPANSION_RULES.items():
        if trigger in text or trigger in words:
            for term in terms:
                add(term, f"由「{trigger}」扩展")

    # 对未被 Jieba 拆开的复合主题做轻量子串拆解。
    for trigger in QUERY_EXPANSION_RULES:
        if trigger != text and trigger in text:
            add(trigger, "复合主题拆解")

    core = [w for w in expanded if w in words or w in text][:5]
    imagery = [w for w in expanded if w not in core][:8]
    return {
        "original": words,
        "expanded": expanded,
        "core": core,
        "imagery": imagery,
        "reasons": reasons,
    }

# ===== KeywordAgent：TF-IDF =====
def extract_keywords(words: list, top_n: int = 10, original_words: list | None = None) -> list:
    if not words:
        return []
    total = len(words)
    counter = Counter(words)
    _ensure_kb()
    total_docs = len(_kb_docs) if _kb_docs else 0
    result = []
    for word, count in counter.most_common(top_n):
        if _is_low_quality_word(word):
            continue
        tf = count / total
        df = _kb_doc_freq.get(word, 0) if _kb_doc_freq else 0
        idf = math.log(1 + (total_docs + 1) / (df + 1)) if total_docs else 1.0
        original_boost = 1.25 if original_words and word in original_words else 1.0
        result.append({"keyword": word, "tfidf": round(tf * idf * original_boost, 4)})
    result.sort(key=lambda item: item["tfidf"], reverse=True)
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
    "孤独": ["孤独","寂寞","独自","空旷","荒漠","一人","深夜","夜里","无人","沉默","静默","落寞","异乡","漂泊","疏离"],
    "怀旧": ["怀念","回忆","记忆","往事","从前","曾经","故乡","旧日","往昔","泛黄","黄昏","夕阳","旧时光","童年","少年"],
    "激昂": ["激昂","热血","汹涌","澎湃","燃烧","呐喊","奔放","豪迈","壮阔","梦想","成长","青春","远行","追逐"],
    "平静": ["平静","宁静","安静","祥和","淡然","从容","悠然","缓缓","淡淡","微风","和解","释然","自我","月光"],
    "悲伤": ["悲伤","痛苦","难过","泪","哭泣","碎裂","凋零","苍白","沉重","窒息","告别","失去","离别"],
    "喜悦": ["快乐","幸福","欢笑","甜","美好","欣喜","灿烂","明媚","温暖","希望","治愈","春日","春天"],
}

def _score_emotions(words: list, include_topic_hints: bool = True) -> tuple[dict, int]:
    scores = {k: 0.0 for k in EMOTION_DICT}
    total = 0
    for word in words:
        for emotion, kws in EMOTION_DICT.items():
            if word in kws:
                scores[emotion] += 1
                total += 1
        if include_topic_hints and word in TOPIC_EMOTION_HINTS:
            for emotion, weight in TOPIC_EMOTION_HINTS[word].items():
                if emotion in scores:
                    scores[emotion] += weight
            total += 1
    return scores, total

def _normalize_scores(scores: dict) -> dict:
    max_score = max(scores.values()) if scores else 0
    if max_score <= 0:
        return {k: 0 for k in scores}
    return {k: round(v / max_score, 2) for k, v in scores.items()}

def analyze_sentiment(words: list, context_docs: list | None = None) -> dict:
    scores, total = _score_emotions(words)
    direct_intensity = total / max(len(words), 1)

    context_scores = {k: 0.0 for k in EMOTION_DICT}
    context_weight = 0.0
    if context_docs:
        max_similarity = max((doc.get("similarity", 0) for doc in context_docs), default=0) or 1
        for rank, doc in enumerate(context_docs[:5]):
            content = doc.get("content", "")
            doc_words = [
                w for w in jieba.cut(content)
                if w.strip() and not _is_low_quality_word(w)
            ]
            doc_scores, doc_total = _score_emotions(doc_words, include_topic_hints=False)
            if doc_total == 0:
                continue

            similarity_weight = doc.get("similarity", 0) / max_similarity
            rank_weight = 1 / (rank + 1)
            weight = similarity_weight * rank_weight
            normalized_doc_scores = _normalize_scores(doc_scores)
            for emotion, value in normalized_doc_scores.items():
                context_scores[emotion] += value * weight
            context_weight += weight

    if context_weight > 0:
        context_ratio = min(context_weight / 2, 1)
        for emotion, value in context_scores.items():
            scores[emotion] += value if total == 0 else value * 0.5
        intensity = max(direct_intensity, context_ratio * (0.6 if total == 0 else 0.3))
    else:
        intensity = direct_intensity

    if total == 0:
        if context_weight == 0:
            return {"dominant": "平静", "scores": scores, "intensity": 0.0}

    normalized = _normalize_scores(scores)
    dominant = max(normalized, key=normalized.get)
    return {"dominant": dominant, "scores": normalized, "intensity": round(min(intensity, 1), 2)}

# ===== RetrievalAgent：BM25 相似度检索 =====
def _build_kb():
    data = _load_poems()
    docs = []
    doc_freq = Counter()

    def add_doc(poem: dict, poem_type: str):
        words = [
            w for w in jieba.cut(poem.get("content", ""))
            if w.strip() and not _is_low_quality_word(w)
        ]
        word_counts = Counter(words)
        docs.append({
            "type": poem_type,
            "title": poem["title"],
            "author": poem["author"],
            "content": poem["content"],
            "words": words,
            "word_counts": word_counts,
            "doc_len": len(words),
        })
        doc_freq.update(word_counts.keys())

    for p in data.get("modern", []):
        add_doc(p, "现代诗")
    for p in data.get("classical", []):
        add_doc(p, "古典诗")

    avg_doc_len = sum(doc["doc_len"] for doc in docs) / max(len(docs), 1)
    return docs, doc_freq, avg_doc_len

_kb_docs = None
_kb_doc_freq = None
_kb_avg_doc_len = 0

def _ensure_kb():
    global _kb_docs, _kb_doc_freq, _kb_avg_doc_len
    if _kb_docs is None:
        _kb_docs, _kb_doc_freq, _kb_avg_doc_len = _build_kb()

def retrieve_similar(query_words: list, creation_type: str = "all", top_n: int = 5) -> list:
    _ensure_kb()

    query_terms = [w for w in query_words if not _is_low_quality_word(w)]
    if not query_terms:
        return []

    k1 = 1.5
    b = 0.75
    total_docs = len(_kb_docs)
    scored = []
    for doc in _kb_docs:
        if creation_type == "古典诗" and doc["type"] != "古典诗":
            continue
        if creation_type in ("现代诗","散文","短篇片段") and doc["type"] != "现代诗":
            continue

        score = 0.0
        matched_terms = []
        doc_len = max(doc["doc_len"], 1)
        for term in query_terms:
            freq = doc["word_counts"].get(term, 0)
            if freq == 0:
                continue
            matched_terms.append(term)
            df = _kb_doc_freq.get(term, 0)
            idf = math.log(1 + (total_docs - df + 0.5) / (df + 0.5))
            norm = freq + k1 * (1 - b + b * doc_len / max(_kb_avg_doc_len, 1))
            score += idf * (freq * (k1 + 1)) / norm

        if score > 0:
            scored.append({
                "type": doc["type"],
                "title": doc["title"],
                "author": doc["author"],
                "content": doc["content"][:200],
                "similarity": round(score, 4),
                "matchedTerms": matched_terms[:8],
            })

    scored.sort(key=lambda x: x["similarity"], reverse=True)
    return scored[:top_n]

def _knowledge_keywords(doc: dict, top_n: int = 5) -> list:
    total_docs = len(_kb_docs) if _kb_docs else 0
    total_words = max(doc.get("doc_len", 0), 1)
    ranked = []
    for word, count in doc.get("word_counts", {}).items():
        if _is_low_quality_word(word):
            continue
        df = _kb_doc_freq.get(word, 0) if _kb_doc_freq else 0
        tf = count / total_words
        idf = math.log(1 + (total_docs + 1) / (df + 1)) if total_docs else 1.0
        ranked.append((word, tf * idf, count))

    ranked.sort(key=lambda item: (item[1], item[2], len(item[0])), reverse=True)
    return [word for word, _, _ in ranked[:top_n]]

_knowledge_view_cache = None

def _ensure_knowledge_view():
    global _knowledge_view_cache
    _ensure_kb()
    if _knowledge_view_cache is not None:
        return _knowledge_view_cache

    items = []
    stats = {"total": len(_kb_docs), "modern": 0, "classical": 0, "emotions": {}}
    type_prefix = {"现代诗": "m", "古典诗": "c"}
    type_counts = Counter()

    for index, doc in enumerate(_kb_docs):
        emotion = analyze_sentiment(doc["words"])
        keywords = _knowledge_keywords(doc, 5)
        poem_type = doc["type"]
        type_counts[poem_type] += 1
        stats["emotions"][emotion["dominant"]] = stats["emotions"].get(emotion["dominant"], 0) + 1
        items.append({
            "id": f"{type_prefix.get(poem_type, 'p')}-{index}",
            "type": poem_type,
            "title": doc["title"],
            "author": doc["author"],
            "content": doc["content"],
            "keywords": keywords,
            "emotion": emotion["dominant"],
            "emotionDetail": emotion,
        })

    stats["modern"] = type_counts.get("现代诗", 0)
    stats["classical"] = type_counts.get("古典诗", 0)
    _knowledge_view_cache = {"items": items, "stats": stats}
    return _knowledge_view_cache

def get_knowledge_page(
    page: int = 1,
    page_size: int = 30,
    search: str = "",
    emotion: str = "all",
    poem_type: str = "all",
) -> dict:
    view = _ensure_knowledge_view()
    page = max(int(page or 1), 1)
    page_size = min(max(int(page_size or 30), 1), 100)
    search = (search or "").strip()

    filtered = []
    for item in view["items"]:
        if poem_type != "all" and item["type"] != poem_type:
            continue
        if emotion != "all" and item["emotion"] != emotion:
            continue
        if search:
            haystack = "".join([
                item["title"],
                item["author"],
                item["content"],
                "".join(item["keywords"]),
            ])
            if search not in haystack:
                continue
        filtered.append(item)

    start = (page - 1) * page_size
    end = start + page_size
    return {
        "items": filtered[start:end],
        "stats": view["stats"],
        "filteredTotal": len(filtered),
        "page": page,
        "pageSize": page_size,
        "hasMore": end < len(filtered),
    }

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
