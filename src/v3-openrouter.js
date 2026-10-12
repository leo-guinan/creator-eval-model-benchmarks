import { parseJsonContent } from './site-prompt.js';
import { buildFrameworkMessages, buildInstrumentMessages, V3_PROMPT_VERSION } from './v3-prompt.js';

const URL = 'https://openrouter.ai/api/v1/chat/completions';

function contentText(content) { return typeof content === 'string' ? content : Array.isArray(content) ? content.map((block) => typeof block === 'string' ? block : block?.text || '').join('') : ''; }

async function call(messages, env, fetchImpl) {
  const model = env.OPENROUTER_MODEL;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);
  try {
    const response = await fetchImpl(URL, { method: 'POST', headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`, 'Content-Type': 'application/json',
      'HTTP-Referer': env.OPENROUTER_HTTP_REFERER || 'https://tools.leoasaservice.com/', 'X-Title': 'Creator Eval Engine V3'
    }, body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 16_000, reasoning: model.startsWith('deepseek/') ? { effort: 'none', exclude: true } : { effort: 'low', exclude: true }, response_format: { type: 'json_object' } }), signal: controller.signal });
    const requestId = response.headers.get('x-request-id') || response.headers.get('x-openrouter-request-id') || null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(`OpenRouter returned HTTP ${response.status}.`); error.request_id = requestId; throw error; }
    const content = contentText(payload?.choices?.[0]?.message?.content);
    if (!content) { const error = new Error(`Model returned no text content (${payload?.choices?.[0]?.finish_reason || 'unknown finish reason'}).`); error.request_id = requestId; error.response_id = payload.id || null; error.usage = payload.usage || null; throw error; }
    return { request_id: requestId, response_id: payload.id || null, effective_model: payload.model || model, usage: payload.usage || null, raw: parseJsonContent(content) };
  } finally { clearTimeout(timer); }
}

export async function generateV3(discovery, env, fetchImpl = fetch) {
  if (!env?.OPENROUTER_API_KEY) return { status: 'provider_unconfigured', prompt_version: V3_PROMPT_VERSION };
  const framework = await call(buildFrameworkMessages(discovery), env, fetchImpl);
  const instrument = await call(buildInstrumentMessages(discovery, framework.raw), env, fetchImpl);
  return { status: 'generated', prompt_version: V3_PROMPT_VERSION, framework, instrument };
}
