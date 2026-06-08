// ========== MusAgent 后端 API 客户端 ==========
// 后端不可用时自动降级为本地 NLP

const API_BASE = 'http://localhost:8000/api';
let backendAvailable = null; // null=未检测, true=可用, false=不可用

/** 检测后端是否可用 */
export async function checkBackend() {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const resp = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    backendAvailable = resp.ok;
    console.log(`[API] 后端${backendAvailable ? '已' : '未'}连接`);
  } catch (e) {
    backendAvailable = false;
    console.log('[API] 后端未启动，使用本地 NLP 引擎:', e.message);
  }
  return backendAvailable;
}

/** 调用远程 Pipeline */
export async function remotePipeline(params) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const resp = await fetch(`${API_BASE}/pipeline`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`API ${resp.status}: ${text.slice(0, 100)}`);
    }
    return resp.json();
  } finally {
    clearTimeout(timeout);
  }
}

/** 调用远程检索 */
export async function remoteRetrieve(words, creationType) {
  const resp = await fetch(`${API_BASE}/retrieve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ words, creationType }),
  });
  if (!resp.ok) throw new Error(`API error: ${resp.status}`);
  return resp.json();
}

/** 灵感对话 — 发送消息 + 历史，返回 AI 回复 + NLP 分析 */
export async function chatWithInspiration(message, history = []) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);
  try {
    const resp = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Chat API ${resp.status}: ${text.slice(0, 100)}`);
    }
    return resp.json();
  } finally {
    clearTimeout(timeout);
  }
}

export default { checkBackend, remotePipeline, remoteRetrieve, chatWithInspiration };
