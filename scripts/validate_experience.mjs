import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateConstitution, validateProtocolResult } from '../src/eval-architecture.js';

const root = resolve(new URL('..', import.meta.url).pathname);
const args = process.argv.slice(2);
const requestedIndex = args.indexOf('--experience-dir');
const requested = requestedIndex >= 0 ? args[requestedIndex + 1] : 'experience';
const outputIndex = args.indexOf('--output');
const outputArg = outputIndex >= 0 ? args[outputIndex + 1] : null;
const experienceDir = resolve(root, requested);
const output = resolve(root, outputArg || 'data/corey/2026-10-13/experience-validation-receipt-v1.json');

function fail(message) {
  console.error(`experience validation failed: ${message}`);
  process.exitCode = 1;
}

const required = ['eval/index.json', 'eval/protocol.js', 'eval/golden-cases.json', 'app/index.html', 'app/app.js'];
const missing = required.filter((file) => !existsSync(resolve(experienceDir, file)));
if (missing.length) {
  fail(`missing required experience file(s): ${missing.join(', ')}`);
} else {
  const manifest = JSON.parse(await readFile(resolve(experienceDir, 'eval/index.json'), 'utf8'));
  const cases = JSON.parse(await readFile(resolve(experienceDir, 'eval/golden-cases.json'), 'utf8'));
  const constitution = JSON.parse(await readFile(resolve(root, 'data/corey/2026-10-13/eval-constitution-v1.json'), 'utf8'));
  const protocol = await import(pathToFileURL(resolve(experienceDir, 'eval/protocol.js')).href);
  const reports = [];

  for (const caseData of cases.cases) {
    const session = protocol.createSession({ caseData });
    for (const item of caseData.item_results) {
      const next = protocol.getNextItem(session);
      if (!next || next.item_id !== item.item_id) throw new Error(`protocol order mismatch for case ${caseData.id}`);
      protocol.submitResponse(session, item);
    }
    reports.push(protocol.getResult(session));
  }

  const protocolErrors = reports.flatMap((report) => validateProtocolResult(report).map((error) => `${report.case_id}:${error}`));
  const constitutionalErrors = validateConstitution(reports, constitution);
  const status = protocolErrors.length || constitutionalErrors.length ? 'failed' : 'passed';
  const receipt = {
    receipt_version: 'experience-validation-receipt.v1',
    status,
    experience_dir: requested,
    experience_version: manifest.experience_version,
    judgment_model_version: manifest.judgment_model_version,
    protocol_version: manifest.protocol_version,
    golden_cases: { case_count: reports.length, protocol_errors: protocolErrors },
    constitutional_regression: { status: constitutionalErrors.length ? 'failed' : 'passed', errors: constitutionalErrors },
    artifact_versions: {
      judgment_model: manifest.judgment_model_version,
      protocol: manifest.protocol_version,
      experience: manifest.experience_version,
    },
    provenance: {
      fixture_status: 'synthetic_fixture',
      claim_boundary: 'This validates a local experience against synthetic golden cases. It does not validate creator judgment or respondent outcomes.',
    },
  };
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`);
  console.log(JSON.stringify({ status, output, case_count: reports.length }, null, 2));
  if (status !== 'passed') process.exitCode = 1;
}
