import { readFileSync, writeFileSync } from 'node:fs';
import { compileJudgment } from '../src/v5-scorer.js';
import { compileAfterCalibration, computeJudgmentDistanceV7 } from '../src/v7-rule-learner.js';

const fixture = JSON.parse(readFileSync('data/corey/2026-10-13/v7-rule-learning-v1.json', 'utf8'));
const before = fixture.cases.map((item) => compileJudgment({ case_id: item.id, item_results: item.item_results, next_discriminating_experiment: item.next_discriminating_experiment, retest: item.retest }));
const calibrated = compileAfterCalibration({ cases: fixture.cases, corrections: fixture.corrections, fresh_cases: [] });
const after = calibrated.reports;
const beforeDistance = computeJudgmentDistanceV7({ reports: before, adjudications: fixture.adjudications });
const afterDistance = computeJudgmentDistanceV7({ reports: after, adjudications: fixture.adjudications });
const output = { session_id: fixture.session_id, status: 'synthetic_rule_learning_compiled', corrections: fixture.corrections, learned_rules: calibrated.rules, before, after, fresh_case_generalization: after.find((report) => report.case_id === 'E'), distance_before: beforeDistance, distance_after: afterDistance, claim_boundary: calibrated.claim_boundary };
writeFileSync('data/corey/2026-10-13/v7-rule-learning-receipt-v1.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ learned_rules: calibrated.rules.map((rule) => rule.rule_id), B_before: before.find((r) => r.case_id === 'B')?.primary_candidate, B_after: after.find((r) => r.case_id === 'B')?.primary_candidate, E_after: after.find((r) => r.case_id === 'E')?.primary_candidate, distance_before: beforeDistance.aggregate_judgment_distance, distance_after: afterDistance.aggregate_judgment_distance }));
