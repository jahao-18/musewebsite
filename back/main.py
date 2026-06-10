"""
MusAgent 后端 — FastAPI + DeepSeek LLM
启动: uvicorn main:app --reload --port 8000
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI

from nlp_engine import (
    segment, extract_keywords, summarize, analyze_sentiment,
    retrieve_similar, match_art_style, match_music, expand_query,
    get_knowledge_page,
)

app = FastAPI(title="MusAgent API", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== DeepSeek 配置 =====
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "sk-your-key-here")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
llm_client = OpenAI(api_key=DEEPSEEK_API_KEY, base_url=DEEPSEEK_BASE_URL)

# ===== Pydantic 模型 =====
class PipelineRequest(BaseModel):
    topic: str
    creationType: str = "现代诗"
    emotionTone: str = "孤独"
    artStyle: str = "赛博朋克"
    useLLM: bool = False  # 是否使用 DeepSeek 生成
    lengthPreference: str = "中"
    languageStyle: str = "清新"
    rhymeLevel: str = "自由"
    abstractionLevel: str = "平衡"

class RegenerateRequest(BaseModel):
    input: PipelineRequest
    keywords: list = []
    similarWorks: list = []
    ragResults: list = []
    emotion: dict = {}
    artStyles: list = []
    music: dict = {}

class PolishRequest(BaseModel):
    text: str
    targetStyle: str = "文学化"
    preserveMeaning: bool = True
    useLLM: bool = True

# ===== API 路由 =====
@app.get("/api/health")
def health():
    return {"status": "ok", "service": "MusAgent"}

@app.post("/api/segment")
def api_segment(req: dict):
    text = req.get("text", "")
    return segment(text)

@app.post("/api/keywords")
def api_keywords(req: dict):
    words = req.get("words", [])
    return {"keywords": extract_keywords(words, 10)}

@app.post("/api/sentiment")
def api_sentiment(req: dict):
    words = req.get("words", [])
    return analyze_sentiment(words)

@app.post("/api/retrieve")
def api_retrieve(req: dict):
    words = req.get("words", [])
    creation_type = req.get("creationType", "all")
    return {"results": retrieve_similar(words, creation_type, 5)}

@app.get("/api/knowledge")
def api_knowledge(
    page: int = 1,
    pageSize: int = 30,
    search: str = "",
    emotion: str = "all",
    poemType: str = "all",
):
    return get_knowledge_page(page, pageSize, search, emotion, poemType)

@app.post("/api/pipeline")
def run_full_pipeline(req: PipelineRequest):
    """完整流水线：分词 → 关键词 → TextRank → 情感 → 检索 → RAG → 生成"""
    # Step 1: 分词
    seg = segment(req.topic)
    expanded_query = expand_query(req.topic, seg["words"])

    # Step 2: 关键词
    kw = extract_keywords(expanded_query["expanded"], 10, seg["words"])

    # Step 3: TextRank 摘要（不再限制长度，始终运行）
    summary = summarize(req.topic)

    # Step 4: 相似度检索
    similar = retrieve_similar(expanded_query["expanded"], req.creationType, 5)

    # Step 5: 情感（输入直匹配 + 相似作品兜底推断）
    emotion = analyze_sentiment(expanded_query["expanded"], similar)

    # Step 6: RAG — 对每首参考诗做 NLP 提取关键信息
    rag_results = []
    for s in similar[:3]:
        ref_seg = segment(s["content"])
        ref_kw = extract_keywords(ref_seg["words"], 5)
        ref_emotion = analyze_sentiment(ref_seg["words"])
        rag_results.append({
            "topic": s["title"],
            "type": s["type"],
            "author": s["author"],
            "similarity": s["similarity"],
            "keywords": [k["keyword"] for k in ref_kw[:3]],
            "emotion": ref_emotion["dominant"],
            "excerpt": s["content"][:120],
        })

    # Step 7: 风格 + 音乐
    art = match_art_style(seg["words"], emotion["dominant"])
    music = match_music(emotion["dominant"])

    # Step 8: 生成（同时产出算法模板 + LLM 两种结果）
    gen_template = template_generate(req, kw, similar, emotion["dominant"], art[0], music)
    if req.useLLM:
        gen_llm = llm_generate(req, kw, similar, emotion["dominant"], art[0], music, rag_results)
    else:
        gen_llm = {
            **gen_template,
            "method": "未启用 LLM，使用算法模板",
            "note": "请求 useLLM=false，已跳过 DeepSeek 调用",
        }

    return {
        "input": req.model_dump(),
        "segmentation": seg,
        "queryExpansion": expanded_query,
        "keywords": kw,
        "summary": summary["summary"],
        "emotion": emotion,
        "intent": classify_intent(req.topic, req.creationType),
        "similarWorks": similar,
        "ragResults": rag_results,
        "artStyles": art,
        "music": music,
        "generated": gen_template,
        "generatedLLM": gen_llm,
    }

@app.post("/api/regenerate")
def regenerate_from_context(req: RegenerateRequest):
    """沿用已有分析结果，仅重新执行 WriterAgent。"""
    emotion_name = req.emotion.get("dominant", req.input.emotionTone)
    art = req.artStyles[0] if req.artStyles else {"name": req.input.artStyle, "keywords": []}
    music = req.music or {"mood": emotion_name, "genre": "", "desc": ""}
    gen_template = template_generate(req.input, req.keywords, req.similarWorks, emotion_name, art, music)
    if req.input.useLLM:
        gen_llm = llm_generate(req.input, req.keywords, req.similarWorks, emotion_name, art, music, req.ragResults)
    else:
        gen_llm = {
            **gen_template,
            "method": "未启用 LLM，使用算法模板",
            "note": "请求 useLLM=false，已跳过 DeepSeek 调用",
        }
    return {"generated": gen_template, "generatedLLM": gen_llm}

@app.post("/api/polish")
def polish_text(req: PolishRequest):
    """创作润色：保留原意，输出诊断、建议、保守润色和风格化润色。"""
    text = req.text.strip()
    if not text:
        return {
            "input": req.model_dump(),
            "segmentation": {"words": [], "freq": {}, "total": 0},
            "keywords": [],
            "summary": "",
            "emotion": {"dominant": "未知", "scores": {}, "intensity": 0},
            "diagnosis": [],
            "suggestions": ["请输入需要润色的文本。"],
            "conservative": "",
            "creative": "",
            "method": "空输入",
            "llmUsed": False,
        }

    seg = segment(text)
    kw = extract_keywords(seg["words"], 8)
    summary = summarize(text)
    emotion = analyze_sentiment(seg["words"])
    diagnosis = build_polish_diagnosis(text, kw, emotion, summary["summary"])
    suggestions = build_polish_suggestions(text, kw, emotion)
    fallback = fallback_polish(text, kw, emotion)
    llm_result = None

    if req.useLLM:
        llm_result = llm_polish(text, req.targetStyle, req.preserveMeaning, kw, emotion, diagnosis, suggestions)

    return {
        "input": req.model_dump(),
        "segmentation": seg,
        "keywords": kw,
        "summary": summary["summary"],
        "emotion": emotion,
        "diagnosis": diagnosis,
        "suggestions": suggestions,
        "conservative": (llm_result or {}).get("conservative") or fallback["conservative"],
        "creative": (llm_result or {}).get("creative") or fallback["creative"],
        "method": (llm_result or {}).get("method") or fallback["method"],
        "llmUsed": bool(llm_result),
        "note": (llm_result or {}).get("note") or fallback["note"],
    }

# ===== 意图分类 =====
def classify_intent(topic: str, creation_type: str) -> dict:
    intent_map = {"现代诗":"诗歌创作","古典诗":"诗歌创作","散文":"散文创作","短篇片段":"小说创作"}
    intent = intent_map.get(creation_type, "诗歌创作")
    return {"intent": intent, "confidence": {"诗歌创作": 0.8}}

def _emotion_strength_label(intensity: float) -> str:
    if intensity >= 0.5:
        return "情绪线索明显"
    if intensity >= 0.2:
        return "情绪线索中等"
    if intensity > 0:
        return "情绪线索较弱"
    return "情绪线索不明显"

def build_polish_diagnosis(text: str, keywords: list, emotion: dict, summary_text: str) -> list:
    top_kw = [k["keyword"] for k in keywords[:5]]
    diagnosis = [
        f"核心意象集中在「{'、'.join(top_kw) if top_kw else '暂无明显关键词'}」。",
        f"主导情绪为「{emotion.get('dominant', '未知')}」，{_emotion_strength_label(emotion.get('intensity', 0))}。",
    ]
    if summary_text and summary_text != text:
        diagnosis.append(f"文本中心句可概括为：{summary_text}")
    if len(text) < 30:
        diagnosis.append("文本较短，适合优先增强画面细节和动词力度。")
    elif len(text) > 220:
        diagnosis.append("文本较长，适合压缩重复表达并强化段落节奏。")
    if "，" not in text and "。" not in text and "\n" not in text:
        diagnosis.append("当前断句较少，可以通过停顿制造节奏层次。")
    return diagnosis

def build_polish_suggestions(text: str, keywords: list, emotion: dict) -> list:
    top_kw = [k["keyword"] for k in keywords[:4]]
    suggestions = []
    if top_kw:
        suggestions.append(f"保留「{'、'.join(top_kw[:3])}」等核心意象，避免润色时换掉文本的识别点。")
    suggestions.append("优先替换泛化形容词，改用具体动作、触感、光线或声音。")
    suggestions.append("检查每个比喻是否服务同一情绪，不要让意象互相抢焦点。")
    if emotion.get("intensity", 0) < 0.2:
        suggestions.append("当前情绪信号偏弱，可以增加一句带有明确态度或感受的收束句。")
    else:
        suggestions.append(f"围绕「{emotion.get('dominant', '情绪')}」强化节奏，避免语气突然转向。")
    return suggestions[:4]

def fallback_polish(text: str, keywords: list, emotion: dict) -> dict:
    top_kw = [k["keyword"] for k in keywords[:3]]
    anchor = "、".join(top_kw) if top_kw else "原有意象"
    conservative = text.replace("很长很长", "拖得更长").strip()
    creative = f"{text.strip()}\n\n{emotion.get('dominant', '某种情绪')}在{anchor}之间缓慢显影，像一束光穿过尚未命名的缝隙。"
    return {
        "method": "算法润色建议",
        "conservative": conservative,
        "creative": creative,
        "note": "DeepSeek 不可用或未启用时返回规则化润色结果。",
    }

def llm_polish(text: str, target_style: str, preserve_meaning: bool, keywords: list, emotion: dict, diagnosis: list, suggestions: list):
    top_kw = [k["keyword"] for k in keywords[:5]]
    prompt = f"""请润色下面这段中文创作文本。

原文：
{text}

目标风格：{target_style}
是否保留原意：{"必须保留原意" if preserve_meaning else "允许较大幅度改写"}
关键词：{'、'.join(top_kw)}
主导情绪：{emotion.get('dominant', '未知')}
诊断：{'；'.join(diagnosis)}
建议：{'；'.join(suggestions)}

请严格按以下格式输出，不要添加额外解释：
[保守润色]
在这里输出，尽量保留原文结构和意思。

[风格化润色]
在这里输出，可以更文学化，但不要偏离原文核心意象。
"""
    try:
        resp = llm_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一位中文文学编辑，擅长保留原意的文本润色、节奏优化和意象增强。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.65,
            max_tokens=650,
        )
        content = resp.choices[0].message.content.strip()
        conservative = content
        creative = content
        if "[保守润色]" in content and "[风格化润色]" in content:
            conservative = content.split("[保守润色]", 1)[1].split("[风格化润色]", 1)[0].strip()
            creative = content.split("[风格化润色]", 1)[1].strip()
        return {
            "method": "DeepSeek 文学润色",
            "conservative": conservative,
            "creative": creative,
            "note": "模型：deepseek-chat | 任务：保留原意 + 风格化润色",
        }
    except Exception:
        return None

# ===== 文本生成 =====
def template_generate(req: PipelineRequest, keywords: list, similar: list, emotion: str, art: dict, music: dict):
    """算法模板生成"""
    top_kw = [k["keyword"] for k in keywords[:5]]
    ref_title = similar[0]["title"] if similar else ""

    if req.creationType == "古典诗":
        poems = [
            f"{top_kw[0] if top_kw else '暮'}色{top_kw[1] if len(top_kw)>1 else '苍茫'}笼四野\n{top_kw[2] if len(top_kw)>2 else '孤'}心一片{top_kw[3] if len(top_kw)>3 else '寄'}天涯\n{emotion}不是无端起\n只为{top_kw[4] if len(top_kw)>4 else '浮生'}半盏茶",
            f"{top_kw[0] if top_kw else '长夜'}漫漫{top_kw[1] if len(top_kw)>1 else '独'}倚栏\n{top_kw[2] if len(top_kw)>2 else '月'}照{top_kw[3] if len(top_kw)>3 else '孤影'}泪未干\n谁解{emotion}无限意\n{top_kw[4] if len(top_kw)>4 else '秋风'}一叶落长安",
        ]
        content = poems[abs(hash(req.topic)) % len(poems)]
    elif req.creationType == "散文":
        content = f"关于{top_kw[0] if top_kw else '时光'}的片段\n\n我常常想起{top_kw[1] if len(top_kw)>1 else '安静'}的时刻。{top_kw[2] if len(top_kw)>2 else '风'}轻轻吹过，带走了说不清的东西。\n\n就像《{ref_title or '那些诗'}》所写，有些美只存在于消逝的瞬间。"
    else:
        poems = [
            f"{top_kw[0] if top_kw else '夜'}沉入{top_kw[1] if len(top_kw)>1 else '深'}色的海\n{top_kw[2] if len(top_kw)>2 else '风'}在{top_kw[3] if len(top_kw)>3 else '窗'}外徘徊\n像那些未说完的话\n在{emotion}里慢慢{top_kw[4] if len(top_kw)>4 else '散'}开",
            f"把{top_kw[0] if top_kw else '思念'}叠成纸船\n放进{top_kw[1] if len(top_kw)>1 else '月光'}铺就的河\n它漂向{top_kw[2] if len(top_kw)>2 else '远方'}\n那里有{top_kw[3] if len(top_kw)>3 else '春天'}和未拆封的{top_kw[4] if len(top_kw)>4 else '梦'}",
        ]
        content = poems[abs(hash(req.topic)) % len(poems)]

    return {
        "method": "算法模板生成",
        "content": content,
        "note": f"意象：{'、'.join(top_kw)} | 参考：《{ref_title}》| 风格：{art['name']} | 偏好：{req.lengthPreference}/{req.languageStyle}/{req.rhymeLevel}/{req.abstractionLevel} | 音乐：{music['genre']}",
    }

def llm_generate(req: PipelineRequest, keywords: list, similar: list, emotion: str, art: dict, music: dict, rag_results: list = None):
    """DeepSeek LLM 生成 — 融入 RAG 提取的参考诗结构信息"""
    top_kw = [k["keyword"] for k in keywords[:5]]
    refs = "\n".join([
        f"- 《{s['title']}》({s['type']})：{s['content'][:80]}"
        for s in similar[:3]
    ])

    # 构建 RAG 上下文：NLP 提取的参考诗结构化信息
    rag_context = ""
    if rag_results:
        rag_parts = []
        for r in rag_results:
            rag_parts.append(
                f"■《{r['topic']}》({r['type']}·{r['author']})\n"
                f"  情感基调：{r['emotion']} | 核心意象：{'、'.join(r['keywords'])}\n"
                f"  原文片段：「{r['excerpt']}」"
            )
        rag_context = "\n".join(rag_parts)

    prompts = {
        "现代诗": f"""请创作一首现代诗，表达「{req.topic}」的主题。

用户情感基调：{emotion}
用户输入关键词：{'、'.join(top_kw)}
目标艺术风格：{art['name']}
创作偏好：篇幅{req.lengthPreference}，语言风格{req.languageStyle}，押韵程度{req.rhymeLevel}，抽象程度{req.abstractionLevel}

════════ 知识库 RAG 参考 ════════
以下是通过 NLP 分析从知识库中检索到的相似诗歌的结构化信息，请参考其意象、情感和风格：
{rag_context if rag_context else refs}
════════════════════════════════

要求：
1. 4-8行，语言凝练有力
2. 融合上述参考诗歌的核心意象与情感质感
3. 保留用户关键词"{'、'.join(top_kw[:3])}"但用自己的方式重新演绎
4. 体现{emotion}的情感氛围和{art['name']}的风格
5. 遵守创作偏好，直接输出诗歌，不加标题和解释""",

        "古典诗": f"""请创作一首七言绝句/律诗，主题：「{req.topic}」。

情感：{emotion}
参考意象：{'、'.join(top_kw)}
风格：{art['name']}
创作偏好：篇幅{req.lengthPreference}，语言风格{req.languageStyle}，押韵程度{req.rhymeLevel}，抽象程度{req.abstractionLevel}

════════ 知识库 RAG 参考 ════════
{rag_context if rag_context else refs}
════════════════════════════════

要求：
1. 符合格律（平仄、押韵）
2. 借鉴参考诗歌的意境而不抄袭
3. 输出格式为4或8句
4. 直接输出诗句，不加解释""",

        "散文": f"""请写一段散文片段，主题：「{req.topic}」。

情感：{emotion}
参考：《{similar[0]['title'] if similar else '未知作品'}》
创作偏好：篇幅{req.lengthPreference}，语言风格{req.languageStyle}，抽象程度{req.abstractionLevel}

════════ 知识库 RAG 参考 ════════
{rag_context if rag_context else refs}
════════════════════════════════

要求：200字以内，借鉴参考作品的情感质感和意象，直接输出散文内容""",

        "短篇片段": f"""请写一个短篇叙事片段，主题：「{req.topic}」。

情感：{emotion}
意象：{'、'.join(top_kw)}
创作偏好：篇幅{req.lengthPreference}，语言风格{req.languageStyle}，抽象程度{req.abstractionLevel}

参考作品：
{rag_context if rag_context else refs}

要求：150字以内，融入参考作品的情感氛围，直接输出内容""",
    }

    prompt = prompts.get(req.creationType, prompts["现代诗"])

    try:
        resp = llm_client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一位中国文学创作助手，精通诗歌、散文和短篇创作。请仔细分析参考作品中 NLP 提取的意象、情感和结构信息，将其作为创作养分而非简单模仿对象。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.8,
            max_tokens=500,
        )
        content = resp.choices[0].message.content.strip()
        return {
            "method": "DeepSeek LLM 生成 (RAG增强)",
            "content": content,
            "note": f"模型：deepseek-chat | 情感：{emotion} | 风格：{art['name']} | RAG参考：{len(rag_results or [])}首",
        }
    except Exception as e:
        return {
            "method": f"LLM 调用失败，降级为算法模板 ({str(e)[:50]})",
            "content": template_generate(req, keywords, similar, emotion, art, music)["content"],
            "note": f"DeepSeek API 不可用，已自动切换为算法模板生成",
        }

# ===== 对话模型 =====
class ChatRequest(BaseModel):
    message: str
    history: list[dict] = []  # [{"role":"user/assistant", "content":"..."}]

# ===== 灵感对话接口 =====
INSPIRATION_SYSTEM_PROMPT = """你是一个名叫「灵感菌」的情绪感知与创作灵感小助手。

你的核心任务：
1. **共情倾听**：首先感知用户的情绪状态，用温暖的理解回应
2. **情绪引导**：帮助用户梳理情绪，让情绪成为创作的燃料
3. **灵感激发**：根据用户表达的情绪和话题，给予创意启发（诗歌意象、画面联想、艺术风格建议等）
4. **知识引用**：适时引用古诗词或文学片段来呼应或升华用户的情感

风格要求：
- 语气温暖、真诚，像深夜电台里的知心朋友
- 回复简洁（100字左右），不要长篇大论
- 适当使用 emoji 增加亲和力
- 当用户表达创作意图时，主动提供意象建议和风格参考
- 永远保持正向、包容、不评判的态度"""

@app.post("/api/chat")
def chat(req: ChatRequest):
    """灵感对话：NLP 情绪分析 + DeepSeek 灵感助手"""
    # Step 1: NLP 预处理 — 分析用户消息
    seg = segment(req.message)
    kw = extract_keywords(seg["words"], 5)
    emotion = analyze_sentiment(seg["words"])

    # Step 2: 构建消息（系统提示 + 对话历史 + 当前消息）
    messages = [{"role": "system", "content": INSPIRATION_SYSTEM_PROMPT}]
    for h in req.history[-10:]:  # 只保留最近10轮避免token过长
        messages.append({"role": h.get("role", "user"), "content": h.get("content", "")})
    messages.append({"role": "user", "content": req.message})

    try:
        resp = llm_client.chat.completions.create(
            model="deepseek-chat",
            messages=messages,
            temperature=0.9,
            max_tokens=400,
        )
        reply = resp.choices[0].message.content.strip()
        llm_used = True
    except Exception as e:
        # 降级：基于 NLP 分析生成简单回复
        top_kw = [k["keyword"] for k in kw[:3]]
        templates = [
            f"我感受到了你内心的{emotion['dominant']}。{'、'.join(top_kw) if top_kw else '你的话语'}让我想起一句诗：「此情可待成追忆，只是当时已惘然。」愿意和我聊聊更多吗？🌙",
            f"你的情绪里有一种{emotion['dominant']}的质感。也许可以试试把这些感受写下来——文字是最好的容器。需要一些意象灵感吗？✨",
            f"听你说话，我仿佛看到了{'、'.join(top_kw[:2]) if len(top_kw)>=2 else '某个画面'}。创作就在这些细微的感知里。想不想一起探索？🎨",
        ]
        import random
        reply = random.choice(templates)
        llm_used = False

    return {
        "reply": reply,
        "llmUsed": llm_used,
        "nlp": {
            "segmentation": seg,
            "keywords": kw,
            "emotion": emotion,
        },
    }

# ===== 启动入口 =====
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
