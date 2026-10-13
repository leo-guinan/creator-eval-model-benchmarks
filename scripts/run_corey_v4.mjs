import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverFrameworkSources } from '../src/source-discovery.js';
import { generateV4 } from '../src/v4-openrouter.js';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required in the process environment.');
const sourceUrl = process.env.CREATOR_EVAL_SOURCE_URL || 'https://coreywilkspsyd.com/';
const models = (process.env.CREATOR_EVAL_MODELS || 'deepseek/deepseek-v4-flash-0731,openai/gpt-5.6-luna,anthropic/claude-haiku-5.5').split(',').map((x) => x.trim()).filter(Boolean);
const discovery = await discoverFrameworkSources(sourceUrl);
const results = [];
for (const model of models) {
  const started = Date.now();
  try {
    const result = await generateV4(discovery, { OPENROUTER_API_KEY: apiKey, OPENROUTER_MODEL: model });
    results.push({ model, elapsed_ms: Date.now() - started, ...result });
  } catch (error) {
    results.push({ model, elapsed_ms: Date.now() - started, status: 'error', error: error.message, request_id: error.request_id || null, response_id: error.response_id || null, usage: error.usage || null });
  }
}
const timestamp = new Date().toISOString();
const outputDir = join('data', new URL(sourceUrl).hostname.replace(/^www\./, ''), timestamp.slice(0, 10));
mkdirSync(outputDir, { recursive: true });
const output = join(outputDir, `v4-${timestamp.replaceAll(':', '').replace(/\.\d{3}Z$/, 'Z')}.json`);
writeFileSync(output, JSON.stringify({ captured_at: timestamp, discovery, models: results }, null, 2) + '\n');
console.log(JSON.stringify({ output, pages: discovery.pages.length, models: results.length, statuses: results.map(({ model, status, validation_errors }) => ({ model, status, validation_errors: validation_errors?.length || 0 })) }));
