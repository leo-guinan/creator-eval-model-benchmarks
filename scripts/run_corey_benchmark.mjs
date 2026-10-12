import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateSiteDraft } from '../src/openrouter.js';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required in the process environment.');

const sourceUrl = process.env.CREATOR_EVAL_SOURCE_URL || 'https://coreywilkspsyd.com/';
const models = (process.env.CREATOR_EVAL_MODELS || [
  'deepseek/deepseek-v4-flash-0731',
  'openai/gpt-5.6-luna',
  'anthropic/claude-haiku-5.5'
].join(',')).split(',').map((value) => value.trim()).filter(Boolean);

const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'CreatorEvalBenchmark/0.1' } });
if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
const html = (await response.text()).slice(0, 1_500_000);
const strip = (value) => value.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&#39;/g, "'").replace(/&quot;/gi, '"').replace(/\s+/g, ' ').trim();
const matches = (pattern, limit = 12) => [...html.matchAll(pattern)].slice(0, limit).map((match) => strip(match[1] || '')).filter(Boolean);
const url = new URL(sourceUrl);
const source = {
  url: sourceUrl,
  host: url.hostname,
  captured_at: new Date().toISOString(),
  coverage: 'single public URL; bounded to the first 1.5 MB response and first 12,000 normalized text characters',
  title: matches(/<title[^>]*>([\s\S]*?)<\/title>/gi, 1)[0] || '',
  description: matches(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["'][^>]*>/gi, 1)[0] || '',
  headings: matches(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi, 12),
  excerpts: [strip(html).slice(0, 12_000)]
};

const results = [];
for (const model of models) {
  const started = Date.now();
  try {
    const result = await generateSiteDraft(source, {
      OPENROUTER_API_KEY: apiKey,
      OPENROUTER_MODEL: model,
      OPENROUTER_HTTP_REFERER: 'https://tools.leoasaservice.com/'
    });
    results.push({ model, elapsed_ms: Date.now() - started, ...result });
  } catch (error) {
    results.push({ model, elapsed_ms: Date.now() - started, status: 'error', error: error.message, request_id: error.request_id || null, response_id: error.response_id || null, usage: error.usage || null });
  }
}

const timestamp = new Date().toISOString();
const date = timestamp.slice(0, 10);
const outputDir = join('data', url.hostname.replace(/^www\./, ''), date);
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, `models-${timestamp.replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')}.json`);
writeFileSync(outputPath, JSON.stringify({ captured_at: timestamp, source: { url: source.url, host: source.host, title: source.title, coverage: source.coverage }, models: results }, null, 2) + '\n');
console.log(JSON.stringify({ output: outputPath, model_count: results.length, statuses: results.map(({ model, status }) => ({ model, status })) }));
