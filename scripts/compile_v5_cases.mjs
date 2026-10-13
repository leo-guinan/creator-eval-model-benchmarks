import { readFileSync, writeFileSync } from 'node:fs';
import { compileJudgment } from '../src/v5-scorer.js';

const input = JSON.parse(readFileSync('data/corey/2026-10-13/judgment-cases-v1.json', 'utf8'));
const reports = input.cases.map((item) => compileJudgment({ case_id: item.id, item_results: item.item_results, next_discriminating_experiment: item.next_discriminating_experiment, retest: item.retest }));
const output = { case_set: input.case_set, status: 'synthetic_fixture_compiled', compiler: 'v5-deterministic-scorer', reports };
writeFileSync('data/corey/2026-10-13/judgment-reports-v1.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ reports: reports.map((report) => ({ case_id: report.case_id, primary_candidate: report.primary_candidate, confidence: report.confidence, impact: report.impact, response_capability: report.response_capability, alternatives: report.alternative_explanations_survived, forced_classification: report.forced_classification })) }));
