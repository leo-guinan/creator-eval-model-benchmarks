import { compileJudgment } from '../../src/v5-scorer.js';

export const PROTOCOL_VERSION = 'eval-protocol.v1';
export const JUDGMENT_MODEL_VERSION = 'corey-action-gap.v1';
export const EXPERIENCE_VERSION = 'corey-starter.v1';

export function createSession({ caseData }) {
  return {
    caseId: caseData.id,
    itemResults: [],
    pendingItems: [...caseData.item_results],
    nextExperiment: caseData.next_discriminating_experiment,
    retestInterval: caseData.retest,
  };
}

export function getNextItem(session) {
  const item = session.pendingItems[0];
  return item ? { ...item, response_contract: 'submit_response' } : null;
}

export function submitResponse(session, response) {
  if (!response || !response.item_id) throw new Error('item_id is required');
  const index = session.pendingItems.findIndex((item) => item.item_id === response.item_id);
  if (index < 0) throw new Error(`unknown item_id: ${response.item_id}`);
  session.pendingItems.splice(index, 1);
  session.itemResults.push({ ...response });
  return { accepted: true, remaining_items: session.pendingItems.length };
}

export function requestArtifact(session, request = {}) {
  return {
    case_id: session.caseId,
    artifact_id: request.artifact_id || 'MISSING',
    status: 'not_required_for_fixture',
    input_spec: request.input_spec || 'MISSING',
  };
}

export function getResult(session) {
  return compileJudgment({
    case_id: session.caseId,
    item_results: session.itemResults,
    next_discriminating_experiment: session.nextExperiment,
    retest: session.retestInterval,
  });
}

export function getCandidateMechanisms(session) {
  return getResult(session).candidate_mechanisms;
}

export function getNextExperiment(session) {
  return session.nextExperiment;
}

export function retest(session) {
  return {
    case_id: session.caseId,
    scheduled: session.retestInterval,
    status: 'contract_only',
  };
}
