<div align="center">
  <br />
    <img src="public/images/logo.png" alt="MusAgent Logo" width="80" />
    <h1>MusAgent</h1>
    <p>基于多智能体协作的文学与艺术灵感生成平台</p>
  <br />

   <div>
    <img src="https://img.shields.io/badge/-React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/-GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=white" />
    <img src="https://img.shields.io/badge/-Tailwind-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
    <img src="https://img.shields.io/badge/-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
    <img src="https://img.shields.io/badge/-DeepSeek-4D6BFE?style=for-the-badge&logo=openai&logoColor=white" />
    <img src="https://img.shields.io/badge/-Jieba-FF6B35?style=for-the-badge&logo=python&logoColor=white" />
  </div>

  <h3 align="center">8 个 NLP Agent 协同 · 5320 首诗歌知识库 · DeepSeek LLM 生成</h3>
</div>

---

## 📖 简介

MusAgent 是一个基于多智能体（Multi-Agent）协作的文学与艺术灵感生成平台。输入一个主题或情绪，系统调用 8 个 NLP Agent 依次完成分词、关键词提取、情感分析、相似度检索、RAG 知识增强等步骤，最终由**算法模板**和 **DeepSeek LLM** 双通道生成诗歌或散文，并以双栏对比方式呈现。

平台还内置了**灵感菌**对话机器人——一个基于 DeepSeek 的情绪感知助手，可倾听用户心声、引导情绪、激发创作灵感。

---

## 🧠 NLP Pipeline

```
用户输入 → 分词 → TF-IDF → TextRank → 情感分析 → 相似度检索 → RAG → 风格/音乐 → 生成
```

| Agent | 技术 | 说明 |
|-------|------|------|
| 📝 WordSegAgent | Jieba + HMM | 中文分词 + 停用词过滤 |
| 🔑 KeywordAgent | TF-IDF | 词频-逆文档频率关键词提取 Top 10 |
| 📋 SummaryAgent | TextRank | 基于 PageRank 的句子重要性排序 |
| 💭 EmotionAgent | 情感词典 | 6 维情感打分（孤独/怀旧/平静/激昂/悲伤/喜悦） |
| 🔍 RetrievalAgent | TF 余弦相似度 | 从 5320 首诗歌中检索 Top 5 |
| 📚 RAGAgent | NLP 结构化提取 | 参考诗二次分词→关键词→情感，注入 LLM Prompt |
| 🎨 StyleMatchAgent | 关键词匹配 | 6 种艺术风格推荐 |
| ✍️ WriterAgent | DeepSeek LLM | 融合 RAG 上下文的约束生成 + 算法模板降级 |

---

## ✨ 功能

- **灵感生成** — 输入主题，选择创作类型、情绪基调、艺术风格，一键生成双版本（⚙️ 算法 + 🤖 LLM）
- **创作润色** — NLP 分析文本情感与关键词，LLM 优化修辞与表达
- **知识库** — 5320 首诗歌（现代诗 5000 + 古典诗词 320），情感/类型筛选、关键词搜索、点击展开全文、分页加载
- **灵感菌对话** — 情绪感知 AI 助手，NLP 分析每条消息的情感与关键词，温暖回应 + 创作启发
- **Agent 工作流** — 可视化展示 7 步流水线执行过程与关键指标
- **纯暗色主题** — CSS 变量驱动，无亮色模式
- **响应式设计** — 手机（≤767px）/ 平板（768-1023px）/ 桌面三断点完美适配

---

## 🚀 快速开始

### 环境要求

| 依赖 | 版本 |
|------|------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Python | ≥ 3.10 |

### 1. 克隆

```bash
git clone https://github.com/liusiqi05/Musagent.git
cd Musagent
```

### 2. 安装前端依赖

```bash
cd gsap_cocktails
npm install
```

### 3. 安装后端依赖

```bash
cd ../back
pip install fastapi uvicorn jieba numpy openai pydantic
```

### 4. 配置 DeepSeek API Key

```powershell
# Windows PowerShell
$env:DEEPSEEK_API_KEY="sk-your-api-key-here"

# macOS / Linux
export DEEPSEEK_API_KEY="sk-your-api-key-here"
```

> ⚠️ 不设置 API Key 时，LLM 生成自动降级为算法模板。

### 5. 启动

```bash
# 终端 1：后端
cd back
python -m uvicorn main:app --host 0.0.0.0 --port 8000

# 终端 2：前端
cd gsap_cocktails
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173)

---

## 📁 项目结构

```
Musagent/
├── gsap_cocktails/          # 前端 (React 19 + Vite 6)
│   ├── src/
│   │   ├── components/      # Hero / Navbar / Cocktails / About / Art / Menu / Contact
│   │   ├── pages/           # 灵感生成 / 知识库 / Agent工作流 / 创作润色
│   │   ├── nlp/             # API 客户端 + Pipeline 调度
│   │   ├── data/            # poems_extracted.json（5320 首诗歌, 2.6MB）
│   │   └── index.css        # 全局样式 + 响应式媒体查询
│   └── public/              # 静态资源（图片、字体、视频）
└── back/                    # 后端 (FastAPI)
    ├── main.py              # API 路由 + DeepSeek 集成
    └── nlp_engine.py        # NLP 引擎（分词/TF-IDF/TextRank/情感/检索）
```

---

## 🔌 API

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |
| `POST` | `/api/pipeline` | 完整流水线 `{topic, creationType, emotionTone, artStyle}` |
| `POST` | `/api/chat` | 灵感对话 `{message, history}` |
| `POST` | `/api/segment` | 分词 `{text}` |
| `POST` | `/api/keywords` | 关键词 `{words}` |
| `POST` | `/api/sentiment` | 情感分析 `{words}` |
| `POST` | `/api/retrieve` | 相似度检索 `{words, creationType}` |

---

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 · Vite 6 · Tailwind CSS 4 · GSAP |
| 后端 | FastAPI · Uvicorn · Pydantic |
| NLP | Jieba · NumPy · TF-IDF · TextRank · 情感词典 |
| AI | DeepSeek (deepseek-chat) · OpenAI SDK |
| 数据 | 5320 首诗歌 JSON |

---

## 🌐 页面

| 路径 | 功能 |
|------|------|
| `/` | 首页 |
| `/cocktails` | 灵感生成工作台 + 灵感菌对话 |
| `/menu` | 知识库（分页浏览） |
| `/about` | Agent 工作流展示 |
| `/contact` | 创作润色 |

---

## 📄 详细文档

参见 [PROJECT.md](PROJECT.md) — 包含完整算法原理、数学公式、数据流图和部署说明。
