const REQUIRED_FRAMEWORK_KEYS = ['creator_construct_id', 'name', 'creator_distinction', 'observable_evidence', 'source_basis', 'confidence', 'calibration_questions'];
const REQUIRED_RELATIONSHIP_KEYS = ['from_construct_id', 'creator_claimed_relationship', 'observable_expression', 'desired_behavior', 'evidence_status', 'source_basis', 'validated_relationship'];
const REQUIRED_QUESTION_KEYS = ['text', 'task_type', 'response_type', 'creator_construct_id', 'behavior_being_tested', 'input_spec', 'response_options', 'artifact_required', 'scoring_logic', 'strong_signal', 'weak_signal', 'alternative_explanations', 'disconfirming_evidence', 'source_basis', 'creator_calibration_needed'];

function exactKeys(value, required) { return value && typeof value === 'object' && !Array.isArray(value) && required.every((key) => Object.hasOwn(value, key)) && Object.keys(value).every((key) => required.includes(key)); }

export function validateFrameworkV4(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return ['framework is not an object'];
  for (const key of ['title', 'creator_judgment_model', 'frameworks', 'relationships', 'missing_evidence', 'claim_boundary']) if (!(key in value)) errors.push(`framework missing ${key}`);
  for (const [index, item] of (value.frameworks || []).entries()) if (!exactKeys(item, REQUIRED_FRAMEWORK_KEYS)) errors.push(`frameworks[${index}] exact keys mismatch`);
  for (const [index, item] of (value.relationships || []).entries()) if (!exactKeys(item, REQUIRED_RELATIONSHIP_KEYS)) errors.push(`relationships[${index}] exact keys mismatch`);
  return errors;
}

export function validateInstrumentV4(value) {
  const errors = [];
  if (!value || typeof value !== 'object') return ['instrument is not an object'];
  for (const key of ['title', 'assessment_subject', 'score_axes', 'dimensions', 'questions', 'claim_boundary', 'missing_evidence']) if (!(key in value)) errors.push(`instrument missing ${key}`);
  const axes = value.score_axes || {};
  for (const key of ['mechanism', 'evidence_confidence', 'impact', 'response_capability']) if (!(key in axes)) errors.push(`score_axes missing ${key}`);
  for (const [index, item] of (value.dimensions || []).entries()) {
    if (!exactKeys(item, ['creator_construct_id', 'name', 'note', 'score_axis', 'score_direction', 'observable_manifestations', 'source_basis', 'confidence'])) errors.push(`dimensions[${index}] exact keys mismatch`);
  }
  for (const [index, item] of (value.questions || []).entries()) {
    if (!exactKeys(item, REQUIRED_QUESTION_KEYS)) { errors.push(`questions[${index}] exact keys mismatch`); continue; }
    if (item.response_type === 'forced_comparison' && (!Array.isArray(item.response_options) || item.response_options.length < 2)) errors.push(`questions[${index}] forced comparison lacks two options`);
    if (item.response_type === 'artifact_judgment' && (item.artifact_required !== true || !String(item.input_spec || '').trim())) errors.push(`questions[${index}] artifact judgment is not executable`);
    if (!['identification', 'impact', 'response_capability', 'discrimination', 'retest'].includes(item.task_type)) errors.push(`questions[${index}] invalid task type`);
  }
  return errors;
}

export function validateV4(framework, instrument) { return [...validateFrameworkV4(framework), ...validateInstrumentV4(instrument)]; }
