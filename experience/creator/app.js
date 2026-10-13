const packet = await fetch('./calibration-packet.json').then((response) => response.json());
const storageKey = `creator-calibration:${packet.session_id}`;
const casesNode = document.querySelector('#cases');
const statusNode = document.querySelector('#status');
const exportButton = document.querySelector('#export');
const resetButton = document.querySelector('#reset');

const state = JSON.parse(localStorage.getItem(storageKey) || '{}');
const choices = [
  ['exactly_right', 'Exactly right'],
  ['mostly_right', 'Mostly right'],
  ['wrong', 'Wrong'],
  ['missing_something', 'Missing something'],
];

function save() {
  localStorage.setItem(storageKey, JSON.stringify(state));
  statusNode.textContent = 'Saved in this browser only.';
}

function render() {
  casesNode.replaceChildren();
  for (const row of packet.adjudications) {
    const card = document.createElement('section');
    card.className = 'card';
    const current = state[row.case_id] || {};
    card.innerHTML = `
      <h2>Case ${row.case_id}</h2>
      <p>What did the evaluator get right or wrong?</p>
      <label>Judgment
        <select data-field="judgment" data-case="${row.case_id}">
          <option value="">Choose one</option>
          ${choices.map(([value, label]) => `<option value="${value}" ${current.judgment === value ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
      </label>
      <label>Creator correction
        <textarea data-field="correction" data-case="${row.case_id}" rows="4" placeholder="What evidence or distinction is missing?">${current.correction || ''}</textarea>
      </label>
      <label>Recommended next action
        <select data-field="recommendation" data-case="${row.case_id}">
          <option value="">Choose one</option>
          <option value="yes" ${current.recommendation === 'yes' ? 'selected' : ''}>Yes</option>
          <option value="directionally" ${current.recommendation === 'directionally' ? 'selected' : ''}>Directionally</option>
          <option value="no" ${current.recommendation === 'no' ? 'selected' : ''}>No</option>
        </select>
      </label>`;
    casesNode.append(card);
  }
}

casesNode.addEventListener('input', (event) => {
  const target = event.target;
  const caseId = target.dataset.case;
  if (!caseId) return;
  state[caseId] = { ...(state[caseId] || {}), [target.dataset.field]: target.value };
  save();
});

exportButton.addEventListener('click', () => {
  const receipt = {
    receipt_version: 'creator-calibration-receipt.v1',
    calibration_version: 'creator-calibration.v1',
    status: 'creator_review_pending',
    session_id: packet.session_id,
    creator: packet.creator,
    responses: state,
    provenance: {
      source_packet: 'calibration-packet.json',
      storage: 'browser-local',
      claim_boundary: 'Unsubmitted local review. It is not Corey\'s adjudication until explicitly reviewed and accepted.',
    },
  };
  const blob = new Blob([JSON.stringify(receipt, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'creator-calibration-receipt.json';
  link.click();
  URL.revokeObjectURL(link.href);
  statusNode.textContent = 'Exported a browser-local draft receipt. Nothing was transmitted.';
});

resetButton.addEventListener('click', () => {
  localStorage.removeItem(storageKey);
  Object.keys(state).forEach((key) => delete state[key]);
  render();
  statusNode.textContent = 'Local calibration cleared.';
});

render();
