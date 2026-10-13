const clamp = (value) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : null;

function mean(values) {
  const usable = values.map(clamp).filter((value) => value !== null);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : null;
}

function confidenceLabel(score, margin, hasStrongAlternative) {
  if (score === null) return 'MISSING';
  if (score >= 0.8 && margin >= 0.2 && !hasStrongAlternative) return 'high';
  if (score >= 0.6 && margin >= 0.1) return 'moderate';
  return 'low';
}

export function compileJudgment({ case_id, item_results = [], next_discriminating_experiment = 'MISSING', retest = 'MISSING' }) {
  const mechanismGroups = new Map();
  const alternatives = new Map();
  const supportingEvidence = [];
  const disconfirmingEvidence = [];
  for (const item of item_results) {
    const constructId = item.construct_id || 'unclear';
    if (!mechanismGroups.has(constructId)) mechanismGroups.set(constructId, { construct_id: constructId, supports: [], evidence: [], contradictions: [] });
    const group = mechanismGroups.get(constructId);
    if (item.mechanism_support !== undefined) group.supports.push(item.mechanism_support);
    if (item.evidence) { group.evidence.push(item.evidence); supportingEvidence.push({ item_id: item.item_id || 'MISSING', text: item.evidence, construct_id: constructId }); }
    if (item.disconfirming_evidence) { group.contradictions.push(item.disconfirming_evidence); disconfirmingEvidence.push({ item_id: item.item_id || 'MISSING', text: item.disconfirming_evidence, construct_id: constructId }); }
    for (const alternative of item.alternative_explanations || []) {
      const name = alternative.name || 'MISSING';
      const prior = alternatives.get(name) || { name, supports: [], evidence: [] };
      if (alternative.support !== undefined) prior.supports.push(alternative.support);
      if (alternative.evidence) prior.evidence.push(alternative.evidence);
      alternatives.set(name, prior);
    }
  }
  const ranked = [...mechanismGroups.values()].map((group) => ({ ...group, support: mean(group.supports) })).filter((group) => group.support !== null).sort((a, b) => b.support - a.support || a.construct_id.localeCompare(b.construct_id));
  const primary = ranked[0] || null;
  const runnerUp = ranked[1] || null;
  const margin = primary && runnerUp ? primary.support - runnerUp.support : (primary ? primary.support : 0);
  const alternativeRows = [...alternatives.values()].map((row) => ({ ...row, support: mean(row.supports) })).filter((row) => row.support !== null).sort((a, b) => b.support - a.support || a.name.localeCompare(b.name));
  const strongAlternative = alternativeRows[0] && alternativeRows[0].support >= 0.65;
  const ambiguous = !primary || primary.support < 0.6 || (runnerUp && margin < 0.15) || (strongAlternative && alternativeRows[0].support >= primary.support - 0.1);
  const impact = mean(item_results.map((item) => item.impact));
  const responseCapability = mean(item_results.map((item) => item.response_capability));
  return {
    case_id,
    primary_candidate: ambiguous ? null : { construct_id: primary.construct_id, support: primary.support, confidence: confidenceLabel(primary.support, margin, Boolean(strongAlternative)) },
    candidate_mechanisms: ranked.map((row) => ({ construct_id: row.construct_id, support: row.support, evidence: row.evidence, contradictions: row.contradictions })),
    confidence: primary ? confidenceLabel(primary.support, margin, Boolean(strongAlternative)) : 'MISSING',
    impact,
    response_capability: responseCapability,
    alternatives: alternativeRows,
    alternative_explanations_survived: alternativeRows.filter((row) => row.support >= 0.3).map((row) => row.name),
    forced_classification: Boolean(primary && primary.support >= 0.6 && ambiguous),
    supporting_evidence: supportingEvidence,
    disconfirming_evidence: disconfirmingEvidence,
    next_discriminating_experiment,
    retest,
    claim_boundary: 'This is a deterministic compilation of coded response evidence. It is not a diagnosis, validated causal attribution, or proof that the creator\'s framework is correct.'
  };
}
