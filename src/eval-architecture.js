const REQUIRED_PROTOCOL_FIELDS = [
  'case_id', 'candidate_mechanisms', 'confidence', 'impact',
  'response_capability', 'alternatives', 'alternative_explanations_survived',
  'supporting_evidence', 'disconfirming_evidence',
  'next_discriminating_experiment', 'retest', 'claim_boundary'
];

const SENSITIVE_FIELDS = new Set([
  'question_wording', 'response_options', 'item_order', 'evidence_requested',
  'scenario_text', 'scoring_mapping', 'required_artifacts', 'result_interpretation'
]);

export function validateProtocolResult(result) {
  const errors = REQUIRED_PROTOCOL_FIELDS.filter((field) => !(field in result));
  if (result.claim_boundary === 'MISSING') errors.push('claim_boundary');
  if (!Array.isArray(result.candidate_mechanisms)) errors.push('candidate_mechanisms');
  if (!Array.isArray(result.alternatives)) errors.push('alternatives');
  return [...new Set(errors)].sort();
}

export function classifyExperienceChange({ changedPaths = [], changedFields = [] } = {}) {
  const reasons = [];
  if (changedFields.some((field) => SENSITIVE_FIELDS.has(field))) {
    reasons.push('measurement_sensitive_change');
  }
  for (const path of changedPaths) {
    if (path.startsWith('eval/') || path.startsWith('src/')) reasons.push('protected_semantic_path');
    else if (!path.startsWith('app/') && !path.startsWith('experience/')) reasons.push('unclassified_path');
  }
  return reasons.length
    ? { risk: 'measurement_sensitive', requires_creator_review: true, reasons: [...new Set(reasons)].sort() }
    : { risk: 'presentation_safe', requires_creator_review: false, reasons: [] };
}

export function validateConstitution(reports, constitution) {
  const errors = [];
  const byId = new Map(reports.map((row) => [row.case_id, row]));
  for (const rule of constitution.rules || []) {
    if (rule.id === 'preserve_ambiguity') {
      const row = byId.get('A');
      if (!row || row.primary_candidate !== null || !row.classification_withheld) errors.push(rule.id);
    } else if (rule.id === 'preserve_external_constraints') {
      const primary = byId.get('D')?.primary_candidate;
      if (!primary || primary.construct_id !== 'external_constraint') errors.push(rule.id);
    } else if (rule.id === 'preserve_alternatives') {
      for (const [caseId, alternative] of [['A', 'skill_gap'], ['B', 'genuine_information_gap']]) {
        if (!(byId.get(caseId)?.alternative_explanations_survived || []).includes(alternative)) errors.push(`${rule.id}:${caseId}`);
      }
    } else if (rule.id === 'claim_boundary_required') {
      for (const row of reports) if (!row.claim_boundary || row.claim_boundary === 'MISSING') errors.push(`${rule.id}:${row.case_id}`);
    }
  }
  return errors;
}

export function buildPublishGate({ experienceChanges = {}, protocolResults = [], constitution } = {}) {
  const change = classifyExperienceChange(experienceChanges);
  const reasons = [...change.reasons];
  for (const result of protocolResults) reasons.push(...validateProtocolResult(result));
  if (constitution && protocolResults.length) reasons.push(...validateConstitution(protocolResults, constitution));
  return reasons.length
    ? { status: 'review_required', reasons: [...new Set(reasons)].sort() }
    : { status: 'publishable', reasons: [] };
}
