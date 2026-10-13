export const V4_PROMPT_VERSION = 'site-eval-draft.v4';

export const FRAMEWORK_OUTPUT_SCHEMA_V4 = {
  type: 'object', additionalProperties: false,
  required: ['title', 'creator_judgment_model', 'frameworks', 'relationships', 'missing_evidence', 'claim_boundary'],
  properties: {
    title: { type: 'string' }, creator_judgment_model: { type: 'string' },
    frameworks: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false,
      required: ['creator_construct_id', 'name', 'creator_distinction', 'observable_evidence', 'source_basis', 'confidence', 'calibration_questions'],
      properties: {
        creator_construct_id: { type: 'string' }, name: { type: 'string' }, creator_distinction: { type: 'string' },
        observable_evidence: { type: 'array', maxItems: 6, items: { type: 'string' } }, source_basis: { type: 'array', maxItems: 6, items: { type: 'string' } },
        confidence: { type: 'string', enum: ['high', 'moderate', 'low', 'MISSING'] }, calibration_questions: { type: 'array', maxItems: 4, items: { type: 'string' } }
      }
    } },
    relationships: { type: 'array', maxItems: 12, items: { type: 'object', additionalProperties: false,
      required: ['from_construct_id', 'creator_claimed_relationship', 'observable_expression', 'desired_behavior', 'evidence_status', 'source_basis', 'validated_relationship'],
      properties: {
        from_construct_id: { type: 'string' }, creator_claimed_relationship: { type: 'string' }, observable_expression: { type: 'string' },
        desired_behavior: { type: 'string' }, evidence_status: { type: 'string', enum: ['creator_framework', 'creator_positioning', 'testimonial_only', 'inferred', 'MISSING'] },
        source_basis: { type: 'array', items: { type: 'string' } }, validated_relationship: { type: 'string', enum: ['MISSING', 'not_claimed', 'supported_by_source_only'] }
      }
    } },
    missing_evidence: { type: 'array', items: { type: 'string' } }, claim_boundary: { type: 'string' }
  }
};

export const INSTRUMENT_OUTPUT_SCHEMA_V4 = {
  type: 'object', additionalProperties: false,
  required: ['title', 'assessment_subject', 'score_axes', 'dimensions', 'questions', 'claim_boundary', 'missing_evidence'],
  properties: {
    title: { type: 'string' }, assessment_subject: { type: 'string', enum: ['creator_audience', 'unknown'] },
    score_axes: { type: 'object', additionalProperties: false,
      required: ['mechanism', 'evidence_confidence', 'impact', 'response_capability'],
      properties: {
        mechanism: { type: 'string', const: 'categorical' },
        evidence_confidence: { type: 'string', const: 'confidence' },
        impact: { type: 'string', const: 'severity' },
        response_capability: { type: 'string', const: 'capability' }
      }
    },
    dimensions: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false,
      required: ['creator_construct_id', 'name', 'note', 'score_axis', 'score_direction', 'observable_manifestations', 'source_basis', 'confidence'],
      properties: {
        creator_construct_id: { type: 'string' }, name: { type: 'string' }, note: { type: 'string' },
        score_axis: { type: 'string', enum: ['mechanism', 'evidence_confidence', 'impact', 'response_capability'] },
        score_direction: { type: 'string', enum: ['higher_is_better', 'higher_is_worse', 'unordered_category'] },
        observable_manifestations: { type: 'array', items: { type: 'string' } }, source_basis: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'string', enum: ['high', 'moderate', 'low', 'MISSING'] }
      }
    } },
    questions: { type: 'array', maxItems: 10, items: { type: 'object', additionalProperties: false,
      required: ['text', 'task_type', 'response_type', 'creator_construct_id', 'behavior_being_tested', 'input_spec', 'response_options', 'artifact_required', 'scoring_logic', 'strong_signal', 'weak_signal', 'alternative_explanations', 'disconfirming_evidence', 'source_basis', 'creator_calibration_needed'],
      properties: {
        text: { type: 'string' }, task_type: { type: 'string', enum: ['identification', 'impact', 'response_capability', 'discrimination', 'retest'] },
        response_type: { type: 'string', enum: ['self_report', 'scenario', 'forced_comparison', 'artifact_judgment'] }, creator_construct_id: { type: 'string' },
        behavior_being_tested: { type: 'string' }, input_spec: { type: 'string' }, response_options: { type: 'array', items: { type: 'string' } }, artifact_required: { type: 'boolean' },
        scoring_logic: { type: 'string' }, strong_signal: { type: 'string' }, weak_signal: { type: 'string' }, alternative_explanations: { type: 'array', items: { type: 'string' } },
        disconfirming_evidence: { type: 'array', items: { type: 'string' } }, source_basis: { type: 'array', items: { type: 'string' } }, creator_calibration_needed: { type: 'boolean' }
      }
    } },
    claim_boundary: { type: 'string' }, missing_evidence: { type: 'array', items: { type: 'string' } }
  }
};

const SYSTEM = `You are a source-bounded creator-judgment analyst. The creator is the judge; public pages are evidence of distinctions the creator may teach. Do not audit the website, SEO, pricing, credentials, CTAs, or marketing. Do not diagnose, infer stable traits, claim causality, or reward worldview agreement. Preserve external explanations and allow none/unclear classifications. Separate creator-claimed relationships from independently validated relationships: validation is MISSING unless supplied. Return JSON only.`;

export function buildFrameworkMessagesV4(discovery) {
  return [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify({
    task: 'Extract the creator judgment model, including named constructs and claimed relationships, before constructing an instrument.', source_discovery: discovery,
    output_contract: FRAMEWORK_OUTPUT_SCHEMA_V4,
    constraints: ['Assign stable creator_construct_id values such as four_horsemen.fear_of_uncertainty when source support exists.', 'Represent fear category, behavioral disguise, desired behavior, and alternative explanation without claiming causality.', 'Use validated_relationship=MISSING unless independent validation is present.', 'Do not invent named constructs from a title alone.']
  }) }];
}

export function buildInstrumentMessagesV4(discovery, framework) {
  return [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify({
    task: 'Construct a multi-axis respondent instrument from the extracted creator judgment model.', assessment_subject: 'creator_audience', source_discovery: discovery, extracted_framework: framework,
    output_contract: INSTRUMENT_OUTPUT_SCHEMA_V4,
    constraints: ['Include separate identification, impact, response_capability, and discrimination tasks; do not collapse them into one score.', 'Every dimension declares score_axis and score_direction.', 'Every question carries a creator_construct_id.', 'Every forced_comparison has at least two response_options.', 'Every artifact_judgment sets artifact_required=true and specifies input_spec.', 'Preserve alternative explanations such as skill, resources, legal constraints, reversibility, and context.', 'Require disconfirming_evidence or an explicit MISSING marker for each question.']
  }) }];
}
