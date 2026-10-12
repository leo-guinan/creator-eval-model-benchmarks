const FRAMEWORK_HINTS = [
  'framework', 'model', 'method', 'approach', 'horsemen', 'action gap', 'liminal',
  'fear', 'assessment', 'work with me', 'how it works', 'resources', 'articles'
];

function strip(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#39;/g, "'")
    .replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim();
}

function absoluteUrl(href, baseUrl) {
  try {
    const url = new URL(href, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    if (url.hostname !== new URL(baseUrl).hostname) return null;
    url.hash = '';
    return url.toString();
  } catch { return null; }
}

function linkLabel(match) {
  return strip(match[1] || match[2] || '').slice(0, 240);
}

export function rankFrameworkLinks(html, sourceUrl, limit = 5) {
  const candidates = new Map();
  const pattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(pattern)) {
    const url = absoluteUrl(match[1], sourceUrl);
    if (!url || url === sourceUrl) continue;
    const label = linkLabel([match[2], match[1]]);
    const haystack = `${url} ${label}`.toLowerCase();
    const hits = FRAMEWORK_HINTS.filter((hint) => haystack.includes(hint));
    if (!hits.length) continue;
    const score = hits.length * 10 + (label.length > 12 ? 2 : 0) - (url.split('/').length > 6 ? 1 : 0);
    const prior = candidates.get(url);
    if (!prior || score > prior.score) candidates.set(url, { url, label, score, signals: hits });
  }
  return [...candidates.values()].sort((a, b) => b.score - a.score || a.url.localeCompare(b.url)).slice(0, limit);
}

export function boundedSourceCapture(html, url, capturedAt = new Date().toISOString()) {
  const boundedHtml = html.slice(0, 1_500_000);
  const matches = (pattern, limit = 12) => [...boundedHtml.matchAll(pattern)].slice(0, limit).map((match) => strip(match[1] || '')).filter(Boolean);
  const parsed = new URL(url);
  return {
    url, host: parsed.hostname, captured_at: capturedAt,
    coverage: 'bounded public capture: first 1.5 MB response and first 12,000 normalized text characters',
    title: matches(/<title[^>]*>([\s\S]*?)<\/title>/gi, 1)[0] || '',
    description: matches(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/gi, 1)[0] || '',
    headings: matches(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, 12),
    excerpts: [strip(boundedHtml).slice(0, 12_000)]
  };
}

export async function discoverFrameworkSources(sourceUrl, fetchImpl = fetch, limit = 5) {
  const response = await fetchImpl(sourceUrl, { headers: { 'User-Agent': 'CreatorEvalBenchmark/0.2' } });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
  const homepageHtml = (await response.text()).slice(0, 1_500_000);
  const links = rankFrameworkLinks(homepageHtml, sourceUrl, limit);
  const pages = [{ ...boundedSourceCapture(homepageHtml, sourceUrl), role: 'homepage', discovery_score: null }];
  for (const link of links) {
    try {
      const pageResponse = await fetchImpl(link.url, { headers: { 'User-Agent': 'CreatorEvalBenchmark/0.2' } });
      if (!pageResponse.ok) { pages.push({ url: link.url, role: 'candidate_framework', fetch_status: pageResponse.status, discovery: link }); continue; }
      const html = (await pageResponse.text()).slice(0, 1_500_000);
      pages.push({ ...boundedSourceCapture(html, link.url), role: 'candidate_framework', discovery: link });
    } catch (error) {
      pages.push({ url: link.url, role: 'candidate_framework', fetch_status: 'error', error: error.message, discovery: link });
    }
  }
  return { root_url: sourceUrl, selection_policy: 'same-host links ranked by framework-language signals; bounded to top 5', pages };
}
