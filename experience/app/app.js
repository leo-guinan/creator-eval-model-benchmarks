import {
  createSession,
  getNextItem,
  submitResponse,
  getResult,
} from '/eval/protocol.js';

const itemNode = document.querySelector('#item');
const statusNode = document.querySelector('#status');
const beginButton = document.querySelector('#begin');
let session;

async function loadFixture() {
  const response = await fetch('/eval/golden-cases.json');
  const fixture = await response.json();
  session = createSession({ caseData: fixture.cases.find((row) => row.id === 'B') });
  const item = getNextItem(session);
  itemNode.textContent = item.evidence || 'The first case is ready.';
}

beginButton.addEventListener('click', () => {
  if (!session) return;
  const item = getNextItem(session);
  submitResponse(session, {
    ...item,
    evidence: item.evidence,
    mechanism_support: item.mechanism_support,
    impact: item.impact,
    response_capability: item.response_capability,
    alternative_explanations: item.alternative_explanations,
  });
  const result = getResult(session);
  statusNode.textContent = result.primary_candidate
    ? `Candidate recorded: ${result.primary_candidate.construct_id}`
    : 'The evidence remains ambiguous.';
  beginButton.disabled = true;
});

loadFixture().catch((error) => {
  statusNode.textContent = `Experience unavailable: ${error.message}`;
});
