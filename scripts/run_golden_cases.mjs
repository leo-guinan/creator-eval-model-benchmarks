import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  createSession,
  getNextItem,
  submitResponse,
  getResult,
  PROTOCOL_VERSION,
  JUDGMENT_MODEL_VERSION,
  EXPERIENCE_VERSION,
} from '../experience/eval/protocol.js';
import { buildPublishGate, validateConstitution } from '../src/eval-architecture.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const cases = JSON.parse(await readFile(resolve(root, 'data/corey/2026-10-13/judgment-cases-v1.json'), 'utf8'));
const constitution = JSON.parse(await readFile(resolve(root, 'data/corey/2026-10-13/eval-constitution-v1.json'), 'utf8'));
const reports = [];

for (const caseData of cases.cases) {
  const session = createSession({ caseData });
  for (const item of caseData.item_results) {
    const next = getNextItem(session);
    if (!next || next.item_id !== item.item_id) throw new Error(`protocol order mismatch for case ${caseData.id}`);
    submitResponse(session, item);
  }
  reports.push(getResult(session));
}

const constitutionalErrors = validateConstitution(reports, constitution);
const publishGate = buildPublishGate({
  experienceChanges: { changedPaths: ['app/theme/colors.css'] },
  protocolResults: reports,
  constitution,
});
const receipt = {
  receipt_version: 'golden-case-receipt.v1',
  status: constitutionalErrors.length || publishGate.status !== 'publishable' ? 'failed' : 'passed',
  judgment_model_version: JUDGMENT_MODEL_VERSION,
  protocol_version: PROTOCOL_VERSION,
  experience_version: EXPERIENCE_VERSION,
  artifact_versions: {
    judgment_model: JUDGMENT_MODEL_VERSION,
    protocol: PROTOCOL_VERSION,
    experience: EXPERIENCE_VERSION,
  },
  case_count: reports.length,
  cases: reports.map((report) => ({
    case_id: report.case_id,
    primary_candidate: report.primary_candidate,
    classification_withheld: report.classification_withheld,
    alternatives: report.alternative_explanations_survived,
  })),
  constitutional_regression: {
    status: constitutionalErrors.length ? 'failed' : 'passed',
    errors: constitutionalErrors,
  },
  publish_gate: {
    status: publishGate.status,
    reasons: publishGate.reasons,
    presentation_change_requires_review: false,
  },
  provenance: {
    source_cases: 'data/corey/2026-10-13/judgment-cases-v1.json',
    fixture_status: 'synthetic_fixture',
    claim_boundary: 'This receipt verifies protocol and constitutional behavior on synthetic cases. It does not validate Corey judgment or respondent outcomes.',
  },
};
const output = resolve(root, 'data/corey/2026-10-13/golden-case-receipt-v1.json');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, case_count: receipt.case_count, output }, null, 2));
if (receipt.status !== 'passed') process.exitCode = 1;
