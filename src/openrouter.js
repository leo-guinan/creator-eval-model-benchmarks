import { SITE_MODEL, buildSiteMessages, parseJsonContent, normalizeSiteDraft } from './site-prompt.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

function contentText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map((block) => typeof block === 'string' ? block : block?.text || '').join('');
  return '';
}

export async function generateSiteDraft(source, env, fetchImpl = fetch) {
  const apiKey = env?.OPENROUTER_API_KEY;
  if (!apiKey) return { status: 'provider_unconfigured', draft: null, requested_model: SITE_MODEL };
  const requestedModel = env.OPENROUTER_MODEL || SITE_MODEL;
  const reasoning = requestedModel.startsWith('deepseek/')
    ? { effort: 'none', exclude: true }
    : { effort: 'low', exclude: true };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetchImpl(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': env.OPENROUTER_HTTP_REFERER || 'https://tools.leoasaservice.com/',
        'X-Title': 'Creator Eval Engine'
      },
      body: JSON.stringify({
        model: requestedModel,
        messages: buildSiteMessages(source),
        temperature: 0.1,
        max_tokens: 12000,
        reasoning,
        response_format: { type: 'json_object' }
      }),
      signal: controller.signal
    });
    const requestId = response.headers.get('x-request-id') || response.headers.get('x-openrouter-request-id') || null;
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(`OpenRouter returned HTTP ${response.status}.`);
      error.provider_status = response.status;
      error.request_id = requestId;
      throw error;
    }
    const message = payload?.choices?.[0]?.message || {};
    const content = contentText(message.content);
    if (!content) {
      const error = new Error(`Model returned no text content (${payload?.choices?.[0]?.finish_reason || 'unknown finish reason'}).`);
      error.request_id = requestId;
      error.response_id = payload.id || null;
      error.usage = payload.usage || null;
      throw error;
    }
    const raw = parseJsonContent(content);
    const effectiveModel = payload.model || requestedModel;
    return {
      status: 'generated',
      request_id: requestId,
      response_id: payload.id || null,
      effective_model: effectiveModel,
      usage: payload.usage || null,
      draft: normalizeSiteDraft(raw, source, requestedModel, effectiveModel)
    };
  } catch (error) {
    if (error.name === 'AbortError') error = new Error('OpenRouter request timed out.');
    error.request_id = error.request_id || null;
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
