function primaryId(report) { return report.primary_candidate?.construct_id || null; }

export function buildJudgeTheJudgePacket({ framework_cards = [], reports = [] }) {
  return {
    title: 'Judge the Judge',
    introduction: 'We built a first draft of your judgment from your public work. It will be wrong in places. Teach us how you see it.',
    sections: {
      distinctions: framework_cards.map((card) => ({
        creator_construct_id: card.creator_construct_id,
        name: card.name,
        summary: card.summary,
        controls: ['exactly_right', 'mostly_right', 'wrong', 'missing_something'],
        correction_prompt: 'If this is not exactly right, what distinction would you make instead?'
      })),
      judgments: reports.map((report) => ({
        case_id: report.case_id,
        current_read: report.primary_candidate || { classification: 'withheld', candidates: report.candidate_mechanisms },
        alternatives: report.alternative_explanations_survived,
        next_question: report.next_discriminating_experiment,
        controls: ['same_call', 'choose_failure', 'choose_ridicule', 'choose_something_else', 'need_different_evidence'],
        correction_prompt: 'What are you noticing that we are missing?'
      })),
      recommendations: reports.map((report) => ({
        case_id: report.case_id,
        proposed_experiment: report.next_discriminating_experiment,
        controls: ['yes', 'directionally', 'no'],
        correction_prompt: 'If not, what would you have this person do instead?'
      }))
    },
    counterexample_prompt: 'Give us one example of a person your framework is commonly applied to incorrectly.'
  };
}

export function computeJudgmentDistance({ reports, adjudications }) {
  const rows = reports.map((report) => {
    const judgment = adjudications.find((item) => item.case_id === report.case_id) || {};
    const machine = primaryId(report);
    const creator = judgment.creator_primary_construct_id || null;
    const agreement = machine && creator && machine === creator ? 1 : machine === creator ? 0.5 : 0;
    const boundary = judgment.boundary_classification ? (creator === judgment.boundary_classification ? 1 : 0) : null;
    const alternatives = new Set(report.alternative_explanations_survived || []);
    const creatorAlternatives = new Set(judgment.creator_alternatives || []);
    const union = new Set([...alternatives, ...creatorAlternatives]);
    const intersection = [...alternatives].filter((item) => creatorAlternatives.has(item)).length;
    const evidenceAgreement = union.size ? intersection / union.size : 1;
    return { case_id: report.case_id, mechanism_agreement: agreement, evidence_agreement: evidenceAgreement, boundary_agreement: boundary, judgment_distance: 1 - agreement };
  });
  const values = rows.flatMap((row) => [row.mechanism_agreement, row.evidence_agreement, row.boundary_agreement]).filter((value) => value !== null);
  return { rows, aggregate_judgment_distance: values.length ? 1 - values.reduce((sum, value) => sum + value, 0) / values.length : null, claim_boundary: 'Judgment Distance is a calibration comparison, not Corey Accuracy or proof of framework validity.' };
}

export function propagateCalibration({ reports, adjudications, rule_updates = [] }) {
  const distance = computeJudgmentDistance({ reports, adjudications });
  const changes = rule_updates.map((update) => ({
    rule_id: update.rule_id,
    before: update.before,
    correction: update.correction,
    affected_construct_ids: update.affected_construct_ids || [],
    affected_case_ids: update.affected_case_ids || [],
    changed_questions: update.changed_questions || 0,
    changed_scoring_rules: update.changed_scoring_rules || 0,
    changed_report_interpretations: update.changed_report_interpretations || 0
  }));
  return { before: { reports }, calibration: { adjudications }, changes, after: { reports }, distance_before_update: distance };
}
