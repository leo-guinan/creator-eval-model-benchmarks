export const V3_PROMPT_VERSION = 'site-eval-draft.v3';

export const FRAMEWORK_OUTPUT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title', 'creator_judgment_model', 'frameworks', 'missing_evidence', 'claim_boundary'],
  properties: {
    title: { type: 'string' },
    creator_judgment_model: { type: 'string' },
    frameworks: { type: 'array', maxItems: 8, items: { type: 'object', additionalProperties: false,
      required: ['name', 'creator_distinction', 'observable_evidence', 'source_basis', 'confidence', 'calibration_questions'],
      properties: {
        name: { type: 'string' }, creator_distinction: { type: 'string' },
        observable_evidence: { type: 'array', maxItems: 6, items: { type: 'string' } },
        source_basis: { type: 'array', maxItems: 6, items: { type: 'string' } },
        confidence: { type: 'string', enum: ['high', 'moderate', 'low', 'MISSING'] },
        calibration_questions: { type: 'array', maxItems: 4, items: { type: 'string' } }
      }
    } },
    missing_evidence: { type: 'array', items: { type: 'string' } },
    claim_boundary: { type: 'string' }
  }
};

export const INSTRUMENT_OUTPUT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['title', 'assessment_subject', 'score_semantics', 'dimensions', 'questions', 'claim_boundary', 'missing_evidence'],
  properties: {
    title: { type: 'string' }, assessment_subject: { type: 'string', enum: ['creator_audience', 'unknown'] },
    score_semantics: { type: 'string', enum: ['capability', 'bottleneck_severity', 'readiness', 'categorical'] },
    dimensions: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false,
      required: ['name', 'note', 'score_semantics', 'observable_manifestations', 'source_basis', 'confidence'],
      properties: {
        name: { type: 'string' }, note: { type: 'string' }, score_semantics: { type: 'string', enum: ['capability', 'bottleneck_severity', 'readiness', 'categorical'] },
        observable_manifestations: { type: 'array', items: { type: 'string' } }, source_basis: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'string', enum: ['high', 'moderate', 'low', 'MISSING'] }
      }
    } },
    questions: { type: 'array', maxItems: 6, items: { type: 'object', additionalProperties: false,
      required: ['text', 'response_type', 'behavior_being_tested', 'input_spec', 'response_options', 'artifact_required', 'scoring_logic', 'strong_signal', 'weak_signal', 'confounders', 'source_basis', 'creator_calibration_needed'],
      properties: {
        text: { type: 'string' }, response_type: { type: 'string', enum: ['self_report', 'scenario', 'forced_comparison', 'artifact_judgment'] },
        behavior_being_tested: { type: 'string' }, input_spec: { type: 'string' }, response_options: { type: 'array', items: { type: 'string' } },
        artifact_required: { type: 'boolean' }, scoring_logic: { type: 'string' }, strong_signal: { type: 'string' }, weak_signal: { type: 'string' },
        confounders: { type: 'array', items: { type: 'string' } }, source_basis: { type: 'array', items: { type: 'string' } }, creator_calibration_needed: { type: 'boolean' }
      }
    } },
    claim_boundary: { type: 'string' }, missing_evidence: { type: 'array', items: { type: 'string' } }
  }
};

const SYSTEM = `You are a source-bounded creator-judgment analyst. The creator is the judge; their public pages are evidence of distinctions they may use. Do not audit the website, SEO, pricing, credentials, CTAs, or marketing. Do not diagnose, infer stable traits, claim causality, or reward agreement with a worldview. Treat every interpretation as a calibration hypothesis. Use MISSING when the pages do not establish a distinction. Return JSON only.`;

export function buildFrameworkMessages(discovery) {
  return [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify({
    task: 'Extract the creator\'s underlying judgment model before constructing any respondent instrument.',
    source_discovery: discovery,
    output_contract: FRAMEWORK_OUTPUT_SCHEMA,
    constraints: ['Separate observed creator distinctions from interpretations.', 'Cite page URLs or short verbatim excerpts in source_basis.', 'Do not invent named frameworks from headings alone.', 'Identify what additional creator material or calibration is required.']
  }) }];
}

export function buildInstrumentMessages(discovery, framework) {
  return [{ role: 'system', content: SYSTEM }, { role: 'user', content: JSON.stringify({
    task: 'Construct a respondent-facing instrument from the extracted creator judgment model.',
    assessment_subject: 'creator_audience', source_discovery: discovery, extracted_framework: framework,
    output_contract: INSTRUMENT_OUTPUT_SCHEMA,
    constraints: ['Every forced_comparison must include at least two response_options.', 'Every artifact_judgment must set artifact_required true and specify input_spec.', 'Choose one score_semantics and explain whether high is good, bad, or categorical.', 'Questions must elicit behavior, decisions, scenarios, or inspectable artifacts rather than agreement with the creator.', 'Keep interventions limited to instrument improvements unless the source establishes a creator intervention.']
  }) }];
}
