import { readFileSync, writeFileSync } from 'node:fs';
import { buildJudgeTheJudgePacket, computeJudgmentDistance, propagateCalibration } from '../src/v6-judge-the-judge.js';

const reports = JSON.parse(readFileSync('data/corey/2026-10-13/judgment-reports-v1.json', 'utf8')).reports;
const fixture = JSON.parse(readFileSync('data/corey/2026-10-13/judge-the-judge-v1.json', 'utf8'));
const packet = buildJudgeTheJudgePacket({ framework_cards: fixture.framework_cards, reports });
const distance = computeJudgmentDistance({ reports, adjudications: fixture.adjudications });
const afterReports = reports.map((report) => fixture.after_overrides[report.case_id] ? { ...report, ...fixture.after_overrides[report.case_id] } : report);
const propagation = propagateCalibration({ reports, adjudications: fixture.adjudications, rule_updates: fixture.rule_updates });
propagation.after.reports = afterReports;
const output = { session_id: fixture.session_id, status: 'synthetic_fixture_compiled', packet, distance_before_update: distance, propagation, fresh_case: fixture.fresh_case, counterexample_prompt: fixture.counterexample_prompt, claim_boundary: 'This is a synthetic calibration protocol and propagation preview. It is not Corey\'s actual judgment or evidence of model learning.' };
writeFileSync('data/corey/2026-10-13/judge-the-judge-receipt-v1.json', JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ packet_sections: Object.keys(packet.sections), cases: reports.length, aggregate_judgment_distance: distance.aggregate_judgment_distance, rule_updates: fixture.rule_updates.length, fresh_case: fixture.fresh_case.id }));
