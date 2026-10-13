import { compileJudgment } from './v5-scorer.js';

function hasAny(text, terms) { const value = String(text || '').toLowerCase(); return terms.some((term) => value.includes(term)); }

export function deriveRuleFromCorrection({ correction, target_construct_id }) {
  const text = String(correction || '').trim();
  const lower = text.toLowerCase();
  if (target_construct_id === 'four_horsemen.fear_of_uncertainty' && hasAny(lower, ['reversib', 'costly', 'cost of being wrong'])) {
    return {
      rule_id: 'uncertainty.requires_decision_context', construct_id: target_construct_id,
      required_positive_signal: 'continued information seeking after a sufficiently informed, low-cost or reversible next step is available',
      insufficient_alone: ['information seeking', 'lack of confidence', 'not enough information'],
      required_fields: ['decision_reversibility', 'expected_cost_if_wrong', 'next_step_clarity'],
      source_correction: text
    };
  }
  if (target_construct_id === 'four_horsemen.fear_of_ridicule' && hasAny(lower, ['social judgment', 'anticipated evaluation', 'other people'])) {
    return {
      rule_id: 'ridicule.requires_social_evaluation', construct_id: target_construct_id,
      required_positive_signal: 'anticipated evaluation or judgment by another person or group',
      insufficient_alone: ['qualification doubt', 'self-doubt about capability'],
      required_fields: ['anticipated_social_evaluation'],
      source_correction: text
    };
  }
  return { rule_id: 'unparsed_correction', construct_id: target_construct_id, source_correction: text, required_positive_signal: 'MISSING', insufficient_alone: [], required_fields: [] };
}

export function applyLearnedRules(itemResults, rules) {
  return itemResults.map((item) => {
    let next = { ...item, alternative_explanations: [...(item.alternative_explanations || [])] };
    for (const rule of rules) {
      if (rule.rule_id === 'uncertainty.requires_decision_context' && item.construct_id === rule.construct_id) {
        const contextComplete = ['decision_reversibility', 'expected_cost_if_wrong', 'next_step_clarity'].every((field) => item[field] !== undefined && item[field] !== null);
        if (!contextComplete) {
          next.mechanism_support = Math.min(Number(item.mechanism_support || 0), 0.55);
          next.alternative_explanations.push({ name: 'genuine_information_gap', support: Math.max(0.48, Number(item.alternative_support || 0.48)), evidence: 'Decision reversibility or expected cost remains unknown.' });
        } else if (item.decision_reversibility === 'cheap' && item.next_step_clarity === 'clear' && Number(item.expected_cost_if_wrong || 0) <= 0.35) {
          next.mechanism_support = Math.max(Number(item.mechanism_support || 0), 0.9);
        }
      }
      if (rule.rule_id === 'ridicule.requires_social_evaluation' && item.construct_id === rule.construct_id && item.anticipated_social_evaluation !== true) {
        next.mechanism_support = Math.min(Number(item.mechanism_support || 0), 0.31);
        next.alternative_explanations.push({ name: 'skill_gap', support: 0.32, evidence: 'Qualification concern without anticipated social evaluation.' });
      }
    }
    return next;
  });
}

export function compileAfterCalibration({ cases, corrections, fresh_cases }) {
  const rules = corrections.map(deriveRuleFromCorrection);
  const compiled = [...cases, ...fresh_cases].map((item) => {
    const learnedItems = applyLearnedRules(item.item_results, rules);
    return compileJudgment({ case_id: item.id, item_results: learnedItems, next_discriminating_experiment: item.next_discriminating_experiment, retest: item.retest });
  });
  return { rules, reports: compiled, claim_boundary: 'This is a deterministic rule-learning demonstration from explicit creator corrections. It is not proof of creator judgment or causal validity.' };
}

export function computeJudgmentDistanceV7({ reports, adjudications }) {
  const rows = reports.map((report) => {
    const creator = adjudications.find((item) => item.case_id === report.case_id) || {};
    const machineId = report.primary_candidate?.construct_id || null;
    const mechanismAgreement = machineId === creator.creator_primary_construct_id ? 1 : machineId === null && creator.creator_primary_construct_id === null ? 1 : 0;
    const machineAlternatives = new Set(report.alternative_explanations_survived || []);
    const creatorAlternatives = new Set(creator.creator_alternatives || []);
    const union = new Set([...machineAlternatives, ...creatorAlternatives]);
    const alternativeExplanationAgreement = union.size ? [...machineAlternatives].filter((x) => creatorAlternatives.has(x)).length / union.size : 1;
    const boundaryAgreement = creator.boundary_classification ? (machineId === creator.boundary_classification ? 1 : 0) : null;
    const interventionAgreement = creator.intervention_decision ? (creator.intervention_decision === 'yes' ? 1 : creator.intervention_decision === 'directionally' ? 0.5 : 0) : null;
    return { case_id: report.case_id, mechanism_agreement: mechanismAgreement, alternative_explanation_agreement: alternativeExplanationAgreement, boundary_agreement: boundaryAgreement, intervention_agreement: interventionAgreement };
  });
  const values = rows.flatMap((row) => [row.mechanism_agreement, row.alternative_explanation_agreement, row.boundary_agreement, row.intervention_agreement]).filter((value) => value !== null);
  return { rows, aggregate_judgment_distance: values.length ? 1 - values.reduce((sum, value) => sum + value, 0) / values.length : null, claim_boundary: 'Judgment Distance is a calibration comparison, not Corey Accuracy or proof of framework validity.' };
}
