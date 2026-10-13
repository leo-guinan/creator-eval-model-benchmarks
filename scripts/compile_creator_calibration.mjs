import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const packet = JSON.parse(await readFile(resolve(root, 'experience/creator/calibration-packet.json'), 'utf8'));
const adjudications = packet.adjudications.map((row) => ({
  ...row,
  correction_scope: row.correction ? 'judgment_model' : 'none',
}));
const receipt = {
  receipt_version: 'creator-calibration-receipt.v1',
  calibration_version: 'creator-calibration.v1',
  status: 'synthetic_fixture',
  creator: packet.creator,
  case_count: adjudications.length,
  adjudications,
  recommendations: packet.recommendations,
  rule_updates: packet.rule_updates,
  counterexample_prompt: packet.counterexample_prompt,
  provenance: {
    source_packet: 'experience/creator/calibration-packet.json',
    fixture_status: packet.status,
    claim_boundary: 'This is a synthetic calibration interaction. It is not Corey\'s actual adjudication and does not validate the evaluator.',
  },
};
await writeFile(resolve(root, 'data/corey/2026-10-13/creator-calibration-receipt-v1.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, case_count: receipt.case_count }, null, 2));
