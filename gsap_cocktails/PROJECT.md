# MusAgent — 多智能体文学与艺术灵感生成平台

> 基于 8 个 NLP Agent 协作的诗歌创作与情绪感知系统

---

## 一、项目结构

```
e:\nlpwebsite\
├── gsap_cocktails/          # 前端 (React 19 + Vite 6)
│   ├── public/
│   │   ├── images/          # 静态图片（树叶、图标等）
│   │   ├── videos/          # 背景视频（output.mp4）
│   │   └── fonts/           # Modern Negra 字体
│   ├── src/
│   │   ├── components/      # 首页组件
│   │   │   ├── Hero.jsx     # 首屏（标题 + 视频背景）
│   │   │   ├── Navbar.jsx   # 透明导航栏
│   │   │   ├── Cocktails.jsx# 灵感主题 + 创作风格列表
│   │   │   ├── About.jsx    # 平台介绍 + 图片网格
│   │   │   ├── Art.jsx      # 艺术风格展示
│   │   │   ├── Menu.jsx     # 创作类型滑块
│   │   │   └── Contact.jsx  # 页脚（联系 + GitHub）
│   │   ├── pages/           # 路由页面
│   │   │   ├── Home.jsx     # 首页（组装所有组件）
│   │   │   ├── CocktailsPage.jsx  # 灵感生成工作台 + 对话系统
│   │   │   ├── MenuPage.jsx      # 知识库（5320 首诗歌浏览）
│   │   │   ├── AboutPage.jsx     # Agent 工作流展示
│   │   │   └── ContactPage.jsx   # 创作润色
│   │   ├── nlp/
│   │   │   ├── api.js       # 后端 API 客户端
│   │   │   └── pipeline.js  # Pipeline 调度
│   │   ├── data/
│   │   │   ├── poems_extracted.json  # 5320 首诗歌 (2.6MB)
│   │   │   └── mockData.js           # 轻量模拟数据
│   │   ├── index.css        # 全局样式 + 响应式
│   │   ├── main.jsx         # 入口
│   │   └── App.jsx          # 路由
│   ├── constants/index.js   # 全局常量
│   ├── package.json
│   └── vite.config.js
│
└── back/                    # 后端 (FastAPI)
    ├── main.py              # API 路由 + DeepSeek 集成
    └── nlp_engine.py        # NLP 引擎（分词/TF-IDF/TextRank/情感/检索）
```

---

## 二、技术栈

| 层级 | 技术 | 用途 |
|------|------|------|
| 前端框架 | React 19 + Vite 6 | SPA 构建 |
| 样式 | Tailwind CSS 4 | 原子化 CSS + 纯暗色主题 |
| 动画 | GSAP + ScrollTrigger + SplitText | 首屏逐字动画、视差滚动 |
| 路由 | React Router v6 | 5 个页面路由 |
| 后端框架 | FastAPI (Python) | REST API |
| 服务器 | Uvicorn | ASGI 服务 |
| 分词 | Jieba | 中文分词 + 停用词过滤 |
| 数值计算 | NumPy | TextRank 矩阵运算、向量计算 |
| AI 生成 | DeepSeek (deepseek-chat) | OpenAI 兼容 SDK 调用 |

---

## 三、NLP Agent 知识体系

### 流水线总览

```
用户输入 → 分词 → TF-IDF → TextRank → 情感分析 → 相似度检索 → RAG 提取 → 风格/音乐 → 生成
```

### Agent 详解

#### 1. WordSegAgent — Jieba 分词

- **算法**：基于前缀词典（Prefix Dictionary）的精确模式 + HMM 新词发现
- **处理**：停用词过滤（200+ 词），仅保留长度 >1 的有效词
- **输出**：`{words: [...]  , freq: {...}, total: N}`

#### 2. KeywordAgent — TF-IDF 关键词

- **公式**：$\text{TF} = \frac{n_{word}}{N_{total}}$，IDF 使用经验值 1.0
- **输出**：Top 10 关键词 + TF-IDF 权重
- **示例**：`"城市孤独"` → `[城市(0.5), 孤独(0.5)]`

#### 3. SummaryAgent — TextRank 摘要

- **算法**：基于 PageRank 的句子重要性排序
- **公式**：
  $$\text{Score}(s_i) = 0.15 + 0.85 \times \sum_{j}\frac{\text{sim}(s_j, s_i)}{\sum_k \text{sim}(s_j, s_k)} \times \text{Score}(s_j)$$
- **相似度**：Jaccard 词集交集，经对数归一化
- **迭代**：50 轮收敛

#### 4. EmotionAgent — 情感分析

- **方法**：预定义情感词典，多维度匹配打分
- **情感类别**：孤独、怀旧、平静、激昂、悲伤、喜悦
- **输出**：`{dominant: "孤独", scores: {...}, intensity: 0.75}`

#### 5. RetrievalAgent — 相似度检索

- **算法**：TF 词袋向量的余弦相似度变体
- **公式**：
  $$\text{sim}(Q, D) = \frac{|Q_{set} \cap D_{set}|}{\log_2(|Q_{set}|+1) + \log_2(|D_{set}|+1)}$$
- **数据**：5320 首诗歌（现代诗 5000 + 古典诗词 320）
- **过滤**：支持按创作类型（现代诗/古典诗）过滤
- **输出**：Top 5 最相似诗歌（标题、作者、内容、相似度分数）

#### 6. RAGAgent — 知识增强检索

- **流程**：对 Top 3 检索结果二次 NLP 分析
  1. Jieba 分词 → 提取关键词（TF-IDF Top 3）
  2. 情感分析 → 提取主导情绪
  3. 结构化输出：`{标题, 类型, 情感基调, 核心意象, 原文片段}`
- **注入**：结构化上下文注入 LLM Prompt，作为创作参考

#### 7. StyleMatchAgent — 艺术风格匹配

- **方法**：关键词匹配 + 情绪→风格映射表
- **风格库**：

| 风格 | 关键词 | 适配情绪 |
|------|--------|---------|
| 印象派 | 光影、色彩、朦胧、梦幻 | 怀旧、喜悦 |
| 表现主义 | 扭曲、呐喊、痛苦、不安 | 孤独、激昂、悲伤 |
| 极简主义 | 留白、简洁、克制、静谧 | 孤独、平静 |
| 中国水墨 | 山水、意境、气韵、飘逸 | 怀旧、平静、悲伤 |
| 赛博朋克 | 霓虹、科技、都市、未来 | 孤独、激昂 |
| 超现实主义 | 梦境、荒诞、自由、迷离 | 激昂、喜悦 |

#### 8. WriterAgent — DeepSeek LLM 生成

- **模型**：`deepseek-chat`
- **System Prompt**：中国文学创作助手
- **Prompt 结构**：
  ```
  用户主题 + 情感基调 + 关键词 + 艺术风格
  ════════ RAG 知识库参考 ════════
  ■《参考诗标题》(类型·作者)
    情感基调：xxx | 核心意象：xx、xx
    原文片段：「…」
  ════════════════════════════════
  ```
- **参数**：`temperature=0.8, max_tokens=500`
- **降级**：API 不可用时自动切换算法模板

---

## 四、算法模板生成

当 LLM 不可用时，使用规则模板生成：

- **现代诗**：将 Top 5 关键词嵌入预定义诗歌骨架，基于 `hash(topic)` 选择变体
- **古典诗**：七言绝句格式，关键词 + 情绪填充格律
- **散文**：关键词驱动的叙事片段
- **参考**：检索到的 Top 1 相似诗歌标题

---

## 五、灵感对话系统（灵感菌）

### 后端 `/api/chat`

- **NLP 预处理**：对用户每条消息做 分词 → TF-IDF 关键词 → 情感分析
- **System Prompt**：
  ```
  你是一个名叫「灵感菌」的情绪感知与创作灵感小助手。
  核心任务：共情倾听 → 情绪引导 → 灵感激发 → 知识引用
  风格：温暖真诚、简洁（~100字）、适当 emoji
  ```
- **降级**：LLM 不可用时，基于 NLP 情感+关键词 从 3 个模板中随机生成回复
- **上下文**：保留最近 10 轮对话历史

### 前端 UI

- 暗色主题消息气泡（用户黄色 / 助手灰色）
- 每条助手消息标注 NLP 情绪 + 关键词 + LLM/模板标识
- 三点跳动加载动画
- Enter 快捷发送
- 窄屏 400px → 300px 自适应

---

## 六、数据资产

| 数据 | 规模 | 位置 |
|------|------|------|
| 现代诗 | 5000 首 | `poems_extracted.json` |
| 古典诗词 | 320 首 | `poems_extracted.json` |
| 停用词表 | 200+ 词 | `nlp_engine.py` |
| 情感词典 | 6 类 × 多词 | `nlp_engine.py` |
| 艺术风格映射 | 6 种 × 8 关键词 | `nlp_engine.py` |
| 音乐情绪映射 | 6 种 → 曲风/艺术家 | `nlp_engine.py` |

---

## 七、运行环境

| 依赖 | 版本要求 |
|------|---------|
| Node.js | ≥18 |
| npm | ≥9 |
| Python | ≥3.10 |
| Windows / macOS / Linux | 任意 |

### Python 依赖

```bash
pip install fastapi uvicorn jieba numpy openai pydantic
```

### Node 依赖

```bash
npm install
# 含：react react-dom react-router-dom gsap @gsap/react
# tailwindcss @tailwindcss/vite react-responsive
```

### 环境变量

| 变量 | 说明 |
|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥（必填，否则 LLM 功能降级） |
| `DEEPSEEK_BASE_URL` | DeepSeek API 地址（默认 `https://api.deepseek.com`） |

---

## 八、启动命令

```powershell
# ===== 终端 1：前端 =====
cd e:\nlpwebsite\gsap_cocktails
npm run dev
# → http://localhost:5173

# ===== 终端 2：后端 =====
cd e:\nlpwebsite\back
$env:DEEPSEEK_API_KEY="sk-your-api-key-here"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
# → http://localhost:8000

# 健康检查
# Invoke-RestMethod http://localhost:8000/api/health
```

---

## 九、API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查 |
| POST | `/api/segment` | 分词 `{text}` |
| POST | `/api/keywords` | 关键词 `{words}` |
| POST | `/api/sentiment` | 情感分析 `{words}` |
| POST | `/api/retrieve` | 相似度检索 `{words, creationType}` |
| POST | `/api/pipeline` | 完整流水线 `{topic, creationType, emotionTone, artStyle}` |
| POST | `/api/chat` | 灵感对话 `{message, history}` |

---

## 十、页面路由

| 路径 | 组件 | 功能 |
|------|------|------|
| `/` | Home | 首页（Hero → Cocktails → About → Art → Menu → Contact） |
| `/cocktails` | CocktailsPage | 灵感生成工作台 + 灵感菌对话 |
| `/menu` | MenuPage | 知识库（5320 首诗歌分页浏览） |
| `/about` | AboutPage | Agent 工作流（7 步流程图） |
| `/contact` | ContactPage | 创作润色（NLP 分析 + LLM 润色对比） |

---

## 十一、响应式设计

| 断点 | CSS 类别 | 主要调整 |
|------|---------|---------|
| ≤767px | `@media (max-width: 767px)` | 导航换行、标题缩小、卡片单列、图片高度缩减 |
| 768-1023px | `@media (min-width: 768px) and (max-width: 1023px)` | 平板适配、知识库双列、滑块图片调整 |
| ≥1024px | 默认 | 完整桌面布局 |

---

## 十二、数据流

```
┌─────────────────────────────────────────────────────────┐
│ 用户输入 "城市孤独"                                       │
│                                                         │
│ ① Jieba 分词 → ["城市", "孤独"]                          │
│ ② TF-IDF → [{城市:0.5}, {孤独:0.5}]                      │
│ ③ TextRank → 摘要文本                                    │
│ ④ 情感分析 → {dominant:"孤独", intensity:0.75}             │
│ ⑤ 5320诗歌检索 → Top 5 相似诗歌                           │
│ ⑥ RAG → 对Top 3 做 分词+关键词+情感 → 结构化上下文         │
│ ⑦ 风格匹配 → 赛博朋克/表现主义/极简主义                     │
│ ⑧ 音乐推荐 → 后摇/氛围                                    │
│                                                         │
│  ▼ DeepSeek Prompt                                      │
│  ┌─────────────────────────────────────────────────┐    │
│  │ 请创作现代诗，主题「城市孤独」                      │    │
│  │ 情感：孤独  意象：城市、孤独  风格：赛博朋克         │    │
│  │ ════════ RAG 知识库参考 ════════                  │    │
│  │ ■《城市夜行人》(现代诗·佚名)                        │    │
│  │   情感：孤独  意象：霓虹、雨水、长街                 │    │
│  │   原文：「霓虹在雨水中碎裂成千万个自己…」             │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ▼ 输出                                                  │
│  ⚙️ 算法模板               🤖 DeepSeek LLM (RAG增强)     │
│  夜沉入深色的海              霓虹在凌晨四点的街道上          │
│  风在窗外徘徊                呼吸着孤独的电流                │
│  ...                         ...                          │
└─────────────────────────────────────────────────────────┘
```

---

## 十三、构建部署

```bash
# 生产构建
cd e:\nlpwebsite\gsap_cocktails
npm run build
# → dist/ 目录，部署到任意静态服务器

# 后端部署
cd e:\nlpwebsite\back
$env:DEEPSEEK_API_KEY="sk-xxx"
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
